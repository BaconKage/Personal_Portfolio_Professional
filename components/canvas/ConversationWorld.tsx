import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";
export default function ConversationWorld({
  pointer,
  progress,
  quality,
  step,
}: SceneProps) {
  const ref = useRef<THREE.Group>(null);
  const dots = useRef<THREE.InstancedMesh>(null);
  const dotMatrix = useMemo(() => new THREE.Matrix4(), []);
  const geometries = useMemo(
    () =>
      [0, 1].map((side) => {
        const points: number[] = [];
        for (let j = 0; j < 30 * quality + 15; j++) {
          const r = 0.45 + j * 0.025;
          for (let i = 0; i < 100; i++) {
            for (const k of [i, i + 1]) {
              const t = (k / 100) * Math.PI * 2;
              points.push(
                Math.cos(t) * r + Math.sin(t * 2) * 0.13,
                Math.sin(t) * 1.6,
                Math.sin(j * 0.15) * 0.55 + Math.cos(t) * 0.15,
              );
            }
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
        g.rotateZ(side ? 0.3 : -0.3);
        return g;
      }),
    [quality],
  );
  useEffect(
    () => () => {
      geometries.forEach((g) => g.dispose());
    },
    [geometries],
  );
  const motionTime = useRef(0);
  useFrame((_, dt) => {
    motionTime.current += Math.min(dt, 0.04);
    const time = motionTime.current;
    if (dots.current) {
      for (let i = 0; i < 24; i++) {
        dotMatrix.makeTranslation(
          -0.8 + i * 0.07,
          Math.sin(i * 0.22 + progress.current) * 0.22,
          0,
        );
        dots.current.setMatrixAt(i, dotMatrix);
      }
      dots.current.instanceMatrix.needsUpdate = true;
    }
    ref.current?.children.slice(0, 2).forEach((c, i) => {
      c.position.x = THREE.MathUtils.damp(
        c.position.x,
        (i ? 1 : -1) *
          ((step.current === 1 ? 1.15 : step.current === 2 ? 1.9 : 1.5) +
            Math.sin(time * 0.8) * 0.22),
        4,
        dt,
      );
    });
    if (ref.current)
      ref.current.rotation.y = THREE.MathUtils.damp(
        ref.current.rotation.y,
        pointer.x * 0.25 + step.current * 0.03 + Math.sin(time * 0.5) * 0.2,
        3,
        dt,
      );
  });
  return (
    <group ref={ref} position={[0.4, 0.5, 0]}>
      {geometries.map((geo, i) => (
        <lineSegments
          key={i}
          geometry={geo}
          position={[i ? 1.5 : -1.5, i ? -0.3 : 0.2, 0]}
        >
          <lineBasicMaterial
            color={i ? "#f5a480" : "#d2d9e8"}
            transparent
            opacity={0.8}
          />
        </lineSegments>
      ))}
      <instancedMesh
        ref={dots}
        args={[undefined, undefined, 24]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#f3bfa1" />
      </instancedMesh>
    </group>
  );
}
