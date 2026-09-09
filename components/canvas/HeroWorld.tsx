/* The instanced transforms are mutable GPU state owned by R3F. */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";

/** Spring-driven connector field: inertial drift, contact separation and pointer repulsion. */
export default function HeroWorld({ pointer, quality, progress }: SceneProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const elapsed = useRef(0);
  const count = quality < 0.75 ? 22 : 42;
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outline = [
      [-0.22, 0.7],
      [0.22, 0.7],
      [0.22, 0.22],
      [0.7, 0.22],
      [0.7, -0.22],
      [0.22, -0.22],
      [0.22, -0.7],
      [-0.22, -0.7],
      [-0.22, -0.22],
      [-0.7, -0.22],
      [-0.7, 0.22],
      [-0.22, 0.22],
    ];
    outline.forEach(([x, y], i) =>
      i ? shape.lineTo(x, y) : shape.moveTo(x, y),
    );
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.13, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.5,
      bevelEnabled: true,
      bevelThickness: 0.11,
      bevelSize: 0.11,
      bevelSegments: 4,
      steps: 1,
      curveSegments: 24,
    });
    g.center();
    return g;
  }, []);
  const bodies = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = (n: number) => {
          const v = Math.sin(n * 127.1 + 17.3) * 43758.5453;
          return v - Math.floor(v);
        };
        const home = new THREE.Vector3(
          (seed(i + 1) - 0.5) * 12,
          (seed(i + 54) - 0.5) * 6,
          (seed(i + 102) - 0.5) * 3,
        );
        return {
          home,
          position: home.clone(),
          velocity: new THREE.Vector3(),
          rotation: new THREE.Euler(
            seed(i + 8) * 6,
            seed(i + 20) * 6,
            seed(i + 40) * 6,
          ),
          scale: 0.58 + seed(i + 16) * 0.55,
        };
      }),
    [count],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const push = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (mesh.current) {
      bodies.forEach((_, i) =>
        mesh.current!.setColorAt(
          i,
          new THREE.Color(
            i % 4 === 0 ? "#2345ff" : i % 4 === 1 ? "#424956" : "#c4ccd7",
          ),
        ),
      );
      if (mesh.current.instanceColor)
        mesh.current.instanceColor.needsUpdate = true;
    }
  }, [bodies]);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    const dt = Math.min(delta, 0.035);
    elapsed.current += dt;
    const time = elapsed.current;
    bodies.forEach((b, i) => {
      target.copy(b.home);
      target.y += Math.sin(time * 0.45 + i) * 0.55;
      target.x += Math.cos(time * 0.3 + i) * 0.35;
      b.velocity.addScaledVector(target.sub(b.position), dt * 0.9);
      push.set(
        b.position.x - pointer.x * 6.5,
        b.position.y - pointer.y * 3.8,
        b.position.z - 0.7,
      );
      const distance = push.length();
      if (distance < 2.2 && distance > 0.01)
        b.velocity.addScaledVector(push.normalize(), (2.2 - distance) * dt * 3);
      for (let j = i + 1; j < bodies.length; j++) {
        const other = bodies[j];
        push.copy(b.position).sub(other.position);
        const d = push.length(),
          radius = (b.scale + other.scale) * 0.62;
        if (d < radius && d > 0.01) {
          push.multiplyScalar(((radius - d) * dt * 3) / d);
          b.velocity.add(push);
          other.velocity.sub(push);
        }
      }
      b.velocity.multiplyScalar(Math.exp(-dt * 1.35));
      b.position.addScaledVector(b.velocity, dt);
      b.rotation.x += dt * (0.15 + (i % 3) * 0.05);
      b.rotation.y += dt * (i % 2 ? 0.2 : -0.14);
      b.rotation.z += dt * 0.075;
      dummy.position.copy(b.position);
      dummy.rotation.copy(b.rotation);
      dummy.scale.setScalar(b.scale * (1 + progress.current * 0.08));
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, count]}
      frustumCulled={false}
    >
      <meshStandardMaterial metalness={0.55} roughness={0.22} />
    </instancedMesh>
  );
}
