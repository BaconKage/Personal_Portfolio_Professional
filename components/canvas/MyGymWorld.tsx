import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBoxGeometry } from "@react-three/drei";
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
  const bodies = useRef<THREE.InstancedMesh>(null);
  const edges = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const dots = useRef<THREE.InstancedMesh>(null);
  const activeDot = useRef<THREE.Mesh>(null);
  const details = useRef<THREE.InstancedMesh>(null);
  const heights = useRef(new Float32Array(7));
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const motionTime = useRef(0);
  useEffect(() => {
    const color = new THREE.Color();
    for (let i = 0; i < 7; i++) {
      bodies.current?.setColorAt(i, color.set(i === 4 ? "#244cff" : "#a6b7d4"));
      rings.current?.setColorAt(i, color.set(i === 4 ? "#c6ffad" : "#e4ecfb"));
    }
    for (const mesh of [bodies.current, rings.current])
      if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
    for (const mesh of [
      bodies.current,
      edges.current,
      rings.current,
      dots.current,
      details.current,
    ])
      mesh?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.04);
    motionTime.current += dt;
    const time = motionTime.current;
    if (group.current)
      group.current.rotation.y = THREE.MathUtils.damp(
        group.current.rotation.y,
        -0.65 +
          pointer.x * 0.23 +
          Math.sin(time * 0.4) * 0.14 +
          (progress.current - 0.5) * 0.6,
        4,
        dt,
      );
    const assemble = THREE.MathUtils.smoothstep(progress.current, 0.1, 0.5);
    let dotIndex = 0;
    for (let i = 0; i < 7; i++) {
      const [x, , z] = locations[i];
      const y = (heights.current[i] = THREE.MathUtils.damp(
        heights.current[i],
        (1 - assemble) * (i % 2 ? 3 : -2.6) +
          Math.sin(time * 1.15 + i * 0.8) * 0.14 +
          (step.current === 1
            ? i === 4
              ? 1.1
              : -0.2
            : step.current === 2
              ? (i % 3) * 0.45
              : 0),
        4,
        dt,
      ));
      bodies.current?.setMatrixAt(i, matrix.makeTranslation(x, y, z));
      edges.current?.setMatrixAt(i, matrix.makeTranslation(x, y - 0.19, z));
      matrix.makeRotationX(-Math.PI / 2).setPosition(x, y + 0.345, z);
      rings.current?.setMatrixAt(i, matrix);
      if (i === 4) activeDot.current?.position.set(x, y + 0.37, z);
      else
        dots.current?.setMatrixAt(
          dotIndex++,
          matrix.makeTranslation(x, y + 0.37, z),
        );
      for (let n = 0; n < 4; n++)
        details.current?.setMatrixAt(
          i * 4 + n,
          matrix.makeTranslation(x - 0.62 + n * 0.13, y + 0.344, z + 0.6),
        );
    }
    for (const mesh of [
      bodies.current,
      edges.current,
      rings.current,
      dots.current,
      details.current,
    ])
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group
      ref={group}
      rotation={[0.55, -0.5, 0.02]}
      position={[0.4, -0.65, 0]}
      scale={0.82}
    >
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, 7]}
        frustumCulled={false}
      >
        <RoundedBoxGeometry
          args={[1.95, 0.66, 1.9]}
          radius={0.1}
          smoothness={3}
        />
        <meshStandardMaterial metalness={0.7} roughness={0.24} />
      </instancedMesh>
      <instancedMesh
        ref={edges}
        args={[undefined, undefined, 7]}
        frustumCulled={false}
      >
        <RoundedBoxGeometry
          args={[1.99, 0.04, 1.94]}
          radius={0.06}
          smoothness={2}
        />
        <meshStandardMaterial
          color="#345aff"
          emissive="#244cff"
          emissiveIntensity={0.8}
        />
      </instancedMesh>
      <instancedMesh
        ref={rings}
        args={[undefined, undefined, 7]}
        frustumCulled={false}
      >
        <ringGeometry args={[0.37, 0.4, 40]} />
        <meshStandardMaterial metalness={0.45} roughness={0.2} />
      </instancedMesh>
      <instancedMesh
        ref={dots}
        args={[undefined, undefined, 6]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshStandardMaterial
          color="#b4ceff"
          emissive="#527dff"
          emissiveIntensity={0.8}
        />
      </instancedMesh>
      <mesh ref={activeDot}>
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshStandardMaterial
          color="#bcff8c"
          emissive="#6cde47"
          emissiveIntensity={0.8}
        />
      </mesh>
      <instancedMesh
        ref={details}
        args={[undefined, undefined, 28]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.06, 0.015, 0.18]} />
        <meshStandardMaterial color="#35445e" />
      </instancedMesh>
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
