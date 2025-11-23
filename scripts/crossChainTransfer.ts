import { network } from "hardhat";
import { parseEther } from "viem";
import { encryptAmount } from "../test/utils.js";
import { IExec, utils } from 'iexec';

// Configuration from environment variables
const CONTRACT_ADDRESS_SEPOLIA = "0x9485fC2dffEb7dE828e68BbFA73efB51584417e1";
const RECIPIENT = "0xbabe8270ac9857af3aac06877888f1939fbec578";
const AMOUNT = process.env.AMOUNT || "100000000000000000000"; // Amount in wei (default: 100 tokens with 18 decimals)
const IEXEC_PAYMENT = process.env.IEXEC_PAYMENT || "0.01"; // ETH to send for iExec payment
const APP_ADDRESS = process.env.APP_ADDRESS as `0x${string}` || "0xbb21e58a72327a5fda6f5d3673f1fab6607aeab1";
const WORKERPOOL_ADDRESS = process.env.WORKERPOOL_ADDRESS as `0x${string}` || "0xb967057a21dc6a66a29721d96b8aa7454b7c383f";

/**
 * Private token transfer using iExec SDK for order management
 * 
 * This script demonstrates how to:
 * 1. Fetch app and workerpool orders from iExec orderbook
 * 2. Create and sign a request order using iExec SDK (instead of manageRequestOrder)
 * 3. Publish the signed request order to the iExec orderbook
 * 4. Call the transfer function on the PrivateERC20 token contract (Sepolia)
 * 5. Let iExec TEE workers match orders and process the encrypted transfer
 */
