import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🚀 Deploying EduCred (Pure Ethers)...");

    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // Account #0 from local hardhat node
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const wallet = new ethers.Wallet(privateKey, provider);

    const artifactPath = path.resolve("artifacts/contracts/EduCred.sol/EduCred.json");
    if (!fs.existsSync(artifactPath)) {
        console.error("❌ Artifact not found. Run 'npx hardhat compile' first.");
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("✅ EduCred deployed to:", address);

    const metadata = {
        abi: artifact.abi,
        contractAddress: address
    };

    // Save to server
    const serverOutputPath = path.resolve("../server/utils/EduCred.json");
    fs.writeFileSync(serverOutputPath, JSON.stringify(metadata, null, 2));
    console.log("💾 Metadata saved to server:", serverOutputPath);

    // Save to client
    const clientOutputPath = path.resolve("../client/src/contracts/EduCred.json");
    fs.writeFileSync(clientOutputPath, JSON.stringify(metadata, null, 2));
    console.log("💾 Metadata saved to client:", clientOutputPath);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
