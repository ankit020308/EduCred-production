import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // Default first account from Ganache --wallet.deterministic
    const wallet = new ethers.Wallet("0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d", provider);

    const artifactPath = path.resolve("artifacts/contracts/EduCred.sol/EduCred.json");
    if (!fs.existsSync(artifactPath)) {
        console.error("❌ Artifact not found. Run 'npx hardhat compile' first.");
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    console.log("🚀 Deploying EduCred...");
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("✅ EduCred deployed to:", address);

    // Save metadata for the backend
    const metadata = {
        abi: artifact.abi,
        contractAddress: address
    };

    const outputPath = path.resolve("../server/utils/EduCred.json");
    fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
    console.log("💾 Metadata saved to:", outputPath);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
