import { network } from "hardhat";
import { parseUnits, toHex, parseEther, concat, pad } from "viem";
import * as fs from "fs";
import * as path from "path";

// Configuration - Update this
const AMOUNT = "2.0"; // Amount in RLC (e.g., "1.0" for 1 RLC)

/**
 * Deposit sRLC into the contract's iExec escrow account
 */
async function main() {
  // Connect to network
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  // Get chain ID
  const chainId = await publicClient.getChainId();
  console.log(`\n🔍 Connected to chain ID: ${chainId}`);

  // Load config
  const configPath = path.join(process.cwd(), "config", "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  // Find chain config
  const chainConfig = Object.values(config.chains).find(
    (c: any) => c.chainId === chainId
  );

  if (!chainConfig) {
    throw new Error(
      `No configuration found for chain ID ${chainId}. Please add it to config/config.json`
    );
  }

  const POCO_ADDRESS = (chainConfig as any).pocoAddress;
  if (!POCO_ADDRESS || POCO_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      `Poco address not configured for chain ${chainId}. This script only works on chains with Poco contract.`
    );
  }

  // Get the latest deployment address from Hardhat Ignition
  const deploymentsDir = path.join(
    process.cwd(),
    "ignition",
    "deployments",
    `chain-${chainId}`
  );
  const deployedAddressesPath = path.join(deploymentsDir, "deployed_addresses.json");

  if (!fs.existsSync(deployedAddressesPath)) {
    throw new Error(
      `No deployment found for chain ${chainId}. Please deploy the contract first using: npm run deploy:${(chainConfig as any).name.toLowerCase().replace(" ", "")}`
    );
  }

  const deployedAddresses = JSON.parse(
    fs.readFileSync(deployedAddressesPath, "utf8")
  );
  const CONTRACT_ADDRESS = deployedAddresses["PrivateERC20Module#PrivateERC20"];

  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "PrivateERC20 contract address not found in deployed_addresses.json"
    );
  }

  console.log("\n💰 Depositing sRLC into contract...");
  console.log(`   Network: ${(chainConfig as any).name} (${chainId})`);
  console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  console.log(`   Amount: ${AMOUNT} RLC`);
  console.log(`   Poco: ${POCO_ADDRESS}`);
  console.log(`\n   Depositor: ${deployer.account!.address}`);

  // RLC has 9 decimals
  const amountInWei = parseUnits(AMOUNT, 9);

  // Get RLC token address from Poco
  console.log(`\n🔍 Fetching RLC token address...`);
  const rlcTokenAddress = (await publicClient.readContract({
    address: POCO_ADDRESS as `0x${string}`,
    abi: [
      {
        name: "token",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "address" }],
      },
    ],
    functionName: "token",
  })) as `0x${string}`;
  console.log(`   RLC Token: ${rlcTokenAddress}`);

  // Check RLC balance
  const balance = (await publicClient.readContract({
    address: rlcTokenAddress,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "balanceOf",
    args: [deployer.account!.address],
  })) as bigint;

  console.log(
    `\n   Your RLC balance: ${Number(balance) / 10 ** 9} RLC (${balance} wei)`
  );

  if (balance < amountInWei) {
    throw new Error(
      `Insufficient RLC balance. You have ${Number(balance) / 10 ** 9} RLC but need ${AMOUNT} RLC`
    );
  }

  // Approve Poco to spend RLC
  console.log(`\n✅ Approving Poco to spend RLC...`);
  const approveHash = await deployer.writeContract({
    address: rlcTokenAddress,
    abi: [
      {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ type: "bool" }],
      },
    ] as const,
    functionName: "approve",
    args: [POCO_ADDRESS as `0x${string}`, amountInWei],
  } as any);

  console.log(`   Approve tx: ${approveHash}`);
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log(`   ✅ Approval confirmed`);

  // Deposit RLC to get sRLC for the contract
  console.log(`\n💰 Depositing RLC to get sRLC for contract...`);
  const depositHash = await deployer.writeContract({
    address: POCO_ADDRESS as `0x${string}`,
    abi: [
      {
        name: "depositFor",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "amount", type: "uint256" },
          { name: "target", type: "address" },
        ],
        outputs: [{ type: "bool" }],
      },
    ] as const,
    functionName: "depositFor",
    args: [amountInWei, CONTRACT_ADDRESS as `0x${string}`],
  } as any);

  console.log(`   Deposit tx: ${depositHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: depositHash,
  });

  if (receipt.status === "success") {
    console.log(`\n✅ Successfully deposited ${AMOUNT} RLC as sRLC!`);
    console.log(`   Transaction: ${depositHash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed}`);
    console.log(
      `\n   Contract ${CONTRACT_ADDRESS} now has sRLC to pay for iExec computations`
    );
  } else {
    throw new Error("Deposit transaction failed");
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

