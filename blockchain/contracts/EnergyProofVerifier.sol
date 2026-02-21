// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IEnergyProofVerifier.sol";

/**
 * @title EnergyProofVerifier (Mock)
 * @notice Placeholder that always returns true. Use for local dev until you run:
 *   cd blockchain/circuits && ./build.sh
 * then replace this file with the SnarkJS-generated Verifier.sol
 * (rename the contract to EnergyProofVerifier).
 *
 * Real verifier: proves amount_to_sell = total_solar - total_load without revealing solar/load.
 */
contract EnergyProofVerifier is IEnergyProofVerifier {
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[1] calldata
    ) external pure override returns (bool) {
        return true; // Mock: accept any proof for development
    }
}
