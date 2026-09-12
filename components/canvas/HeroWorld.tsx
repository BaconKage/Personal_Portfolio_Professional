/* eslint-disable react-hooks/immutability -- Materials and transforms are mutable GPU state. */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";
import { CORE_IGNITION_MS } from "@/lib/motion";
import { getCoreState, sampleCore } from "@/lib/core-sequence";
import { createCoreStars } from "./CoreStars";

/** A sculptural bundle of neural pathways, with a travelling charge and elastic focus. */
export default function HeroWorld({ pointer, quality }: SceneProps) {
  const rotation = useRef({ x: 0, y: 0 });
  const root = useRef<THREE.Group>(null);
  const sculpture = useRef<THREE.Mesh>(null);
  const starField = useRef<THREE.Points>(null);
  const glow = useRef<THREE.Mesh>(null);
  const wave =
    useRef<THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>>(null);
  const cloud = useRef<THREE.Points>(null);
  const orbit =
    useRef<THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>>(null);
  const time = useRef(0);
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
      transparent: true,
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
        float bloom=pow(.5+.5*sin(neuralUv.y*100.53),4.);
        totalEmissiveRadiance+=vec3(.035,.17,1.)*thread*(.22+uCharge*12.+pulse*(2.8+uCharge*4.)+(1.-metalArrival)*2.);
        totalEmissiveRadiance+=vec3(.015,.07,1.)*bloom*uCharge*1.8;
        totalEmissiveRadiance+=vec3(.35,.7,1.)*leadingEdge*3.;`,
      );
    };
    return m;
  }, [uniforms]);
  const knot = useMemo(
    () =>
      new THREE.TorusKnotGeometry(
        1.65,
        0.43,
        quality < 0.75 ? 160 : 256,
        24,
        2,
        3,
      ),
    [quality],
  );
  const stars = useMemo(() => createCoreStars(knot, quality), [knot, quality]);
  const glowMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uEnergy: { value: 0 } },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform float uEnergy; varying vec2 vUv;
      void main(){float r=length(vUv-.5); float glow=exp(-r*r*17.)*(1.-smoothstep(.3,.5,r));
      gl_FragColor=vec4(.025,.15,1.,glow*uEnergy*.38);
      #include <colorspace_fragment>
      }`,
      }),
    [],
  );
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
    const turn = (event: Event) => {
      if (getCoreState().phase !== "idle") return;
      const d = (event as CustomEvent<{ x: number; y: number }>).detail;
      rotation.current.y += d.x;
      rotation.current.x = THREE.MathUtils.clamp(
        rotation.current.x + d.y,
        -1.1,
        1.1,
      );
    };
    window.addEventListener("core-turn", turn);
    return () => {
      window.removeEventListener("core-turn", turn);
      material.dispose();
      particles.dispose();
      knot.dispose();
      stars.dispose();
      glowMaterial.dispose();
    };
  }, [material, particles, knot, stars, glowMaterial]);
  useFrame(({ gl }, delta) => {
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
    const core = getCoreState();
    const frame = sampleCore(core, performance.now());
    time.current += dt;
    uniforms.uTime.value = time.current;
    uniforms.uCharge.value = frame.energy + Math.sin(ignition * Math.PI) * 0.7;
    uniforms.uIgnition.value = ignition;
    material.opacity = frame.surface;
    material.depthWrite = frame.surface > 0.98;
    if (sculpture.current) sculpture.current.visible = frame.surface > 0.001;
    if (wave.current) {
      const release =
        core.phase === "dispersing"
          ? Math.min(1, (performance.now() - core.startedAt) / 1600)
          : 0;
      wave.current.scale.setScalar(1 + release * 5);
      wave.current.material.opacity = Math.sin(release * Math.PI) * 0.3;
    }
    cloud.current?.scale.setScalar(1 + frame.energy * 0.16);
    if (cloud.current)
      (cloud.current.material as THREE.PointsMaterial).opacity =
        0.58 * arrival * frame.surface;
    if (orbit.current)
      orbit.current.material.opacity = 0.45 * arrival * frame.surface;
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
        (1 + frame.energy * 0.08) *
        (1 + (1 - settle) * 0.24),
    );
    root.current.updateMatrixWorld();
    stars.uniforms.uCoreMatrix.value.copy(root.current.matrixWorld);
    stars.uniforms.uSpread.value = frame.spread;
    stars.uniforms.uOpacity.value = frame.stars;
    stars.uniforms.uEnergy.value = frame.energy;
    stars.uniforms.uTime.value = time.current;
    stars.uniforms.uAspect.value = r ? r.width / r.height : 1.8;
    stars.uniforms.uDpr.value = gl.getPixelRatio();
    stars.uniforms.uPointer.value.x = THREE.MathUtils.damp(
      stars.uniforms.uPointer.value.x,
      pointer.x,
      3,
      dt,
    );
    stars.uniforms.uPointer.value.y = THREE.MathUtils.damp(
      stars.uniforms.uPointer.value.y,
      pointer.y,
      3,
      dt,
    );
    if (starField.current) starField.current.visible = frame.stars > 0.001;
    glowMaterial.uniforms.uEnergy.value = frame.energy;
    if (glow.current) {
      glow.current.position.copy(root.current.position);
      glow.current.position.z = -1;
      glow.current.scale.setScalar((mobile ? 0.5 : 1.05) * (1 + frame.spread));
      glow.current.visible = frame.energy > 0.001;
    }
  });
  return (
    <>
      <group ref={root}>
        <mesh ref={sculpture} geometry={knot} material={material} />
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
      <mesh ref={glow} material={glowMaterial} renderOrder={-1}>
        <planeGeometry args={[9, 9]} />
      </mesh>
      <points
        ref={starField}
        geometry={stars.geometry}
        material={stars.material}
        frustumCulled={false}
        renderOrder={2}
      />
    </>
  );
}
