import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

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
  // Load config for defaults
  const configPath = path.join(process.cwd(), "config", "config.json");
  const config: Config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  // Get network from environment variable, default to arbitrumSepolia
  const networkEnv = process.env.DEPLOY_NETWORK || "arbitrumSepolia";

  // Map network names to config keys
  const networkConfigMap: { [key: string]: string } = {
    sepolia: "sepolia",
    sepoliaFork: "sepolia",
    baseSepolia: "baseSepolia",
    baseSepoliaFork: "baseSepolia",
    arbitrumSepolia: "arbitrumSepolia",
    arbitrumSepoliaFork: "arbitrumSepolia",
  };

  const configKey = networkConfigMap[networkEnv] || "arbitrumSepolia";
  const defaultConfig =
    config.chains[configKey] || config.chains.arbitrumSepolia;

  // Get parameters from config with ability to override
  const tokenName = m.getParameter("name", config.tokenConfig.name);
  const tokenSymbol = m.getParameter("symbol", config.tokenConfig.symbol);
  const decimals = m.getParameter("decimals", config.tokenConfig.decimals);

  console.log(`\n🌐 Deploying PrivateERC20 with Ignition...`);
  console.log(`   Network (from env): ${networkEnv}`);
  console.log(
    `   Chain config: ${defaultConfig.name} (${defaultConfig.chainId})`
  );
  console.log(
    `   Token: ${config.tokenConfig.name} (${config.tokenConfig.symbol})`
  );

  // Get chain-specific parameters (with defaults from Arbitrum Sepolia)
  // Override these via --parameters for other networks
  const pocoOAppRouter = m.getParameter(
    "pocoOAppRouter",
    defaultConfig.pocoOAppRouter
  ) as unknown as string;
  const pocoAddress = m.getParameter(
    "pocoAddress",
    defaultConfig.pocoAddress
  ) as unknown as string;
  const isArbitrum = m.getParameter(
    "isArbitrum",
    defaultConfig.isArbitrum
  ) as unknown as boolean;
  const lzOptions = m.getParameter(
    "lzOptions",
    defaultConfig.lzOptions
  ) as unknown as string;

  // Handle encryption key
  // Allow passing as parameter (for tests) or from environment variable (for production)
  const encryptionPublicKey = m.getParameter(
    "encryptionPublicKey",
    process.env.ENCRYPTION_PUBLIC_KEY || ""
  ) as unknown as string;

  if (!encryptionPublicKey) {
    throw new Error(
      "ENCRYPTION_PUBLIC_KEY environment variable or parameter is required"
    );
  }

  console.log(`   🔐 Using encryption public key`);

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
