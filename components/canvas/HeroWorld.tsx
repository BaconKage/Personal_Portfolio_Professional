import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";
export default function HeroWorld({ pointer, progress, quality }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const lines = useMemo(() => {
    const points: number[] = [];
    const count = Math.round(65 * quality) + 25;
    for (let j = 0; j < count; j++) {
      const a = (j / count) * Math.PI * 2;
      for (let i = 0; i < 150; i++) {
        for (const k of [i, i + 1]) {
          const t = (k / 150) * Math.PI * 2;
          const radius = 1.45 + 0.46 * Math.cos(a);
          points.push(
            radius * Math.cos(t),
            radius * Math.sin(t),
            0.46 * Math.sin(a) + Math.sin(t * 3 + a) * 0.045,
          );
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, [quality]);
  useEffect(
    () => () => {
      lines.dispose();
    },
    [lines],
  );
  useFrame((_, dt) => {
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(
        group.current.rotation.y,
        0.55 + pointer.x * 0.1,
        5,
        dt,
      );
      group.current.rotation.x = THREE.MathUtils.damp(
        group.current.rotation.x,
        0.18 + pointer.y * 0.1,
        5,
        dt,
      );
      group.current.rotation.z = -0.4 + progress.current * 0.2;
    }
  });
  return (
    <group ref={group} rotation={[0.18, 0.55, -0.4]} scale={1.16}>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#203e96" transparent opacity={0.58} />
      </lineSegments>
      <mesh>
        <torusGeometry args={[1.12, 0.085, 16, 160]} />
        <meshStandardMaterial
          color="#2046f7"
          metalness={0.65}
          roughness={0.2}
        />
      </mesh>
      <mesh rotation={[0, 0, 0.3]}>
        <torusGeometry args={[1.94, 0.012, 8, 160]} />
        <meshStandardMaterial color="#748bb0" metalness={0.7} roughness={0.3} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[Math.cos(i) * 1.92, Math.sin(i) * 1.92, 0]}>
          <sphereGeometry args={[i === 0 ? 0.07 : 0.035, 12, 12]} />
          <meshStandardMaterial
            color={i === 0 ? "#244cff" : "#8096be"}
            metalness={0.7}
            roughness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}
