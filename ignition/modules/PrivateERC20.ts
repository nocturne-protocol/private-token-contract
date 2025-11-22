import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { PrivateKey } from "eciesjs";
import { toHex } from "viem";
import * as fs from "fs";
import * as path from "path";

interface ChainConfig {
  name: string;
  chainId: number;
  isArbitrum: boolean;
  pocoOAppRouter: string;
  pocoAddress: string;
  lzOptions: string;
  lzOptionsGas: number;
}

interface Config {
  chains: {
    [key: string]: ChainConfig;
  };
  tokenConfig: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

const PrivateERC20Module = buildModule("PrivateERC20Module", (m) => {
  // Load config
  const configPath = path.join(process.cwd(), "config", "config.json");
  const config: Config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  // Get parameters from config with ability to override
  const tokenName = m.getParameter("name", config.tokenConfig.name);
  const tokenSymbol = m.getParameter("symbol", config.tokenConfig.symbol);
  const decimals = m.getParameter("decimals", config.tokenConfig.decimals);

  // Get chain ID from network context
  const chainId = m.getParameter("chainId") as unknown as number;

  // Find chain config
  let chainConfig: ChainConfig | undefined;
  for (const cfg of Object.values(config.chains)) {
    if (cfg.chainId === chainId) {
      chainConfig = cfg;
      break;
    }
  }

  if (!chainConfig) {
    throw new Error(
      `No configuration found for chainId ${chainId}. Please add it to config/config.json`
    );
  }

  console.log(`\n🌐 Deploying to: ${chainConfig.name} (chainId: ${chainId})`);
  console.log(`   isArbitrum: ${chainConfig.isArbitrum}`);
  console.log(`   pocoOAppRouter: ${chainConfig.pocoOAppRouter}`);
  console.log(`   pocoAddress: ${chainConfig.pocoAddress}`);

  // Get chain-specific parameters (allow override)
  const pocoOAppRouter = m.getParameter(
    "pocoOAppRouter",
    chainConfig.pocoOAppRouter
  ) as unknown as string;
  const pocoAddress = m.getParameter(
    "pocoAddress",
    chainConfig.pocoAddress
  ) as unknown as string;
  const isArbitrum = m.getParameter(
    "isArbitrum",
    chainConfig.isArbitrum
  ) as unknown as boolean;
  const lzOptions = m.getParameter(
    "lzOptions",
    chainConfig.lzOptions
  ) as unknown as string;

  // Handle encryption key
  let encryptionPublicKey: string;
  let generatedPrivateKey: PrivateKey | undefined;

  // Check if provided as parameter
  const providedKey = m.getParameter(
    "encryptionPublicKey",
    ""
  ) as unknown as string;

  if (providedKey && providedKey !== "" && providedKey !== "0x") {
    encryptionPublicKey = providedKey;
    console.log("\n🔐 Using provided encryption public key");
    console.log(`   Public Key: ${encryptionPublicKey}`);
  } else {
    // Generate new keypair
    generatedPrivateKey = new PrivateKey();
    encryptionPublicKey = toHex(generatedPrivateKey.publicKey.toBytes());
    console.log("\n🔐 Generated new encryption keypair:");
    console.log(`   Private Key: ${generatedPrivateKey.toHex()}`);
    console.log(`   Public Key:  ${encryptionPublicKey}`);
    console.warn(
      "   ⚠️  Save the private key securely - it cannot be recovered!"
    );
  }

  console.log(`\n📦 Token Configuration:`);
  console.log(`   Name: ${tokenName}`);
  console.log(`   Symbol: ${tokenSymbol}`);
  console.log(`   Decimals: ${decimals}`);

  // Deploy contract
  const privateERC20 = m.contract("PrivateERC20", [
    tokenName,
    tokenSymbol,
    decimals,
    encryptionPublicKey,
    pocoOAppRouter,
    pocoAddress,
    isArbitrum,
    lzOptions,
  ]);

  return { privateERC20 };
});

export default PrivateERC20Module;
