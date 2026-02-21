# AegisGrid — End-to-End Flight Check

Run this **before you pitch** to confirm all four servers and the UI are in sync.

---

## Prerequisites: Start All Four Environments

| Service        | Port | Command |
|----------------|------|--------|
| **Hardhat**    | 8545 | `cd blockchain && npx hardhat node` |
| **Node Gateway** | 8000 | `cd backend && node index.js` |
| **Python AI**  | 8001 | `cd ai-engine && uvicorn main:app --port 8001` |
| **React**      | 5173 | `cd frontend && npm run dev` |

Optional (pulse check): in another terminal run `python ai-engine/watch_tick.py` to see live ticks in the console.

---

## Test 1: The Heartbeat (Data & UI Sync)

**Goal:** Prove the Python physics engine is driving the React 3D canvas.

1. With all four services running, open **http://localhost:5173** and go to the **Overview** page.
2. **Verify:**
   - [ ] Status badge shows **● LIVE** (not ● MOCK).
   - [ ] Top KPI bar shows changing **Grid Load**, **Generation**, and **Price**.
   - [ ] 3D canvas shows **15 nodes** with particle flows; nodes turn green (selling) or red (buying) based on surplus/deficit.

**If Test 1 fails:** Use the [Contingency Prompt for Test 1](#if-test-1-fails-no-3d-nodes--ui-frozen) below.

---

## Test 2: The Chaos Response (AI & Physics)

**Goal:** Prove the DDPG agent governs the economy under stress.

1. Stay on **Overview** and find the **Chaos Engine** panel.
2. Click **Simulate Cloud Cover** (first button).
3. **Verify:**
   - [ ] 3D canvas reacts: more nodes turn red (buying) as generation drops.
   - [ ] If `watch_tick.py` is running: logs show a clear **deficit** (negative imbalance) and the **AI Swap Fee** increases.
   - [ ] AI Telemetry shows **Imbalance** going negative and **Swap Fee** rising.

**If Test 2 fails:** Use the [Contingency Prompt for Test 2](#if-test-2-fails-ai-fee-doesnt-spike) below.

---

## Test 3: The Cryptographic Settlement (ZK & Web3)

**Goal:** Prove the frontend can generate a ZK proof and settle on-chain.

1. Go to the **AMM** page.
2. Find the **ZK Add Liquidity** card.
3. Enter **8** (Total Solar), **3** (Total Load), **10** (Stable to Add).
4. Click **Execute ZK Add Liquidity**.
5. **Verify:**
   - [ ] Node gateway terminal logs a successful **POST /api/generate-proof** (or 503 if circuit not built).
   - [ ] Hardhat terminal logs a successful **addLiquidityWithProof** transaction.
   - [ ] AMM page **Pool Reserves** (and/or bonding curve) update with the new liquidity.

**Note:** Test 3 requires the zk circuit to be built (`cd blockchain/circuits && ./build.sh`) and MetaMask (or Hardhat account) connected to localhost:8545.

**If Test 3 fails:** Use the [Contingency Prompt for Test 3](#if-test-3-fails-zk-proof-reverted-on-chain) below.

---

## Contingency Prompts for Antigravity

If any test fails, **do not manually hunt across four servers**. Copy the matching prompt below and feed it to Antigravity to fix the leak.

### If Test 1 Fails (No 3D Nodes / UI Frozen)

> Test 1 failed. My `MicrogridCanvas` is not rendering the 15 nodes, or the UI is stuck on MOCK data. Check `useGridStore.ts` and ensure `applyTick` is correctly parsing the `nodes` array from the `simulation_tick` payload, and verify that the Node.js gateway is successfully forwarding the `/tick` response from Python.

### If Test 2 Fails (AI Fee Doesn't Spike)

> Test 2 failed. When I click 'Simulate Cloud Cover', the Python `physics_oracle` registers the drop in generation, but the DDPG agent's fee does not change. Check `main.py` and ensure the state vector `[gridImbalance, aggregate_soc, price]` is being normalized correctly before being passed into the Actor model's `forward` pass during the `/tick` interval.

### If Test 3 Fails (ZK Proof Reverted On-Chain)

> Test 3 failed. The `executeZkSwap` function fired, but the Hardhat transaction reverted. Please verify two things: 1. Ensure `useAegisAMM.ts` is formatting the `proofA`, `proofB`, and `proofC` arrays exactly as the Solidity `EnergyProofVerifier` expects. 2. Ensure `AegisAMM.sol` is correctly passing the `[amountToSell]` public signal to the verifier interface.

---

## Automated Script (API-Only Checks)

From the project root you can run the PowerShell script to validate Python and gateway endpoints (no browser):

```powershell
.\scripts\e2e-flight-check.ps1
```

This checks: Python `/tick` (payload shape + nodes), Python `/chaos`, Gateway `/health`, and optionally `/api/generate-proof` if the circuit exists.
