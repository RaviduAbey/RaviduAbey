// The Well: Rav Abeywardana's portfolio as one scroll-driven three.js scene.
// A dark well lined with rings of curved screens that narrow and turn faster
// as they go down. Each screen plays a top-to-bottom scroll of one of nine
// pages of Rav's work. Scroll speed drives the turning and the playback.
// Clicking a screen pulls it off the wall and unrolls it toward you. At the
// bottom a lone figure in Prussian-blue light turns to watch whatever you
// look at, while one big screen cranks through the pages slit by slit.
// The finale pulls the camera up until the well is a ring of light.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const SITES = [
  { tex: 'screens/01-analytics.jpg', title: 'The portfolio, analytics side', line: 'Finding the numbers that move a business. The particle portrait, the switch and the case studies.', href: '/#analytics' },
  { tex: 'screens/02-apps.jpg', title: 'The portfolio, apps side', line: 'Building the apps that run on the numbers: chatbots, automations and websites.', href: '/#apps' },
  { tex: 'screens/03-about.jpg', title: 'About and the numbers', line: '$2M of discrepancies cut to $20K, ~$95K saved, 1,000+ SKUs validated, a 6.94 / 7 GPA.', href: '/#about' },
  { tex: 'screens/04-brands.jpg', title: "Brands I've worked with", line: 'Milwaukee Tool, The Good Guys, Matara Express Cabs, A & Jay, inlined. and Dr. Asanka Gunawardana.', href: '/#brands' },
  { tex: 'screens/05-skills.jpg', title: 'The skill chart', line: 'Thirty-two tools falling into bars: analytics, business systems, marketing, AI and automation.', href: '/#skills' },
  { tex: 'screens/06-work.jpg', title: 'Selected work', line: 'Five case studies, each drawn from its real figures.', href: '/#work' },
  { tex: 'screens/07-experience.jpg', title: 'Where I have worked', line: 'Milwaukee / TTI, The Good Guys, Rangebow, a Master of Business Analytics and a Bachelor of Commerce.', href: '/#experience' },
  { tex: 'screens/08-card.jpg', title: 'The contact card', line: 'A digital business card: save my contact, call, email or scan the QR code.', href: '/card/' },
  { tex: 'screens/09-contact.jpg', title: 'Contact', line: 'Got a messy dataset? Email ravabe99@gmail.com.', href: '/#contact' },
];

const $ = (s) => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = Math.min(innerWidth, innerHeight) < 700;
const BONE = new THREE.Color('#f2ede4');
const INK = new THREE.Color('#050404');
const PRUSSIAN = new THREE.Color('#003153');

/* ============================================================
   renderer, or a polite fallback
   ============================================================ */
const canvas = $('#scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  $('[data-fallback]').classList.add('is-on');
  $('[data-gate]').remove();
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = INK.clone();
const camera = new THREE.PerspectiveCamera(small ? 70 : 58, innerWidth / innerHeight, 0.05, 200);

/* ============================================================
   textures: nine tall scroll recordings
   ============================================================ */
const manager = new THREE.LoadingManager();
const loadEl = $('[data-load]');
manager.onProgress = (_, done, total) => { loadEl.textContent = `Loading screens ${done} / ${total}`; };
manager.onLoad = () => { loadEl.textContent = 'Ready'; };
const loader = new THREE.TextureLoader(manager);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const textures = SITES.map((s) => {
  const t = loader.load(s.tex);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, maxAniso);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
});

/* ============================================================
   screen material: plays a window of a tall texture, scrolling
   ============================================================ */
