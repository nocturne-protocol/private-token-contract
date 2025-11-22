# PrivateERC20 Tests

## Test Files

### 1. `e2e.ts` - End-to-End Basic Tests
Basic functionality tests that run on forked networks (Sepolia, Base Sepolia, Arbitrum Sepolia).

**What it tests:**
- Minting encrypted tokens
- Decrypting balances with private key
- Transfer requests
- Balance updates
- Privacy guarantees
- Input validation

**Run with:**
```bash
npm test
```

### 2. `iexec-integration.ts` - iExec SDK Integration Test
Comprehensive integration test that demonstrates the full flow with iExec SDK.

**What it tests:**
- Deploys contract on Arbitrum Sepolia fork
- Fetches real AppOrder and WorkerpoolOrder from iExec orderbook
- Stores orders in the contract
- Executes encrypted transfer request
- Simulates TEE callback with updated balances
- Verifies privacy and encryption throughout

**AppAddress:** `0xe8e10f22a9ee1a4916c1acd9cb35fcf9702f1232`  
**WorkerpoolAddress:** `0xb967057a21dc6a66a29721d96b8aa7454b7c383f`

**Run with:**
```bash
# Install iExec SDK first
npm install

# Run the test
npm run test:iexec
```

## Test Flow Explained

### iExec Integration Test Flow

1. **Setup Environment**
   - Starts Arbitrum Sepolia fork
   - Generates encryption keypair
   - Loads configuration from `config/config.json`

2. **Deploy Contract**
   - Deploys PrivateERC20 with Arbitrum Sepolia config
   - Sets up Poco integration (direct calls on Arbitrum)
   - Configures LayerZero options

3. **Fetch iExec Orders**
   - Connects to iExec SDK
   - Fetches AppOrder from orderbook for the TEE computation app
   - Fetches WorkerpoolOrder from orderbook for TEE execution
   - Falls back to mock orders if orderbook is empty (for testing)

4. **Store Orders in Contract**
   - Calls `storeOrders()` with fetched orders
   - Creates empty DatasetOrder (no dataset needed)
   - Emits `OrdersStored` event

5. **Mint Tokens**
   - Mints 1000 tokens to user1
   - Amount is encrypted with public key
   - Verifies encrypted balance is stored

6. **Request Transfer**
   - User1 transfers 100 tokens to user2
   - Transfer amount is encrypted
   - Calls `transfer()` which triggers `matchOrders`
   - Emits `TransferRequested` event
   - In production, this creates an iExec task in the TEE

7. **TEE Callback Simulation**
   - Simulates what the TEE would do:
     - Decrypt balances
     - Validate transfer
     - Compute new balances
     - Re-encrypt with public key
   - Calls `updateBalance()` with new encrypted balances
   - Emits `BalanceUpdate` event

8. **Verify Results**
   - Checks that balances are updated correctly
   - Verifies privacy: on-chain balances are opaque hex strings
   - Confirms only private key holder can decrypt actual values

## Configuration

The test uses configuration from `config/config.json`:

```json
{
  "chains": {
    "arbitrumSepolia": {
      "name": "Arbitrum Sepolia",
      "chainId": 421614,
      "isArbitrum": true,
      "pocoOAppRouter": "0x...",
      "pocoAddress": "0x...",
      "lzOptions": "0x"
    }
  },
  "tokenConfig": {
    "name": "Private Token",
    "symbol": "PRIV",
    "decimals": 18
  }
}
```

## Requirements

- Node.js 18+
- Hardhat
- iExec SDK (`npm install iexec`)
- Access to Arbitrum Sepolia RPC (for fork)

## Environment Variables

Create a `.env` file:

```bash
# RPC URLs
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Private key for deployment (only for testing)
PRIVATE_KEY=your_test_private_key_here
```

## Expected Output

```
🔧 Setting up test environment on Arbitrum Sepolia fork...
   Deployer: 0x...
   User1: 0x...
   User2: 0x...

🔐 Generated encryption keypair
   Public Key: 0x04...

📦 Deploying PrivateERC20 contract...
   Chain: Arbitrum Sepolia (421614)
   ✅ Contract deployed at: 0x...

🌐 Initializing iExec SDK...
   ✅ iExec SDK initialized

📖 Fetching AppOrder for app: 0xe8e10f22a9ee1a4916c1acd9cb35fcf9702f1232
   ✅ Found X app order(s)
   ✅ AppOrder ready

📖 Fetching WorkerpoolOrder for workerpool: 0xb967057a21dc6a66a29721d96b8aa7454b7c383f
   ✅ Found X workerpool order(s)
   ✅ WorkerpoolOrder ready

💾 Storing orders in contract...
   ✅ Orders stored successfully

🪙 Minting tokens to user1...
   ✅ Minted 1000 tokens to user1

🔄 Requesting transfer from user1 to user2...
   ✅ Transfer requested successfully

🔐 Simulating TEE callback (updateBalance)...
   ✅ Balances updated and verified
   User1 balance: 900 tokens
   User2 balance: 100 tokens

🔒 Verifying privacy guarantees...
   ✅ Privacy maintained: balances are encrypted
   ✅ Only TEE with private key can decrypt actual values
```

## Production vs Testing

### In Testing
- We simulate the TEE callback by calling `updateBalance()` directly
- Test requires real orders from iExec orderbook (no mocks)
- We use a locally generated keypair
- Contract is deployed on a local fork

### In Production
- iExec TEE executes in a secure enclave
- TEE decrypts, validates, and computes new balances
- TEE calls back `updateBalance()` with new encrypted values
- All computation happens off-chain in confidential environment
- Orders are fetched from live iExec orderbook
- Keypair is managed securely by the TEE
- Contract is deployed on actual networks

## Troubleshooting

### "iExec SDK not initialized"
Install the iExec SDK:
```bash
npm install iexec
```

### "No app orders found in orderbook"
This means the specified app has no active orders. Check:
- The app address is correct: `0xe8e10f22a9ee1a4916c1acd9cb35fcf9702f1232`
- Orders exist for this app on Arbitrum Sepolia
- You may need to create orders or use a different app address

### "RPC URL not configured"
Make sure your `.env` file has `ARBITRUM_SEPOLIA_RPC_URL` set.

### Fork fails
Ensure you have network access and the RPC endpoint is responsive. You can try a different RPC provider.

## Learn More

- [iExec Documentation](https://docs.iex.ec/)
- [iExec SDK](https://github.com/iExecBlockchainComputing/iexec-sdk)
- [LayerZero Documentation](https://docs.layerzero.network/)
- [ECIES Encryption](https://github.com/ecies/js)

