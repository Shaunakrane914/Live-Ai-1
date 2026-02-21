# AegisGrid Phase 4: zk-SNARK Energy Proof

Circuit proves **amount_to_sell = total_solar - total_load** without revealing `total_solar` or `total_load`.

## Prerequisites

- **Node.js** (v14+)
- **Circom** (compiler): https://docs.circom.io/getting-started/installation/
- **SnarkJS**: `npm install -g snarkjs`

## Terminal Execution Steps (SnarkJS Pipeline)

Run these from the `blockchain/circuits` directory.

### 1. Compile the circuit (R1CS + WASM + symbols)

```bash
circom energy_proof.circom --r1cs --wasm --sym -o .
```

You should see: `energy_proof.r1cs`, `energy_proof_js/` (WASM + witness generator), `energy_proof.sym`.

### 2. Download Powers of Tau (trusted setup phase 1)

Use a small ceremony file for this circuit size (e.g. 12 = 2^12 constraints is plenty):

```bash
# Option A: wget (Linux/macOS/Git Bash)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau -O pot12.ptau

# Option B: curl (Windows PowerShell)
# Invoke-WebRequest -Uri "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau" -OutFile pot12.ptau
```

If the URL is unavailable, run a local phase-1 (slower):

```bash
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="AegisGrid" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12.ptau -v
```

### 3. Groth16 trusted setup (phase 2)

```bash
snarkjs groth16 setup energy_proof.r1cs pot12.ptau energy_proof_0000.zkey
snarkjs zkey contribute energy_proof_0000.zkey energy_proof_0001.zkey --name="AegisGrid phase2" -v
```

### 4. Export verification key (optional, for off-chain verification)

```bash
snarkjs zkey export verificationkey energy_proof_0001.zkey verification_key.json
```

### 5. Export Verifier.sol (for AegisAMM integration)

```bash
snarkjs zkey export solidityverifier energy_proof_0001.zkey ../contracts/EnergyProofVerifier.sol
```

This writes `EnergyProofVerifier.sol` into `blockchain/contracts/`. The generated contract is usually named `Groth16Verifier`; if so, either rename it to `EnergyProofVerifier` in that file, or update `AegisAMM.sol` to use the generated contract name.

### 6. Generate a test witness and proof (optional)

```bash
# Create input file (amount_to_sell will be 5.0 kWh; private: solar=10, load=5)
echo '{"total_solar": "10", "total_load": "5"}' > input.json

# Compute witness
node energy_proof_js/generate_witness.js energy_proof_js/energy_proof.wasm input.json witness.wtns

# Generate proof
snarkjs groth16 prove energy_proof_0001.zkey witness.wtns proof.json public.json

# Verify (off-chain)
snarkjs groth16 verify verification_key.json public.json proof.json
```

---

## Integration with AegisAMM

- **addLiquidity(energyIn, stableIn)** — unchanged; no proof (e.g. initial seed or non-privacy path).
- **addLiquidityWithProof(amountToSell, stableIn, proof)** — requires a valid zk-SNARK proof that the caller has at least `amountToSell` excess energy (i.e. the circuit’s public output). The contract verifies the proof then adds `amountToSell` energy + `stableIn` stable to the pool.

Private inputs (`total_solar`, `total_load`) stay on the prosumer device; only `amount_to_sell` and the proof are sent on-chain.