const screenVert = /* glsl */`
  uniform float uBend;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec3 p = position;
    // curl the plane back into an arc (used when a screen is pulled off the wall)
    p.z -= uBend * (p.x * p.x) * 1.2;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const screenFrag = /* glsl */`
  uniform sampler2D uTex;
  uniform float uOffset, uWin, uGlow, uRing, uFog, uDim, uReveal;
  uniform vec3 uBg, uBone;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    float ty = fract(uOffset + (1.0 - vUv.y) * uWin);
    vec3 c = texture2D(uTex, vec2(vUv.x, 1.0 - ty)).rgb;
    c *= 0.93 + 0.07 * sin(vUv.y * 620.0);                     // faint scanlines
    vec2 d = min(vUv, 1.0 - vUv);
    float edge = 1.0 - smoothstep(0.0, 0.014, min(d.x * 0.7, d.y));
    c = c * (1.0 - uDim) + uGlow * 0.12;
    c = mix(c, c * 0.04, uRing);                               // finale: pictures fade to dark
    c += uBone * edge * (0.1 + uGlow * 0.7 + uRing * 1.3);      // rims glow into a ring
    if (vUv.y < 1.0 - uReveal) discard;                        // unrolling from the top
    float fog = exp(-uFog * uFog * vDepth * vDepth);
    gl_FragColor = vec4(mix(uBg, c, fog), 1.0);
  }`;

function screenMaterial(tex, win) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: tex }, uOffset: { value: Math.random() }, uWin: { value: win },
      uGlow: { value: 0 }, uRing: { value: 0 }, uFog: { value: 0.028 }, uDim: { value: 0 },
      uReveal: { value: 1 }, uBend: { value: 0 },
      uBg: { value: INK }, uBone: { value: BONE },
    },
    vertexShader: screenVert, fragmentShader: screenFrag, side: THREE.DoubleSide,
  });
}

// a curved screen: a slice of a cone, so it sits on the funnel wall facing in
function coneSlice(rTop, rBot, h, arc, segU = 18, segV = 6) {
  const pos = [], uv = [], idx = [];
  for (let v = 0; v <= segV; v++) {
    const tv = v / segV, r = lerp(rTop, rBot, tv), y = -tv * h;
    for (let u = 0; u <= segU; u++) {
      const tu = u / segU, th = (tu - 0.5) * arc;
      pos.push(Math.sin(th) * r, y, Math.cos(th) * r);
      uv.push(1 - tu, 1 - tv); // viewed from inside, so mirror u
    }
  }
  for (let v = 0; v < segV; v++) for (let u = 0; u < segU; u++) {
    const a = v * (segU + 1) + u, b = a + segU + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/* ============================================================
   the well
   ============================================================ */
const RINGS = small ? 6 : 7;
const R_TOP = 9, R_BOT = 3, RING_H = 3.3, RING_GAP = 0.3;
const rings = [];
const screens = [];
const ringLights = [];
const ringMat = new THREE.MeshBasicMaterial({ color: BONE.clone().multiplyScalar(0.35) });
for (let i = 0; i < RINGS; i++) {
  const rTop = lerp(R_TOP, R_BOT, i / RINGS), rBot = lerp(R_TOP, R_BOT, (i + 1) / RINGS);
  const yTop = -i * (RING_H + RING_GAP);
  const K = Math.max(small ? 5 : 6, Math.round((small ? 10 : 12) - i));
  const arc = (Math.PI * 2 / K) * 0.88;
  const group = new THREE.Group();
  group.position.y = yTop;
  group.rotation.y = Math.random() * Math.PI * 2;
  scene.add(group);
  const geo = coneSlice(rTop, rBot, RING_H, arc);
  const width = arc * (rTop + rBot) / 2;
  const win = (RING_H / width) / 3; // strip is 1:3, so the screen shows this much of it
  for (let k = 0; k < K; k++) {
    const site = (i * 4 + k * 2 + (i % 2)) % SITES.length;
    const mesh = new THREE.Mesh(geo, screenMaterial(textures[site], win));
    mesh.rotation.y = (k / K) * Math.PI * 2;
    mesh.userData = { site, ring: i, rTop, rBot, arc, width, win };
    group.add(mesh);
    screens.push(mesh);
  }
  // a thin ring of light at the top lip of each ring
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rTop, 0.018, 6, 160), ringMat.clone());
  lip.rotation.x = Math.PI / 2;
  lip.position.y = yTop + 0.12;
  scene.add(lip);
  ringLights.push(lip);
  rings.push({ group, speed: 0.045 + i * 0.03, K, angle: 0 });
}
const RING_BOTTOM = -RINGS * (RING_H + RING_GAP) + RING_GAP;

/* ---------- the chamber at the bottom ---------- */
const CH_H = 3.4;
const FLOOR_Y = RING_BOTTOM - CH_H;
const chamberWall = new THREE.Mesh(
  new THREE.CylinderGeometry(R_BOT, R_BOT, CH_H, 64, 1, true),
  new THREE.MeshStandardMaterial({ color: 0x0a0909, roughness: 0.9, side: THREE.BackSide })
);
chamberWall.position.y = FLOOR_Y + CH_H / 2;
scene.add(chamberWall);

// the pool of Prussian-blue light
const floorMat = new THREE.ShaderMaterial({
  uniforms: { uCol: { value: PRUSSIAN }, uHi: { value: new THREE.Color('#2e7bbf') }, uTime: { value: 0 }, uPulse: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform vec3 uCol, uHi; uniform float uTime, uPulse; varying vec2 vUv;
    void main(){ vec2 p = vUv - .5; float r = length(p) * 2.;
      float pool = exp(-r * r * 3.2);
      float ripple = .06 * sin(r * 26. - uTime * 1.4) * pool;
      vec3 c = uCol * (pool * 2.6 + ripple) + uHi * pow(pool, 6.) * (1.2 + uPulse);
      c += vec3(.012) * (1. - r);
      gl_FragColor = vec4(c, 1.); }`,
});
const floor = new THREE.Mesh(new THREE.CircleGeometry(R_BOT, 96), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = FLOOR_Y;
scene.add(floor);

// a soft shaft of light rising from the pool
const shaft = new THREE.Mesh(
  new THREE.CylinderGeometry(1.1, 1.6, 7, 48, 1, true),
  new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color('#1b5c94') } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; void main(){ float a = pow(1. - vUv.y, 2.2) * .22; gl_FragColor = vec4(uCol * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  })
);
shaft.position.y = FLOOR_Y + 3.5;
scene.add(shaft);

