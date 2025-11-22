import { network } from "hardhat";
import { IExec, utils } from 'iexec';

// Configuration - Update these for your deployment
const CONTRACT_ADDRESS = "0xFC2146736ee72A1c5057e2b914Ed27339F1fe9c7";
const APP_ADDRESS = "0xbb21e58a72327a5fda6f5d3673f1fab6607aeab1";
const WORKERPOOL_ADDRESS = "0xb967057a21dc6a66a29721d96b8aa7454b7c383f";

/**
 * Fetch and store iExec orders in the deployed PrivateERC20 contract
 */
async function main() {
  // Validate required parameters
  if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS environment variable is required");
  }

  console.log("\n📋 Fetching and storing iExec orders...");
  console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  console.log(`   App: ${APP_ADDRESS}`);
  console.log(`   Workerpool: ${WORKERPOOL_ADDRESS}`);

  // Connect to network
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  console.log(`\n   Deployer: ${deployer.account!.address}`);

  // Get contract instance
  const contract = await viem.getContractAt("PrivateERC20", CONTRACT_ADDRESS);

  // Initialize iExec SDK
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  const ethProvider = utils.getSignerFromPrivateKey(
    "421614", // Arbitrum Sepolia chain ID
    privateKey
  );
  const iexec = new IExec({ ethProvider });

  // Fetch AppOrder
  console.log(`\n📖 Fetching AppOrder for app: ${APP_ADDRESS}...`);
  const appOrders = await iexec.orderbook.fetchAppOrderbook(APP_ADDRESS);
  
  if (appOrders.count === 0) {
    throw new Error("No app orders found in orderbook");
  }
  
  const firstAppOrder = appOrders.orders[0];
  console.log(`   ✅ Found ${appOrders.count} app order(s)`);
  console.log(`   Price: ${firstAppOrder.order.appprice}`);
  
  const appOrder = {
    app: firstAppOrder.order.app as `0x${string}`,
    appprice: BigInt(firstAppOrder.order.appprice),
    volume: BigInt(firstAppOrder.order.volume),
    tag: firstAppOrder.order.tag as `0x${string}`,
    datasetrestrict: firstAppOrder.order.datasetrestrict as `0x${string}`,
    workerpoolrestrict: firstAppOrder.order.workerpoolrestrict as `0x${string}`,
    requesterrestrict: firstAppOrder.order.requesterrestrict as `0x${string}`,
    salt: firstAppOrder.order.salt as `0x${string}`,
    sign: firstAppOrder.order.sign as `0x${string}`,
  };

  // Fetch WorkerpoolOrder
  console.log(`\n📖 Fetching WorkerpoolOrder for workerpool: ${WORKERPOOL_ADDRESS}...`);
  const workerpoolOrders = await iexec.orderbook.fetchWorkerpoolOrderbook({
    workerpool: WORKERPOOL_ADDRESS
  });
  
  if (workerpoolOrders.count === 0) {
    throw new Error("No workerpool orders found in orderbook");
  }
  
  const firstWorkerpoolOrder = workerpoolOrders.orders[0];
  console.log(`   ✅ Found ${workerpoolOrders.count} workerpool order(s)`);
  console.log(`   Price: ${firstWorkerpoolOrder.order.workerpoolprice}`);
  
  const workerpoolOrder = {
    workerpool: firstWorkerpoolOrder.order.workerpool as `0x${string}`,
    workerpoolprice: BigInt(firstWorkerpoolOrder.order.workerpoolprice),
    volume: BigInt(firstWorkerpoolOrder.order.volume),
    tag: firstWorkerpoolOrder.order.tag as `0x${string}`,
    category: BigInt(firstWorkerpoolOrder.order.category),
    trust: BigInt(firstWorkerpoolOrder.order.trust),
    apprestrict: firstWorkerpoolOrder.order.apprestrict as `0x${string}`,
    datasetrestrict: firstWorkerpoolOrder.order.datasetrestrict as `0x${string}`,
    requesterrestrict: firstWorkerpoolOrder.order.requesterrestrict as `0x${string}`,
    salt: firstWorkerpoolOrder.order.salt as `0x${string}`,
    sign: firstWorkerpoolOrder.order.sign as `0x${string}`,
  };

  // Create empty DatasetOrder (no dataset required)
  console.log(`\n📝 Creating empty DatasetOrder...`);
  const datasetOrder = {
    dataset: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    datasetprice: 0n,
    volume: 0n,
    tag: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    apprestrict: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    workerpoolrestrict: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    requesterrestrict: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    salt: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    sign: "0x" as `0x${string}`,
  };
  console.log("   ✅ Empty DatasetOrder created");

  // Store orders in contract
  console.log(`\n💾 Storing orders in contract...`);
  console.log(`   AppOrder app: ${appOrder.app}`);
  console.log(`   WorkerpoolOrder workerpool: ${workerpoolOrder.workerpool}`);
  console.log(`   DatasetOrder dataset: ${datasetOrder.dataset} (empty)`);

  const hash = await contract.write.storeOrders(
    [appOrder, workerpoolOrder, datasetOrder],
    {
      account: deployer.account!.address,
    }
  );

  console.log(`\n📝 Transaction submitted: ${hash}`);
  console.log(`   Waiting for confirmation...`);

  // Wait for transaction receipt
  const publicClient = await viem.getPublicClient();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === "success") {
    console.log(`\n✅ Orders stored successfully!`);
    console.log(`   Transaction: ${hash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed}`);
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

