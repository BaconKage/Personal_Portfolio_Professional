import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { SceneProps } from "./types";
import type { PlaygroundInput } from "@/lib/playground-input";
import {
  advancePlayground,
  assembleBodies,
  createPlaygroundPhysics,
  grabBody,
  moveBody,
  nudgeBody,
  releaseBody,
  resizePlayground,
} from "@/lib/playground-physics";

const colors = ["#7598ff", "#aecbff", "#efa87d", "#b4a1ff", "#c9eea0"];
function Finish({ color = "#a9bad5" }: { color?: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={0.62}
      roughness={0.24}
      clearcoat={1}
      clearcoatRoughness={0.16}
    />
  );
}

function Modules() {
  return (
    <group rotation={[0.45, -0.55, -0.12]}>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((y) => (
          <group
            key={`${x}:${y}`}
            position={[x * 0.32, y * 0.32, x === y ? 0.12 : -0.12]}
          >
            <RoundedBox args={[0.53, 0.53, 0.47]} radius={0.07} smoothness={2}>
              <Finish color={x === y ? "#3866ff" : "#bfcde2"} />
            </RoundedBox>
            <mesh position={[0, 0, 0.246]}>
              <ringGeometry args={[0.115, 0.135, 28]} />
              <meshBasicMaterial color="#cee5ff" />
            </mesh>
          </group>
        )),
      )}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.07, 1.15, 0.07]} />
        <Finish />
      </mesh>
    </group>
  );
}

function Waveform() {
  const wave = useMemo(() => {
    const points = Array.from({ length: 60 }, (_, i) => {
      const x = (i / 59) * 1.6 - 0.8;
      return new THREE.Vector3(
        x,
        Math.sin(x * 15) * 0.24 * Math.cos(x),
        Math.cos(x * 15) * 0.12,
      );
    });
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      100,
      0.045,
      8,
      false,
    );
  }, []);
  useEffect(() => () => wave.dispose(), [wave]);
  return (
    <group rotation={[0.15, -0.35, -0.22]}>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.52, 0.11, 12, 60]} />
        <Finish color="#8299c3" />
      </mesh>
      <mesh geometry={wave}>
        <meshPhysicalMaterial
          color="#c8f0ff"
          emissive="#457ef3"
          emissiveIntensity={0.5}
          metalness={0.25}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function Conversation() {
  return (
    <group rotation={[0.1, 0.2, -0.2]}>
      <mesh position={[-0.32, 0.05, 0.08]} rotation={[0.2, 0.18, 0.34]}>
        <torusGeometry args={[0.35, 0.15, 16, 56, Math.PI * 1.7]} />
        <Finish color="#efab83" />
      </mesh>
      <mesh
        position={[0.32, -0.05, -0.08]}
        rotation={[-0.2, -0.18, Math.PI + 0.34]}
      >
        <torusGeometry args={[0.35, 0.15, 16, 56, Math.PI * 1.7]} />
        <Finish color="#c2d6eb" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.065, 16, 16]} />
        <meshBasicMaterial color="#ffcea6" />
      </mesh>
    </group>
  );
}