const poolLight = new THREE.PointLight(0x2e7bbf, 14, 9, 1.6);
poolLight.position.set(0, FLOOR_Y + 0.35, 0);
scene.add(poolLight);
const screenLight = new THREE.PointLight(0xf2ede4, 6, 8, 1.8);
screenLight.position.set(0, FLOOR_Y + 1.8, 2.1);
scene.add(screenLight);
scene.add(new THREE.AmbientLight(0x223344, 0.25));

/* ---------- the lone figure ---------- */
const figure = new THREE.Group();
const body = new THREE.MeshStandardMaterial({ color: 0x0d0c0c, roughness: 0.55, metalness: 0.1 });
const cap = (r, l, x, y, z, rz = 0) => {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), body);
  m.position.set(x, y, z); m.rotation.z = rz; figure.add(m); return m;
};
cap(0.085, 0.72, -0.1, 0.45, 0);            // legs
cap(0.085, 0.72, 0.1, 0.45, 0);
const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.86, 18), body); // long coat
coat.position.y = 1.1; figure.add(coat);
cap(0.06, 0.55, -0.27, 1.12, 0, 0.12);      // arms
cap(0.06, 0.55, 0.27, 1.12, 0, -0.12);
const head = new THREE.Group();
head.position.y = 1.68; figure.add(head);
const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 18), body); head.add(skull);
const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), body); nose.position.set(0, -0.01, 0.125); head.add(nose);
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 10), body); neck.position.y = 1.56; figure.add(neck);
figure.position.y = FLOOR_Y;
figure.scale.setScalar(1.05);
scene.add(figure);

