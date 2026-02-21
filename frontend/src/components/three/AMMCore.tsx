import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface AMMCoreProps {
    energyReserve: number
    stableReserve: number
}

// Pre-allocated scratch for glow pulse
const _glowColor = new THREE.Color('#3B82F6')

const AMMCore = memo(function AMMCore({ energyReserve, stableReserve }: AMMCoreProps) {
    const outerRef = useRef<THREE.Mesh>(null)
    const innerRef = useRef<THREE.Mesh>(null)
    const ring1Ref = useRef<THREE.Mesh>(null)
    const glowRef = useRef<THREE.Mesh>(null)
    const lightRef = useRef<THREE.PointLight>(null)

    const ratio = Math.min(1, stableReserve / energyReserve + 0.3)
    const innerScale = ratio * 0.4

    useFrame(({ clock }) => {
        const t = clock.elapsedTime
        if (outerRef.current) {
            outerRef.current.rotation.y = t * 0.18
            outerRef.current.rotation.x = t * 0.06
        }
        if (innerRef.current) innerRef.current.rotation.y = -t * 0.4
        if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.55

        // Soft glow pulse — scale + opacity
        if (glowRef.current) {
            const pulse = 0.5 + Math.sin(t * 1.1) * 0.5          // 0..1
            const s = 1.2 + pulse * 0.35
            glowRef.current.scale.setScalar(s)
                ; (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + pulse * 0.08
        }
        // Light intensity pulses in sync
        if (lightRef.current) {
            lightRef.current.intensity = 1.0 + Math.sin(t * 1.1) * 0.55
        }
    })

    return (
        <group>
            {/* ── Soft glow aura — large transparent sphere ─────────── */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[1.4, 12, 12]} />
                <meshBasicMaterial color="#3B82F6" transparent opacity={0.08} side={THREE.FrontSide} depthWrite={false} />
            </mesh>

            {/* Secondary outer halo */}
            <mesh>
                <sphereGeometry args={[2.0, 10, 10]} />
                <meshBasicMaterial color="#93C5FD" transparent opacity={0.03} side={THREE.FrontSide} depthWrite={false} />
            </mesh>

            {/* Wireframe icosahedron */}
            <mesh ref={outerRef}>
                <icosahedronGeometry args={[0.65, 0]} />
                <meshBasicMaterial color="#1E40AF" wireframe transparent opacity={0.55} />
            </mesh>

            {/* Inner solid */}
            <mesh ref={innerRef} scale={innerScale}>
                <dodecahedronGeometry args={[0.55, 0]} />
                <meshBasicMaterial color="#2563EB" transparent opacity={0.75} />
            </mesh>

            {/* Orbital ring */}
            <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.90, 0.015, 4, 48]} />
                <meshBasicMaterial color="#3B82F6" transparent opacity={0.65} />
            </mesh>

            {/* Static accent ring */}
            <mesh rotation={[Math.PI / 3.5, Math.PI / 6, 0]}>
                <torusGeometry args={[1.02, 0.009, 4, 48]} />
                <meshBasicMaterial color="#16A34A" transparent opacity={0.35} />
            </mesh>

            {/* Pulsing point light — acts as the visual glow source */}
            <pointLight ref={lightRef} color="#3B82F6" intensity={1.2} distance={5.5} decay={2} />
        </group>
    )
})

export default AMMCore
