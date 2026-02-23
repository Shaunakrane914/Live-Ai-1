# ⚡ Gridium Protocol

> **A decentralized, AI-governed energy microgrid powered by zero-knowledge cryptography.**

[![React](https://img.shields.io/badge/Frontend-React_Three_Fiber-61DAFB?style=for-the-badge&logo=react)](#)
[![Solidity](https://img.shields.io/badge/Contracts-Solidity_%2B_Hardhat-363636?style=for-the-badge&logo=solidity)](#)
[![AI](https://img.shields.io/badge/Agent-DDPG_Reinforcement_Learning-FF6F00?style=for-the-badge&logo=tensorflow)](#)
[![ZK](https://img.shields.io/badge/Privacy-Groth16_zk--SNARKs-00E676?style=for-the-badge)](#)

## 🌍 The Trilemma We Solved

Traditional power grids are fragile and centralized. If a power plant fails, the city goes dark. Furthermore, if you generate your own solar energy, selling it directly to your neighbor is practically impossible. 

**Gridium fixes this.** We turn neighborhoods into self-sustaining, autonomous micro-economies. But balancing a live physical grid without a central authority creates three massive problems. Here is how we solved them:

### 1. The Market: ERC-20 AMM
To let houses trade power instantly without a middleman, we built an Automated Market Maker (AMM) on-chain. Think of it as a communal energy bucket. Nodes with surplus solar automatically dump power into the bucket and get paid in USDC. Nodes that need power buy it instantly. No waiting for order books, and no centralized intermediaries taking a cut.

### 2. The Brain: DDPG AI Agent
Energy is physical; if everyone buys from the AMM at 6:00 PM, the grid blacks out. We implemented a Deep Deterministic Policy Gradient (DDPG) reinforcement learning agent. It acts as an autonomous traffic cop, constantly monitoring grid balance. If demand spikes, the AI dynamically raises the swap fee to protect the grid's reserves.

### 3. The Shield: zk-SNARKs
Trading energy on a public blockchain is dangerous. If everyone can see when your house uses zero power, burglars know you are on vacation. We implemented Groth16 Zero-Knowledge proofs. Nodes generate cryptographic proofs of their physical energy surplus off-chain. The blockchain verifies the math and settles the trade without ever revealing the node's physical location or raw load data.

---

## � Go-To-Market & Disruptive Potential

**Validated Demand & Market Fit:**
The current grid infrastructure is failing under the weight of renewable energy integration. Gridium directly aligns with the massive market shift toward decentralized energy resources (DERs). By offering an AI-governed, AMM-based microgrid, we provide a robust strategy indicating high adoption potential for modern residential developers and solar-equipped municipalities.

**Vision & Eventual Dominance:**
Gridium is not just an incremental improvement—it is a visionary product with a strong future outlook. By merging zero-knowledge privacy with reinforcement learning, we have the high potential to lead or transform the entire market of peer-to-peer energy trading, positioning this protocol for longevity and eventual dominance in the decentralized physical infrastructure network (DePIN) sector.

---

## 🔬 Tech Innovation

**Impressive Originality — DDPG × Groth16 on Physical Infrastructure:**
Gridium's breakthrough approach lies in combining two frontier technologies — **Deep Deterministic Policy Gradient (DDPG) Reinforcement Learning** and **Groth16 zk-SNARKs** — to solve a real-world physical infrastructure problem. Most blockchain projects apply smart contracts to financial abstractions. Gridium applies them to *watts and kilowatt-hours*. The DDPG agent learns, in real-time, to use swap-fee economics as a control signal to prevent physical grid failure — a technique with significant potential to reshape how autonomous infrastructure systems are designed globally. Combined with privacy-preserving zk-proof settlement, Gridium is a forward-thinking protocol that sits at the intersection of AI, cryptography, and energy systems engineering.



## �🖥️ Command Center Architecture

### 1. Macro Grid Topology
A live 3D visualization of 15 autonomous "Prosumer" nodes trading peer-to-peer around the central AMM router.

![Macro Grid](docs/assets/overview.png)

### 2. AMM Trading Floor
The financial settlement layer featuring live candlestick charts tracking the AI's fee adjustments, the $x \cdot y = k$ bonding curve, and the ZK-liquidity deposit engine.

![AMM Floor](docs/assets/amm-floor.png)

### 3. Prosumer Terminal
Individual node telemetry. Watch the Auto-Gridium Agent's live decision matrix as it evaluates battery levels and market prices to buy or sell autonomously.

![Prosumer View](docs/assets/prosumer.png)

### 4. ZK Settlement Terminal
The cryptographic security checkpoint. Watch live Groth16 proofs be verified on-chain, complete with a slash registry that blocks malicious data injections.

![ZK Terminal](docs/assets/zk-terminal.png)

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript** - Type-safe component architecture
- **Three.js / React Three Fiber** - 3D microgrid visualization
- **Framer Motion** - Smooth animations and transitions
- **Tailwind CSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **WebSocket** - Real-time data streaming

### Blockchain
- **Solidity** - Smart contract development
- **Hardhat** - Development environment and testing
- **Ethers.js** - Blockchain interaction
- **Groth16** - zk-SNARK proof system

### AI/ML
- **Python** - Agent training environment
- **PyTorch** - Deep learning framework
- **DDPG** - Deep Deterministic Policy Gradient agent
- **OpenAI Gym** - Custom microgrid environment

---

## 🚀 Local Development Setup

### Prerequisites
* Node.js (v18+)
* Yarn or npm
* Hardhat (for local blockchain)
* Python 3.8+ (for AI engine)

### ⚡ One-Click Master Launch (Recommended)

The Gridium Command Center features a **Master Launcher** that automatically orchestrates all three services (AI Engine, Gateway, and Frontend) and verifies your dependencies.

1. **Install requirements:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Launch the platform:**
   ```bash
   python app.py
   ```

> [!TIP]
> **No manual configuration needed.** The launcher will automatically check for `node_modules`, install missing dependencies, and boot the AI simulation and the interactive dashboard in parallel.

---

### 🛠️ Manual / Advanced Setup

If you prefer to run services individually for debugging:

1. **AI Engine**: `cd ai-engine && uvicorn main:app`
2. **Gateway**: `cd backend && node index.js`
3. **Frontend**: `cd frontend && npm run dev`
4. **Blockchain**: `cd blockchain && npx hardhat node`


---

## 📊 Dataset

- 15 Prosumer Nodes with real solar generation data
- Load consumption patterns from residential neighborhoods
- Battery State of Charge (SOC) telemetry
- Weather condition correlations
- Live trading price history

---

## 🔐 Privacy & Security

- **Zero-Knowledge Proofs**: Nodes prove energy surplus without revealing identity
- **zk-SNARK Verification**: On-chain proof verification via Groth16
- **No Location Leakage**: Trading metadata never exposes physical node locations
- **Tamper-Proof**: Cryptographic guarantees prevent fake energy data

---

## ⚖️ License

Built for the Hackathon Season.
MIT License.

---

## 👥 Team

- **Shaunak Rane** - Backend Ai & 3D Vizualization
- **Yash Pandit** - Smart Contracts & ZK Implementation
- **Sanket Deka** - Frontend & UI/UX

---

*Gridium isn't just a dashboard. It is a living, breathing, AI-governed economy.*
