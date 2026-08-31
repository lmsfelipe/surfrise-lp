/**
 * Renderiza a hero em software, com a mesma matemática do shader de
 * HeroCanvas.tsx, para gerar os pôsteres estáticos.
 *
 * Por que existe: abaixo de 1000px a página não baixa three.js nem abre um
 * contexto WebGL. Sem isso a hero cairia num gradiente CSS chapado.
 *
 * O que é aproximado: a interseção do raio com a superfície deslocada é
 * resolvida por três iterações de ponto fixo em vez de rasterizar a malha.
 * Na prática é indistinguível — a diferença aparece só em silhuetas de crista
 * bem em primeiro plano.
 */

// ---------- utilidades ----------
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Mesma semântica do smoothstep do GLSL, inclusive com edge0 > edge1. */
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * O three.js converte cores de uniform de sRGB para linear antes de enviá-las,
 * e o shader escreve o resultado direto no framebuffer. Para o pôster bater com
 * a tela, a conversão precisa acontecer aqui também.
 */
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const uniformColor = (hex) =>
  [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => srgbToLinear(v / 255));

// ---------- ruído (espelha o GLSL) ----------
const fract = (x) => x - Math.floor(x);
const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);

function vnoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return mix(
    mix(hash(ix, iy), hash(ix + 1, iy), ux),
    mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux),
    uy,
  );
}

function fbm(x, y) {
  let v = 0;
  let a = 0.55;
  for (let i = 0; i < 4; i++) {
    v += a * vnoise(x, y);
    x *= 2.03;
    y *= 2.03;
    a *= 0.5;
  }
  return v;
}

// ---------- ondas (idênticas ao vertex shader) ----------
const DIR = [
  [0.9363, 0.3511],
  [0.5735, -0.8192],
  [-0.8619, 0.507],
  [0.1961, 0.9806],
];
const FREQ = [0.449, 0.785, 1.396, 2.417];
const AMP = [0.34, 0.155, 0.085, 0.038];
const SPEED = [0.55, 0.82, 1.25, 1.8];

function wave(x, z, t) {
  let h = 0;
  let dx = 0;
  let dz = 0;
  for (let i = 0; i < 4; i++) {
    const p = (x * DIR[i][0] + z * DIR[i][1]) * FREQ[i] + t * SPEED[i];
    h += AMP[i] * Math.sin(p);
    const c = AMP[i] * Math.cos(p) * FREQ[i];
    dx += c * DIR[i][0];
    dz += c * DIR[i][1];
  }
  return [h, dx, dz];
}

// ---------- paleta ----------
// Constantes literais do shader do céu: não passam pelo three, vão como estão.
const ZENITH = [0.055, 0.137, 0.259];
const HIGH = [0.125, 0.337, 0.529];
const MID = [0.376, 0.518, 0.627];
const ROSE = [0.8, 0.478, 0.443];
const WARM = [0.98, 0.78, 0.529];
const EMBER = [0.957, 0.549, 0.318];
const FOAM = [0.87, 0.93, 0.91];

// Uniforms: entram no shader já linearizados pelo three.
const SUN_COL = uniformColor(0xffc880);
const DEEP = uniformColor(0x11304a);
const LIT = uniformColor(0x24708c);
const SKY_LOW = uniformColor(0xf2ab6a);
const SKY_HIGH = uniformColor(0x2a5f8c);
const HAZE = uniformColor(0xe89a63);

const FOG_NEAR = 34;
const FOG_FAR = 96;
const CAM_Z = 8;
const MESH_Z = CAM_Z - 60; // deslocamento do plano: a fase da onda usa a coord. local
const TIME = 12.0;

function skyAt(uvx, uvy, aspect, horizonUv, sunUv, halo) {
  const t = uvy - horizonUv;
  const a = clamp(t / 0.55, 0, 1);

  let sky = mix3(WARM, ROSE, smoothstep(0.02, 0.17, a));
  sky = mix3(sky, MID, smoothstep(0.13, 0.38, a));
  sky = mix3(sky, HIGH, smoothstep(0.3, 0.68, a));
  sky = mix3(sky, ZENITH, smoothstep(0.62, 1.0, a));
  sky = mix3(sky, EMBER, Math.exp(-Math.abs(t) * 9) * 0.72);

  const cpx = (uvx * aspect * 1.35 + TIME * 0.006) * 2.2;
  const cpy = (t + 0.05) * 4.2 * 2.2;
  let clouds = fbm(cpx, cpy);
  clouds *= smoothstep(0, 0.16, t) * smoothstep(0.72, 0.24, t);
  const band = smoothstep(0.52, 0.86, clouds);
  sky = mix3(sky, mix3(EMBER, [1.0, 0.85, 0.72], 0.45), band * 0.34);
  sky = add3(sky, scale3([0.16, 0.09, 0.05], band * Math.exp(-Math.abs(t) * 5)));

  const dx = (uvx - sunUv[0]) * aspect;
  const dy = uvy - sunUv[1];
  const r = Math.hypot(dx, dy);
  const glow = Math.exp(-r * 5 * halo) * 0.95 + Math.exp(-r * 2 * halo) * 0.32;
  sky = add3(sky, scale3([1.0, 0.72, 0.42], glow * 1.05));
  sky = mix3(sky, [1.0, 0.94, 0.83], smoothstep(0.034, 0.014, r) * 0.6);

  return mix3(sky, scale3(sky, 0.55), smoothstep(0, -0.16, t));
}

