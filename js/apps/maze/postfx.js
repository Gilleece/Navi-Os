/* ============================================================
   MAZE.EXE — post-processing (bloom + CRT), non-VR only
   The palette is built around neon glow, but the bare renderer only
   FAKES it with emissive materials and additive motes. This adds a real
   bloom pass so the neon actually blooms, plus an optional subtle CRT
   pass (scanlines + vignette + a hair of chromatic aberration).

   Self-contained: built from core three.r128 primitives (render targets +
   full-screen-quad shader passes), so it needs no vendored example scripts
   and runs offline exactly like the rest of the app. The three r128
   post-processing EXAMPLES (EffectComposer/UnrealBloomPass) live outside
   core three and aren't self-hosted here; this hand-rolled pipeline covers
   the same ground with no extra dependency.

   Pipeline (mode "bloom"):
     scene → sceneRT → bright-pass → blur (H/V, ×2, half-res) → additive
     composite (sceneRT + bloom) → screen
   Pipeline (mode "crt") appends a CRT shader pass before the screen.

   MUST be gated to !M.inVR by the caller: WebXR manages its own
   framebuffers and does not compose with an off-screen pipeline. Photo-
   sensitivity: bloom threshold is kept high / strength moderate, and the
   CRT scanline is static and subtle (no time-based flicker).
   ============================================================ */

const VERT = `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/* pull out only the genuinely bright (neon) pixels */
const BRIGHT_FRAG = `
  uniform sampler2D tDiffuse;
  uniform float threshold;
  varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float contrib = max(0.0, l - threshold) / max(l, 1e-4);
    gl_FragColor = vec4(c * contrib, 1.0);
  }
`;

/* separable 9-tap gaussian; `direction` is a texel-scaled axis vector */
const BLUR_FRAG = `
  uniform sampler2D tDiffuse;
  uniform vec2 direction;
  varying vec2 vUv;
  void main(){
    vec4 s = vec4(0.0);
    s += texture2D(tDiffuse, vUv + direction * -4.0) * 0.0162;
    s += texture2D(tDiffuse, vUv + direction * -3.0) * 0.0540;
    s += texture2D(tDiffuse, vUv + direction * -2.0) * 0.1216;
    s += texture2D(tDiffuse, vUv + direction * -1.0) * 0.1945;
    s += texture2D(tDiffuse, vUv)                    * 0.2270;
    s += texture2D(tDiffuse, vUv + direction *  1.0) * 0.1945;
    s += texture2D(tDiffuse, vUv + direction *  2.0) * 0.1216;
    s += texture2D(tDiffuse, vUv + direction *  3.0) * 0.0540;
    s += texture2D(tDiffuse, vUv + direction *  4.0) * 0.0162;
    gl_FragColor = vec4(s.rgb, 1.0);
  }
`;

/* scene + bloom, additive so it can only brighten (never darken the HUD-less scene) */
const COMPOSITE_FRAG = `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform float strength;
  varying vec2 vUv;
  void main(){
    vec3 base  = texture2D(tScene, vUv).rgb;
    vec3 bloom = texture2D(tBloom, vUv).rgb;
    gl_FragColor = vec4(base + bloom * strength, 1.0);
  }
