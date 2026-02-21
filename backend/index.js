/**
 * AegisGrid Gateway — Node.js Socket.io Server (Port 8000)
 *
 * Responsibilities:
 *  - Bridge the Python AI engine (port 8001) to the React frontend (port 5173)
 *  - Broadcast `simulation_tick` every 500 ms
 *  - Broadcast `grid_event` (SWAP, ZK_VERIFIED, SLASH, LIQUIDITY) randomly
 *  - Forward chaos button clicks from frontend → Python /chaos endpoint
 */

const express = require('express')
const http = require('http')
const path = require('path')
const fs = require('fs')
const { Server } = require('socket.io')
const cors = require('cors')
const axios = require('axios')

// ── Config ──────────────────────────────────────────────────────────
const PORT = 8000
const AI_ENGINE_URL = 'http://localhost:8001'
const TICK_INTERVAL_MS = 500    // match frontend MOCK_INTERVAL
const EVENT_INTERVAL_MS = 2500  // random grid events

// ── Express + Socket.io Setup ───────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
})

// ── Helpers ─────────────────────────────────────────────────────────
let eventCounter = 0

const EVENT_TYPES = ['SWAP', 'ZK_VERIFIED', 'SLASH', 'LIQUIDITY']

const EVENT_GENERATORS = {
    SWAP: () =>
        `${(Math.random() * 15 + 1).toFixed(1)} kWh ↔ ${(Math.random() * 50 + 5).toFixed(2)} USDC`,
    ZK_VERIFIED: () =>
        `Proof 0x${Math.random().toString(16).slice(2, 8).toUpperCase()} accepted`,
    SLASH: () =>
        `${(Math.random() * 80 + 10).toFixed(0)} USDC seized from node 0x${Math.random()
            .toString(16)
            .slice(2, 6)
            .toUpperCase()}`,
    LIQUIDITY: () =>
        `LP deposit: ${(Math.random() * 200 + 50).toFixed(1)} kWh + ${(
            Math.random() * 100 + 20
        ).toFixed(2)} USDC`,
}

function makeEvent(type, message) {
    return {
        id: `evt-${++eventCounter}-${Date.now()}`,
        type: type || EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)],
        message: message || EVENT_GENERATORS[type || 'SWAP'](),
        timestamp: Date.now(),
    }
}

// ── Tick Loop: poll Python AI engine ───────────────────────────────
let tickTimer = null
let eventTimer = null

async function fetchTick() {
    try {
        const { data } = await axios.get(`${AI_ENGINE_URL}/tick`, { timeout: 400 })
        io.emit('simulation_tick', data)

        // If the physics engine returned slash events, broadcast them too
        if (data.slashEvents && data.slashEvents.length > 0) {
            data.slashEvents.forEach((s) => {
                io.emit(
                    'grid_event',
                    makeEvent('SLASH', `${s.penalty_usdc} USDC seized from ${s.node}`)
                )
            })
        }
    } catch {
        // Python engine not reachable — skip tick silently
    }
}

function startLoops() {
    if (tickTimer) return
    tickTimer = setInterval(fetchTick, TICK_INTERVAL_MS)
    eventTimer = setInterval(() => {
        const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)]
        io.emit('grid_event', makeEvent(type))
    }, EVENT_INTERVAL_MS)
    console.log('  ⚡ Tick + event loops started')
}

function stopLoops() {
    clearInterval(tickTimer)
    clearInterval(eventTimer)
    tickTimer = null
    eventTimer = null
}

// ── Chaos → Python Bridge ───────────────────────────────────────────
const CHAOS_MAP = {
    'chaos:cloud_cover': 'cloud_cover',
    'chaos:peak_demand': 'peak_demand',
    'chaos:malicious_actor': 'malicious_actor',
    'chaos:delivery_fail': 'delivery_fail',
}

async function forwardChaos(chaosType, socket) {
    const pythonType = CHAOS_MAP[chaosType]
    if (!pythonType) return

    try {
        await axios.post(`${AI_ENGINE_URL}/chaos`, { type: pythonType }, { timeout: 400 })
    } catch {
        // Python engine offline — still push the visual event to frontend
    }

    // Human-readable label for the event ticker
    const labels = {
        cloud_cover: 'Cloud cover injected — solar −40%',
        peak_demand: 'Peak demand spike — load +60%',
        malicious_actor: 'Malicious prosumer detected — hoarding energy',
        delivery_fail: 'Delivery failure — slash() triggered',
    }

    io.emit('grid_event', makeEvent('CHAOS', labels[pythonType]))
}

// ── Socket.io Events ────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[+] Client connected: ${socket.id}`)
    startLoops()

    // Register chaos listeners
    Object.keys(CHAOS_MAP).forEach((evt) => {
        socket.on(evt, () => forwardChaos(evt, socket))
    })

    socket.on('disconnect', () => {
        console.log(`[-] Client disconnected: ${socket.id}`)
        if (io.engine.clientsCount === 0) stopLoops()
    })
})

// ── REST Endpoints (optional direct access) ─────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', gateway: 'AegisGrid v1' }))

app.get('/market-state', async (_req, res) => {
    try {
        const { data } = await axios.get(`${AI_ENGINE_URL}/market-state`)
        res.json(data)
    } catch {
        res.status(503).json({ error: 'AI engine offline' })
    }
})

app.post('/execute-trade', async (req, res) => {
    try {
        const { data } = await axios.post(`${AI_ENGINE_URL}/swap`, req.body)
        io.emit('grid_event', makeEvent('SWAP', `${data.amountIn} USDC → ${data.amountOut} kWh`))
        res.json(data)
    } catch {
        res.status(503).json({ error: 'AI engine offline' })
    }
})

app.get('/node/:id', async (req, res) => {
    try {
        const { data } = await axios.get(`${AI_ENGINE_URL}/nodes`)
        const node = data.nodes[parseInt(req.params.id) - 1]
        res.json(node || { error: 'Node not found' })
    } catch {
        res.status(503).json({ error: 'AI engine offline' })
    }
})

// ── Phase 5: zk-SNARK proof generation (for addLiquidityWithProof) ───
app.post('/api/generate-proof', async (req, res) => {
    const { totalSolar, totalLoad } = req.body || {}
    if (!totalSolar || !totalLoad) {
        return res.status(400).json({ error: 'totalSolar and totalLoad required' })
    }
    const circuitsDir = path.join(__dirname, '..', 'blockchain', 'circuits')
    const wasmPath = path.join(circuitsDir, 'energy_proof_js', 'energy_proof.wasm')
    const zkeyPath = path.join(circuitsDir, 'energy_proof_0001.zkey')
    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
        return res.status(503).json({
            error: 'Circuit artifacts not found. Run: cd blockchain/circuits && ./build.sh',
        })
    }
    try {
        const { groth16 } = await import('snarkjs')
        const input = {
            total_solar: String(totalSolar),
            total_load: String(totalLoad),
        }
        const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath)
        res.json({ proof, publicSignals })
    } catch (e) {
        console.error('[ZK] Proof generation failed:', e)
        res.status(500).json({ error: e?.message || 'Proof generation failed' })
    }
})

// ── Start ────────────────────────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`\n╔═══════════════════════════════════════╗`)
    console.log(`║  AegisGrid Gateway  →  :${PORT}          ║`)
    console.log(`║  AI Engine expected →  :8001          ║`)
    console.log(`║  Frontend expected  →  :5173          ║`)
    console.log(`╚═══════════════════════════════════════╝\n`)
    startLoops()
})
