import { memo, Suspense, useMemo, useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useGridStore } from '../../store/useGridStore'
import ProsumerNode, { type ProsumerNodeData, type NodeBehavior } from './ProsumerNode'
import AMMCore from './AMMCore'
import ParticleFlow from './ParticleFlow'

const NODE_COUNT = 15  // Match Python physics (was 12)

// ── Golden-ratio node positions — computed once at module level ────
const NODE_POSITIONS: [number, number, number][] = (() => {
    const phi = Math.PI * (3 - Math.sqrt(5))
    return Array.from({ length: NODE_COUNT }, (_, i) => {
        const y = 1 - (i / Math.max(1, NODE_COUNT - 1)) * 2
        const r = Math.sqrt(1 - y * y)
        const theta = phi * i
        return [Math.cos(theta) * r * 5.2, y * 2.3, Math.sin(theta) * r * 5.2]
    })
})()

// ── Static line geometry — built once ─────────────────────────────
const CONNECTION_GEO = (() => {
    const pts: THREE.Vector3[] = []
    const origin = new THREE.Vector3(0, 0, 0)
    NODE_POSITIONS.forEach(p => pts.push(origin.clone(), new THREE.Vector3(...p)))
    return new THREE.BufferGeometry().setFromPoints(pts)
})()

// ── Static materials — shared across renders ───────────────────────
const LINE_MAT = new THREE.LineBasicMaterial({ color: '#94A3B8', transparent: true, opacity: 0.18 })
const FLOOR_MAT = new THREE.MeshBasicMaterial({ color: '#64748B', wireframe: true, transparent: true, opacity: 0.09 })
const FLOOR_GEO = new THREE.PlaneGeometry(32, 32, 20, 20)



// ── Static grid floor — no useFrame ───────────────────────────────
function GridFloor() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.1, 0]}
            geometry={FLOOR_GEO} material={FLOOR_MAT} />
    )
}

// ── AMMCore + nodes batched into ONE useFrame each ─────────────────
// (ProsumerNode already has its own minimal useFrame)

// ── Scene — React.memo prevents re-render from unrelated store ticks
const Scene = memo(function Scene({ orbitRef }: { orbitRef: React.RefObject<OrbitControlsImpl | null> }) {
    const { generation, gridLoad, swapFee, energyReserve, stableReserve, events, nodes: storeNodes } = useGridStore()

    const nodes: ProsumerNodeData[] = useMemo(() => {
        if (storeNodes && storeNodes.length > 0) {
            return storeNodes.map((n, i) => {
                const excess = n.current_gen - n.current_load
                let behavior: NodeBehavior = 'normal'
                if (excess > 1.2) behavior = 'selling'
                else if (excess < -1.2) behavior = 'buying'
                else behavior = 'neutral'
                const pos = NODE_POSITIONS[i] ?? NODE_POSITIONS[0]
                return {
                    id: i,
                    position: pos,
                    behavior,
                    generation: n.current_gen,
                    consumption: n.current_load,
                    batterySoc: n.battery_soc / 100,
                }
            })
        }
        const perGen = generation / NODE_COUNT
        const perLoad = gridLoad / NODE_COUNT
        return NODE_POSITIONS.map((pos, i) => {
            const ng = perGen * (0.7 + Math.sin(i * 2.3) * 0.6)
            const nl = perLoad * (0.7 + Math.cos(i * 1.7) * 0.5)
            const excess = ng - nl
            let behavior: NodeBehavior = 'normal'
            if (i === 3 && swapFee > 3) behavior = 'malicious'
            else if (excess > 1.2) behavior = 'selling'
            else if (excess < -1.2) behavior = 'buying'
            else behavior = 'neutral'
            return {
                id: i, position: pos, behavior,
                generation: ng, consumption: nl,
                batterySoc: 0.3 + (Math.sin(i * 1.1) * 0.5 + 0.5) * 0.7,
            }
        })
    }, [generation, gridLoad, swapFee, storeNodes])

    const activeFlows = useMemo(() =>
        events
            .filter(e => e.type === 'SWAP' || e.type === 'LIQUIDITY')
            .slice(0, 3)
            .map((e, i) => ({
                from: NODE_POSITIONS[(i * 4) % NODE_COUNT],
                to: [0, 0, 0] as [number, number, number],
                color: e.type === 'LIQUIDITY' ? '#16A34A' : '#2563EB',
            })),
        [events]
    )

    return (
        <>
            <ambientLight intensity={1.2} color="#ffffff" />
            <directionalLight position={[4, 7, 4]} intensity={0.4} color="#E0ECFF" castShadow={false} />

            <Stars radius={30} depth={16} count={100} factor={0.7} saturation={0} fade speed={0} />

            <GridFloor />

            <group>
                <AMMCore energyReserve={energyReserve} stableReserve={stableReserve} />
                <Html
                    position={[0, 1.7, 0]}
                    center
                    wrapperClass="pointer-events-none"
                >
                    <div className="pointer-events-none bg-slate-900/80 border border-blue-500/30 text-blue-400 text-xs font-mono px-2 py-1 rounded backdrop-blur-sm whitespace-nowrap">
                        [ Aegis AMM Liquidity Pool ]
                    </div>
                </Html>
            </group>

            <lineSegments geometry={CONNECTION_GEO} material={LINE_MAT} />

            {nodes.map((node, index) => (
                <group key={node.id}>
                    <ProsumerNode data={node} />
                    {index === 0 && (
                        <Html
                            position={[node.position[0], node.position[1] + 0.9, node.position[2]]}
                            center
                            wrapperClass="pointer-events-none"
                        >
                            <div className="pointer-events-none bg-slate-900/80 border border-slate-700/50 text-slate-300 text-[10px] font-mono px-2 py-1 rounded backdrop-blur-sm whitespace-nowrap">
                                [ Autonomous Prosumer ]
                            </div>
                        </Html>
                    )}
                </group>
            ))}

            {activeFlows.map((flow, i) => (
                <ParticleFlow key={i} from={flow.from} to={flow.to} color={flow.color} speed={0.5} count={3} />
            ))}

            <OrbitControls
                ref={orbitRef}
                enablePan={false}
                enableZoom
                minDistance={4}
                maxDistance={13}
                maxPolarAngle={Math.PI * 0.72}
                autoRotate
                autoRotateSpeed={0.22}
                dampingFactor={0.08}
                enableDamping
            />
        </>
    )
})

