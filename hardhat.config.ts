import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatVerify],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  verify: {
    etherscan: {
      apiKey: "YOUR_ETHERSCAN_API_KEY",
    },
  },
  networks: {
    arbitrumSepolia: {
      type: "http",
      url: configVariable("ARBITRUM_SEPOLIA_RPC_URL"),
      accounts: [configVariable("ARBITRUM_SEPOLIA_PRIVATE_KEY")],
    },
  },
});
