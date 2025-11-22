import { describe, it, before } from "node:test";
import { expect } from "chai";
import { network } from "hardhat";
import { PrivateKey } from "eciesjs";
import { toHex, parseEther } from "viem";
import {
  encryptAmount,
  decryptBalance,
  getRLCTokens,
  depositSRLC,
} from "./utils.js";
import PrivateERC20Module from "../ignition/modules/PrivateERC20.js";
import * as fs from "fs";
import * as path from "path";

// Load config
const configPath = path.join(process.cwd(), "config", "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const arbitrumConfig = config.chains.arbitrumSepolia;

// iExec addresses
const APP_ADDRESS = "0xbb21e58a72327a5fda6f5d3673f1fab6607aeab1";
const WORKERPOOL_ADDRESS = "0xb967057a21dc6a66a29721d96b8aa7454b7c383f";

describe("PrivateERC20 iExec Integration Test", async () => {
  // Connect to Arbitrum Sepolia fork
  const { viem, ignition } = await network.connect("arbitrumSepoliaFork");

  let iexec: any;
  let appOrder: any;
  let workerpoolOrder: any;

  // Fixture to deploy contract and setup environment
  async function deployFixture() {
    console.log("\n🔧 Setting up test environment on Arbitrum Sepolia fork...");

    // Generate encryption keypair
    const privateKey = new PrivateKey();
    const publicKey = privateKey.publicKey;
    const encryptionPublicKey = toHex(publicKey.toBytes());
    console.log(`\n🔐 Generated encryption keypair`);
    console.log(`   Public Key: ${encryptionPublicKey.substring(0, 20)}...`);

    // Get wallet clients
    const [deployer, user1, user2] = await viem.getWalletClients();
    console.log(`   Deployer: ${deployer.account!.address}`);
    console.log(`   User1: ${user1.account!.address}`);
    console.log(`   User2: ${user2.account!.address}`);

    // Deploy contract with Ignition (reads config automatically)
    console.log(`\n📦 Deploying PrivateERC20 contract...`);
    console.log(`   Chain: ${arbitrumConfig.name} (${arbitrumConfig.chainId})`);
    console.log(`   pocoAddress: ${arbitrumConfig.pocoAddress}`);
    console.log(`   pocoOAppRouter: ${arbitrumConfig.pocoOAppRouter}`);
    console.log(`   isArbitrum: ${arbitrumConfig.isArbitrum}`);

    const { privateERC20: token } = await ignition.deploy(PrivateERC20Module, {
      parameters: {
        PrivateERC20Module: {
          encryptionPublicKey,
        },
      },
    });

    console.log(`   ✅ Contract deployed at: ${await token.address}`);

    return { token, privateKey, publicKey, deployer, user1, user2 };
  }

  before(async () => {
    // Initialize iExec SDK once (dynamically import)
    console.log("\n🌐 Initializing iExec SDK...");
    // @ts-ignore - dynamic import, may not be installed
    const iexecModule = await import("iexec");
    const IExecClass = iexecModule.IExec;
    iexec = new IExecClass({
      ethProvider: "https://sepolia-rollup.arbitrum.io/rpc",
      // @ts-ignore - chainId config option
      chainId: "421614", // Arbitrum Sepolia
    } as any);
    console.log(`   ✅ iExec SDK initialized`);
  });

  it("should fetch AppOrder from iExec orderbook", async () => {
    console.log(`\n📖 Fetching AppOrder for app: ${APP_ADDRESS}`);

    if (!iexec) {
      throw new Error(
        "iExec SDK not initialized - cannot run integration test"
      );
    }

    // Fetch app orders from orderbook
    const appOrders = await iexec.orderbook.fetchAppOrderbook(APP_ADDRESS);

    expect(appOrders.count).to.be.greaterThan(
      0,
      "No app orders found in orderbook"
    );

    const firstOrder = appOrders.orders[0];
    console.log(`   ✅ Found ${appOrders.count} app order(s)`);
    console.log(`   Using order with price: ${firstOrder.order.appprice}`);

    appOrder = {
      app: firstOrder.order.app,
      appprice: BigInt(firstOrder.order.appprice),
      volume: BigInt(firstOrder.order.volume),
      tag: firstOrder.order.tag,
      datasetrestrict: firstOrder.order.datasetrestrict,
      workerpoolrestrict: firstOrder.order.workerpoolrestrict,
      requesterrestrict: firstOrder.order.requesterrestrict,
      salt: firstOrder.order.salt,
      sign: firstOrder.order.sign,
    };

    // Case-insensitive address comparison
    expect(appOrder.app.toLowerCase()).to.equal(APP_ADDRESS.toLowerCase());
    console.log(`   ✅ AppOrder ready`);
  });

  it("should fetch WorkerpoolOrder from iExec orderbook", async () => {
    console.log(
      `\n📖 Fetching WorkerpoolOrder for workerpool: ${WORKERPOOL_ADDRESS}`
    );

    if (!iexec) {
      throw new Error(
        "iExec SDK not initialized - cannot run integration test"
      );
    }

    // Fetch workerpool orders from orderbook
    const workerpoolOrders = await iexec.orderbook.fetchWorkerpoolOrderbook(
      WORKERPOOL_ADDRESS
    );

    expect(workerpoolOrders.count).to.be.greaterThan(
      0,
      "No workerpool orders found in orderbook"
    );

    const firstOrder = workerpoolOrders.orders[0];
    console.log(`   ✅ Found ${workerpoolOrders.count} workerpool order(s)`);
    console.log(
      `   Using order with price: ${firstOrder.order.workerpoolprice}`
    );

    workerpoolOrder = {
      workerpool: firstOrder.order.workerpool,
      workerpoolprice: BigInt(firstOrder.order.workerpoolprice),
      volume: BigInt(firstOrder.order.volume),
      tag: firstOrder.order.tag,
      category: BigInt(firstOrder.order.category),
      trust: BigInt(firstOrder.order.trust),
      apprestrict: firstOrder.order.apprestrict,
      datasetrestrict: firstOrder.order.datasetrestrict,
      requesterrestrict: firstOrder.order.requesterrestrict,
      salt: firstOrder.order.salt,
      sign: firstOrder.order.sign,
    };

    // Case-insensitive address comparison
    expect(workerpoolOrder.workerpool.toLowerCase()).to.equal(
      WORKERPOOL_ADDRESS.toLowerCase()
    );
    console.log(`   ✅ WorkerpoolOrder ready`);
  });

  it("should complete full transfer flow with iExec orders", async () => {
    const { token, privateKey, publicKey, deployer, user1, user2 } =
      await deployFixture();

    // Step 1: Store orders
    console.log(`\n💾 Storing orders in contract...`);
    const datasetOrder = {
      dataset: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      datasetprice: 0n,
      volume: 0n,
      tag: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      apprestrict:
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
      workerpoolrestrict:
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
      requesterrestrict:
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
      salt: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      sign: "0x" as `0x${string}`,
    };

    console.log(`   AppOrder app: ${appOrder.app}`);
    console.log(`   WorkerpoolOrder workerpool: ${workerpoolOrder.workerpool}`);
    console.log(`   DatasetOrder dataset: ${datasetOrder.dataset} (empty)`);

    await viem.assertions.emit(
      token.write.storeOrders([appOrder, workerpoolOrder, datasetOrder], {
        account: deployer.account!.address,
      }),
      token,
      "OrdersStored"
    );
    console.log(`   ✅ Orders stored successfully`);

    // Step 2: Mint tokens
    console.log(`\n🪙 Minting tokens to user1...`);
    const mintAmount = 1000n * 10n ** 18n;
    const encryptedMintAmount = encryptAmount(publicKey, mintAmount);

    await viem.assertions.emit(
      token.write.mint([user1.account!.address, encryptedMintAmount], {
        account: deployer.account!.address,
      }),
      token,
      "Mint"
    );

    const balance = await token.read.balanceOf([user1.account!.address]);
    const decrypted = decryptBalance(privateKey, balance);
    expect(decrypted).to.equal(mintAmount);
    console.log(`   ✅ Minted ${mintAmount / 10n ** 18n} tokens to user1`);

    // Step 3: Get RLC tokens for the deployer (on fork)
    console.log(`\n💰 Getting RLC tokens for deployer...`);
    await getRLCTokens(
      viem,
      arbitrumConfig.pocoAddress as `0x${string}`,
      deployer.account!.address,
      "10.0" // Get 10 RLC
    );

    // Step 4: Deposit sRLC for contract to pay for iExec computation
    console.log(`\n💰 Depositing sRLC for contract...`);
    await depositSRLC(
      viem,
      arbitrumConfig.pocoAddress as `0x${string}`,
      token.address,
      deployer,
      "1.0" // 1 RLC should be enough to cover the deal cost
    );

    // Step 5: Request transfer
    console.log(`\n🔄 Requesting transfer from user1 to user2...`);
    const transferAmount = 100n * 10n ** 18n;
    const encryptedTransferAmount = encryptAmount(publicKey, transferAmount);

    console.log(`   From: ${user1.account!.address}`);
    console.log(`   To: ${user2.account!.address}`);
    console.log(`   Amount: ${transferAmount / 10n ** 18n} tokens`);

    await viem.assertions.emit(
      token.write.transfer([user2.account!.address, encryptedTransferAmount], {
        account: user1.account!.address,
        value: parseEther("0.01"),
      }),
      token,
      "TransferRequested"
    );
    console.log(`   ✅ Transfer requested successfully`);
  });
});

