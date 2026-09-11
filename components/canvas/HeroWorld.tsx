/* eslint-disable react-hooks/immutability -- Materials and transforms are mutable GPU state. */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";
import { CORE_IGNITION_MS } from "@/lib/motion";

/** A sculptural bundle of neural pathways, with a travelling charge and elastic focus. */
export default function HeroWorld({ pointer, quality }: SceneProps) {
  const rotation = useRef({ x: 0, y: 0 });
  const root = useRef<THREE.Group>(null);
  const wave =
    useRef<THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>>(null);
  const cloud = useRef<THREE.Points>(null);
  const orbit =
    useRef<THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>>(null);
  const time = useRef(0),
    charge = useRef(0);
  const element = useRef<HTMLElement | null>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCharge: { value: 0 },
      uIgnition: { value: 1 },
    }),
    [],
  );
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: "#aebbd5",
      metalness: 0.65,
      roughness: 0.24,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uCharge = uniforms.uCharge;
      shader.uniforms.uIgnition = uniforms.uIgnition;
      shader.vertexShader =
        "uniform float uTime; uniform float uCharge; varying vec2 neuralUv;\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        neuralUv=uv;
        float breath=sin(uv.x*37.7-uTime*.8)*.025+uCharge*.055*sin(uv.x*18.85-uTime*3.);
        transformed+=normal*breath;`,
      );
      shader.fragmentShader =
        "uniform float uTime; uniform float uCharge; uniform float uIgnition; varying vec2 neuralUv;\n" +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float reveal=smoothstep(0.,.72,uIgnition);
        if(uIgnition<.999 && neuralUv.x>reveal+.004) discard;
        float metalArrival=smoothstep(.22,.88,uIgnition);
        diffuseColor.rgb*=mix(.018,1.,metalArrival);`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float thread=pow(.5+.5*sin(neuralUv.y*100.53),18.);
        float pulse=pow(.5+.5*cos(neuralUv.x*18.85-uTime*1.3),16.);
        float leadingEdge=(1.-smoothstep(0.,.025,abs(neuralUv.x-reveal)))*(1.-smoothstep(.72,1.,uIgnition));
        totalEmissiveRadiance+=vec3(.035,.17,1.)*thread*(.22+pulse*(2.8+uCharge*4.)+(1.-metalArrival)*2.);
        totalEmissiveRadiance+=vec3(.35,.7,1.)*leadingEdge*3.;`,
      );
    };
    return m;
  }, [uniforms]);
  const particles = useMemo(() => {
    const n = quality < 0.75 ? 650 : 1500,
      pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2,
        r = 2.7 + Math.sin(i * 127.1) * 0.6;
      pos[i * 3] = Math.cos(t) * r;
      pos[i * 3 + 1] = Math.sin(t) * r;
      pos[i * 3 + 2] = Math.sin(i * 17.3) * 1.8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [quality]);
  useEffect(() => {
    element.current = document.querySelector(".hero");
    const fire = () => {
      charge.current = 1;
    };
    const turn = (event: Event) => {
      const d = (event as CustomEvent<{ x: number; y: number }>).detail;
      rotation.current.y += d.x;
      rotation.current.x = THREE.MathUtils.clamp(
        rotation.current.x + d.y,
        -1.1,
        1.1,
      );
    };
    window.addEventListener("core-turn", turn);
    const click = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".hero") &&
        !event.target.closest("a,button,select,.hero-core-surface")
      )
        fire();
    };
    window.addEventListener("neural-signal", fire);
    window.addEventListener("pointerdown", click);
    return () => {
      window.removeEventListener("core-turn", turn);
      window.removeEventListener("neural-signal", fire);
      window.removeEventListener("pointerdown", click);
      material.dispose();
      particles.dispose();
    };
  }, [material, particles]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.04);
    const phase = element.current?.dataset.ignition;
    const ignition =
      phase === "waiting"
        ? 0
        : phase === "running"
          ? THREE.MathUtils.clamp(
              (performance.now() -
                Number(element.current?.dataset.ignitionStart)) /
                CORE_IGNITION_MS,
              0,
              1,
            )
          : 1;
    const settle = THREE.MathUtils.smootherstep(ignition, 0.18, 1);
    const arrival = THREE.MathUtils.smootherstep(ignition, 0.4, 1);
    time.current += dt;
    charge.current = THREE.MathUtils.damp(charge.current, 0, 1.3, dt);
    uniforms.uTime.value = time.current;
    uniforms.uCharge.value =
      charge.current + Math.sin(ignition * Math.PI) * 0.7;
    uniforms.uIgnition.value = ignition;
    if (wave.current) {
      wave.current.scale.setScalar(1 + (1 - charge.current) * 0.65);
      wave.current.material.opacity = charge.current * 0.65;
    }
    cloud.current?.scale.setScalar(1 + charge.current * 0.16);
    if (cloud.current)
      (cloud.current.material as THREE.PointsMaterial).opacity = 0.58 * arrival;
    if (orbit.current) orbit.current.material.opacity = 0.45 * arrival;
    if (!root.current) return;
    const r = element.current?.getBoundingClientRect();
    const mobile = !!r && r.width < 768;
    const halfWidth = 2.99 * (r ? r.width / r.height : 1.8);
    root.current.position.set(
      mobile ? 0 : halfWidth * 0.39 * settle,
      (mobile ? -0.3 : 0.1) * settle,
      0,
    );
    root.current.rotation.x = THREE.MathUtils.damp(
      root.current.rotation.x,
      0.25 + pointer.y * 0.18 * settle + rotation.current.x,
      4,
      dt,
    );
    root.current.rotation.y = THREE.MathUtils.damp(
      root.current.rotation.y,
      time.current * 0.12 + pointer.x * 0.22 * settle + rotation.current.y,
      4,
      dt,
    );
    root.current.rotation.z = -0.36 + Math.sin(time.current * 0.23) * 0.08;
    root.current.scale.setScalar(
      (mobile ? 0.5 : 1.05) *
        (1 + charge.current * 0.08) *
        (1 + (1 - settle) * 0.24),
    );
  });
  return (
    <group ref={root}>
      <mesh material={material}>
        <torusKnotGeometry
          args={[1.65, 0.43, quality < 0.75 ? 160 : 256, 24, 2, 3]}
        />
      </mesh>
      <points ref={cloud} geometry={particles}>
        <pointsMaterial
          color="#86b1ff"
          size={0.023}
          transparent
          opacity={0.58}
          depthWrite={false}
        />
      </points>
      <mesh ref={orbit} rotation={[Math.PI / 2.7, 0.2, 0]}>
        <torusGeometry args={[2.75, 0.009, 5, 160]} />
        <meshBasicMaterial color="#638cff" transparent opacity={0.45} />
      </mesh>
      <mesh ref={wave} rotation={[Math.PI / 2.7, 0.2, 0]}>
        <torusGeometry args={[2.75, 0.016, 6, 128]} />
        <meshBasicMaterial
          color="#b8d6ff"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