/* ---------- the big screen: cranks through the pages slit by slit ---------- */
const BIG_ARC = 2.1, BIG_H = 2.7;
const bigMat = new THREE.ShaderMaterial({
  uniforms: {
    uA: { value: textures[0] }, uB: { value: textures[1] }, uP: { value: 0 }, uOffset: { value: 0 },
    uWin: { value: 0.2 }, uTime: { value: 0 }, uBg: { value: INK }, uBone: { value: BONE }, uRing: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `
    uniform sampler2D uA, uB; uniform float uP, uOffset, uWin, uTime, uRing; uniform vec3 uBg, uBone; varying vec2 vUv;
    const float SLITS = 18.0;
    vec3 grab(sampler2D t, vec2 uv){ float ty = fract(uOffset + (1. - uv.y) * uWin); return texture2D(t, vec2(uv.x, 1. - ty)).rgb; }
    void main(){
      float s = floor(vUv.x * SLITS), f = fract(vUv.x * SLITS);
      float open = clamp(uP * (SLITS + 2.) - s, 0., 1.);          // slit s opens after slit s-1
      float shown = step(abs(f - .5) * 2., open);
      vec3 c = mix(grab(uA, vUv), grab(uB, vUv), shown);
      float gap = smoothstep(.0, .06, f) * smoothstep(1., .94, f);  // the dark bars between slits
      float flick = .9 + .1 * step(.5, fract(uTime * 11.));         // zoetrope shutter flicker
      c *= mix(.35, 1., gap) * flick;
      vec2 d = min(vUv, 1. - vUv);
      float edge = 1. - smoothstep(0., .01, min(d.x * .5, d.y));
      c = mix(c, c * .05, uRing) + uBone * edge * (.3 + uRing * 1.2);
      gl_FragColor = vec4(c, 1.);
    }`,
  side: THREE.DoubleSide,
});
const big = new THREE.Mesh(coneSlice(R_BOT - 0.15, R_BOT - 0.15, BIG_H, BIG_ARC, 40, 4), bigMat);
big.position.y = FLOOR_Y + BIG_H + 0.35;
scene.add(big);
const bigWidth = BIG_ARC * (R_BOT - 0.15);
bigMat.uniforms.uWin.value = (BIG_H / bigWidth) / 3;

/* ============================================================
   post: bloom, then speed streaks, grain and vignette
   ============================================================ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight).multiplyScalar(small ? 0.5 : 0.75), 0.6, 0.55, 0.78);
composer.addPass(bloom);
const lens = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uStreak: { value: 0 }, uTime: { value: 0 }, uGrain: { value: 0.045 }, uAspect: { value: innerWidth / innerHeight } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uStreak, uTime, uGrain, uAspect; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 dir = vUv - .5;
      vec3 c = vec3(0.); float tot = 0.;
      for (int i = 0; i < 10; i++) {                     // speed streaks: smear toward the centre
        float t = float(i) / 9.; float w = 1. - t * .7;
        vec2 o = dir * t * uStreak * .085;
        c.r += texture2D(tDiffuse, vUv - o * 1.03).r * w;
        c.g += texture2D(tDiffuse, vUv - o).g * w;
        c.b += texture2D(tDiffuse, vUv - o * .97).b * w;
        tot += w;
      }
      c /= tot;
      float vig = smoothstep(1.05, .28, length(dir * vec2(uAspect, 1.) * .85));
      c *= mix(.42, 1., vig);
      float g = hash(vUv * vec2(1931., 1129.) + fract(uTime * 7.)) - .5;
      c += g * uGrain * (.35 + c);                       // grain sits in the image, not on top
      gl_FragColor = vec4(c, 1.);
    }`,
});
composer.addPass(lens);
composer.addPass(new OutputPass());

/* ============================================================
   sound: synthesized room tone, ratchet clatter and wind
   ============================================================ */
const Sound = (() => {
  let ctx = null, master, windGain, windFilter, on = false;
  const noiseBuffer = (seconds, brown) => {
    const len = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  };
  let clickBuf;
  function start() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain(); master.gain.value = 0;
    master.connect(comp); comp.connect(ctx.destination);
    // room tone: brown noise, low-passed, with a faint low drone
    const room = ctx.createBufferSource(); room.buffer = noiseBuffer(4, true); room.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 190;
    const roomGain = ctx.createGain(); roomGain.gain.value = 0.32;
    room.connect(lp).connect(roomGain).connect(master); room.start();
    [55, 82.4].forEach((f, i) => {
      const o = ctx.createOscillator(); o.frequency.value = f; o.detune.value = i ? 7 : -5;
      const g = ctx.createGain(); g.gain.value = 0.018; o.connect(g).connect(master); o.start();
    });
    // wind: band-passed white noise, swept slowly, louder with speed
    const wind = ctx.createBufferSource(); wind.buffer = noiseBuffer(3, false); wind.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 520; windFilter.Q.value = 0.7;
    windGain = ctx.createGain(); windGain.gain.value = 0.012;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 260;
    lfo.connect(lfoAmt).connect(windFilter.frequency); lfo.start();
    wind.connect(windFilter).connect(windGain).connect(master); wind.start();
    clickBuf = noiseBuffer(0.05, false);
    setOn(true);
  }
  function setOn(v) {
    on = v;
    if (!ctx) { if (v) start(); return; }
    if (v && ctx.state === 'suspended') ctx.resume();
    master.gain.setTargetAtTime(v ? 0.9 : 0, ctx.currentTime, v ? 0.6 : 0.15);
  }
  let lastTick = 0;
  function click(freq, q, level, decay) {
    if (!ctx || !on) return;
    const now = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = clickBuf; s.playbackRate.value = 0.8 + Math.random() * 0.6;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * (0.9 + Math.random() * 0.2); bp.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(level, now); g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    s.connect(bp).connect(g).connect(master); s.start(now); s.stop(now + decay + 0.02);
  }
  return {
    start, setOn, isOn: () => on, has: () => !!ctx,
    speed(s) { if (ctx && on) { windGain.gain.setTargetAtTime(0.012 + s * 0.11, ctx.currentTime, 0.25); } },
    ratchet(level) { const t = performance.now(); if (t - lastTick < 34) return; lastTick = t; click(2600, 4, 0.05 + level * 0.12, 0.035); },
    crank() { click(900, 3, 0.16, 0.07); },
    suspend(v) { if (ctx) (v ? ctx.suspend() : (on && ctx.resume())); },
  };
})();
document.addEventListener('visibilitychange', () => Sound.suspend(document.hidden));

