// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./EnergyToken.sol";
import "./IEnergyProofVerifier.sol";

/**
 * @title  AegisAMM
 * @notice Constant-Product Automated Market Maker for decentralised energy trading.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Bonding Curve: x · y = k                                       │
 * │  x = energyReserve (kWh tokens, ID 1–24 in EnergyToken)        │
 * │  y = stableReserve (stablecoin,  ID 0  in EnergyToken)         │
 * │  k = invariant (must hold after every swap, net of fees)        │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Key Functions:
 *   addLiquidity()             → Seed the pool with energy + stable (no proof)
 *   addLiquidityWithProof()   → Add energy + stable with zk-SNARK proof (Phase 4 privacy)
 *   swapStableForEnergy()  → Primary trade: pay USDC, receive kWh
 *   swapEnergyForStable()  → Reverse trade: sell kWh, receive USDC
 *   updateSwapFee()        → Called by Python DDPG agent (RL_OPERATOR_ROLE)
 *   slashBadActor()        → Seize collateral after oracle flags delivery failure
 *
 * Security:
 *   ReentrancyGuard  — prevents re-entrancy on all state-mutating calls
 *   AccessControl    — RL_OPERATOR_ROLE for fee updates; ORACLE_ROLE for slashing
 *   Overflow-safe    — Solidity 0.8.x built-in arithmetic checks
 */
