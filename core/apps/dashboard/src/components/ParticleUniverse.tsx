'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Particles({ count = 2000 }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const light = useRef<THREE.PointLight>(null);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const time = Math.random() * 100;
      const factor = Math.random() * 100 + 20;
      const speed = Math.random() * 0.01 + 0.005;
      const x = Math.random() * 100 - 50;
      const y = Math.random() * 100 - 50;
      const z = Math.random() * 100 - 50;
      temp.push({ time, factor, speed, x, y, z });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    particles.forEach((particle, i) => {
      let { time, factor, speed, x, y, z } = particle;
      let t = particle.time += speed;
      dummy.position.set(
        x + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        y + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        z + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
      );
      dummy.scale.setScalar(Math.max(0.2, Math.sin(t)));
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(i, dummy.matrix);
    });
    if (mesh.current) {
      mesh.current.instanceMatrix.needsUpdate = true;
    }
    
    // Slight camera movement based on mouse
    state.camera.position.x += (state.pointer.x * 5 - state.camera.position.x) * 0.05;
    state.camera.position.y += (state.pointer.y * 5 - state.camera.position.y) * 0.05;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <pointLight ref={light} distance={40} intensity={8} color="lightblue" />
      <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </instancedMesh>
    </>
  );
}

export function ParticleUniverse() {
  return (
    <div className="fixed inset-0 z-[-1] bg-gradient-to-b from-[#050505] to-[#0A0C10]">
      <Canvas camera={{ position: [0, 0, 30], fov: 75 }}>
        <fog attach="fog" args={['#050505', 10, 40]} />
        <ambientLight intensity={0.5} />
        <Particles count={3000} />
      </Canvas>
      {/* Subtle overlay gradients for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(59,167,255,0.05)] via-transparent to-transparent pointer-events-none"></div>
    </div>
  );
}