const soundBtn = $('[data-sound]');
const soundLabel = $('[data-sound-label]');
const showSound = () => {
  const on = Sound.isOn();
  soundBtn.setAttribute('aria-pressed', String(on));
  soundLabel.textContent = on ? 'Sound on' : 'Sound off';
  soundBtn.querySelector('[data-wave]').style.opacity = on ? 1 : 0.2;
};
soundBtn.addEventListener('click', () => { Sound.setOn(!Sound.isOn()); showSound(); });

/* ============================================================
   gate
   ============================================================ */
const gate = $('[data-gate]');
let entered = false;
const enter = (withSound) => {
  if (entered) return;
  entered = true;
  if (withSound) Sound.start();
  showSound();
  gate.classList.add('is-gone');
  document.body.classList.remove('is-locked');
  scrollTo(0, 0);
  setTimeout(() => gate.remove(), 1400);
};
document.querySelectorAll('[data-enter]').forEach((b) => b.addEventListener('click', () => enter(b.dataset.enter === 'sound')));

/* ============================================================
   kinetic type: letters arrive one by one per chapter
   ============================================================ */
document.querySelectorAll('[data-kinetic]').forEach((el) => {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((word) => {
          if (!word) return;
          if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          [...word].forEach((ch) => { const l = document.createElement('span'); l.className = 'l'; l.textContent = ch; l.style.setProperty('--i', i++); w.appendChild(l); });
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  walk(el);
});
const chapters = [...document.querySelectorAll('.ch')].map((el) => ({ el, from: +el.dataset.from, to: +el.dataset.to, on: false }));

/* ============================================================
   pointer, hover and the pulled screen
   ============================================================ */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2(0, 0);
let pointerSeen = false, hovered = null, lookAngle = 0;
addEventListener('pointermove', (e) => {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  pointerSeen = e.pointerType === 'mouse';
}, { passive: true });

const pulledUI = $('[data-pulled]');
let pulled = null; // { mesh, plane, t, dir }
const planeGeo = new THREE.PlaneGeometry(1, 1, 40, 1);

function openScreen(mesh) {
  if (pulled || !entered) return;
  const ud = mesh.userData;
  const mat = screenMaterial(textures[ud.site], ud.win);
  mat.uniforms.uOffset.value = mesh.material.uniforms.uOffset.value;
  mat.uniforms.uFog.value = 0;
  const plane = new THREE.Mesh(planeGeo, mat);
  // start where the screen is: its centre on the wall, facing the axis
  mesh.updateWorldMatrix(true, false);
  const midR = (ud.rTop + ud.rBot) / 2;
  const start = new THREE.Vector3(0, -RING_H / 2, midR).applyMatrix4(mesh.matrixWorld);
  plane.position.copy(start);
  plane.lookAt(new THREE.Vector3(0, start.y, 0));
  plane.scale.set(ud.width, RING_H, 1);
  scene.add(plane);
  mesh.visible = false;
  pulled = {
    mesh, plane, t: 0, dir: 1,
    from: { pos: start.clone(), quat: plane.quaternion.clone(), sx: ud.width, sy: RING_H, win: ud.win },
  };
  const s = SITES[ud.site];
  $('[data-pulled-n]').textContent = `Screen ${String(ud.site + 1).padStart(2, '0')} of 09`;
  $('[data-pulled-title]').textContent = s.title;
  $('[data-pulled-line]').textContent = s.line;
  $('[data-pulled-link]').setAttribute('href', s.href);
  pulledUI.classList.add('is-on');
  document.body.classList.add('is-locked');
  Sound.crank();
}
function closeScreen() {
  if (!pulled || pulled.dir < 0) return;
  pulled.dir = -1;
  pulledUI.classList.remove('is-on');
  Sound.crank();
}
$('[data-pulled-close]').addEventListener('click', closeScreen);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeScreen(); });

