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

## 🖥️ Command Center Architecture

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

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/gridium.git
   cd gridium
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   yarn install
   ```

3. **Install AI engine dependencies:**
   ```bash
   cd ../ai-engine
   pip install -r requirements.txt
   ```

4. **Boot the local Hardhat node & deploy contracts:**
   ```bash
   cd ../blockchain
   yarn hardhat node
   yarn hardhat run scripts/deploy.ts --network localhost
   ```

5. **Start the Gridium Command Center:**
   ```bash
   cd ../frontend
   yarn dev
   ```

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

- **Shaunak Rane** - Frontend Architecture & 3D Visualization
- **Yash Pandit** - Smart Contracts & ZK Implementation
- **Backend AI Team** - DDPG Agent Training & Simulation

---

*Gridium isn't just a dashboard. It is a living, breathing, AI-governed economy.*
