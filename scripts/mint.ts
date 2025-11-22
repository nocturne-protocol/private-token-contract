import { network } from "hardhat";
import { encryptAmount } from "../test/utils.js";

// Configuration from environment variables
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;
const TO_ADDRESS = process.env.TO_ADDRESS as `0x${string}`;
const AMOUNT = process.env.AMOUNT || "1000000"; // Amount in tokens (will be converted to wei)


/**
 * Main mint function
 */
async function mintTokens() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS environment variable is required");
  }
  if (!TO_ADDRESS) {
    throw new Error("TO_ADDRESS environment variable is required");
  }

  console.log("🪙 Minting encrypted tokens...");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`To: ${TO_ADDRESS}`);
  console.log(`Amount: ${AMOUNT} tokens`);

  // Connect to network
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();

  console.log(`Minting from: ${deployer.account!.address}`);

  // Get contract instance
  const contract = await viem.getContractAt("PrivateERC20", CONTRACT_ADDRESS);

  try {
    // 1. Read the public key from the contract
    console.log("\n📖 Reading encryption public key from contract...");
    const publicKeyHex = await contract.read.encryptionPublicKey();
    console.log(`Public Key: ${publicKeyHex}`);

    // 2. Convert amount to wei (assuming 18 decimals)
    const amountInWei = BigInt(AMOUNT) * 10n ** 18n;
    console.log(`Amount in wei: ${amountInWei}`);

    // 3. Encrypt the amount
    console.log("\n🔐 Encrypting amount...");
    const encryptedAmount = encryptAmount(publicKeyHex as string, amountInWei);
    console.log(`Encrypted amount: ${encryptedAmount}`);

    // 4. Call mint function
    console.log("\n📝 Calling mint function...");
    const hash = await contract.write.mint([TO_ADDRESS, encryptedAmount], {
      account: deployer.account!.address,
    });
    
    console.log(`\n✅ Transaction submitted!`);
    console.log(`Transaction hash: ${hash}`);
    console.log(`\nWaiting for confirmation...`);

    // 5. Wait for transaction receipt
    const publicClient = await viem.getPublicClient();
    await publicClient.waitForTransactionReceipt({ hash });
    
    console.log(`\n🎉 Tokens minted successfully!`);
    console.log(`\nMinted ${AMOUNT} tokens to ${TO_ADDRESS}`);
    
  } catch (error) {
    console.error("\n❌ Error minting tokens:", error);
    throw error;
  }
}

// Run the script
mintTokens().catch(console.error);