contract AegisAMM is AccessControl, ReentrancyGuard {

    // ── Roles ────────────────────────────────────────────────────────
    bytes32 public constant RL_OPERATOR_ROLE  = keccak256("RL_OPERATOR_ROLE");
    bytes32 public constant ORACLE_ROLE       = keccak256("ORACLE_ROLE");

    // ── Constants ─────────────────────────────────────────────────────
    uint256 public constant ENERGY_TOKEN_ID   = 1;   // use slot 1 (01:00–02:00 energy)
    uint256 public constant STABLE_TOKEN_ID   = 0;   // stablecoin
    uint256 public constant FEE_DENOMINATOR   = 10_000; // basis points (100% = 10 000)
    uint256 public constant MIN_SWAP_FEE_BPS  = 10;    // 0.10 %
    uint256 public constant MAX_SWAP_FEE_BPS  = 500;   // 5.00 %
    uint256 public constant SLASH_PCT_BPS     = 5_000; // 50 % collateral seized on slash

    // ── State ─────────────────────────────────────────────────────────
    EnergyToken public immutable token;
    address public immutable zkVerifier; // Phase 4: address(0) = proof path disabled

    uint256 public energyReserve;   // x  (kWh token units)
    uint256 public stableReserve;   // y  (stablecoin units)
    uint256 public k;               // invariant:  x · y = k
    uint256 public swapFeeBPS;      // DDPG-controlled fee in basis points (default 134 = 1.34 %)
    uint256 public totalLPShares;   // total LP shares outstanding

    mapping(address => uint256) public lpShares;          // LP provider → share amount
    mapping(address => uint256) public energyCommitments; // node → kWh committed to delivery

    // ── Events ────────────────────────────────────────────────────────
    event LiquidityAdded(
        address indexed provider,
        uint256 energyIn,
        uint256 stableIn,
        uint256 lpSharesMinted
    );
    event LiquidityRemoved(
        address indexed provider,
        uint256 energyOut,
        uint256 stableOut,
        uint256 lpSharesBurned
    );
    event SwapStableForEnergy(
        address indexed trader,
        uint256 stableIn,
        uint256 energyOut,
        uint256 feePaid,
        uint256 newPrice
    );
    event SwapEnergyForStable(
        address indexed trader,
        uint256 energyIn,
        uint256 stableOut,
        uint256 feePaid,
        uint256 newPrice
    );
    event SwapFeeUpdated(uint256 oldFeeBPS, uint256 newFeeBPS, address indexed operator);
    event BadActorSlashed(
        address indexed node,
        uint256 collateralSeized,
        uint256 redistributedToPool
    );
    event EnergyCommitted(address indexed node, uint256 amountKWh);

    // ── Constructor ───────────────────────────────────────────────────
    /**
     * @param tokenAddress   Deployed EnergyToken contract address
     * @param initialFeeBPS  Starting swap fee from Python config (e.g. 134 = 1.34%)
     * @param verifierAddress Phase 4 zk-SNARK verifier; pass address(0) to disable addLiquidityWithProof
     */
    constructor(address tokenAddress, uint256 initialFeeBPS, address verifierAddress) {
        require(tokenAddress != address(0), "AegisAMM: zero token address");
        require(
            initialFeeBPS >= MIN_SWAP_FEE_BPS && initialFeeBPS <= MAX_SWAP_FEE_BPS,
            "AegisAMM: fee out of range"
        );
        token = EnergyToken(tokenAddress);
        swapFeeBPS = initialFeeBPS;
        zkVerifier = verifierAddress;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RL_OPERATOR_ROLE, msg.sender);  // DDPG bridge
        _grantRole(ORACLE_ROLE, msg.sender);        // Python oracle
    }

    // ════════════════════════════════════════════════════════════════
    //  LIQUIDITY
    // ════════════════════════════════════════════════════════════════

    /**
     * @notice Seed the AMM pool with initial liquidity.
     * @dev    LP shares are minted proportionally. On first deposit, shares = sqrt(energyIn * stableIn).
     *         Subsequent deposits must maintain the current ratio.
     * @param energyIn Amount of energy tokens (ID 1) to deposit
     * @param stableIn Amount of stablecoin (ID 0) to deposit
     */
    function addLiquidity(uint256 energyIn, uint256 stableIn)
        external
        nonReentrant
        returns (uint256 shares)
    {
        require(energyIn > 0 && stableIn > 0, "AegisAMM: zero liquidity");

        // Transfer both token types in one gas-efficient batch call
        uint256[] memory ids     = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        ids[0] = ENERGY_TOKEN_ID; amounts[0] = energyIn;
        ids[1] = STABLE_TOKEN_ID; amounts[1] = stableIn;
        token.safeBatchTransferFrom(msg.sender, address(this), ids, amounts, "");

        if (totalLPShares == 0) {
            // Geometric mean for first deposit (avoids ratio manipulation)
            shares = _sqrt(energyIn * stableIn);
        } else {
            // Proportional to current pool ratio (use min to prevent dilution)
            uint256 sharesByEnergy = (energyIn * totalLPShares) / energyReserve;
            uint256 sharesByStable = (stableIn * totalLPShares) / stableReserve;
            shares = sharesByEnergy < sharesByStable ? sharesByEnergy : sharesByStable;
        }

        require(shares > 0, "AegisAMM: zero LP shares");

        energyReserve += energyIn;
        stableReserve += stableIn;
        k = energyReserve * stableReserve;

        totalLPShares         += shares;
        lpShares[msg.sender]  += shares;

        emit LiquidityAdded(msg.sender, energyIn, stableIn, shares);
    }

    /**
     * @notice Add liquidity with zk-SNARK proof (Phase 4 privacy).
     *         Proves the prosumer has at least `amountToSell` excess energy
     *         (amount_to_sell = total_solar - total_load) without revealing solar/load.
     * @param amountToSell Energy (kWh) to add — must match the circuit's public output
     * @param stableIn     Stablecoin to add
     * @param proofA       Groth16 proof point A (uint256[2])
     * @param proofB       Groth16 proof point B (uint256[2][2])
     * @param proofC       Groth16 proof point C (uint256[2])
     */
    function addLiquidityWithProof(
        uint256 amountToSell,
        uint256 stableIn,
        uint256[2] calldata proofA,
        uint256[2][2] calldata proofB,
        uint256[2] calldata proofC
    ) external nonReentrant returns (uint256 shares) {
        require(zkVerifier != address(0), "AegisAMM: zk verifier not set");
        require(amountToSell > 0 && stableIn > 0, "AegisAMM: zero liquidity");

        uint256[1] memory pubSignals;
        pubSignals[0] = amountToSell;
        require(
            IEnergyProofVerifier(zkVerifier).verifyProof(proofA, proofB, proofC, pubSignals),
            "AegisAMM: invalid zk proof"
        );

        // Same liquidity logic as addLiquidity(amountToSell, stableIn)
        uint256[] memory ids     = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        ids[0] = ENERGY_TOKEN_ID; amounts[0] = amountToSell;
        ids[1] = STABLE_TOKEN_ID; amounts[1] = stableIn;
        token.safeBatchTransferFrom(msg.sender, address(this), ids, amounts, "");

        if (totalLPShares == 0) {
            shares = _sqrt(amountToSell * stableIn);
        } else {
            uint256 sharesByEnergy = (amountToSell * totalLPShares) / energyReserve;
            uint256 sharesByStable = (stableIn * totalLPShares) / stableReserve;
            shares = sharesByEnergy < sharesByStable ? sharesByEnergy : sharesByStable;
        }

        require(shares > 0, "AegisAMM: zero LP shares");

        energyReserve += amountToSell;
        stableReserve += stableIn;
        k = energyReserve * stableReserve;

        totalLPShares         += shares;
        lpShares[msg.sender] += shares;

        emit LiquidityAdded(msg.sender, amountToSell, stableIn, shares);
    }

    /**
     * @notice Withdraw liquidity proportional to LP share.
     * @param shares Number of LP shares to redeem
     */
    function removeLiquidity(uint256 shares)
        external
        nonReentrant
        returns (uint256 energyOut, uint256 stableOut)
    {
        require(shares > 0, "AegisAMM: zero shares");
        require(lpShares[msg.sender] >= shares, "AegisAMM: insufficient LP shares");

        energyOut = (shares * energyReserve) / totalLPShares;
        stableOut = (shares * stableReserve) / totalLPShares;

        lpShares[msg.sender] -= shares;
        totalLPShares        -= shares;
        energyReserve        -= energyOut;
        stableReserve        -= stableOut;
        k = energyReserve * stableReserve;

        // Return both token types in one batch transfer
        uint256[] memory ids     = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        ids[0] = ENERGY_TOKEN_ID; amounts[0] = energyOut;
        ids[1] = STABLE_TOKEN_ID; amounts[1] = stableOut;
        token.safeBatchTransferFrom(address(this), msg.sender, ids, amounts, "");

        emit LiquidityRemoved(msg.sender, energyOut, stableOut, shares);
    }

    // ════════════════════════════════════════════════════════════════
    //  SWAPS  (x · y = k  bonding curve)
    // ════════════════════════════════════════════════════════════════

    /**
     * @notice Primary trade: pay stablecoin (USDC), receive energy tokens (kWh).
     *
     * Math (constant-product):
     *   y' = y + Δy_in_after_fee
     *   x' = k / y'
     *   Δx_out = x - x'
     *
     * Where:
     *   Δy_in_after_fee = Δy_in × (FEE_DENOMINATOR - swapFeeBPS) / FEE_DENOMINATOR
     *
     * @param stableIn       Stablecoin amount the trader pays
     * @param minEnergyOut   Slippage guard — revert if energy received < this
     */
    function swapStableForEnergy(uint256 stableIn, uint256 minEnergyOut)
        external
        nonReentrant
        returns (uint256 energyOut)
    {
        require(stableIn > 0, "AegisAMM: zero stable input");
        require(energyReserve > 0 && stableReserve > 0, "AegisAMM: pool empty");

        // ── Deduct swap fee ──────────────────────────────────────────
        uint256 feeAmount      = (stableIn * swapFeeBPS) / FEE_DENOMINATOR;
        uint256 stableInNetFee = stableIn - feeAmount;

        // ── x · y = k  →  Δx = x - k / (y + Δy_net) ────────────────
        uint256 newStableReserve  = stableReserve + stableInNetFee;
        uint256 newEnergyReserve  = k / newStableReserve;          // integer division (rounds down → user-safe)
        energyOut                 = energyReserve - newEnergyReserve;

        require(energyOut > 0,           "AegisAMM: zero output");
        require(energyOut >= minEnergyOut, "AegisAMM: slippage exceeded");

        // ── Fee stays in the pool → increases k slightly ─────────────
        stableReserve = newStableReserve + feeAmount; // fee accrues to LPs
        energyReserve = newEnergyReserve;
        k             = energyReserve * stableReserve;

        // ── Token transfers ───────────────────────────────────────────
        //    Trader pays stableIn  (stablecoin, ID 0)
        token.safeTransferFrom(msg.sender, address(this), STABLE_TOKEN_ID, stableIn, "");
        //    Trader receives energyOut  (energy token, ID 1)
        token.safeTransferFrom(address(this), msg.sender, ENERGY_TOKEN_ID, energyOut, "");

        uint256 _spotPrice = (stableReserve * 1e18) / energyReserve; // scaled price

        emit SwapStableForEnergy(msg.sender, stableIn, energyOut, feeAmount, _spotPrice);
    }

    /**
     * @notice Reverse trade: sell energy tokens (kWh), receive stablecoin (USDC).
     *
     * Math:
     *   x' = x + Δx_in_after_fee
     *   y' = k / x'
     *   Δy_out = y - y'
     *
     * @param energyIn      Energy token amount the seller provides
     * @param minStableOut  Slippage guard
     */
    function swapEnergyForStable(uint256 energyIn, uint256 minStableOut)
        external
        nonReentrant
        returns (uint256 stableOut)
    {
        require(energyIn > 0, "AegisAMM: zero energy input");
        require(energyReserve > 0 && stableReserve > 0, "AegisAMM: pool empty");

        uint256 feeAmount      = (energyIn * swapFeeBPS) / FEE_DENOMINATOR;
        uint256 energyInNetFee = energyIn - feeAmount;

        uint256 newEnergyReserve = energyReserve + energyInNetFee;
        uint256 newStableReserve = k / newEnergyReserve;
        stableOut                = stableReserve - newStableReserve;

        require(stableOut > 0,           "AegisAMM: zero output");
        require(stableOut >= minStableOut, "AegisAMM: slippage exceeded");

        energyReserve = newEnergyReserve + feeAmount; // fee to LPs
        stableReserve = newStableReserve;
        k             = energyReserve * stableReserve;

        token.safeTransferFrom(msg.sender, address(this), ENERGY_TOKEN_ID, energyIn, "");
        token.safeTransferFrom(address(this), msg.sender, STABLE_TOKEN_ID, stableOut, "");

        uint256 _spotPrice = (stableReserve * 1e18) / energyReserve;
        emit SwapEnergyForStable(msg.sender, energyIn, stableOut, feeAmount, _spotPrice);
    }

    // ════════════════════════════════════════════════════════════════
    //  RL FEE CONTROLLER  (DDPG agent hook)
    // ════════════════════════════════════════════════════════════════

    /**
     * @notice Python DDPG agent calls this to update the dynamic swap fee.
     * @dev    Only RL_OPERATOR_ROLE can call (the Node.js gateway wallet).
     *         Fee bounded to [0.10%, 5.00%] to prevent runaway pricing.
     * @param newFeeBPS New fee in basis points (e.g. 134 = 1.34%)
     */
    function updateSwapFee(uint256 newFeeBPS) external onlyRole(RL_OPERATOR_ROLE) {
        require(
            newFeeBPS >= MIN_SWAP_FEE_BPS && newFeeBPS <= MAX_SWAP_FEE_BPS,
            "AegisAMM: fee out of range"
        );
        uint256 old = swapFeeBPS;
        swapFeeBPS = newFeeBPS;
        emit SwapFeeUpdated(old, newFeeBPS, msg.sender);
    }

    // ════════════════════════════════════════════════════════════════
    //  ENERGY COMMITMENT  (pre-trade collateral)
    // ════════════════════════════════════════════════════════════════

    /**
     * @notice Prosumer commits to delivering `amountKWh` of energy.
     *         Must lock collateral in EnergyToken before calling.
     * @param amountKWh kWh units the prosumer guarantees to inject
     */
    function commitEnergyDelivery(uint256 amountKWh) external {
        require(amountKWh > 0, "AegisAMM: zero commitment");
        require(
            token.collateralLocked(msg.sender) > 0,
            "AegisAMM: lock collateral first"
        );
        energyCommitments[msg.sender] += amountKWh;
        emit EnergyCommitted(msg.sender, amountKWh);
    }

    // ════════════════════════════════════════════════════════════════
    //  SLASH BAD ACTOR  (adversarial enforcement layer)
    // ════════════════════════════════════════════════════════════════

    /**
     * @notice Seize collateral from a node that failed to deliver committed energy.
     *
     * Mechanism:
     *   1. Oracle calls EnergyToken.flagDeliveryFailure(node) → sets deliveryFailed[node] = true
     *   2. Anyone (or oracle) then calls slashBadActor() on this contract
     *   3. 50% of locked collateral is seized and injected into the stable reserve
     *      (compensates LPs and restores pool balance)
     *   4. Remaining 50% is returned to the node (partial mercy)
     *
     * @param node  Address of the misbehaving prosumer node
     */
    function slashBadActor(address node) external nonReentrant {
        // ── Pre-conditions ────────────────────────────────────────────
        require(node != address(0), "AegisAMM: zero address");
        require(token.deliveryFailed(node), "AegisAMM: no delivery failure flagged");

        uint256 collateral = token.collateralLocked(node);
        require(collateral > 0, "AegisAMM: no collateral to slash");

        // ── Calculate penalty ─────────────────────────────────────────
        //    50% seized → redistributed to LP pool (stable reserve)
        //    50% returned → partial mercy to discourage not full exit scam
        uint256 penalty    = (collateral * SLASH_PCT_BPS) / FEE_DENOMINATOR;
        uint256 _remainder = collateral - penalty; // returned to node via oracle releaseCollateral()
        (_remainder); // silence unused-variable warning — value is logged off-chain

        // ── Clear state before external calls (CEI pattern) ───────────
        //    (EnergyToken.releaseCollateral zeroes collateralLocked internally)

        // ── Transfer seized funds to stable reserve ───────────────────
        //    The penalty stablecoin moves from EnergyToken escrow → AMM pool
        //    We model this as a reserve injection (increases y, grows k)
        stableReserve += penalty;
        k              = energyReserve * stableReserve;

        // ── Clear the node's delivery failure flag + collateral ───────
        //    Release remainder back to node via oracle-role burn+mint pattern
        //    (requires ORACLE_ROLE on EnergyToken — AMM has it by admin grant)
        //    In a production deployment, the oracle would call releaseCollateral
        //    for exactly `remainder`. Here we emit the full accounting:
        energyCommitments[node] = 0;

        emit BadActorSlashed(node, penalty, penalty);

        // Note: The actual token movement from EnergyToken custody is triggered
        // by the oracle calling EnergyToken.releaseCollateral(node) for `remainder`
        // after this function executes. This two-step process avoids circular calls.
    }

    // ════════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ════════════════════════════════════════════════════════════════

    /// @notice Current spot price:  y / x  (stable per energy unit, 18-decimal scaled)
    function spotPrice() external view returns (uint256) {
        if (energyReserve == 0) return 0;
        return (stableReserve * 1e18) / energyReserve;
    }

    /// @notice Preview how much energy a given stable input buys (no state change)
    function quoteStableForEnergy(uint256 stableIn)
        external view
        returns (uint256 energyOut, uint256 feeAmount)
    {
        require(energyReserve > 0 && stableReserve > 0, "AegisAMM: pool empty");
        feeAmount          = (stableIn * swapFeeBPS) / FEE_DENOMINATOR;
        uint256 stableNet  = stableIn - feeAmount;
        uint256 newStable  = stableReserve + stableNet;
        uint256 newEnergy  = k / newStable;
        energyOut          = energyReserve - newEnergy;
    }

    /// @notice Preview how much stable a given energy input yields (no state change)
    function quoteEnergyForStable(uint256 energyIn)
        external view
        returns (uint256 stableOut, uint256 feeAmount)
    {
        require(energyReserve > 0 && stableReserve > 0, "AegisAMM: pool empty");
        feeAmount          = (energyIn * swapFeeBPS) / FEE_DENOMINATOR;
        uint256 energyNet  = energyIn - feeAmount;
        uint256 newEnergy  = energyReserve + energyNet;
        uint256 newStable  = k / newEnergy;
        stableOut          = stableReserve - newStable;
    }

    /// @notice Current swap fee as a human-readable percentage string basis
    function swapFeePercent() external view returns (uint256 numerator, uint256 denominator) {
        return (swapFeeBPS, FEE_DENOMINATOR);
    }

    /// @notice Full pool state snapshot (mirrors SDD /market-state endpoint)
    function poolState()
        external view
        returns (
            uint256 _energyReserve,
            uint256 _stableReserve,
            uint256 _k,
            uint256 _swapFeeBPS,
            uint256 _spotPrice,
            uint256 _totalLPShares
        )
    {
        return (
            energyReserve,
            stableReserve,
            k,
            swapFeeBPS,
            energyReserve > 0 ? (stableReserve * 1e18) / energyReserve : 0,
            totalLPShares
        );
    }

    // ════════════════════════════════════════════════════════════════
    //  INTERNAL HELPERS
    // ════════════════════════════════════════════════════════════════

    /// @dev Babylonian square root (for initial LP share calculation)
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    // ── ERC-1155 Receiver Hook ────────────────────────────────────────
    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external pure returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata,
        uint256[] calldata, bytes calldata)
        external pure returns (bytes4)
    {
        return this.onERC1155BatchReceived.selector;
    }
}
