import { memo, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
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
    const color = useMemo(() => new THREE.Color(BEHAVIOR_COLORS[data.behavior]), [data.behavior])
    const baseY = data.position[1]
    const phase = data.id * 0.7    // stable — never changes

    useFrame(({ clock }) => {
        if (groupRef.current) {
            // Only Y — no rotation, no scale change: cheapest possible update
            groupRef.current.position.y = baseY + Math.sin(clock.elapsedTime * 1.1 + phase) * 0.05
        }
    })

    return (
        <group ref={groupRef} position={data.position}>
            <mesh>
                <sphereGeometry args={[0.30, 6, 6]} />
                <meshBasicMaterial color={color} transparent opacity={0.18} />
            </mesh>
            <mesh>
                <octahedronGeometry args={[0.16, 0]} />
                <meshBasicMaterial color={color} />
            </mesh>
            <mesh rotation={[Math.PI / 2.5, 0, 0]}>
                <torusGeometry args={[0.25, 0.009, 4, 24]} />
                <meshBasicMaterial color={color} transparent opacity={0.55} />
            </mesh>
            <mesh position={[0, -0.30, 0]}>
                <cylinderGeometry args={[0.03, 0.03, data.batterySoc * 0.22, 4]} />
                <meshBasicMaterial color={data.batterySoc > 0.5 ? '#00A152' : '#E65100'} />
            </mesh>
        </group>
    )
})

export default ProsumerNode
