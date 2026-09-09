import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { SceneProps } from "./types";
const locations = [
  [-2.35, 0, -1.35],
  [0, 0, -1.35],
  [2.35, 0, -1.35],
  [-2.35, 0, 1.05],
  [0, 0, 1.05],
  [2.35, 0, 1.05],
  [0, 0, 3.45],
];
export default function MyGymWorld({ progress, pointer, step }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const modules = useRef<(THREE.Group | null)[]>([]);
  useFrame((_, dt) => {
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(
        group.current.rotation.y,
        -0.5 + pointer.x * 0.09,
        4,
        dt,
      );
    }
    const assemble = THREE.MathUtils.smoothstep(progress.current, 0.1, 0.5);
    modules.current.forEach((m, i) => {
      if (!m) return;
      m.position.y = THREE.MathUtils.damp(
        m.position.y,
        (1 - assemble) * (i % 2 ? 1.5 : -1.3) +
          (step.current === 1
            ? i === 4
              ? 1.1
              : -0.2
            : step.current === 2
              ? (i % 3) * 0.45
              : 0),
        4,
        dt,
      );
    });
  });
  return (
    <group
      ref={group}
      rotation={[0.55, -0.5, 0.02]}
      position={[0.4, -0.65, 0]}
      scale={0.82}
    >
      {locations.map(([x, y, z], i) => (
        <group
          key={i}
          ref={(el) => {
            modules.current[i] = el;
          }}
          position={[x, y, z]}
        >
          <RoundedBox args={[1.95, 0.66, 1.9]} radius={0.1} smoothness={3}>
            <meshStandardMaterial
              color={i === 4 ? "#244cff" : "#a6b7d4"}
              metalness={0.7}
              roughness={0.24}
            />
          </RoundedBox>
          <RoundedBox
            args={[1.99, 0.04, 1.94]}
            position={[0, -0.19, 0]}
            radius={0.06}
            smoothness={2}
          >
            <meshStandardMaterial
              color="#345aff"
              emissive="#244cff"
              emissiveIntensity={0.8}
            />
          </RoundedBox>
          <mesh position={[0, 0.345, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.37, 0.4, 40]} />
            <meshStandardMaterial
              color={i === 4 ? "#c6ffad" : "#e4ecfb"}
              metalness={0.45}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0.37, 0]}>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshStandardMaterial
              color={i === 4 ? "#bcff8c" : "#b4ceff"}
              emissive={i === 4 ? "#6cde47" : "#527dff"}
              emissiveIntensity={0.8}
            />
          </mesh>
          {[0, 1, 2, 3].map((n) => (
            <mesh key={n} position={[-0.62 + n * 0.13, 0.344, 0.6]}>
              <boxGeometry args={[0.06, 0.015, 0.18]} />
              <meshStandardMaterial color="#35445e" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, -0.48, 1]}>
        <boxGeometry args={[0.025, 0.025, 6]} />
        <meshBasicMaterial color="#88adff" />
      </mesh>
      <mesh position={[0, -0.48, 1.05]}>
        <boxGeometry args={[5, 0.025, 0.025]} />
        <meshBasicMaterial color="#88adff" />
      </mesh>
    </group>
  );
}
