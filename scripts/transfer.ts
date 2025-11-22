import { network } from "hardhat";
import { parseEther } from "viem";
import { encryptAmount } from "../test/utils.js";

// Configuration - Update these for your deployment
const CONTRACT_ADDRESS = "0x0d60d494cbC4438066a4C1a6154Aa89cF83b4874";
const RECIPIENT = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; // Update with recipient address
const AMOUNT = "100"; // Amount in tokens (e.g., "100" for 100 tokens)
const IEXEC_PAYMENT = "0.01"; // ETH to send for iExec payment

/**
 * Transfer tokens using PrivateERC20
 */
async function main() {
  // Validate required parameters
  if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS is required");
  }
  if (!RECIPIENT) {
    throw new Error("RECIPIENT address is required");
  }

  console.log("\n🔄 Initiating private transfer...");
  console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  console.log(`   Recipient: ${RECIPIENT}`);
  console.log(`   Amount: ${AMOUNT} tokens`);
  console.log(`   iExec Payment: ${IEXEC_PAYMENT} ETH`);

  // Connect to network
  const { viem } = await network.connect();
  const [sender] = await viem.getWalletClients();
  console.log(`\n   Sender: ${sender.account!.address}`);

  // Get contract instance
  const contract = await viem.getContractAt("PrivateERC20", CONTRACT_ADDRESS);

  // Get encryption public key from contract
  console.log(`\n🔐 Fetching encryption public key...`);
  const publicKeyBytes = await contract.read.encryptionPublicKey();
  const publicKeyHex = publicKeyBytes as `0x${string}`;
  console.log(`   Public Key: ${publicKeyHex.substring(0, 20)}...`);

  // Get decimals for proper conversion
  const decimals = await contract.read.decimals();
  console.log(`   Token decimals: ${decimals}`);

  // Convert amount to base units
  const amountInBaseUnits = BigInt(AMOUNT) * 10n ** BigInt(decimals);
  console.log(`   Amount in base units: ${amountInBaseUnits}`);

  // Encrypt the amount
  console.log(`\n🔒 Encrypting transfer amount...`);
  const encryptedAmount = encryptAmount(publicKeyHex, amountInBaseUnits);
  console.log(`   Encrypted: ${encryptedAmount.substring(0, 20)}...`);

  // Call transfer function
  console.log(`\n📤 Submitting transfer transaction...`);
  const hash = await contract.write.transfer(
    [RECIPIENT, encryptedAmount],
    {
      account: sender.account!.address,
      value: parseEther(IEXEC_PAYMENT),
    }
  );

  console.log(`\n📝 Transaction submitted: ${hash}`);
  console.log(`   Waiting for confirmation...`);

  // Wait for transaction receipt
  const publicClient = await viem.getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === "success") {
    console.log(`\n✅ Transfer requested successfully!`);
    console.log(`   Transaction: ${hash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed}`);
    console.log(`\n   📋 The transfer will be processed by iExec TEE`);
    console.log(`   🔍 Monitor the TransferRequested event for the dealId`);
    console.log(`   ⏳ After computation completes, the balances will be updated`);
  } else {
    throw new Error("Transaction failed");
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

