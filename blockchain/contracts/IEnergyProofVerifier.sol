// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IEnergyProofVerifier
 * @notice Interface for the zk-SNARK verifier used by AegisAMM.addLiquidityWithProof.
 *        Matches SnarkJS Groth16 export: verifyProof(pA, pB, pC, pubSignals).
 * @dev Public signal is uint256[1]: the proven amount_to_sell (excess energy).
 */
interface IEnergyProofVerifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals
    ) external view returns (bool);
}
