import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const GOLD   = new THREE.Color('#E8B84B')
const EMBER  = new THREE.Color('#D4622A')
const COUNT  = 3000

function Particles({ mouseRef }) {
  const mesh   = useRef()
  const { size } = useThree()

  const { positions, colors, phases } = useMemo(() => {
    const pos    = new Float32Array(COUNT * 3)
    const col    = new Float32Array(COUNT * 3)
    const ph     = new Float32Array(COUNT * 2)   // [phaseX, phaseY]
    const tmpColor = new THREE.Color()

    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 40
      pos[i * 3 + 1] = (Math.random() - 0.5) * 24
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16

      const t = Math.random()
      tmpColor.lerpColors(GOLD, EMBER, t)
      col[i * 3]     = tmpColor.r
      col[i * 3 + 1] = tmpColor.g
      col[i * 3 + 2] = tmpColor.b

      ph[i * 2]     = Math.random() * Math.PI * 2
      ph[i * 2 + 1] = Math.random() * Math.PI * 2
    }
    return { positions: pos, colors: col, phases: ph }
  }, [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3))
    g.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    return g
  }, [positions, colors])

  const basePositions = useMemo(() => positions.slice(), [positions])

  useEffect(() => () => geo.dispose(), [geo])

  useFrame((state) => {
    if (!mesh.current) return
    const t   = state.clock.elapsedTime
    const pos = mesh.current.geometry.attributes.position.array
    const mx  = mouseRef.current.x
    const my  = mouseRef.current.y

    for (let i = 0; i < COUNT; i++) {
      const bx = basePositions[i * 3]
      const by = basePositions[i * 3 + 1]
      const bz = basePositions[i * 3 + 2]

      const dx = bx + Math.sin(t * 0.3 + phases[i * 2])     * 0.4
      const dy = by + Math.cos(t * 0.2 + phases[i * 2 + 1]) * 0.4

      // Mouse repulsion in world space (crude mapping)
      const wx  = mx * 20
      const wy  = my * 12
      const rdx = dx - wx
      const rdy = dy - wy
      const rd2 = rdx * rdx + rdy * rdy
      const RAD2 = 9  // radius^2 = 3^2
      let fx = dx, fy = dy

      if (rd2 < RAD2 && rd2 > 0.001) {
        const force = (RAD2 - rd2) / RAD2
        const dist  = Math.sqrt(rd2)
        fx += (rdx / dist) * force * 1.5
        fy += (rdy / dist) * force * 1.5
      }

      pos[i * 3]     = fx
      pos[i * 3 + 1] = fy
      pos[i * 3 + 2] = bz
    }
    mesh.current.geometry.attributes.position.needsUpdate = true

    // Gentle camera parallax
    state.camera.position.x += (mx * 1.5 - state.camera.position.x) * 0.05
    state.camera.position.y += (my * 1.0 - state.camera.position.y) * 0.05
  })

  return (
    <points ref={mesh} geometry={geo}>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

export default function ParticleField({ className = '', style = {} }) {
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const move = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <Canvas
      className={className}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 10], fov: 75 }}
      gl={{ antialias: false, alpha: true }}
      style={{ background: 'transparent', ...style }}
    >
      <Particles mouseRef={mouseRef} />
    </Canvas>
  )
}
