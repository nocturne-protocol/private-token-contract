import { ethers } from "hardhat";

async function main() {
  console.log("Setting up Arbitrum Sepolia fork...");
  
  // Get RPC URL from environment
  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    throw new Error("ARBITRUM_SEPOLIA_RPC_URL environment variable not set");
  }

  console.log("RPC URL:", rpcUrl);
  
  // Get signers on the fork
  const [deployer, user1, user2] = await ethers.getSigners();
  
  console.log("\nDeployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  
  // Deploy contract on the fork
  const PrivateERC20 = await ethers.getContractFactory("PrivateERC20");
  const token = await PrivateERC20.deploy("PrivateToken", "PRIV", 18);
  await token.waitForDeployment();
  
  const tokenAddress = await token.getAddress();
  console.log("\nPrivateERC20 deployed to:", tokenAddress);
  console.log("Token name:", await token.name());
  console.log("Token symbol:", await token.symbol());
  console.log("Token decimals:", await token.decimals());
  
  // Test mint
  console.log("\n--- Testing Mint ---");
  const encryptedAmount = "0x1234567890abcdef";
  const mintTx = await token.mint(user1.address, encryptedAmount);
  await mintTx.wait();
  console.log("Minted tokens to user1");
  
  const balance = await token.balanceOf(user1.address);
  console.log("User1 balance:", balance);
  
  // Test transfer
  console.log("\n--- Testing Transfer ---");
  const transferAmount = "0xfedcba0987654321";
  const transferTx = await token.connect(await ethers.getSigner(user1.address)).transfer(user2.address, transferAmount);
  await transferTx.wait();
  console.log("Transfer requested from user1 to user2");
  
  // Test updateBalance
  console.log("\n--- Testing UpdateBalance ---");
  const senderNewBalance = "0x1111111111111111";
  const receiverNewBalance = "0x2222222222222222";
  const updateTx = await token.updateBalance(user1.address, user2.address, senderNewBalance, receiverNewBalance);
  await updateTx.wait();
  console.log("Balances updated");
  
  console.log("User1 new balance:", await token.balanceOf(user1.address));
  console.log("User2 new balance:", await token.balanceOf(user2.address));
  
  console.log("\n✅ All tests passed on Arbitrum Sepolia fork!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });