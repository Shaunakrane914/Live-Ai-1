import { memo, useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'

export type NodeBehavior = 'normal' | 'selling' | 'buying' | 'malicious' | 'neutral'

export interface ProsumerNodeData {
    id: number
    position: [number, number, number]
    behavior: NodeBehavior
    generation: number
    consumption: number
    batterySoc: number
}

const BEHAVIOR_COLORS: Record<NodeBehavior, string> = {
    normal: '#2979FF',
    selling: '#00A152',
    buying: '#E65100',
    malicious: '#C62828',
    neutral: '#546E7A',
}

export { BEHAVIOR_COLORS }

interface ProsumerNodeProps { data: ProsumerNodeData }

// ── React.memo prevents re-render when store ticks unrelated values ─
const ProsumerNode = memo(function ProsumerNode({ data }: ProsumerNodeProps) {
    const groupRef = useRef<THREE.Group>(null)
    const navigate = useNavigate()
    const color = useMemo(() => new THREE.Color(BEHAVIOR_COLORS[data.behavior]), [data.behavior])
    const hoverColor = useMemo(() => new THREE.Color(BEHAVIOR_COLORS[data.behavior]).multiplyScalar(1.6), [data.behavior])
    const baseY = data.position[1]
    const phase = data.id * 0.7

    // ── Cursor helpers ────────────────────────────────────────────────
    const onPointerOver = useCallback(() => {
        document.body.style.cursor = 'pointer'
    }, [])

    const onPointerOut = useCallback(() => {
        document.body.style.cursor = 'auto'
    }, [])

    // ── Click → navigate to node dashboard ───────────────────────────
    const onClick = useCallback((e: { stopPropagation: () => void }) => {
        e.stopPropagation()             // prevent Canvas from eating the event
        document.body.style.cursor = 'auto'
        navigate(`/node/${data.id}`)
    }, [navigate, data.id])

    useFrame(({ clock }) => {
        if (groupRef.current) {
            groupRef.current.position.y = baseY + Math.sin(clock.elapsedTime * 1.1 + phase) * 0.05
        }
    })

    return (
        <group ref={groupRef} position={data.position}>
            {/* Invisible hit-area sphere — larger than visible geometry so clicks are easy */}
            <mesh
                onPointerOver={onPointerOver}
                onPointerOut={onPointerOut}
                onClick={onClick}
            >
                <sphereGeometry args={[0.42, 8, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Glow shell */}
            <mesh>
                <sphereGeometry args={[0.30, 6, 6]} />
                <meshBasicMaterial color={color} transparent opacity={0.18} />
            </mesh>

            {/* Core octahedron — brightens on hover via hoverColor fallback */}
            <mesh>
                <octahedronGeometry args={[0.16, 0]} />
                <meshBasicMaterial color={hoverColor} />
            </mesh>

            {/* Orbit ring */}
            <mesh rotation={[Math.PI / 2.5, 0, 0]}>
                <torusGeometry args={[0.25, 0.009, 4, 24]} />
                <meshBasicMaterial color={color} transparent opacity={0.55} />
            </mesh>

            {/* Battery bar */}
            <mesh position={[0, -0.30, 0]}>
                <cylinderGeometry args={[0.03, 0.03, data.batterySoc * 0.22, 4]} />
                <meshBasicMaterial color={data.batterySoc > 0.5 ? '#00A152' : '#E65100'} />
            </mesh>
        </group>
    )
})

export default ProsumerNode
