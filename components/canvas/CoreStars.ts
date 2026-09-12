import * as THREE from "three";

/** Samples the actual sculpture, then carries those same points into a deep star field. */
export function createCoreStars(knot: THREE.BufferGeometry, quality: number) {
  const count = quality < 0.75 ? 1100 : 2600;
  const source = knot.getAttribute("position");
  const normals = knot.getAttribute("normal");
  const uv = knot.getAttribute("uv");
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const surfaceUv = new Float32Array(count * 2);
  const destination = new Float32Array(count * 3);
  const seed = new Float32Array(count * 2);
  let randomState = 8317;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const j = Math.floor(random() * source.count);
    position.set([source.getX(j), source.getY(j), source.getZ(j)], i * 3);
    normal.set([normals.getX(j), normals.getY(j), normals.getZ(j)], i * 3);
    surfaceUv.set([uv.getX(j), uv.getY(j)], i * 2);
    destination.set(
      [
        (random() * 2 - 1) * 1.06,
        (random() * 2 - 1) * 1.06,
        random() * 6 - 4.5,
      ],
      i * 3,
    );
    seed.set([random(), random()], i * 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("aNormal", new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute("aUv", new THREE.BufferAttribute(surfaceUv, 2));
  geometry.setAttribute(
    "aDestination",
    new THREE.BufferAttribute(destination, 3),
  );
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 2));
  const uniforms = {
    uCoreMatrix: { value: new THREE.Matrix4() },
    uSpread: { value: 0 },
    uOpacity: { value: 0 },
    uTime: { value: 0 },
    uEnergy: { value: 0 },
    uAspect: { value: 1.8 },
    uDpr: { value: 1 },
    uPointer: { value: new THREE.Vector2() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: `
      uniform mat4 uCoreMatrix;
      uniform float uSpread, uOpacity, uTime, uEnergy, uAspect, uDpr;
      uniform vec2 uPointer;
      attribute vec3 aDestination, aNormal;
      attribute vec2 aSeed, aUv;
      varying vec2 vSeed;
      varying float vAlpha;
      void main() {
        vSeed = aSeed;
        float breath = sin(aUv.x*37.7-uTime*.8)*.025 + uEnergy*.055*sin(aUv.x*18.85-uTime*3.);
        vec3 origin = (uCoreMatrix * vec4(position+aNormal*breath, 1.)).xyz;
        vec3 target = aDestination;
        target.xy *= vec2(2.989*uAspect, 2.989) * (9.2-target.z)/9.2;
        target.xy += uPointer * (.025+aSeed.x*.09);
        target.xy += vec2(sin(uTime*.12+aSeed.x*60.),cos(uTime*.1+aSeed.y*50.))*.035;
        vec3 world = mix(origin, target, uSpread);
        world.xy += vec2(sin(aSeed.x*40.+uSpread*3.),cos(aSeed.y*30.+uSpread*3.)) * sin(uSpread*3.14159)*.42;
        vec4 mv = viewMatrix * vec4(world,1.);
        gl_Position = projectionMatrix * mv;
        float prominent = step(.978,aSeed.x);
        gl_PointSize = (3.5+aSeed.y*4.5+prominent*13.)*uDpr*(9.2/-mv.z);
        vAlpha = uOpacity * (.5+aSeed.y*.5) * (.84+.16*sin(uTime*.65+aSeed.x*50.));
      }
    `,
    fragmentShader: `
      varying vec2 vSeed;
      varying float vAlpha;
      void main() {
        vec2 p = gl_PointCoord-.5;
        float r = length(p);
        if(r>.5) discard;
        float star = exp(-r*r*170.) + exp(-r*r*20.)*.11;
        float cross = exp(-abs(p.x)*95.-abs(p.y)*9.) + exp(-abs(p.y)*95.-abs(p.x)*9.);
        star += cross*.18*step(.978,vSeed.x);
        vec3 color = mix(vec3(.12,.36,1.),vec3(.72,.86,1.),vSeed.y);
        gl_FragColor = vec4(color, star*vAlpha);
        #include <colorspace_fragment>
      }
    `,
  });
  return {
    geometry,
    material,
    uniforms,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