async function main() {
  // Validate required parameters
  if (!CONTRACT_ADDRESS_SEPOLIA) {
    throw new Error("CONTRACT_ADDRESS_SEPOLIA environment variable is required");
  }
  if (!RECIPIENT) {
    throw new Error("RECIPIENT environment variable is required");
  }

  console.log("\n🌉 Initiating private transfer with iExec...");
  console.log(`   Token Contract (Sepolia): ${CONTRACT_ADDRESS_SEPOLIA}`);
  console.log(`   Recipient: ${RECIPIENT}`);
  console.log(`   Amount: ${AMOUNT} wei (${BigInt(AMOUNT) / 10n ** 18n} tokens)`);
  console.log(`   iExec Payment: ${IEXEC_PAYMENT} ETH`);

  // ========================================
  // STEP 1: Initialize iExec SDK and fetch orders
  // ========================================
  console.log("\n📡 Step 1: Initializing iExec SDK...");
  
  // Initialize iExec SDK for fetching and signing orders
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  const ethProvider = utils.getSignerFromPrivateKey("421614", privateKey);
  const iexec = new IExec({ ethProvider });

  // Fetch AppOrder
  console.log("\n📖 Fetching AppOrder from iExec orderbook...");
  const appOrders = await iexec.orderbook.fetchAppOrderbook(APP_ADDRESS);
  if (appOrders.count === 0) {
    throw new Error("No app orders found in orderbook");
  }
  const firstAppOrder = appOrders.orders[0];
  console.log(`   ✅ Found ${appOrders.count} app order(s), price: ${firstAppOrder.order.appprice}`);

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
  console.log("\n📖 Fetching WorkerpoolOrder from iExec orderbook...");
  const workerpoolOrders = await iexec.orderbook.fetchWorkerpoolOrderbook({
    workerpool: WORKERPOOL_ADDRESS,
  });
  if (workerpoolOrders.count === 0) {
    throw new Error("No workerpool orders found in orderbook");
  }
  const firstWorkerpoolOrder = workerpoolOrders.orders[0];
  console.log(`   ✅ Found ${workerpoolOrders.count} workerpool order(s), price: ${firstWorkerpoolOrder.order.workerpoolprice}`);

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

  // ========================================
  // STEP 2: Connect to Sepolia and get token info
  // ========================================
  console.log("\n📡 Step 2: Connecting to Sepolia...");
  const sepoliaConnection = await network.connect("sepolia");
  const [sepoliaSigner] = await sepoliaConnection.viem.getWalletClients();
  console.log(`   Connected with: ${sepoliaSigner.account!.address}`);

  // Get token contract on Sepolia
  const tokenContract = await sepoliaConnection.viem.getContractAt(
    "PrivateERC20",
    CONTRACT_ADDRESS_SEPOLIA
  );

  // Get encryption public key from contract
  console.log("\n🔐 Fetching encryption public key from token contract...");
  const publicKeyBytes = await tokenContract.read.encryptionPublicKey();
  const publicKeyHex = publicKeyBytes as `0x${string}`;
  console.log(`   Public Key: ${publicKeyHex.substring(0, 20)}...`);

  // Amount is already in wei (18 decimals)
  const amountInWei = BigInt(AMOUNT);
  console.log(`   Amount in wei: ${amountInWei}`);

  // Encrypt the amount
  console.log("\n🔒 Encrypting transfer amount...");
  const encryptedAmount = encryptAmount(publicKeyHex, amountInWei);
  console.log(`   Encrypted: ${encryptedAmount.substring(0, 20)}...`);

  // ========================================
  // STEP 3: Create and sign request order using iExec SDK
  // ========================================
  console.log("\n🔏 Step 3: Creating and signing request order with iExec SDK...");
  
  // Helper function to convert address to string
  const addressToString = (addr: string): string => {
    return addr.toLowerCase();
  };

  // Build transfer params (format: encrypteddata sender recipient)
  const transferParams = `${encryptedAmount} ${addressToString(sepoliaSigner.account!.address)} ${addressToString(RECIPIENT)}`;
  
  // Create request order using iExec SDK
  console.log(`   Creating request order...`);
  const requestOrderToSign = await iexec.order.createRequestorder({
    app: appOrder.app,
    appmaxprice: appOrder.appprice.toString(),
    dataset: "0x0000000000000000000000000000000000000000",
    datasetmaxprice: "0",
    workerpool: workerpoolOrder.workerpool,
    workerpoolmaxprice: workerpoolOrder.workerpoolprice.toString(),
    requester: sepoliaSigner.account!.address,
    volume: 1,
    tag: appOrder.tag,
    category: Number(workerpoolOrder.category),
    trust: Number(workerpoolOrder.trust),
    beneficiary: CONTRACT_ADDRESS_SEPOLIA,
    callback: CONTRACT_ADDRESS_SEPOLIA,
    params: transferParams,
  });

  console.log(`   ✅ Request order created`);
  console.log(`     - App: ${requestOrderToSign.app}`);
  console.log(`     - Workerpool: ${requestOrderToSign.workerpool}`);
  console.log(`     - Requester: ${requestOrderToSign.requester}`);
  console.log(`     - Category: ${requestOrderToSign.category}`);
  console.log(`     - Params: ${String(requestOrderToSign.params).substring(0, 50)}...`);
  
  console.log(`\n   Signing request order...`);
  
  // Sign the request order using iExec SDK
  const signedRequestOrder = await iexec.order.signRequestorder(requestOrderToSign);
  
  console.log(`   ✅ Request order signed!`);
  console.log(`     - Salt: ${signedRequestOrder.salt.substring(0, 20)}...`);
  console.log(`     - Signature: ${signedRequestOrder.sign.substring(0, 20)}...`);

  // ========================================
  // STEP 4: Call transfer on Sepolia
  // ========================================
  console.log("\n📤 Step 4: Calling transfer on Sepolia token contract...");
  console.log(`   Note: The signed request order will be used when matchOrders is called`);
  
  const transferHash = await tokenContract.write.transfer(
    [RECIPIENT, encryptedAmount],
    {
      account: sepoliaSigner.account!.address,
      value: parseEther(IEXEC_PAYMENT),
    }
  );

  console.log(`\n📝 Transfer transaction submitted: ${transferHash}`);
  console.log(`   Waiting for confirmation...`);

  const sepoliaPublicClient = await sepoliaConnection.viem.getPublicClient();
  const transferReceipt = await sepoliaPublicClient.waitForTransactionReceipt({ 
    hash: transferHash 
  });

  if (transferReceipt.status === "success") {
    console.log(`\n✅ Transfer requested successfully on Sepolia!`);
    console.log(`   Transaction: ${transferHash}`);
    console.log(`   LayerZero Scan: https://testnet.layerzeroscan.com/tx/${transferHash}\n`);
    console.log(`\n   📋 The transfer will be processed by iExec TEE`);
    console.log(`   🔍 Monitor the TransferRequested event for the dealId`);
    console.log(`   ⏳ After computation completes, the balances will be updated`);
  } else {
    throw new Error("Transfer transaction failed");
  }

  console.log("\n🎉 Transfer initiated successfully!");
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  });

