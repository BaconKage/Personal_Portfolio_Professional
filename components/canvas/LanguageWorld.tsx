import { useEffect, useMemo, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";
function Glyph({
  glyph,
  position,
  color,
}: {
  glyph: string;
  position: [number, number, number];
  color: string;
}) {
  const texture = useLoader(THREE.TextureLoader, `/art/glyph-${glyph}.png`);
  return (
    <mesh position={position}>
      <planeGeometry args={[1.7, 1.7]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
export default function LanguageWorld({ pointer, step }: SceneProps) {
  const ref = useRef<THREE.Group>(null);
  const ring = useMemo(() => {
    const points: number[] = [];
    for (let i = 0; i < 160; i++) {
      for (const k of [i, i + 1]) {
        const t = (k / 160) * Math.PI * 2;
        points.push(Math.cos(t) * 3, Math.sin(t) * 1.05, 0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, []);
  useEffect(() => () => ring.dispose(), [ring]);
  const motionTime = useRef(0);
  useFrame((_, dt) => {
    motionTime.current += Math.min(dt, 0.04);
    const time = motionTime.current;
    ref.current?.children
      .filter((c) => c.type === "Mesh")
      .slice(0, 4)
      .forEach((c, i) => {
        c.scale.setScalar(
          THREE.MathUtils.damp(
            c.scale.x,
            i === step.current ? 1.18 : 0.82,
            5,
            dt,
          ),
        );
      });
    if (ref.current)
      ref.current.rotation.z = THREE.MathUtils.damp(
        ref.current.rotation.z,
        -0.17 +
          pointer.x * 0.12 +
          step.current * 0.05 +
          Math.sin(time * 0.5) * 0.12,
        4,
        dt,
      );
  });
  return (
    <group ref={ref} position={[0, -0.4, 0]} rotation={[0, 0, -0.17]}>
      {[0, 1, 2].map((i) => (
        <lineSegments
          key={i}
          geometry={ring}
          rotation={[0.2 * i, 0.2, i * 0.75]}
        >
          <lineBasicMaterial color="#244cff" transparent opacity={0.22} />
        </lineSegments>
      ))}
      <Glyph glyph="0" position={[-2, 0.2, 0]} color="#244cff" />
      <Glyph glyph="1" position={[0, 1, 0]} color="#cf6949" />
      <Glyph glyph="2" position={[1.9, -0.2, 0]} color="#244cff" />
      <Glyph glyph="3" position={[-0.2, -1.25, 0]} color="#244cff" />
      <mesh position={[2, 1.25, 0]}>
        <sphereGeometry args={[0.15, 20, 20]} />
        <meshStandardMaterial color="#df8457" roughness={0.35} />
      </mesh>
    </group>
  );
}
