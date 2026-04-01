import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // Hardhat Account #0
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("Deploying contract with account:", wallet.address);

    const artifactPath = path.join(__dirname, "../artifacts/contracts/EduCred.sol/EduCred.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log("Deploying EduCred...");
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("✅ EduCred deployed to:", address);

    // Save to client EduCred.json
    const clientPath = path.join(__dirname, "../../client/src/EduCred.json");
    const clientContractPath = path.join(__dirname, "../../client/src/contracts/EduCred.json");
    const serverPath = path.join(__dirname, "../../server/utils/EduCred.json");
    
    const config = {
        contractAddress: address,
        abi: artifact.abi
    };

    fs.writeFileSync(clientPath, JSON.stringify(config, null, 2));
    fs.writeFileSync(clientContractPath, JSON.stringify(config, null, 2));
    fs.writeFileSync(serverPath, JSON.stringify(config, null, 2));
    
    console.log("Updated client configurations at:", clientPath, "and", clientContractPath);
    console.log("Updated server configuration at:", serverPath);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
