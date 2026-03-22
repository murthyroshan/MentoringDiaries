/**
 * Auth-tuned particle field — lighter than Landing's version.
 * Lazy-loaded by AuthBackground.jsx.
 * Identical architecture to ParticleField.jsx but:
 *   COUNT        = 1500   (vs 3000)
 *   repel radius = 4 units, strength = 0.8
 *   camera speed = 0.03x (subtler parallax)
 *   pixelRatio   = Math.min(devicePixelRatio, 2)
 */
import { useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const GOLD  = new THREE.Color('#E8B84B')
const EMBER = new THREE.Color('#D4622A')
const COUNT = 1500
const RAD2  = 16  // 4² — repulsion radius squared

function createParticleData() {
  const pos  = new Float32Array(COUNT * 3)
  const col  = new Float32Array(COUNT * 3)
  const ph   = new Float32Array(COUNT * 2)
  const tmp  = new THREE.Color()

  for (let i = 0; i < COUNT; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 38
    pos[i * 3 + 1] = (Math.random() - 0.5) * 22
    pos[i * 3 + 2] = (Math.random() - 0.5) * 14

    const t = Math.random()
    tmp.lerpColors(GOLD, EMBER, t)
    col[i * 3]     = tmp.r
    col[i * 3 + 1] = tmp.g
    col[i * 3 + 2] = tmp.b

    ph[i * 2]     = Math.random() * Math.PI * 2
    ph[i * 2 + 1] = Math.random() * Math.PI * 2
  }
  return { positions: pos, colors: col, phases: ph }
}

function Particles({ mouseRef }) {
  const mesh = useRef()
  const [{ positions, colors, phases }] = useState(createParticleData)

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3))
    g.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    return g
  }, [positions, colors])

  const basePos = useMemo(() => positions.slice(), [positions])

  useEffect(() => () => geo.dispose(), [geo])

  useFrame((state) => {
    if (!mesh.current) return
    const t   = state.clock.elapsedTime
    const pos = mesh.current.geometry.attributes.position.array
    const mx  = mouseRef.current.x
    const my  = mouseRef.current.y

    for (let i = 0; i < COUNT; i++) {
      const bx = basePos[i * 3]
      const by = basePos[i * 3 + 1]
      const bz = basePos[i * 3 + 2]

      // Gentle breathe: slow drift + sine oscillation
      let fx = bx + Math.sin(t * 0.25 + phases[i * 2])     * 0.5
      let fy = by + Math.cos(t * 0.18 + phases[i * 2 + 1]) * 0.5

      // Mouse repulsion
      const wx  = mx * 18
      const wy  = my * 10
      const rdx = fx - wx
      const rdy = fy - wy
      const rd2 = rdx * rdx + rdy * rdy

      if (rd2 < RAD2 && rd2 > 0.001) {
        const dist  = Math.sqrt(rd2)
        const force = ((RAD2 - rd2) / RAD2) * 0.8
        fx += (rdx / dist) * force
        fy += (rdy / dist) * force
      }

      pos[i * 3]     = fx
      pos[i * 3 + 1] = fy
      pos[i * 3 + 2] = bz
    }
    mesh.current.geometry.attributes.position.needsUpdate = true

    // Subtle camera parallax (0.03x)
    state.camera.position.x += (mx * 0.6 - state.camera.position.x) * 0.03
    state.camera.position.y += (my * 0.4 - state.camera.position.y) * 0.03
  })

  return (
    <points ref={mesh} geometry={geo}>
      <pointsMaterial
        size={0.055}
        vertexColors
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

export default function AuthParticles() {
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
      dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      camera={{ position: [0, 0, 10], fov: 75 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0, background: 'transparent' }}
    >
      <Particles mouseRef={mouseRef} />
    </Canvas>
  )
}
