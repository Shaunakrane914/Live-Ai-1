/**
 * useGridiumAMM — Web3 + zk-SNARK hook for Gridium Phase 5
 * Connects to Hardhat, fetches AMM reserves, and executes zk-proof liquidity adds.
 */
import { useCallback, useState } from 'react'
import { BrowserProvider, Contract, JsonRpcProvider, parseUnits } from 'ethers'

// ── Config ─────────────────────────────────────────────────────────
const HARDHAT_RPC = 'http://localhost:8545'
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : window.location.origin)

// ABI fragments for GridiumAMM
const AMM_ABI = [
  'function energyReserve() view returns (uint256)',
  'function stableReserve() view returns (uint256)',
  'function addLiquidityWithProof(uint256 amountToSell, uint256 stableIn, uint256[2] calldata proofA, uint256[2][2] calldata proofB, uint256[2] calldata proofC) external returns (uint256 shares)',
] as const

// Contract address from deployment.json (fallback if not injected)
const DEFAULT_AMM_ADDRESS = '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e'

export interface GridiumAMMState {
  energyReserve: string
  stableReserve: string
  spotPrice: string
  isLoading: boolean
  error: string | null
}

export interface UseGridiumAMMReturn {
  reserves: GridiumAMMState
  fetchReserves: () => Promise<void>
  executeZkSwap: (totalSolar: number, totalLoad: number, stableIn: number, ammAddress?: string) => Promise<{ success: boolean; txHash?: string; error?: string }>
}

/**
 * Fetch reserves from chain and optionally push to Zustand store.
 */
export function useGridiumAMM(ammAddress: string = DEFAULT_AMM_ADDRESS): UseGridiumAMMReturn {
  const [reserves, setReserves] = useState<GridiumAMMState>({
    energyReserve: '0',
    stableReserve: '0',
    spotPrice: '0',
    isLoading: false,
    error: null,
  })
  const fetchReserves = useCallback(async () => {
    setReserves((r) => ({ ...r, isLoading: true, error: null }))
    try {
      const provider = new JsonRpcProvider(HARDHAT_RPC)
      const contract = new Contract(ammAddress, AMM_ABI, provider)
      const [energy, stable] = await Promise.all([
        contract.energyReserve(),
        contract.stableReserve(),
      ])
      const energyStr = energy.toString()
      const stableStr = stable.toString()
      const spot = stable > 0n && energy > 0n
        ? (Number(stable) / Number(energy)).toFixed(6)
        : '0'
      setReserves({
        energyReserve: energyStr,
        stableReserve: stableStr,
        spotPrice: spot,
        isLoading: false,
        error: null,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setReserves((r) => ({ ...r, isLoading: false, error: msg }))
    }
  }, [ammAddress])

  const executeZkSwap = useCallback(
    async (
      totalSolar: number,
      totalLoad: number,
      stableIn: number,
      overrideAmmAddress?: string
    ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
      const addr = overrideAmmAddress ?? ammAddress
      const amountToSell = Math.max(0, totalSolar - totalLoad)
      if (amountToSell <= 0) {
        return { success: false, error: 'No surplus energy (totalSolar must exceed totalLoad)' }
      }
      if (stableIn <= 0) {
        return { success: false, error: 'stableIn must be positive' }
      }

      try {
        // 1. Generate proof via backend (snarkjs runs in Node; browser cannot run it directly)
        const proofRes = await fetch(`${GATEWAY_URL}/api/generate-proof`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            totalSolar: totalSolar.toString(),
            totalLoad: totalLoad.toString(),
          }),
        })
        if (!proofRes.ok) {
          const errText = await proofRes.text()
          return {
            success: false,
            error: `Proof generation failed: ${errText || proofRes.statusText}`,
          }
        }
        const { proof, publicSignals } = (await proofRes.json()) as {
          proof: { pi_a: number[]; pi_b: number[][]; pi_c: number[] }
          publicSignals: string[]
        }

        // 2. Format proof for Solidity (SnarkJS Groth16 format → verifier calldata)
        const pA = proof.pi_a.slice(0, 2).map((x) => BigInt(x))
        const pB = proof.pi_b.map((row) => row.slice(0, 2).map((x) => BigInt(x))) as [bigint[], bigint[]]
        const pC = proof.pi_c.slice(0, 2).map((x) => BigInt(x))
        const pubSignals = publicSignals.map((s) => BigInt(s))
        const expectedAmount = BigInt(Math.floor(amountToSell))
        const actualAmount = pubSignals[0]
        if (actualAmount === undefined || actualAmount !== expectedAmount) {
          return { success: false, error: 'Proof public signal does not match amountToSell' }
        }

        // 3. Connect MetaMask (or fallback to Hardhat account 0)
        const ethereum = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
        let provider: BrowserProvider | JsonRpcProvider
        if (ethereum) {
          provider = new BrowserProvider(ethereum)
        } else {
          provider = new JsonRpcProvider(HARDHAT_RPC)
        }
        const signer = await provider.getSigner()

        // 4. Call addLiquidityWithProof
        const contract = new Contract(addr, AMM_ABI, signer)
        const amountWei = parseUnits(amountToSell.toString(), 0)
        const stableWei = parseUnits(stableIn.toString(), 0)
        const tx = await contract.addLiquidityWithProof(
          amountWei,
          stableWei,
          pA,
          pB,
          pC
        )
        const receipt = await tx.wait()
        return { success: true, txHash: receipt?.hash }
      } catch (e) {
        const err = e as { message?: string; code?: string }
        let msg = err?.message ?? String(e)
        if (Number(err?.code) === 4001 || msg.includes('user rejected')) {
          msg = 'Transaction rejected by user'
        }
        return { success: false, error: msg }
      }
    },
    [ammAddress]
  )

  return { reserves, fetchReserves, executeZkSwap }
}
