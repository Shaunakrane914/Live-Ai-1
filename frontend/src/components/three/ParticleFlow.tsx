import { memo, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleFlowProps {
    from: [number, number, number]
    to: [number, number, number]
    color?: string
    speed?: number
    count?: number
}

// Pre-allocate shared scratch objects — zero GC pressure in the hot loop
const _point = new THREE.Vector3()
const _dummy = new THREE.Object3D()

// React.memo — only re-renders when from/to/color changes
const ParticleFlow = memo(function ParticleFlow({
    from, to, color = '#4DA3FF', speed = 0.8, count = 3,
}: ParticleFlowProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null)

    const { direction, length, startVec } = useMemo(() => {
        const f = new THREE.Vector3(...from)
        const t = new THREE.Vector3(...to)
        const dir = t.clone().sub(f).normalize()
        const len = f.distanceTo(t)
        return { direction: dir, length: len, startVec: f.clone() }
    }, [from, to])

    const offsets = useMemo(() =>
        Array.from({ length: count }, (_, i) => i / count), [count]
    )

    const pathColor = useMemo(() => new THREE.Color(color), [color])
    const speedFactor = speed * 0.5

    useFrame(({ clock }) => {
        if (!meshRef.current) return
        const t = clock.elapsedTime  // cached accessor — no function call overhead

        for (let i = 0; i < offsets.length; i++) {
            const progress = (t * speedFactor + offsets[i]) % 1

            // Reuse pre-allocated _point — no `new Vector3()` per particle per frame
            _point.copy(startVec).addScaledVector(direction, progress * length)
            _dummy.position.copy(_point)
            _dummy.scale.setScalar(0.04 + Math.sin(progress * Math.PI) * 0.025)
            _dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, _dummy.matrix)
        }
        meshRef.current.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <sphereGeometry args={[1, 4, 4]} />
            <meshBasicMaterial color={pathColor} transparent opacity={0.80} />
        </instancedMesh>
    )
})

export default ParticleFlow