// ── Canvas wrapper ─────────────────────────────────────────────────
export default function MicrogridCanvas() {
    const orbitRef = useRef<OrbitControlsImpl>(null)
    const [visible, setVisible] = useState(true)

    // Get store data for stats overlay
    const { nodes, generation, gridLoad, price } = useGridStore()
    const activeNodes = nodes?.length || 15
    const healthyNodes = nodes?.filter(n => n.battery_soc > 20).length || activeNodes
    const healthPercent = Math.round((healthyNodes / activeNodes) * 100)

    // Pause rendering when tab is hidden
    useEffect(() => {
        const handleVisibility = () => setVisible(!document.hidden)
        document.addEventListener('visibilitychange', handleVisibility)
        return () => document.removeEventListener('visibilitychange', handleVisibility)
    }, [])

    return (
        <div className="w-full h-full relative">
            {/* Stats Overlay - Top Left */}
            <div className="absolute top-4 left-4 z-10 flex gap-6 pointer-events-none">
                <div className="flex flex-col">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Nodes</p>
                    <p className="text-lg font-semibold leading-tight text-blue-400">{activeNodes}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{healthyNodes} healthy</p>
                </div>
                <div className="flex flex-col">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Health</p>
                    <p className={`text-lg font-semibold leading-tight ${healthPercent > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{healthPercent}%</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{healthPercent > 90 ? 'Optimal' : 'Degraded'}</p>
                </div>
                <div className="flex flex-col">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Price</p>
                    <p className="text-lg font-semibold leading-tight text-slate-300">{price.toFixed(3)}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">USDC/kWh</p>
                </div>
                <div className="flex flex-col">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Flow</p>
                    <p className={`text-lg font-semibold leading-tight ${generation > gridLoad ? 'text-emerald-400' : 'text-amber-400'}`}>{(generation - gridLoad).toFixed(1)}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{generation > gridLoad ? 'kW Surplus' : 'kW Deficit'}</p>
                </div>
            </div>

            <div className="absolute bottom-2 right-3 z-10 text-[9px] text-[#8B93A4] opacity-50 pointer-events-none">
                Drag · Scroll to zoom · Click node to inspect
            </div>

            <Canvas
                camera={{ position: [0, 4.5, 11], fov: 55, near: 0.1, far: 100 }}
                gl={{
                    antialias: false,
                    alpha: true,
                    powerPreference: 'high-performance',
                    stencil: false,
                    depth: true,
                }}
                style={{ background: 'transparent' }}
                dpr={[1, 1]}
                flat
                performance={{ min: 0.5, max: 1 }}
                frameloop={visible ? "demand" : "never"}
            >
                <Suspense fallback={null}>
                    <Scene orbitRef={orbitRef} />
                </Suspense>
            </Canvas>
        </div>
    )
}
