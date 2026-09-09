import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";
const bones = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 4],
  [4, 6],
  [3, 5],
  [5, 7],
  [1, 8],
  [8, 9],
  [8, 10],
  [9, 11],
  [11, 13],
  [10, 12],
  [12, 14],
];
function pose(phase: number): number[][] {
  const bend = phase === 1 ? 0.75 : phase === 2 ? 0.38 : 0;
  return [
    [0, 1.75 - bend, 0],
    [0, 1.15 - bend, 0],
    [-0.65, 1 - bend, 0],
    [0.65, 1 - bend, 0],
    [-1, 0.2 - bend * 0.2, 0.3],
    [1, 0.2 - bend * 0.2, 0.3],
    [-0.8, -0.35 + bend, 0.6],
    [0.8, -0.35 + bend, 0.6],
    [0, -0.2 - bend, 0.05],
    [-0.4, -0.2 - bend, 0],
    [0.4, -0.2 - bend, 0],
    [-0.65, -1.2, 0.1 + bend],
    [0.65, -1.2, 0.1 + bend],
    [-0.45, -2, 0],
    [0.45, -2, 0],
  ];
}
export default function PostureWorld({ step, pointer }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const joints = useRef<(THREE.Mesh | null)[]>([]);
  const geo = useMemo(
    () =>
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(new Float32Array(bones.length * 6), 3),
      ),
    [],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((_, dt) => {
    const target = pose(step.current);
    joints.current.forEach((m, i) => {
      if (m)
        m.position.lerp(new THREE.Vector3(...target[i]), 1 - Math.exp(-5 * dt));
    });
    const p = geo.getAttribute("position") as THREE.BufferAttribute;
    bones.forEach(([a, b], i) => {
      const from = joints.current[a]?.position;
      const to = joints.current[b]?.position;
      if (from && to) {
        p.setXYZ(i * 2, from.x, from.y, from.z);
        p.setXYZ(i * 2 + 1, to.x, to.y, to.z);
      }
    });
    p.needsUpdate = true;
    geo.computeBoundingSphere();
    if (group.current)
      group.current.rotation.y = THREE.MathUtils.damp(
        group.current.rotation.y,
        0.25 + pointer.x * 0.12,
        4,
        dt,
      );
  });
  return (
    <group ref={group} position={[0, 0.15, 0]}>
      <lineSegments geometry={geo}>
        <lineBasicMaterial color="#c5fa9a" />
      </lineSegments>
      {pose(0).map((p, i) => (
        <mesh
          key={i}
          position={p as [number, number, number]}
          ref={(el) => {
            joints.current[i] = el;
          }}
        >
          <sphereGeometry args={[i === 0 ? 0.25 : 0.065, 16, 16]} />
          <meshBasicMaterial color="#c5fa9a" wireframe={i === 0} />
        </mesh>
      ))}
      <mesh position={[0, -2.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.25, 1.26, 80]} />
        <meshBasicMaterial
          color="#719b62"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