`;

/* scanlines + vignette + chromatic aberration. Scanline density is a FIXED
   count in screen space (not tied to the drawing-buffer height) — otherwise on
   a retina display the lines fall below one pixel and average out to nothing. */
const CRT_FRAG = `
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  varying vec2 vUv;
  const float SCANLINES = 240.0;                   // visible dark bands across the height
  void main(){
    vec2 uv = vUv;
    vec2 ca = (uv - 0.5) * 0.0030;                 // RGB split toward the edges
    float r = texture2D(tDiffuse, uv + ca).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, uv - ca).b;
    vec3 col = vec3(r, g, b);
    float scan = 0.82 + 0.18 * sin(uv.y * SCANLINES * 3.14159265);   // clear scanlines
    col *= scan;
    vec2 d = uv - 0.5;                              // vignette
    float vig = smoothstep(1.0, 0.15, dot(d, d) * 2.4);
    col *= mix(0.55, 1.0, vig);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createPostFX(three, renderer, scene, camera){
  // The palette's "neon" is LDR: the orange gate is luma ~0.56, tokens ~0.5-0.8,
  // lit panes lower. A high HDR-style threshold blooms almost nothing, so it's
  // tuned to the actual colours — low enough that the gate/tokens/motes glow,
  // still above the dim fogged walls (luma < ~0.25) so they don't wash out.
  const BLOOM_THRESHOLD = 0.25;
  const BLOOM_STRENGTH  = 2.5;
  const BLUR_ITER       = 3;      // ping-pong passes each direction (wider, softer halo)

  // full-screen quad rig (one geometry + ortho cam, material swapped per pass)
  const quadGeo   = new three.PlaneGeometry(2, 2);
  const quadCam   = new three.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new three.Scene();
  const quadMesh  = new three.Mesh(quadGeo, null);
  quadScene.add(quadMesh);

  const rtOpts = { minFilter: three.LinearFilter, magFilter: three.LinearFilter, format: three.RGBAFormat, type: three.UnsignedByteType };
  const mkRT = (w, h, depth) => new three.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { ...rtOpts, depthBuffer: !!depth });

  let W = 1, H = 1, hw = 1, hh = 1;
  const sceneRT = mkRT(1, 1, true);
  const brightRT = mkRT(1, 1, false);
  const blurA = mkRT(1, 1, false);
  const blurB = mkRT(1, 1, false);
  const compRT = mkRT(1, 1, false);   // full-res composite buffer (only used when CRT is on)

  const bright = new three.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, threshold: { value: BLOOM_THRESHOLD } },
    vertexShader: VERT, fragmentShader: BRIGHT_FRAG, depthTest: false, depthWrite: false });
  const blur = new three.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, direction: { value: new three.Vector2() } },
    vertexShader: VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false });
  const composite = new three.ShaderMaterial({
    uniforms: { tScene: { value: null }, tBloom: { value: null }, strength: { value: BLOOM_STRENGTH } },
    vertexShader: VERT, fragmentShader: COMPOSITE_FRAG, depthTest: false, depthWrite: false });
  const crt = new three.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, resolution: { value: new three.Vector2() } },
    vertexShader: VERT, fragmentShader: CRT_FRAG, depthTest: false, depthWrite: false });

  function pass(material, target){
    quadMesh.material = material;
    renderer.setRenderTarget(target || null);
    renderer.render(quadScene, quadCam);
  }

  function setSize(w, h){
    W = Math.max(1, Math.floor(w)); H = Math.max(1, Math.floor(h));
    hw = Math.max(1, Math.floor(W / 2)); hh = Math.max(1, Math.floor(H / 2));
    sceneRT.setSize(W, H);
    brightRT.setSize(hw, hh);
    blurA.setSize(hw, hh);
    blurB.setSize(hw, hh);
    compRT.setSize(W, H);
    crt.uniforms.resolution.value.set(W, H);
  }

  // mode: "bloom" = bloom only; "crt" = bloom + CRT. ("off" is handled by the
  // caller falling back to the bare renderer.render path.)
  function render(mode){
    const prevTarget = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = true;

    // 1. the scene, into an off-screen target
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);

    // 2. bright-pass (half-res)
    bright.uniforms.tDiffuse.value = sceneRT.texture;
    pass(bright, brightRT);

    // 3. separable blur, ping-ponging brightRT -> blurA/blurB
    let src = brightRT;
    const tx = 1 / hw, ty = 1 / hh;
    for (let i = 0; i < BLUR_ITER; i++){
      blur.uniforms.tDiffuse.value = src.texture;
      blur.uniforms.direction.value.set(tx, 0);
      pass(blur, blurA);
      blur.uniforms.tDiffuse.value = blurA.texture;
      blur.uniforms.direction.value.set(0, ty);
      pass(blur, blurB);
      src = blurB;
    }

    // 4. composite scene + bloom
    composite.uniforms.tScene.value = sceneRT.texture;
    composite.uniforms.tBloom.value = blurB.texture;
    if (mode === "crt"){
      pass(composite, compRT);                          // composite into a full-res buffer
      crt.uniforms.tDiffuse.value = compRT.texture;     // 5. CRT to screen
      pass(crt, null);
    } else {
      pass(composite, null);                            // composite straight to screen
    }

    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;
  }

  function dispose(){
    for (const rt of [sceneRT, brightRT, blurA, blurB, compRT]) rt.dispose();
    for (const m of [bright, blur, composite, crt]) m.dispose();
    quadGeo.dispose();
  }

  setSize(renderer.domElement.width || 1, renderer.domElement.height || 1);
  return { render, setSize, dispose };
}
