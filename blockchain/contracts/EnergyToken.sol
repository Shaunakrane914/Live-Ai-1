// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  EnergyToken
 * @notice ERC-1155 multi-token representing hourly energy slots on the AegisGrid.
 *
 * Token ID layout:
 *   ID 0          → Stablecoin (USDC peg, 18 decimals)
 *   ID 1 – 24     → Hourly Energy Tokens (kWh slots, hour 1 = 01:00, etc.)
 *
 * Roles:
 *   DEFAULT_ADMIN_ROLE → deployer; can grant/revoke roles
 *   MINTER_ROLE        → AMM contract; mints LP / settlement tokens
 *   ORACLE_ROLE        → Python oracle bridge; can flag delivery failures
 */
contract EnergyToken is ERC1155, AccessControl, ReentrancyGuard {
    // ── Constants ────────────────────────────────────────────────────
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    uint256 public constant STABLECOIN_ID = 0;
    uint256 public constant MAX_HOUR_SLOTS = 24; // IDs 1–24

    // ── State ────────────────────────────────────────────────────────
    string public name = "AegisGrid Energy Token";
    string public symbol = "AEKT";

    /// @notice Collateral locked per node address (in stablecoin units)
    mapping(address => uint256) public collateralLocked;

    /// @notice Whether a node has been flagged by the oracle for delivery failure
    mapping(address => bool) public deliveryFailed;

    // ── Events ───────────────────────────────────────────────────────
    event CollateralLocked(address indexed node, uint256 amount);
    event CollateralReleased(address indexed node, uint256 amount);
    event DeliveryFailureFlagged(address indexed node, address indexed oracle);

    // ── Constructor ──────────────────────────────────────────────────
    constructor(string memory uri_) ERC1155(uri_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // ── Minting (MINTER_ROLE only) ───────────────────────────────────

    /**
     * @notice Mint a single token type to a recipient.
     * @param to        Recipient address
     * @param id        Token ID (0 = stablecoin, 1-24 = hourly energy slot)
     * @param amount    Amount to mint (18-decimal wei units)
     * @param data      Optional callback data
     */
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external onlyRole(MINTER_ROLE) {
        require(id <= MAX_HOUR_SLOTS, "EnergyToken: invalid token ID");
        _mint(to, id, amount, data);
    }

    /**
     * @notice Mint multiple token types in a single gas-efficient call.
     * @dev    Uses ERC-1155 batch mint — significant gas saving vs multiple ERC-20 transfers.
     */
    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i < ids.length; i++) {
            require(ids[i] <= MAX_HOUR_SLOTS, "EnergyToken: invalid token ID in batch");
        }
        _mintBatch(to, ids, amounts, data);
    }

    /**
     * @notice Burn tokens — called by AMM during settlement.
     */
    function burn(address from, uint256 id, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, id, amount);
    }

    // ── Collateral Management ────────────────────────────────────────

    /**
     * @notice Lock stablecoin collateral for a node committing to energy delivery.
     * @dev    Node must have approved this contract to spend stablecoin (ID 0).
     * @param amount    Stablecoin units to lock
     */
    function lockCollateral(uint256 amount) external nonReentrant {
        require(amount > 0, "EnergyToken: zero collateral");
        // Transfer stablecoin from node to contract custody
        _safeTransferFrom(msg.sender, address(this), STABLECOIN_ID, amount, "");
        collateralLocked[msg.sender] += amount;
        emit CollateralLocked(msg.sender, amount);
    }

    /**
     * @notice Release collateral back to node after successful delivery.
     */
    function releaseCollateral(address node) external onlyRole(ORACLE_ROLE) nonReentrant {
        uint256 amount = collateralLocked[node];
        require(amount > 0, "EnergyToken: no collateral to release");
        collateralLocked[node] = 0;
        _safeTransferFrom(address(this), node, STABLECOIN_ID, amount, "");
        emit CollateralReleased(node, amount);
    }

    // ── Oracle Delivery Flag ─────────────────────────────────────────

    /**
     * @notice Oracle reports that a node failed physical energy delivery.
     *         This flag enables slashBadActor() on the AMM contract.
     */
    function flagDeliveryFailure(address node) external onlyRole(ORACLE_ROLE) {
        deliveryFailed[node] = true;
        emit DeliveryFailureFlagged(node, msg.sender);
    }

    // ── Batch Transfer Helper ─────────────────────────────────────────

    /**
     * @notice Convenience wrapper for gas-efficient batch settlement.
     *         Transfers [stablecoin + energy token] in one tx.
     */
    function settleBatch(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) nonReentrant {
        safeBatchTransferFrom(from, to, ids, amounts, "");
    }

    // ── Interface Support ────────────────────────────────────────────
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
