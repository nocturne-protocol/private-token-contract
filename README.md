# Private ERC20 Token with iExec TEE Integration

This project implements an ERC20 token with privacy features using encrypted amounts and iExec TEE integration for off-chain processing.

## 🚀 Deployed Contract

**Arbitrum Sepolia**: [`0xFC2146736ee72A1c5057e2b914Ed27339F1fe9c7`](https://sepolia.arbiscan.io/address/0xFC2146736ee72A1c5057e2b914Ed27339F1fe9c7)

## 🏗️ Architecture

The `PrivateERC20` contract combines two main features:

1. **Private ERC20 Token** with encrypted balances
2. **TEE Integration** for secure off-chain processing

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

### Key Features

#### 1. Token Minting

```solidity
function mint(address to, bytes calldata encryptedAmount) external onlyOwner
```

- Only the owner can create new tokens
- The amount is provided in encrypted form

#### 2. Transfer with TEE

```solidity
function transfer(address to, bytes calldata encryptedAmount) external
```

- Creates a transfer request with a unique operation ID
- Emits `TransferRequested` and `Transfer` events
- The actual processing happens off-chain in the TEE enclave

#### 3. Balance Updates by TEE

```solidity
function batchUpdateBalances(bytes32 operationId, address[] accounts, bytes[] newBalances) external onlyTEE
```

- Updates balances after verification in the TEE enclave
- Only the TEE oracle can perform these updates

## 🔄 Workflow

1. **Transfer Request** → User calls `transfer()`
2. **Event Emitted** → `TransferRequested` with a unique operation ID
3. **TEE Processing** → iExec enclave decrypts, verifies, and calculates
4. **Update** → TEE calls `batchUpdateBalances()` with new encrypted balances

## 🚀 Usage

### Compilation

```bash
npx hardhat compile
```

### Tests

```bash
forge test
```

### Deployment

**Step 1: Deploy the contract**

```bash
# Arbitrum Sepolia (recommended)
npm run deploy:arbitrumSepolia
```

**Step 2: Configure iExec orders**

```bash
# Edit scripts/storeOrders.ts to set CONTRACT_ADDRESS
# Store orders from iExec orderbook
npm run store-orders:arbitrumSepolia
```

The script will automatically:

- ✅ Retrieve AppOrder and WorkerpoolOrder from iExec
- ✅ Store them in the contract
- ✅ Verify that everything is configured correctly

**Step 3: Deposit sRLC for the contract**

```bash
# The script automatically reads the deployed contract address
# Edit scripts/depositSRLC.ts to adjust AMOUNT if needed (default: 1.0 RLC)
npm run deposit-srlc:arbitrumSepolia
```

The script will automatically:

- ✅ Detect the deployed contract address from Hardhat Ignition
- ✅ Read Poco configuration from config.json
- ✅ Check your RLC balance
- ✅ Approve the Poco contract
- ✅ Deposit RLC as sRLC for the contract
- ✅ The contract can now pay for iExec computations

**Step 4: Perform a transfer**

```bash
# Edit scripts/transfer.ts to set:
# - CONTRACT_ADDRESS: deployed contract address
# - RECIPIENT: recipient address
# - AMOUNT: amount to transfer (in tokens)

npm run transfer:arbitrumSepolia
```

The script will automatically:

- ✅ Retrieve the contract's encryption public key
- ✅ Encrypt the transfer amount
- ✅ Call the transfer() function with iExec payment
- ✅ The TEE will process the transfer confidentially

**Step 5: The contract is ready!**

Users can now call `transfer()` and the iExec TEE system will process computations confidentially.

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
