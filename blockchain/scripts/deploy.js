const { ethers } = require("hardhat");

async function main() {
    console.log("Initiating Phase 2 Deployment Sequence...");

    // ── 1. Fetch local testnet signers ──────────────────────────────
    // Hardhat node pre-funds 20 wallets. We reserve index 1 for the Python DDPG Oracle.
    const [deployer, oracleWallet, prosumer1, prosumer2] = await ethers.getSigners();
    console.log(`[SYSTEM] Admin Deployer : ${deployer.address}`);
    console.log(`[SYSTEM] Python AI Oracle: ${oracleWallet.address}`);
    console.log(`[SYSTEM] Prosumer 1     : ${prosumer1.address}`);
    console.log(`[SYSTEM] Prosumer 2     : ${prosumer2.address}`);

    // ── 2. Deploy the Asset Layer (ERC-1155) ─────────────────────────
    // EnergyToken constructor: (string memory uri_)
    // The URI is a metadata template — {id} will be replaced by the token ID client-side
    const EnergyToken = await ethers.getContractFactory("EnergyToken");
    const energyToken = await EnergyToken.deploy(
        "https://aegisgrid.local/api/token/{id}.json"
    );
    await energyToken.waitForDeployment();
    const tokenAddress = await energyToken.getAddress();
    console.log(`\n✅ [ASSET LAYER]  EnergyToken deployed at: ${tokenAddress}`);

    // ── 3. Deploy the Market Layer (AMM) ─────────────────────────────
    // AegisAMM constructor: (address tokenAddress, uint256 initialFeeBPS)
    // Starting fee = 134 bps = 1.34% (matches Python physics default)
    const AegisAMM = await ethers.getContractFactory("AegisAMM");
    const aegisAMM = await AegisAMM.deploy(tokenAddress, 134);
    await aegisAMM.waitForDeployment();
    const ammAddress = await aegisAMM.getAddress();
    console.log(`✅ [MARKET LAYER] AegisAMM deployed at:    ${ammAddress}`);

    // ── 4. Grant Oracle roles to the Python AI wallet ─────────────────
    // EnergyToken: give oracle MINTER_ROLE (to mint LP shares) + ORACLE_ROLE
    const MINTER_ROLE = ethers.id("MINTER_ROLE");
    const ORACLE_ROLE = ethers.id("ORACLE_ROLE");

    await energyToken.grantRole(MINTER_ROLE, oracleWallet.address);
    await energyToken.grantRole(ORACLE_ROLE, oracleWallet.address);
    // AegisAMM already grants RL_OPERATOR_ROLE and ORACLE_ROLE to deployer
    // Grant them to the oracleWallet too so Python can call updateSwapFee()
    const RL_OPERATOR_ROLE = ethers.id("RL_OPERATOR_ROLE");
    await aegisAMM.grantRole(RL_OPERATOR_ROLE, oracleWallet.address);
    await aegisAMM.grantRole(ORACLE_ROLE, oracleWallet.address);

    console.log(`\n✅ [ROLES] Oracle wallet granted:`);
    console.log(`   • EnergyToken.MINTER_ROLE`);
    console.log(`   • EnergyToken.ORACLE_ROLE`);
    console.log(`   • AegisAMM.RL_OPERATOR_ROLE  (DDPG fee updates)`);
    console.log(`   • AegisAMM.ORACLE_ROLE       (slashing)`);

    // ── 5. Seed the AMM with initial liquidity from the deployer ──────
    // Mint tokens to deployer first, then add to pool
    const ENERGY_ID = 1;
    const STABLE_ID = 0;
    const INITIAL_ENERGY = ethers.parseUnits("5000", 0);  // 5000 kWh tokens
    const INITIAL_STABLE = ethers.parseUnits("421", 0);   // 421 USDC tokens

    await energyToken.mint(deployer.address, ENERGY_ID, INITIAL_ENERGY, "0x");
    await energyToken.mint(deployer.address, STABLE_ID, INITIAL_STABLE, "0x");
    console.log(`\n✅ [MINT]  Seeded deployer with initial tokens`);

    // Approve AMM to pull tokens from deployer, then add liquidity
    await energyToken.setApprovalForAll(ammAddress, true);
    const tx = await aegisAMM.addLiquidity(INITIAL_ENERGY, INITIAL_STABLE);
    await tx.wait();
    const [x, y, k] = await Promise.all([
        aegisAMM.energyReserve(),
        aegisAMM.stableReserve(),
        aegisAMM.k(),
    ]);
    console.log(`✅ [POOL]  Liquidity seeded:`);
    console.log(`   x (energy) = ${x.toString()} kWh`);
    console.log(`   y (stable) = ${y.toString()} USDC`);
    console.log(`   k          = ${k.toString()}`);
    console.log(`   spot price = ${(Number(y) / Number(x)).toFixed(6)} USDC/kWh`);

    // ── 6. Print deployment summary ───────────────────────────────────
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  AEGISGRID PHASE 2 — DEPLOYMENT COMPLETE                     ║
╠══════════════════════════════════════════════════════════════╣
║  EnergyToken : ${tokenAddress}  ║
║  AegisAMM   : ${ammAddress}  ║
╠══════════════════════════════════════════════════════════════╣
║  Oracle Wallet (Index 1):                                    ║
║  ${oracleWallet.address}                    ║
╠══════════════════════════════════════════════════════════════╣
║  ⚠️  NEXT STEP: Paste AegisAMM address into physics_oracle.py ║
╚══════════════════════════════════════════════════════════════╝
`);

    // ── 7. Write deployment info to JSON for Python to consume ────────
    const fs = require("fs");
    const deploymentInfo = {
        network: "localhost",
        chainId: 31337,
        deployedAt: new Date().toISOString(),
        contracts: {
            EnergyToken: tokenAddress,
            AegisAMM: ammAddress,
        },
        wallets: {
            deployer: deployer.address,
            oracle: oracleWallet.address,
            prosumer1: prosumer1.address,
            prosumer2: prosumer2.address,
        },
        initialPool: {
            energyReserve: x.toString(),
            stableReserve: y.toString(),
            k: k.toString(),
        },
    };

    fs.writeFileSync(
        "../ai-engine/deployment.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("✅ [FILE]  deployment.json written to ai-engine/deployment.json");
    console.log("           Python OracleBridge will auto-load this on next start.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
