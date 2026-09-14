/* eslint-disable react-hooks/immutability -- Shader uniforms and Three.js transforms are mutable GPU state. */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";
import {
  createPortalGeometry,
  portalPointsVertex,
  portalLinesVertex,
} from "./PortalGeometry";

export default function PortalWorld({
  pointer,
  quality,
  step,
  layout,
}: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const buffers = useMemo(
    () => createPortalGeometry(quality < 0.75 ? 1400 : 3200),
    [quality],
  );
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uBlend: { value: 0 },
      uOrbitOffset: { value: 0 },
      uPixelScale: { value: 1 },
      uLineColor: { value: new THREE.Color("#638dff") },
    }),
    [],
  );
  // Own these materials so Fiber's uniform reconciliation cannot copy the
  // wrappers away from the shared values updated by the animation loop.
  const materials = useMemo(
    () => ({
      lines: new THREE.ShaderMaterial({
        uniforms,
        vertexShader: portalLinesVertex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fragmentShader: `uniform vec3 uLineColor; void main() { gl_FragColor=vec4(uLineColor,.5);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      }),
      points: new THREE.ShaderMaterial({
        uniforms,
        vertexShader: portalPointsVertex,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fragmentShader: `varying vec3 vColor; void main() { gl_FragColor=vec4(vColor,.88);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      }),
    }),
    [uniforms],
  );
  useEffect(
    () => () => {
      buffers.geometry.dispose();
      buffers.ribbons.dispose();
    },
    [buffers],
  );
  useEffect(
    () => () => {
      materials.lines.dispose();
      materials.points.dispose();
    },
    [materials],
  );
  useFrame(({ gl }, delta) => {
    if (document.hidden) return;
    const dt = Math.min(delta, 0.04),
      r = layout.section;
    uniforms.uTime.value += dt;
    uniforms.uBlend.value = THREE.MathUtils.damp(
      uniforms.uBlend.value,
      step.current === 1 ? 1 : 0,
      2.6,
      dt,
    );
    uniforms.uScroll.value = r
      ? THREE.MathUtils.clamp(
          -r.top / Math.max(1, r.height - layout.viewportHeight),
          0,
          1,
        )
      : 0;
    uniforms.uOrbitOffset.value = r && r.width > 767 ? 1.6 : 0;
    uniforms.uPixelScale.value =
      (layout.rect?.height || layout.viewportHeight) * 0.5 * gl.getPixelRatio();
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(
        group.current.rotation.y,
        pointer.x * 0.16,
        3,
        dt,
      );
      group.current.rotation.x = THREE.MathUtils.damp(
        group.current.rotation.x,
        -pointer.y * 0.12,
        3,
        dt,
      );
    }
  });
  return (
    <group ref={group}>
      <lineSegments geometry={buffers.ribbons} frustumCulled={false}>
        <primitive object={materials.lines} attach="material" />
      </lineSegments>
      <points geometry={buffers.geometry} frustumCulled={false}>
        <primitive object={materials.points} attach="material" />
      </points>
    </group>
  );
}
