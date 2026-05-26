const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("Deploying EduCred contract to Ganache...");

  // We get the contract to deploy
  const EduCred = await ethers.getContractFactory("EduCred");
  const eduCred = await EduCred.deploy();

  await eduCred.waitForDeployment();

  const contractAddress = await eduCred.getAddress();
  
  console.log("✅ EduCred deployed to:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
