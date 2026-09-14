import * as THREE from "three";

/** Immutable seeds replace 5,760 animated CPU vertices and buffer uploads/frame. */
export function createPortalGeometry(count: number) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const tunnel = new Float32Array(count * 4);
  const orbit = new Float32Array(count * 2);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = i / count,
      strand = i % 13;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    tunnel.set(
      [
        u,
        u * Math.PI * 44 + strand * 2.399,
        3.8 + Math.sin(u * 19 + strand) * 0.55,
        Math.cos(phi),
      ],
      i * 4,
    );
    orbit.set([i * 2.399963, Math.sin(phi)], i * 2);
    color
      .set(i % 9 === 0 ? "#e2f6ff" : i % 3 === 0 ? "#749fff" : "#294bfa")
      .toArray(colors, i * 3);
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aTunnel", new THREE.BufferAttribute(tunnel, 4));
  geometry.setAttribute("aOrbit", new THREE.BufferAttribute(orbit, 2));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const ribbons = new THREE.BufferGeometry();
  const seeds = new Float32Array(16 * 80 * 6);
  for (let lane = 0; lane < 16; lane++)
    for (let segment = 0; segment < 80; segment++)
      for (let end = 0; end < 2; end++) {
        seeds.set(
          [
            (segment + end) / 80,
            (lane / 16) * Math.PI * 2,
            (lane / 15) * Math.PI,
          ],
          ((lane * 80 + segment) * 2 + end) * 3,
        );
      }
  ribbons.setAttribute("position", new THREE.BufferAttribute(seeds, 3));
  return { geometry, ribbons };
}

export const portalPointsVertex = `
uniform float uTime, uScroll, uBlend, uOrbitOffset, uPixelScale;
attribute vec4 aTunnel;
attribute vec2 aOrbit;
varying vec3 vColor;
void main() {
  vColor = color;
  float depth = mod(aTunnel.x*54. + uScroll*36. + uTime*.65, 54.);
  float angle = aTunnel.y + uTime*.055;
  vec3 tunnel = vec3(cos(angle)*aTunnel.z + sin(depth*.14+uTime*.12)*.65,
    sin(angle)*aTunnel.z + cos(depth*.13)*.5, 7.-depth);
  float theta = aOrbit.x + uTime*.12;
  float radius = 2.7 + sin(theta*3.+uTime)*.13;
  vec3 orbit = vec3(aOrbit.y*cos(theta)*radius + uOrbitOffset,
    aTunnel.w*radius, aOrbit.y*sin(theta)*radius);
  vec4 mv = modelViewMatrix * vec4(mix(tunnel, orbit, uBlend), 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = .075 * uPixelScale / max(.1, -mv.z);
}`;

export const portalLinesVertex = `
uniform float uTime, uScroll, uBlend, uOrbitOffset;
void main() {
  float depth = position.x*52.;
  float angle = position.y + depth*.13 + uTime*.11 + uScroll*2.;
  float radius = 3.6 + sin(depth*.2+uTime*.2)*.4;
  vec3 tunnel = vec3(cos(angle)*radius, sin(angle)*radius, 7.-depth);
  float orbitAngle = position.x*6.28318530718 + uTime*.12;
  vec3 orbit = vec3(sin(position.z)*cos(orbitAngle)*2.8 + uOrbitOffset,
    cos(position.z)*2.8, sin(position.z)*sin(orbitAngle)*2.8);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(mix(tunnel, orbit, uBlend), 1.);
}`;
