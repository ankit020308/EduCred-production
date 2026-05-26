import hre from "hardhat";
const { ethers } = hre;
import fs from "fs";
import path from "path";

async function main() {
    console.log("🚀 Deploying EduCred...");

    const EduCred = await ethers.getContractFactory("EduCred");
    const contract = await EduCred.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("✅ EduCred deployed to:", address);

    // Save metadata for the backend
    const artifactPath = path.resolve("artifacts/contracts/EduCred.sol/EduCred.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

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