function Languages() {
  const glyphs = useLoader(
    THREE.TextureLoader,
    [0, 1, 2, 3].map((i) => `/art/glyph-${i}.png`),
  );
  return (
    <group rotation={[0.12, -0.15, 0.15]}>
      <mesh rotation={[0.4, 0.1, 0]}>
        <torusGeometry args={[0.57, 0.065, 12, 64]} />
        <Finish color="#8e88ce" />
      </mesh>
      {glyphs.map((texture, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.49, Math.sin(a) * 0.49, 0.14]}
            rotation={[0, 0, -0.15]}
          >
            <planeGeometry args={[0.51, 0.51]} />
            <meshBasicMaterial
              map={texture}
              color={i % 2 ? "#d7c6ff" : "#b6d6ff"}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
      <mesh position={[0.59, -0.08, 0.05]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <Finish color="#e5b38c" />
      </mesh>
    </group>
  );
}

const joints: [number, number, number][] = [
  [0, 0.66, 0],
  [0, 0.34, 0],
  [-0.3, 0.25, 0],
  [-0.46, -0.1, 0.08],
  [0.31, 0.3, 0],
  [0.51, 0.53, 0.08],
  [0, -0.15, 0],
  [-0.26, -0.4, 0.1],
  [-0.36, -0.72, 0],
  [0.3, -0.38, -0.1],
  [0.51, -0.65, 0],
];
const bones = [
  [0, 1],
  [1, 2],
  [2, 3],
  [1, 4],
  [4, 5],
  [1, 6],
  [6, 7],
  [7, 8],
  [6, 9],
  [9, 10],
];
function Posture() {
  const links = useMemo(
    () =>
      bones.map(([from, to]) => {
        const a = new THREE.Vector3(...joints[from]),
          b = new THREE.Vector3(...joints[to]);
        return {
          position: a.clone().add(b).multiplyScalar(0.5),
          length: a.distanceTo(b),
          rotation: new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            b.clone().sub(a).normalize(),
          ),
        };
      }),
    [],
  );
  return (
    <group rotation={[0.1, -0.25, -0.12]}>
      {links.map((bone, i) => (
        <mesh key={i} position={bone.position} quaternion={bone.rotation}>
          <cylinderGeometry args={[0.045, 0.045, bone.length, 10]} />
          <Finish color="#a0b5a4" />
        </mesh>
      ))}
      {joints.map((position, i) => (
        <mesh position={position} key={i}>
          <sphereGeometry args={[i === 0 ? 0.15 : 0.085, 16, 16]} />
          <Finish color={i === 0 || i === 6 ? "#ccefaa" : "#d5e2c5"} />
        </mesh>
      ))}
    </group>
  );
}

const shapes = [Modules, Waveform, Conversation, Languages, Posture];
export default function PlaygroundWorld({
  element,
  camera,
  layout,
}: SceneProps) {
  const physics = useMemo(() => createPlaygroundPhysics(), []);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const rings = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const hitTargets = useRef<HTMLButtonElement[]>([]);
  const selected = useRef(-1),
    hovered = useRef(-1);
  const time = useRef(0);
  const lastSize = useRef({ width: 0, height: 0 });
  const projected = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    hitTargets.current = Array.from(
      element.querySelectorAll<HTMLButtonElement>("[data-body]"),
    );
    selected.current = Number(element.dataset.selected ?? -1);
    const input = (event: Event) => {
      const action = (event as CustomEvent<PlaygroundInput>).detail;
      if (action.kind === "grab")
        grabBody(
          physics,
          action.index,
          action.x * lastSize.current.width,
          action.y * lastSize.current.height,
        );
      if (action.kind === "move")
        moveBody(
          physics,
          action.x * lastSize.current.width,
          action.y * lastSize.current.height,
        );
      if (action.kind === "release")
        releaseBody(
          physics,
          action.vx * lastSize.current.width,
          action.vy * lastSize.current.height,
        );
      if (action.kind === "cancel") releaseBody(physics);
      if (action.kind === "select") selected.current = action.index;
      if (action.kind === "hover") hovered.current = action.index;
      if (action.kind === "nudge")
        nudgeBody(physics, action.index, action.x, action.y);
      if (action.kind === "assemble") {
        selected.current = -1;
        hovered.current = -1;
        assembleBodies(physics);
      }
    };
    element.addEventListener("playground-input", input);
    return () => {
      element.removeEventListener("playground-input", input);
      element.dispatchEvent(new Event("playground-reset-gesture"));
      hitTargets.current.forEach((button) => button.removeAttribute("style"));
    };
  }, [element, physics]);

  useFrame((_, delta) => {
    if (document.hidden || camera.position.z === 0) return;
    const rect = layout.rect;
    if (
      !rect ||
      rect.bottom <= 0 ||
      rect.top >= innerHeight ||
      rect.width < 1 ||
      rect.height < 1
    )
      return;
    const height =
      2 *
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
      camera.position.z;
    const width = (height * rect.width) / rect.height;
    if (
      Math.abs(width - lastSize.current.width) > 0.01 ||
      Math.abs(height - lastSize.current.height) > 0.01
    ) {
      // Reserve the frame's top metadata and bottom controls, plus side padding.
      resizePlayground(physics, width - 0.4, height - 1.4);
      // A newly mounted scene starts in its formation, with no fly-in delay.
      if (!lastSize.current.width)
        physics.bodies.forEach((body) => {
          body.x = body.homeX;
          body.y = body.homeY;
        });
      lastSize.current = { width, height };
    }
    const dt = Math.min(delta, 0.05);
    time.current += dt;
    advancePlayground(physics, dt);
    physics.bodies.forEach((body, i) => {
      const group = groups.current[i],
        button = hitTargets.current[i];
      if (!group || !button) return;
      const active = selected.current === i;
      const hover = hovered.current === i;
      const dragging = physics.drag?.index === i;
      const lift = active ? 0.75 : dragging ? 0.45 : hover ? 0.2 : 0;
      group.position.set(
        body.x,
        body.y,
        THREE.MathUtils.damp(group.position.z, lift, 6, dt),
      );
      const scale =
        (body.radius / 0.92) * (active ? 1.09 : hover || dragging ? 1.035 : 1);
      group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, scale, 7, dt));
      group.rotation.set(
        Math.sin(time.current * 0.5 + i) * 0.1,
        Math.sin(time.current * 0.35 + i * 2) * 0.13,
        body.angle,
      );
      if (rings.current[i])
        rings.current[i]!.opacity = THREE.MathUtils.damp(
          rings.current[i]!.opacity,
          active ? 0.6 : hover || dragging ? 0.28 : 0.065,
          6,
          dt,
        );
      projected.copy(group.position).project(camera);
      const size = Math.max(
        50,
        (((body.radius * 2) / height) * rect.height * camera.position.z) /
          (camera.position.z - group.position.z),
      );
      const x = ((projected.x + 1) * 0.5 * rect.width).toFixed(2);
      const y = ((1 - projected.y) * 0.5 * rect.height).toFixed(2);
      button.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
      const rounded = `${size.toFixed(1)}px`;
      if (button.style.width !== rounded) {
        button.style.width = rounded;
        button.style.height = rounded;
      }
      const stacking = active || dragging ? "4" : "3";
      if (button.style.zIndex !== stacking) button.style.zIndex = stacking;
    });
  });

  return (
    <>
      <pointLight
        position={[0, 0, 4]}
        color="#bed3ff"
        intensity={9}
        distance={14}
        decay={2}
      />
      {shapes.map((Shape, i) => (
        <group
          key={i}
          ref={(group) => {
            groups.current[i] = group;
          }}
        >
          <Shape />
          <mesh position={[0, 0, -0.65]}>
            <ringGeometry args={[0.99, 1.005, 72]} />
            <meshBasicMaterial
              ref={(material) => {
                rings.current[i] = material;
              }}
              color={colors[i]}
              transparent
              opacity={0.065}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
