import * as THREE from "three";

/**
 * Pointer "screen paint": a low-resolution velocity field the cursor paints
 * into, advected by its own motion and curl noise, then used by a post pass
 * to smear the rendered frame along the stroke with an iridescent fringe.
 * Modelled on lusion.co's ScreenPaint + ScreenPaintDistortion.
 *
 * Texel layout: xy = velocity (biased by 0.5), z/w = fast/slow stroke weight.
 */

const settings = {
  radiusDistanceRange: 100,
  pushStrength: 25,
  accelerationDissipation: 0.8,
  velocityDissipation: 0.975,
  weight1Dissipation: 0.95,
  weight2Dissipation: 0.8,
  curlScale: 0.02,
  curlStrength: 3,
  amount: 3,
  rgbShift: 0.5,
  multiplier: 5,
  colorMultiplier: 10,
  shade: 1.25,
};

const vertex = /* glsl */ `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const paintFragment = /* glsl */ `
uniform sampler2D u_lowPaintTexture;
uniform sampler2D u_prevPaintTexture;
uniform vec2 u_paintTexelSize;
uniform vec4 u_drawFrom;
uniform vec4 u_drawTo;
uniform float u_pushStrength;
uniform vec3 u_dissipations;
uniform vec2 u_vel;
uniform float u_curlScale;
uniform float u_curlStrength;
varying vec2 v_uv;

