#!/usr/bin/env bash
# AegisGrid Phase 4 — Build zk-SNARK circuit and export Verifier.sol
# Run from: blockchain/circuits/
# Requires: circom, snarkjs (npm install -g snarkjs)

set -e
echo "[1/6] Compiling energy_proof.circom..."
circom energy_proof.circom --r1cs --wasm --sym -o .

PTAU="pot12.ptau"
if [ ! -f "$PTAU" ]; then
  echo "[2/6] Downloading Powers of Tau (12)..."
  curl -L -o "$PTAU" "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau" || {
    echo "Download failed. Run manual phase-1 (see README.md)."
    exit 1
  }
else
  echo "[2/6] Using existing $PTAU"
fi

echo "[3/6] Groth16 setup..."
snarkjs groth16 setup energy_proof.r1cs "$PTAU" energy_proof_0000.zkey
echo "[4/6] Contribute to phase 2..."
snarkjs zkey contribute energy_proof_0000.zkey energy_proof_0001.zkey --name="AegisGrid" -v
echo "[5/6] Export verification key..."
snarkjs zkey export verificationkey energy_proof_0001.zkey verification_key.json
echo "[6/6] Export Solidity verifier..."
snarkjs zkey export solidityverifier energy_proof_0001.zkey ../contracts/EnergyProofVerifier.sol

echo "Done. Verifier written to ../contracts/EnergyProofVerifier.sol"
echo "If the contract is named Groth16Verifier, rename it to EnergyProofVerifier or update AegisAMM.sol."
