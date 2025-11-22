# Private ERC20 Token with iExec TEE Integration

Ce projet implémente un token ERC20 avec des fonctionnalités de confidentialité utilisant des montants chiffrés et une intégration avec iExec TEE pour le traitement off-chain.

## 🏗️ Architecture

Le contrat `PrivateERC20` combine deux fonctionnalités principales :

1. **Token ERC20 privé** avec balances chiffrées
2. **Intégration TEE** pour le traitement off-chain sécurisé

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Chain: Sepolia / Base Sepolia (or other L2s)               │
│                                                             │
│  ┌─────────────────┐         ┌──────────────────┐           │
│  │ PrivateERC20    │────────>│  PocoOApp        │           │
│  │ Contract        │         │  (Router Mode)   │           │
│  └─────────────────┘         └──────────────────┘           │
│         ^                             │                     │
│         │ 1. transfer()               │ 2. routeCall()      │
│         │ with encrypted amount       │                     │
└─────────┼─────────────────────────────┼──────────────────-──┘
          │                             │
          │                             │ LayerZero
          │                             │ Cross-chain
          │                             │ Message
          │                             ▼
┌─────────┼─────────────────────────────────────────────────┐
│  Chain: Arbitrum Sepolia                                  │
│         │                     ┌──────────────────┐        │
│         │                     │  PocoOApp        │        │
│         │                     │  (Receiver Mode) │        │
│         │                     └─────────┬────────┘        │
│         │                               │                 │
│         │                               │ 3. _lzReceive() │
│         │                               │    calls Poco   │
|         |                               |                 |
│         │                               │ 4. matchOrders()│
│         │                               │    creates deal │
│         │                               ▼                 │
│         │                     ┌──────────────────┐        │
│         │                     │ TEE Workerpool   │        │
│         │                     │ Executes Transfer│        │
│         │                     └─────────┬────────┘        │
│         │                               │                 │
│         │                               │ 5. Computes new │
│         │                               │    balances     │
│         └───────────────────────────────┘                 │
│                                        6. updateBalance() │
│                                           callback        │
└───────────────────────────────────────────────────────────┘
```

### Fonctionnalités clés

#### 1. Mint de tokens

```solidity
function mint(address to, bytes calldata encryptedAmount) external onlyOwner
```

- Seul le propriétaire peut créer de nouveaux tokens
- Le montant est fourni sous forme chiffrée

#### 2. Transfert avec TEE

```solidity
function transfer(address to, bytes calldata encryptedAmount) external
```

- Crée une demande de transfert avec un ID d'opération unique
- Émet des événements `TransferRequested` et `Transfer`
- Le traitement réel se fait off-chain dans l'enclave TEE

#### 3. Mise à jour des balances par TEE

```solidity
function batchUpdateBalances(bytes32 operationId, address[] accounts, bytes[] newBalances) external onlyTEE
```

- Met à jour les balances après vérification dans l'enclave TEE
- Seul l'oracle TEE peut effectuer ces mises à jour

## 🔄 Flux de travail

1. **Demande de transfert** → L'utilisateur appelle `transfer()`
2. **Événement émis** → `TransferRequested` avec un ID d'opération unique
3. **Traitement TEE** → L'enclave iExec déchiffre, vérifie et calcule
4. **Mise à jour** → TEE appelle `batchUpdateBalances()` avec les nouvelles balances chiffrées

## 🚀 Utilisation

### Compilation

```bash
npx hardhat compile
```

### Tests

```bash
forge test
```

### Déploiement

```bash
npx hardhat run scripts/deploy.ts --network <network>
```

## 🔐 Sécurité

- **Confidentialité** : Tous les montants restent chiffrés on-chain
- **Intégrité** : Vérification dans un environnement d'exécution de confiance (TEE)
- **Auditabilité** : Tous les événements sont traçables

## 📁 Structure des fichiers

```
contracts/
├── PrivateERC20.sol         # Contrat principal
└── PrivateERC20.t.sol       # Tests Forge

scripts/
└── deploy.ts                # Script de déploiement
```

## 🛠️ Pourquoi un seul contrat ?

L'architecture a été simplifiée pour éviter la complexité inutile :

- **Avant** : Deux contrats séparés (`PrivateERC20` + `TEEBalanceManager`)
- **Maintenant** : Un seul contrat avec toute la logique intégrée
- **Avantages** :
  - Moins de gas pour les interactions
  - Code plus simple à maintenir
  - Pas de risques de synchronisation entre contrats

```shell
npx hardhat test
```

You can also selectively run the Solidity or `node:test` tests:

```shell
npx hardhat test solidity
npx hardhat test nodejs
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```
