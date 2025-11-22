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
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
  networks: {
    // ================================
    // Forked Networks (local simulation with real state)
    // ================================

    // Fork Sepolia locally for testing
    sepoliaFork: {
      type: "edr-simulated",
      chainType: "l1",
      forking: {
        url: configVariable("SEPOLIA_RPC_URL"),
      },
    },

    // Fork Base Sepolia locally
    baseSepoliaFork: {
      type: "edr-simulated",
      chainType: "op", // Base is OP Stack
      forking: {
        url: configVariable("BASE_SEPOLIA_RPC_URL"),
        blockNumber: 18000000, // Use older block to avoid base fee params v1 issue
      },
    },

    // Fork Arbitrum Sepolia locally
    arbitrumSepoliaFork: {
      type: "edr-simulated",
      chainType: "generic", // Arbitrum uses Nitro, not OP Stack
      forking: {
        url: configVariable("ARBITRUM_SEPOLIA_RPC_URL"),
      },
    },

    // ================================
    // Live Testnets (HTTP/JSON-RPC)
    // ================================

    // Ethereum Sepolia
    sepolia: {
      type: "http",
      chainType: "l1",
      chainId: 11155111,
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
    },

    // Base Sepolia (OP Stack L2)
    baseSepolia: {
      type: "http",
      chainType: "op",
      chainId: 84532,
      url: configVariable("BASE_SEPOLIA_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
    },

    // Arbitrum Sepolia
    arbitrumSepolia: {
      type: "http",
      chainType: "generic",
      chainId: 421614,
      url: configVariable("ARBITRUM_SEPOLIA_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },
});