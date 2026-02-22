import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy GridiumAMM
  const AMM = await ethers.getContractFactory("GridiumAMM");
  const amm = await AMM.deploy();
  await amm.waitForDeployment();
  console.log("GridiumAMM deployed to:", await amm.getAddress());

  // Deploy 15 Prosumer Nodes
  const Prosumer = await ethers.getContractFactory("ProsumerNode");
  for (let i = 0; i < 15; i++) {
    const node = await Prosumer.deploy(await amm.getAddress(), `Node-${i}`);
    await node.waitForDeployment();
    console.log(`Node-${i} deployed to:`, await node.getAddress());
  }

  // Deploy ZK Verifier
  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  console.log("ZK Verifier deployed to:", await verifier.getAddress());

  console.log("\n✅ All contracts deployed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