// while a screen is out, scrolling plays it instead of moving the well
addEventListener('wheel', (e) => {
  if (!pulled || pulled.dir < 0) return;
  e.preventDefault();
  pulled.plane.material.uniforms.uOffset.value += e.deltaY * 0.0006;
}, { passive: false });
let dragY = null;
addEventListener('touchstart', (e) => { if (pulled) dragY = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', (e) => {
  if (!pulled || dragY === null) return;
  const y = e.touches[0].clientY;
  pulled.plane.material.uniforms.uOffset.value += (dragY - y) * 0.0012;
  dragY = y;
}, { passive: true });

canvas.addEventListener('click', (e) => {
  if (!entered) return;
  if (pulled) {
    // a click away from the pulled screen puts it back
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.intersectObject(pulled.plane).length) closeScreen();
    return;
  }
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(screens.filter((m) => m.visible), false)[0];
  if (hit) openScreen(hit.object);
});

/* ============================================================
   scroll
   ============================================================ */
let target = 0, prog = 0, vel = 0;
const readScroll = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  target = max > 0 ? clamp(scrollY / max) : 0;
};
addEventListener('scroll', readScroll, { passive: true });
readScroll();

/* ============================================================
   resize
   ============================================================ */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  lens.uniforms.uAspect.value = innerWidth / innerHeight;
  readScroll();
});

/* ============================================================
   the loop
   ============================================================ */