/** Devolve um Buffer RGB de W*H*3 bytes. */
export function renderHero({ width, height, horizonFromTop, sunNdc, halo, fov, camY }) {
  const W = width;
  const H = height;
  const aspect = W / H;
  const tanHalf = Math.tan(((fov / 2) * Math.PI) / 180);
  const pitch = Math.atan(-(1 - 2 * horizonFromTop) * tanHalf);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  const rayFor = (ndcx, ndcy) => {
    const dx = ndcx * tanHalf * aspect;
    const dy = ndcy * tanHalf;
    const y = dy * cosP + sinP;
    const z = dy * sinP - cosP;
    const len = Math.hypot(dx, y, z);
    return [dx / len, y / len, z / len];
  };

  const L = rayFor(sunNdc[0], sunNdc[1]);
  const sunUv = [(sunNdc[0] + 1) / 2, (sunNdc[1] + 1) / 2];
  const horizonUv = 1 - horizonFromTop;

  const out = Buffer.allocUnsafe(W * H * 3);
  let o = 0;

  for (let py = 0; py < H; py++) {
    const uvy = 1 - (py + 0.5) / H;
    const ndcy = 1 - (2 * (py + 0.5)) / H;

    for (let px = 0; px < W; px++) {
      const uvx = (px + 0.5) / W;
      const ndcx = (2 * (px + 0.5)) / W - 1;

      const rd = rayFor(ndcx, ndcy);
      let col = skyAt(uvx, uvy, aspect, horizonUv, sunUv, halo);

      if (rd[1] < -1e-4) {
        // Ponto fixo até a superfície deslocada.
        let t = camY / -rd[1];
        let h = 0;
        for (let k = 0; k < 3; k++) {
          if (!Number.isFinite(t) || t > 4000) break;
          h = wave(rd[0] * t, CAM_Z + rd[2] * t - MESH_Z, TIME)[0];
          t = (camY - h) / -rd[1];
        }
        t = clamp(t, 0, 4000);

        const [hh, ddx, ddz] = wave(rd[0] * t, CAM_Z + rd[2] * t - MESH_Z, TIME);
        const nl = Math.hypot(-ddx, 1, -ddz);
        const N = [-ddx / nl, 1 / nl, -ddz / nl];
        const V = [-rd[0], -rd[1], -rd[2]];

        const fog = smoothstep(FOG_NEAR, FOG_FAR, t);

        const d = dot3(rd, N);
        const R = [rd[0] - 2 * d * N[0], rd[1] - 2 * d * N[1], rd[2] - 2 * d * N[2]];

        let w = mix3(DEEP, LIT, clamp(hh * 1.3 + 0.5, 0, 1));
        const fres = (1 - Math.max(dot3(N, V), 0)) ** 4;
        w = mix3(w, mix3(SKY_LOW, SKY_HIGH, clamp(R[1] * 3.2, 0, 1)), fres * 0.88);

        const rl = Math.max(dot3(R, L), 0);
        w = add3(w, scale3(SUN_COL, rl ** 11 * 0.55));
        w = add3(w, scale3(SUN_COL, rl ** mix(520, 90, fog) * mix(3.2, 0.9, fog)));

        w = mix3(w, FOAM, smoothstep(0.36, 0.56, hh) * 0.26);
        w = mix3(w, HAZE, fog * 0.92);

        col = mix3(col, w, 1 - fog * fog);
      }

      const dither = (Math.random() - 0.5) / 240;
      out[o++] = clamp((col[0] + dither) * 255 + 0.5, 0, 255) | 0;
      out[o++] = clamp((col[1] + dither) * 255 + 0.5, 0, 255) | 0;
      out[o++] = clamp((col[2] + dither) * 255 + 0.5, 0, 255) | 0;
    }
  }

  return out;
}

/** Enquadramentos: o largo é o mesmo do WebGL, o alto é a versão de coluna única. */
export const FRAMINGS = {
  wide: { horizonFromTop: 0.575, sunNdc: [0.06, -0.115], halo: 1.0, fov: 45, camY: 3.2 },
  tall: { horizonFromTop: 0.82, sunNdc: [0.3, -0.6], halo: 1.7, fov: 52, camY: 3.4 },
};