vec2 sdSegment(in vec2 p, in vec2 a, in vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return vec2(length(pa - ba * h), h);
}
vec2 hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}
// Gradient noise with analytic derivatives (value, d/dx, d/dy).
vec3 noised(in vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = hash(i + vec2(0.0, 0.0));
  vec2 gb = hash(i + vec2(1.0, 0.0));
  vec2 gc = hash(i + vec2(0.0, 1.0));
  vec2 gd = hash(i + vec2(1.0, 1.0));
  float va = dot(ga, f - vec2(0.0, 0.0));
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  return vec3(
    va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * (va - vb - vc + vd),
    ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) +
      du * (u.yx * (va - vb - vc + vd) + vec2(vb, vc) - va)
  );
}
void main() {
  vec2 res = sdSegment(gl_FragCoord.xy, u_drawFrom.xy, u_drawTo.xy);
  vec2 radiusWeight = mix(u_drawFrom.zw, u_drawTo.zw, res.y);
  float d = 1.0 - smoothstep(-0.01, radiusWeight.x, res.x);
  vec4 lowData = texture2D(u_lowPaintTexture, v_uv);
  // The blurred field pushes the paint outward; curl noise makes it swirl.
  vec2 velInv = (0.5 - lowData.xy) * u_pushStrength;
  vec3 noise3 = noised(gl_FragCoord.xy * u_curlScale * (1.0 - lowData.xy));
  vec2 noise = noised(gl_FragCoord.xy * u_curlScale *
    (2.0 - lowData.xy * (0.5 + noise3.x) + noise3.yz * 0.1)).yz;
  velInv += noise * (lowData.z + lowData.w) * u_curlStrength;
  vec4 data = texture2D(u_prevPaintTexture, v_uv + velInv * u_paintTexelSize);
  data.xy -= 0.5;
  vec4 delta = (u_dissipations.xxyz - 1.0) * data;
  delta += vec4(u_vel * d, radiusWeight.yy * d);
  delta.zw = sign(delta.zw) * max(vec2(0.004), abs(delta.zw));
  data += delta;
  data.xy += 0.5;
  gl_FragColor = clamp(data, vec4(0.0), vec4(1.0));
}`;

const copyFragment = /* glsl */ `
uniform sampler2D u_texture;
varying vec2 v_uv;
void main() { gl_FragColor = texture2D(u_texture, v_uv); }`;

const blurFragment = /* glsl */ `
uniform sampler2D u_texture;
uniform vec2 u_delta;
varying vec2 v_uv;
void main() {
  vec4 c = texture2D(u_texture, v_uv) * 0.2270270270;
  c += (texture2D(u_texture, v_uv + u_delta * 1.3846153846) +
        texture2D(u_texture, v_uv - u_delta * 1.3846153846)) * 0.3162162162;
  c += (texture2D(u_texture, v_uv + u_delta * 3.2307692308) +
        texture2D(u_texture, v_uv - u_delta * 3.2307692308)) * 0.0702702703;
  gl_FragColor = c;
}`;

const distortionFragment = /* glsl */ `
uniform sampler2D u_texture;
uniform sampler2D u_screenPaintTexture;
uniform vec2 u_screenPaintTexelSize;
uniform float u_amount;
uniform float u_rgbShift;
uniform float u_multiplier;
uniform float u_colorMultiplier;
uniform float u_shade;
varying vec2 v_uv;
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
void main() {
  vec4 data = texture2D(u_screenPaintTexture, v_uv);
  float weight = (data.z + data.w) * 0.5;
  if (weight < 0.002) {
    gl_FragColor = texture2D(u_texture, v_uv);
    return;
  }
  vec2 vel = (0.5 - data.xy - 0.001) * 2.0 * weight;
  vec2 velocity = vel * u_amount / 4.0 * u_screenPaintTexelSize * u_multiplier;
  vec2 jitter = vec2(ign(gl_FragCoord.xy + vec2(17.0, 29.0)),
                     ign(gl_FragCoord.xy + vec2(59.0, 11.0)));
  vec2 uv = v_uv + jitter * velocity;
  vec4 color = vec4(0.0);
  for (int i = 0; i < 9; i++) {
    color += texture2D(u_texture, uv);
    uv += velocity;
  }
  color /= 9.0;
  vec3 tint = sin(vec3(vel.x + vel.y) * 40.0 + vec3(0.0, 2.0, 4.0) * u_rgbShift) *
    smoothstep(0.4, -0.9, weight) * u_shade * max(abs(vel.x), abs(vel.y)) *
    u_colorMultiplier;
  color.rgb = max(color.rgb + tint, 0.0);
  // The canvas is premultiplied: let the fringe carry its own coverage so it
  // also reads over the page behind transparent areas.
  color.a = max(color.a, max(color.r, max(color.g, color.b)));
  gl_FragColor = color;
}`;

export type ScreenPaint = ReturnType<typeof createScreenPaint>;

export function createScreenPaint(renderer: THREE.WebGLRenderer) {
  const target = (linear = true) =>
    new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
      magFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
  let prev = target(),
    curr = target();
  const low = target(),
    lowBlur = target();
  const paintTexelSize = new THREE.Vector2(1, 1);
  const from = new THREE.Vector4(),
    to = new THREE.Vector4();
  const vel = new THREE.Vector2();
  const step = new THREE.Vector2();

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

  const paint = material(paintFragment, {
    u_lowPaintTexture: { value: low.texture },
    u_prevPaintTexture: { value: prev.texture },
    u_paintTexelSize: { value: paintTexelSize },
    u_drawFrom: { value: from },
    u_drawTo: { value: to },
    u_pushStrength: { value: settings.pushStrength },
    u_dissipations: {
      value: new THREE.Vector3(
        settings.velocityDissipation,
        settings.weight1Dissipation,
        settings.weight2Dissipation,
      ),
    },
    u_vel: { value: vel },
    u_curlScale: { value: settings.curlScale },
    u_curlStrength: { value: settings.curlStrength },
  });
  const copy = material(copyFragment, { u_texture: { value: null } });
  const blur = material(blurFragment, {
    u_texture: { value: null },
    u_delta: { value: new THREE.Vector2() },
  });
  const frame = new THREE.FramebufferTexture(1, 1);
  frame.colorSpace = THREE.NoColorSpace;
  frame.minFilter = frame.magFilter = THREE.LinearFilter;
  const distortion = material(distortionFragment, {
    u_texture: { value: frame },
    u_screenPaintTexture: { value: curr.texture },
    u_screenPaintTexelSize: { value: paintTexelSize },
    u_amount: { value: settings.amount },
    u_rgbShift: { value: settings.rgbShift },
    u_multiplier: { value: settings.multiplier },
    u_colorMultiplier: { value: settings.colorMultiplier },
    u_shade: { value: settings.shade },
  });
  distortion.transparent = false;

  const draw = (mat: THREE.Material, rt: THREE.WebGLRenderTarget | null) => {
    quad.material = mat;
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
  };
  const clear = () => {
    const color = new THREE.Color(),
      alpha = renderer.getClearAlpha();
    renderer.getClearColor(color);
    renderer.setClearColor(new THREE.Color(0.5, 0.5, 0), 0);
    for (const rt of [prev, curr, low, lowBlur]) {
      renderer.setRenderTarget(rt);
      renderer.clear(true, false, false);
    }
    renderer.setRenderTarget(null);
    renderer.setClearColor(color, alpha);
    vel.set(0, 0);
  };

  let width = 0,
    height = 0,
    started = false;
  const drawSize = new THREE.Vector2();

  return {
    resize(w: number, h: number) {
      const pw = Math.max(1, Math.round(w / 4)),
        ph = Math.max(1, Math.round(h / 4));
      if (pw === curr.width && ph === curr.height) return;
      width = w;
      height = h;
      prev.setSize(pw, ph);
      curr.setSize(pw, ph);
      low.setSize(Math.max(1, pw >> 1), Math.max(1, ph >> 1));
      lowBlur.setSize(Math.max(1, pw >> 1), Math.max(1, ph >> 1));
      paintTexelSize.set(1 / pw, 1 / ph);
      started = false;
      clear();
    },
    /** Advance the field one frame. `pointer` is in CSS pixels from top-left. */
    update(
      dt: number,
      pointer: { x: number; y: number },
      previous: { x: number; y: number },
      moved: boolean,
    ) {
      if (!width) return;
      [prev, curr] = [curr, prev];
      paint.uniforms.u_prevPaintTexture.value = prev.texture;
      distortion.uniforms.u_screenPaintTexture.value = curr.texture;
      const pw = curr.width,
        ph = curr.height;
      // Faster strokes paint wider, like a brush pressed harder.
      const distance = moved
        ? Math.hypot(pointer.x - previous.x, pointer.y - previous.y)
        : 0;
      const maxRadius = Math.max(40, width / 20);
      const radius =
        (THREE.MathUtils.clamp(distance / settings.radiusDistanceRange, 0, 1) *
          maxRadius *
          ph) /
        height;
      const x = (pointer.x / width) * pw,
        y = (1 - pointer.y / height) * ph;
      from.copy(to);
      to.set(x, y, radius, 1);
      if (!started) {
        from.copy(to);
        started = true;
      }
      step.set(to.x - from.x, to.y - from.y).multiplyScalar(dt * 0.8);
      vel.multiplyScalar(settings.accelerationDissipation).add(step);
      renderer.setScissorTest(false);
      draw(paint, curr);
      copy.uniforms.u_texture.value = curr.texture;
      draw(copy, low);
      blur.uniforms.u_texture.value = low.texture;
      (blur.uniforms.u_delta.value as THREE.Vector2).set(1 / low.width, 0);
      draw(blur, lowBlur);
      blur.uniforms.u_texture.value = lowBlur.texture;
      (blur.uniforms.u_delta.value as THREE.Vector2).set(0, 1 / low.height);
      draw(blur, low);
      renderer.setRenderTarget(null);
    },
    /** Re-draw what is on the canvas through the distortion. */
    composite(cssWidth: number, cssHeight: number) {
      renderer.getDrawingBufferSize(drawSize);
      if (
        frame.image.width !== drawSize.x ||
        frame.image.height !== drawSize.y
      ) {
        frame.image.width = drawSize.x;
        frame.image.height = drawSize.y;
        frame.dispose();
        frame.needsUpdate = true;
      }
      renderer.setRenderTarget(null);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, cssWidth, cssHeight);
      renderer.copyFramebufferToTexture(frame);
      draw(distortion, null);
    },
    reset() {
      started = false;
      if (width) clear();
    },
    dispose() {
      for (const rt of [prev, curr, low, lowBlur]) rt.dispose();
      for (const m of [paint, copy, blur, distortion]) m.dispose();
      frame.dispose();
      geometry.dispose();
    },
  };
}