const meter = $('[data-meter]');
const chaptersEl = $('.chapters');
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3();
let bigP = 0, bigIdx = 0, bigSlit = -1, frame = 0, finale = 0, figYaw = 0, headYaw = 0, sway = 0;
const TOP_Y = 7.5;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  frame++;

  // smoothed progress and a 0..1 speed from how fast it moves
  const prev = prog;
  prog += (target - prog) * (reduce ? 1 : 1 - Math.exp(-dt * 4.2));
  vel = lerp(vel, (prog - prev) / Math.max(dt, 1e-3), 1 - Math.exp(-dt * 6));
  const speed = clamp(Math.abs(vel) * 5);
  Sound.speed(speed);
  meter.style.setProperty('--p', prog.toFixed(4));

  // chapters
  let anyOn = false, centerOn = false;
  chapters.forEach((c) => {
    const on = prog >= c.from && prog < c.to && entered && !pulled;
    if (on !== c.on) { c.on = on; c.el.classList.toggle('is-on', on); }
    if (on) { anyOn = true; centerOn = c.el.classList.contains('ch--center'); }
  });
  chaptersEl.classList.toggle('has-words', anyOn);
  chaptersEl.classList.toggle('is-center', centerOn);

  // rings turn faster lower down, and much faster while scrolling
  const turn = (reduce ? 0.15 : 1) * (1 + speed * 9);
  rings.forEach((r, i) => {
    const d = r.speed * turn * dt * (i % 2 ? -1 : 1);
    r.group.rotation.y += d;
    r.angle += Math.abs(d);
    if (i === 0 && r.angle > (Math.PI * 2 / r.K) / 3) { r.angle = 0; if (speed > 0.04) Sound.ratchet(speed); }
  });
  // playback: every screen scrolls its page, faster with scroll speed
  const play = dt * (0.012 + speed * 0.22);
  for (const m of screens) m.material.uniforms.uOffset.value += play * (1 + m.userData.ring * 0.08);

  // camera: descend looking down, level out at the bottom, then rise for the finale
  const desc = easeInOut(clamp(prog / 0.8));
  finale = smooth(0.86, 1, prog);
  const bottomY = FLOOR_Y + 1.55;
  let y = lerp(TOP_Y, bottomY, desc);
  let z = lerp(0, -(R_BOT - 0.55), smooth(0.55, 0.8, prog));
  let pitch = lerp(-1.42, -0.08, smooth(0.5, 0.8, prog));
  sway += dt * 0.25;
  let yaw = Math.sin(sway) * 0.12 * (1 - smooth(0.6, 0.8, prog));
  if (pointerSeen && !pulled) { yaw += -ndc.x * 0.22; pitch += ndc.y * 0.1; }
  // finale: up and out until the well is a ring of light
  y = lerp(y, TOP_Y + 22, easeInOut(finale));
  z = lerp(z, 0, finale);
  pitch = lerp(pitch, -Math.PI / 2 + 0.002, finale);
  camPos.set(0, y, z);
  camera.position.lerp(camPos, reduce ? 1 : 1 - Math.exp(-dt * 10));
  camLook.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).add(camera.position);
  camera.up.set(0, 1, 0);
  if (finale > 0.98) camera.up.set(0, 0, 1);
  camera.lookAt(camLook);

  // what are you looking at? the pointer if there is one, else the middle of the view
  if (frame % 3 === 0 && !pulled) {
    raycaster.setFromCamera(pointerSeen ? ndc : new THREE.Vector2(0, 0), camera);
    const hit = raycaster.intersectObjects(screens, false)[0];
    hovered = hit ? hit.object : null;
    canvas.style.cursor = hovered && pointerSeen ? 'pointer' : '';
    if (hovered) { hit.point.y = 0; lookAngle = Math.atan2(hit.point.x, hit.point.z); }
  }
  for (const m of screens) {
    const u = m.material.uniforms;
    u.uGlow.value += ((m === hovered ? 1 : 0) - u.uGlow.value) * 0.12;
    u.uRing.value = finale;
  }
  ringLights.forEach((l, i) => l.material.color.copy(BONE).multiplyScalar(0.3 + finale * (2.1 - i * 0.18) + speed * 0.3));
  bloom.strength = 0.6 + finale * 0.45 + speed * 0.15;

  // the figure turns to watch whatever you're looking at (the big screen by default)
  const want = hovered ? lookAngle : 0;
  let dy = want - figYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  figYaw += dy * 0.04;
  figure.rotation.y = figYaw;
  let hy = (hovered ? lookAngle : 0) - (figYaw + headYaw); hy = Math.atan2(Math.sin(hy), Math.cos(hy));
  headYaw = clamp(headYaw + hy * 0.08, -0.7, 0.7);
  head.rotation.y = headYaw;
  head.rotation.x = hovered ? -0.35 : -0.05; // looks up at the walls
  figure.position.y = FLOOR_Y + Math.sin(t * 1.3) * 0.004;

  // the big screen cranks through the pages, one slit at a time
  bigP += dt / 2.8 * (1 + speed * 2);
  if (bigP >= 1) {
    bigP = 0; bigIdx = (bigIdx + 1) % SITES.length;
    bigMat.uniforms.uA.value = textures[bigIdx];
    bigMat.uniforms.uB.value = textures[(bigIdx + 1) % SITES.length];
    bigSlit = -1;
  }
  const slit = Math.floor(clamp(bigP * 1.11) * 18);
  if (slit !== bigSlit && slit < 18) { bigSlit = slit; if (prog > 0.6 && prog < 0.9) Sound.crank(); }
  bigMat.uniforms.uP.value = easeInOut(clamp(bigP * 1.1));
  bigMat.uniforms.uOffset.value += dt * 0.03;
  bigMat.uniforms.uTime.value = t;
  bigMat.uniforms.uRing.value = finale;
  floorMat.uniforms.uTime.value = t;
  floorMat.uniforms.uPulse.value = speed;

  // a screen pulled off the wall: lift, flatten, unroll toward you
  if (pulled) {
    const p = pulled;
    p.t = clamp(p.t + Math.min(dt, 0.12) * (p.dir > 0 ? 1.15 : 1.6) * p.dir);
    const e = easeInOut(p.t);
    const dist = small ? 2.3 : 2.6;
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const viewW = viewH * camera.aspect;
    let th = viewH * 0.78, tw = th * 0.58;
    if (tw > viewW * 0.86) { tw = viewW * 0.86; th = tw / 0.58; }
    tmp.set(0, 0, -dist).applyQuaternion(camera.quaternion).add(camera.position);
    if (!small) tmp.add(new THREE.Vector3(viewW * 0.12, 0, 0).applyQuaternion(camera.quaternion));
    p.plane.position.lerpVectors(p.from.pos, tmp, e);
    p.plane.quaternion.slerpQuaternions(p.from.quat, camera.quaternion, e);
    const u = p.plane.material.uniforms;
    p.plane.scale.set(lerp(p.from.sx, tw, e), lerp(p.from.sy, th, e), 1);
    u.uBend.value = (1 - smooth(0.25, 0.85, p.t)) * 0.18;       // curved on the wall, flat in your hands
    u.uWin.value = lerp(p.from.win, (th / tw) / 3, e);
    u.uReveal.value = p.dir > 0 ? lerp(0.35, 1, smooth(0.35, 1, p.t)) : 1; // unrolls top to bottom
    u.uOffset.value += dt * 0.012;
    u.uGlow.value = 0.2 * e;
    for (const m of screens) m.material.uniforms.uDim.value = 0.55 * e;
    if (p.dir < 0 && p.t <= 0) {
      p.mesh.visible = true;
      p.mesh.material.uniforms.uOffset.value = u.uOffset.value;
      scene.remove(p.plane);
      p.plane.material.dispose();
      for (const m of screens) m.material.uniforms.uDim.value = 0;
      pulled = null;
      document.body.classList.remove('is-locked');
    }
  }

  lens.uniforms.uStreak.value = reduce ? 0 : lerp(lens.uniforms.uStreak.value, speed * 0.7, 1 - Math.exp(-dt * 8));
  lens.uniforms.uTime.value = reduce ? 0 : t;
  composer.render(dt);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
