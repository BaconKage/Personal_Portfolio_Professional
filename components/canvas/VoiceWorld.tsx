import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";
export default function VoiceWorld({
  pointer,
  progress,
  quality,
  step,
}: SceneProps) {
  const g = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const points: number[] = [];
    const count = Math.round(100 * quality) + 45;
    for (let j = 0; j < count; j++) {
      const x = (j / count - 0.5) * 7;
      const height =
        0.3 + Math.abs(Math.sin(j * 0.19) * Math.cos(j * 0.044)) * 1.6;
      for (let i = 0; i < 60; i++) {
        for (const k of [i, i + 1]) {
          const t = (k / 60) * Math.PI * 2;
          points.push(x, Math.sin(t) * height, Math.cos(t) * height);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    return geometry;
  }, [quality]);
  useEffect(
    () => () => {
      geo.dispose();
    },
    [geo],
  );
  useFrame((_, dt) => {
    if (g.current) {
      g.current.children
        .filter((c) => c.type === "Mesh")
        .forEach((c, i) => {
          c.position.x = THREE.MathUtils.damp(
            c.position.x,
            -2.4 + step.current * 1.6 + i * 0.12,
            5,
            dt,
          );
        });
      g.current.rotation.y = THREE.MathUtils.damp(
        g.current.rotation.y,
        -0.2 + pointer.x * 0.08,
        4,
        dt,
      );
      g.current.rotation.x =
        0.12 + progress.current * 0.15 + step.current * 0.04;
    }
  });
  return (
    <group ref={g} rotation={[0.2, -0.2, -0.2]} position={[0.6, 0.1, 0]}>
      <lineSegments geometry={geo}>
        <lineBasicMaterial color="#668cff" transparent opacity={0.8} />
      </lineSegments>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0.1, 0, 0]}>
        <torusGeometry args={[1.9, 0.016, 8, 120]} />
        <meshBasicMaterial color="#d0ddff" />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0.22, 0, 0]}>
        <torusGeometry args={[1.95, 0.006, 6, 100]} />
        <meshBasicMaterial color="#527dff" />
      </mesh>
    </group>
  );
}
