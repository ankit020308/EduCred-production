import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "shanghai",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    node: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 1337
    },
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      type: "http",
      url: process.env.RPC_URL || "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    },
    amoy: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002
    },
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137
    }
  }
};

if (
  (process.env.HARDHAT_NETWORK === 'amoy' || process.env.HARDHAT_NETWORK === 'polygon') &&
  !process.env.POLYGON_RPC_URL
) {
  console.warn('[hardhat] WARNING: POLYGON_RPC_URL is not set. Polygon deployment will fail.');
}
