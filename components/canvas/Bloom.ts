import * as THREE from "three";

/**
 * Bloom for the reactor: light that is bright enough bleeds past its own
 * edges, onto the housing and out over the page. The frame is copied once,
 * its brightest parts are kept at quarter resolution and blurred at two
 * sizes (a tight glow and a wide one), and the result is added back over
 * the hero.
 *
 * It costs one framebuffer copy and a handful of small passes, so it runs
 * only while the core is lit (charging, online, cooling, or the dive).
 */

const vertex = /* glsl */ `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// Four bilinear taps cover the 4x4 block each output texel stands for, so
// thin bright lines do not shimmer in and out of the reduced image.
const brightFragment = /* glsl */ `
uniform sampler2D u_texture;
uniform vec2 u_texel;
varying vec2 v_uv;
vec3 pick(vec2 uv) {
  vec3 c = texture2D(u_texture, uv).rgb;
  float level = max(c.r, max(c.g, c.b));
  return c * smoothstep(0.74, 1.0, level);
}
void main() {
  vec3 c = pick(v_uv + u_texel * vec2(-1.0, -1.0)) +
    pick(v_uv + u_texel * vec2(1.0, -1.0)) +
    pick(v_uv + u_texel * vec2(-1.0, 1.0)) +
    pick(v_uv + u_texel * vec2(1.0, 1.0));
  gl_FragColor = vec4(c * 0.25, 1.0);
}`;

const blurFragment = /* glsl */ `
uniform sampler2D u_texture;
uniform vec2 u_delta;
varying vec2 v_uv;
void main() {
  vec3 c = texture2D(u_texture, v_uv).rgb * 0.2270270270;
  c += (texture2D(u_texture, v_uv + u_delta * 1.3846153846).rgb +
        texture2D(u_texture, v_uv - u_delta * 1.3846153846).rgb) * 0.3162162162;
  c += (texture2D(u_texture, v_uv + u_delta * 3.2307692308).rgb +
        texture2D(u_texture, v_uv - u_delta * 3.2307692308).rgb) * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`;

// Added to what is there. Alpha stays untouched, so over the page (where
// the canvas is transparent) the glow lands as light on the page itself.
const compositeFragment = /* glsl */ `
uniform sampler2D u_near;
uniform sampler2D u_far;
uniform float u_strength;
varying vec2 v_uv;
void main() {
  vec3 glow = texture2D(u_near, v_uv).rgb * 0.2 + texture2D(u_far, v_uv).rgb * 0.36;
  gl_FragColor = vec4(glow * u_strength, 0.0);
}`;

export type Bloom = ReturnType<typeof createBloom>;

export function createBloom(renderer: THREE.WebGLRenderer) {
  const target = () =>
    new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
  const near = target(),
    nearPass = target(),
    far = target(),
    farPass = target();
  const frame = new THREE.FramebufferTexture(1, 1);
  frame.colorSpace = THREE.NoColorSpace;
  frame.minFilter = frame.magFilter = THREE.LinearFilter;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2),
  );
  const quad = new THREE.Mesh(geometry);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera();
  const material = (
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform>,
  ) =>
    new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
  const bright = material(brightFragment, {
    u_texture: { value: frame },
    u_texel: { value: new THREE.Vector2() },
  });
  const blur = material(blurFragment, {
    u_texture: { value: null },
    u_delta: { value: new THREE.Vector2() },
  });
  const composite = material(compositeFragment, {
    u_near: { value: near.texture },
    u_far: { value: far.texture },
    u_strength: { value: 0 },
  });
  composite.blending = THREE.CustomBlending;
  composite.blendEquation = THREE.AddEquation;
  composite.blendSrc = THREE.OneFactor;
  composite.blendDst = THREE.OneFactor;
  composite.blendSrcAlpha = THREE.ZeroFactor;
  composite.blendDstAlpha = THREE.OneFactor;
  composite.transparent = true;

  const draw = (mat: THREE.Material, rt: THREE.WebGLRenderTarget | null) => {
    quad.material = mat;
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
  };
  // Link every pass before it is first needed: linking on first use would
  // stall the very frame the core lights up.
  const previous = renderer.getRenderTarget();
  for (const [mat, rt] of [
    [bright, near],
    [blur, nearPass],
    [composite, null],
  ] as const) {
    quad.material = mat;
    renderer.setRenderTarget(rt);
    renderer.compile(scene, camera);
  }
  renderer.setRenderTarget(previous);

  const size = new THREE.Vector2();
  const pass = (
    source: THREE.Texture,
    to: THREE.WebGLRenderTarget,
    dx: number,
    dy: number,
  ) => {
    blur.uniforms.u_texture.value = source;
    (blur.uniforms.u_delta.value as THREE.Vector2).set(dx, dy);
    draw(blur, to);
  };

  return {
    /**
     * Bloom what has been drawn so far, inside `region` (CSS px, origin at
     * the bottom-left like the renderer's viewport). `strength` is 0..1.
     */
    render(
      cssWidth: number,
      cssHeight: number,
      region: { x: number; y: number; width: number; height: number },
      strength: number,
    ) {
      renderer.getDrawingBufferSize(size);
      if (frame.image.width !== size.x || frame.image.height !== size.y) {
        frame.image.width = size.x;
        frame.image.height = size.y;
        frame.dispose();
        frame.needsUpdate = true;
        const w = Math.max(1, Math.ceil(size.x / 4)),
          h = Math.max(1, Math.ceil(size.y / 4));
        near.setSize(w, h);
        nearPass.setSize(w, h);
        far.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
        farPass.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
        (bright.uniforms.u_texel.value as THREE.Vector2).set(
          1 / size.x,
          1 / size.y,
        );
      }
      renderer.setRenderTarget(null);
      renderer.setScissorTest(false);
      renderer.copyFramebufferToTexture(frame);
      draw(bright, near);
      pass(near.texture, nearPass, 1 / near.width, 0);
      pass(nearPass.texture, near, 0, 1 / near.height);
      // The wide glow: the tight one again, at half its size.
      pass(near.texture, farPass, 1 / far.width, 0);
      pass(farPass.texture, far, 0, 1 / far.height);
      composite.uniforms.u_strength.value = strength;
      renderer.setRenderTarget(null);
      renderer.setViewport(0, 0, cssWidth, cssHeight);
      renderer.setScissor(region.x, region.y, region.width, region.height);
      renderer.setScissorTest(true);
      draw(composite, null);
      renderer.setScissorTest(false);
    },
    dispose() {
      for (const rt of [near, nearPass, far, farPass]) rt.dispose();
      for (const m of [bright, blur, composite]) m.dispose();
      frame.dispose();
      geometry.dispose();
    },
  };
}
