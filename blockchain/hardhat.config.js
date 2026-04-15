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
      url: process.env.RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    }
  }
};
