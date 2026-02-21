// AegisGrid Phase 4: Zero-Knowledge Energy Surplus Proof
// Proves: amount_to_sell = total_solar - total_load
// without revealing total_solar or total_load to the blockchain.
//
// Private: household solar generation and load (smart meter data).
// Public:  amount of energy the prosumer is allowed to sell to the AMM.

pragma circom 2.0.0;

template EnergyProof() {
    // Private inputs (never sent on-chain)
    signal input total_solar;
    signal input total_load;

    // Public output (verified on-chain; prosumer sends this + proof)
    signal output amount_to_sell;

    // Constraint: excess energy equals solar minus load.
    // (Hackathon: assume total_solar >= total_load; frontend only calls when surplus.)
    amount_to_sell <== total_solar - total_load;
}

component main = EnergyProof();
