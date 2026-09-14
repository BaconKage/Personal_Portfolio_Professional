import * as THREE from "three";
import type { SceneId } from "@/components/Artwork";
/** A shared point topology carries each project's visual language into the next. */
export function createTransitionField() {
  const count = 320;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3),
  );
  const material = new THREE.PointsMaterial({
    color: "#688eff",
    size: 0.025,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(points);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.z = 10;
  const shape = (id: SceneId, i: number): [number, number, number] => {
    const t = (i / count) * Math.PI * 2;
    if (id === "mygym")
      return [
        ((i % 20) / 19 - 0.5) * 5,
        (Math.floor(i / 20) / 15 - 0.5) * 2,
        Math.sin(i % 20) * 0.12,
      ];
    if (id === "vanicert")
      return [
        (i / count - 0.5) * 6,
        Math.sin(t * 9) * (0.4 + Math.sin(t * 2) ** 2),
        Math.cos(t * 9) * 0.35,
      ];
    if (id === "firstdrop-ai")
      return [
        (i % 2 ? 1.4 : -1.4) + Math.cos(t) * 0.7,
        Math.sin(t) * 1.45,
        Math.sin(t * 3) * 0.2,
      ];
    return [Math.cos(t) * 2.5, Math.sin(t) * 1.15, Math.sin(t * 4) * 0.3];
  };
  const forms = new Map<SceneId, Float32Array>();
  const form = (id: SceneId) => {
    if (!forms.has(id)) {
      const values = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) values.set(shape(id, i), i * 3);
      forms.set(id, values);
    }
    return forms.get(id)!;
  };
  return {
    scene,
    camera,
    update(from: SceneId, to: SceneId, t: number, aspect: number) {
      const p = geometry.getAttribute("position") as THREE.BufferAttribute;
      const mix = THREE.MathUtils.smoothstep(t, 0, 1);
      const a = form(from),
        b = form(to);
      for (let i = 0; i < count; i++) {
        p.setXYZ(
          i,
          THREE.MathUtils.lerp(a[i * 3], b[i * 3], mix),
          THREE.MathUtils.lerp(a[i * 3 + 1], b[i * 3 + 1], mix),
          THREE.MathUtils.lerp(a[i * 3 + 2], b[i * 3 + 2], mix),
        );
      }
      p.needsUpdate = true;
      material.opacity = Math.sin(t * Math.PI) * 0.65;
      if (camera.aspect !== aspect) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
