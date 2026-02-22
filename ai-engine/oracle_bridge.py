import os
import json
import time
from web3 import Web3

class OracleBridge:
    """
    Web3 interface connecting the Python physics to the deployed Solidity AMM.

    It handles on-chain fee updates and slashing events by communicating with
    the local Hardhat node or a production RPC endpoint.
    """

    def __init__(self, rpc_url="http://127.0.0.1:8545"):
        """
        Initializes the Web3 bridge to the Hardhat local node.

        It auto-loads contract addresses from 'deployment.json' and binds to
        contract instances using ABIs found in the blockchain/artifacts directory.
        """
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.amm_contract = None
        self.token_contract = None
        self.oracle_wallet = None

        if not self.w3.is_connected():
            print("[WARN] Web3 Not Connected. Running in simulation-only mode.")
            return

        print(f"✅ Web3 Connected. Block Height: {self.w3.eth.block_number}")

        # ── Auto-load from deployment.json ─────
        deployment_path = os.path.join(os.path.dirname(__file__), "deployment.json")
        if not os.path.exists(deployment_path):
            print("[WARN] deployment.json not found.")
            return

        with open(deployment_path, "r") as f:
            deploy_info = json.load(f)

        amm_address   = deploy_info["contracts"]["AegisAMM"]
        token_address = deploy_info["contracts"]["EnergyToken"]
        self.oracle_wallet = deploy_info["wallets"]["oracle"]

        # ── Load ABI from Hardhat artifacts ─────
        artifacts_base = os.path.join(
            os.path.dirname(__file__), "..", "blockchain", "artifacts", "contracts"
        )
        amm_artifact_path   = os.path.join(artifacts_base, "AegisAMM.sol",   "AegisAMM.json")
        token_artifact_path = os.path.join(artifacts_base, "EnergyToken.sol","EnergyToken.json")

        try:
            with open(amm_artifact_path, "r") as f:
                amm_abi = json.load(f)["abi"]
            with open(token_artifact_path, "r") as f:
                token_abi = json.load(f)["abi"]
        except FileNotFoundError as e:
            print(f"[WARN] ABI file not found: {e}")
            return

        self.amm_contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(amm_address), abi=amm_abi
        )
        self.token_contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(token_address), abi=token_abi
        )

        print(f"✅ Contracts Mapped: AegisAMM={amm_address}, Token={token_address}")

    def update_swap_fee(self, new_fee_pct: float):
        """Called by the DDPG agent to push fee adjustment on-chain."""
        if not self.amm_contract or not self.oracle_wallet:
            return

        fee_bps = max(10, min(500, int(new_fee_pct * 100)))
        try:
            tx_hash = self.amm_contract.functions.updateSwapFee(fee_bps).transact(
                {"from": self.oracle_wallet, "gas": 100_000}
            )
            self.w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"[CHAIN] Swap fee updated → {fee_bps/100:.2f}%")
        except Exception as e:
            print(f"[CHAIN] updateSwapFee failed: {e}")

    def flag_delivery_failure(self, node_address: str):
        """Oracle flags a node for slashing after a failed delivery."""
        if not self.token_contract or not self.oracle_wallet:
            return
        try:
            tx_hash = self.token_contract.functions.flagDeliveryFailure(
                self.w3.to_checksum_address(node_address)
            ).transact({"from": self.oracle_wallet, "gas": 80_000})
            self.w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"[CHAIN] Delivery failure flagged for {node_address[:10]}")
        except Exception as e:
            print(f"[CHAIN] flagDeliveryFailure failed: {e}")

    def push_telemetry(self, state_data):
        """Log oracle state and push on-chain swap fee if connected."""
        hour = state_data['hour']
        time_str = f"{int(hour):02d}:{'30' if hour % 1 else '00'}"
        imbalance = state_data['gridImbalance']
        status = "🟢 SURPLUS" if imbalance >= 0 else "🔴 DEFICIT"
        print(
            f"[ORACLE] Time: {time_str} | "
            f"Grid: {status} | "
            f"Gen/Load: {state_data['generation']}/{state_data['gridLoad']} kW"
        )
        self.update_swap_fee(state_data['swapFee'])
