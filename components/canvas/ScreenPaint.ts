import * as THREE from "three";

/**
 * Pointer "screen paint": a low-resolution velocity field the cursor paints
 * into, advected by its own motion and curl noise (the field is modelled on
 * lusion.co's ScreenPaint). A post pass then disturbs the rendered frame the
 * way buttermax.net's fluid disturbs its media: the image warps along the
 * flow, steps into wavy pixel bands, and splits into its RGB channels.
 *
 * Texel layout: xy = velocity (biased by 0.5), z/w = fast/slow stroke weight.
 */

const settings = {
  // Brush: reaches full width at a gentle speed, broad like buttermax's.
  radiusDistanceRange: 60,
  radiusScreenFraction: 1 / 14,
  pushStrength: 25,
  accelerationDissipation: 0.8,
  // Per 60Hz frame; scaled by the real frame time so every refresh rate
  // leaves the same trail.
  velocityDissipation: 0.975,
  weight1Dissipation: 0.95,
  weight2Dissipation: 0.8,
  curlScale: 0.02,
  curlStrength: 3,
  /** How far the flow pushes the image, in CSS px at full strength. */
  warp: 64,
  /** Height of the pixel bands the image steps into, in CSS px. */
  band: 8,
  /** Base shift along the stroke, as in buttermax (0.05 of the view). */
  drift: 0.02,
  /** RGB channel split, in CSS px at full strength. */
  rgbSplit: 24,
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
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_warp;
uniform float u_band;
uniform float u_drift;
uniform float u_rgbSplit;
varying vec2 v_uv;
void main() {
  vec4 data = texture2D(u_screenPaintTexture, v_uv);
  float fluid = (data.z + data.w) * 0.5;
  if (fluid < 0.002) {
    gl_FragColor = texture2D(u_texture, v_uv);
    return;
  }
  vec2 px = 1.0 / u_resolution;
  vec2 vel = (0.5 - data.xy - 0.001) * 2.0 * fluid;
  // The image is pushed along the flow.
  vec2 uv = v_uv - vel * u_warp * px + fluid * u_drift;
  // Pixel stepping (buttermax's media shader): a sawtooth offset snaps each
  // band of rows onto one row, and the bands wave across the image.
  float period = u_band * px.y;
  float phase = v_uv.y + sin(v_uv.x * 5.0 + u_time * 0.5) * 0.5 + fluid +
    sin(u_time * 0.3) * 2.5;
  uv.y -= mod(phase, period) * fluid;
  // RGB split along the flow, strongest where the paint is.
  vec2 dir = length(vel) > 1e-4 ? normalize(vel) : vec2(1.0, 0.0);
  vec2 split = dir * fluid * u_rgbSplit * px;
  vec4 r = texture2D(u_texture, uv + split);
  vec4 g = texture2D(u_texture, uv);
  vec4 b = texture2D(u_texture, uv - split);
  vec4 color = vec4(r.r, g.g, b.b, max(g.a, max(r.a, b.a)));
  color.rgb *= mix(1.0, 0.98, fluid);
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
  const resolution = new THREE.Vector2(1, 1);
  const distortion = material(distortionFragment, {
    u_texture: { value: frame },
    u_screenPaintTexture: { value: curr.texture },
    u_resolution: { value: resolution },
    u_time: { value: 0 },
    u_warp: { value: settings.warp },
    u_band: { value: settings.band },
    u_drift: { value: settings.drift },
    u_rgbSplit: { value: settings.rgbSplit },
  });
  distortion.transparent = false;

  const draw = (mat: THREE.Material, rt: THREE.WebGLRenderTarget | null) => {
    quad.material = mat;
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
  };
  // Link every pass for the target it draws into, in the background, before
  // the first mouse move. Linking on first use stalls that frame.
  const previousTarget = renderer.getRenderTarget();
  for (const [mat, rt] of [
    [paint, curr],
    [copy, low],
    [blur, lowBlur],
    [distortion, null],
  ] as const) {
    quad.material = mat;
    renderer.setRenderTarget(rt);
    renderer.compile(scene, camera);
  }
  renderer.setRenderTarget(previousTarget);
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
      // Frame-rate independent fading: the same trail at 60, 120 or 144Hz.
      const frames = dt * 60;
      (paint.uniforms.u_dissipations.value as THREE.Vector3).set(
        Math.pow(settings.velocityDissipation, frames),
        Math.pow(settings.weight1Dissipation, frames),
        Math.pow(settings.weight2Dissipation, frames),
      );
      distortion.uniforms.u_time.value += dt;
      [prev, curr] = [curr, prev];
      paint.uniforms.u_prevPaintTexture.value = prev.texture;
      distortion.uniforms.u_screenPaintTexture.value = curr.texture;
      const pw = curr.width,
        ph = curr.height;
      // Faster strokes paint wider, like a brush pressed harder.
      const distance = moved
        ? Math.hypot(pointer.x - previous.x, pointer.y - previous.y)
        : 0;
      const maxRadius = Math.max(56, width * settings.radiusScreenFraction);
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
      vel
        .multiplyScalar(Math.pow(settings.accelerationDissipation, frames))
        .add(step);
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
      resolution.set(cssWidth, cssHeight);
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
