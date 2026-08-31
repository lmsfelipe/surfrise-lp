/**
 * Gera os assets derivados da landing page:
 *   1. os prints do app em WebP (public/prints/*.webp)
 *   2. a marca "surfrise" recortada do arquivo de seleção (public/brand/logo.webp)
 *   3. a imagem de compartilhamento (public/og.jpg)
 *
 * Fontes ficam em src/assets/ (não são servidas).
 * Rode com `npm run assets` sempre que trocar os prints ou a marca.
 */
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { renderHero, FRAMINGS } from "./hero-poster.mjs";

const SRC = "src/assets/prints";
const OUT = "public/prints";

/**
 * Cada print sai em duas larguras. O maior mockup da página tem 306 px de CSS,
 * então 706w cobre retina no desktop e 424w cobre o celular (232 px em DPR
 * 1,75). Sem isso o celular baixava o arquivo de desktop — era o "Improve
 * image delivery" do Lighthouse.
 */
const PRINT_WIDTHS = [424, 706];

async function prints() {
  await mkdir(OUT, { recursive: true });
  const files = (await readdir(SRC)).filter((f) => f.endsWith(".png")).sort();
  for (const f of files) {
    const base = f.replace(/\.png$/, "");
    for (const w of PRINT_WIDTHS) {
      // A largura maior mantém o nome sem sufixo: é o src de fallback.
      const to = join(OUT, w === 706 ? `${base}.webp` : `${base}-${w}.webp`);
      const info = await sharp(join(SRC, f))
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toFile(to);
      console.log(`  ${f} → ${to}  ${(info.size / 1024).toFixed(0)} kB`);
    }
  }
}

/**
 * A marca. A fonte (src/assets/brand/logo-source.png) já é o wordmark
 * "surfrise" + o traço em degradê prontos: texto branco, fundo genuinamente
 * transparente, sem nenhum cartão ou cor colada atrás — só recorta a margem
 * em branco de cima e reduz pro tamanho de exibição.
 *
 * (Existiu antes uma versão desta função que reconstruía a marca a partir de
 * um recorte de seleção com um cartão cor de areia colado atrás: distância
 * de cor pra achar o que era fundo, classificação texto/traço por canal,
 * desfoque pra disfarçar ruído de compressão. Funcionava, mas cada uma dessas
 * etapas arriscava perder um pouco de fidelidade às formas reais das letras
 * — e perdia, visivelmente. Esta fonte já vem correta, então essa
 * reconstrução toda é desnecessária.)
 *
 * Se a marca for atualizada, troque src/assets/brand/logo-source.png por um
 * arquivo no mesmo formato (texto branco, fundo transparente) e rode
 * `npm run assets` de novo.
 */
async function logo() {
  const SRC = "src/assets/brand/logo-source.png";

  // Margem em branco no topo do canvas fonte (824×328) — o conteúdo real
  // começa em y=37 e vai até a borda em todos os outros lados.
  const TOP_PAD = 37;

  // A marca só aparece na Nav (~59px de largura) e no rodapé (~68px). 360px
  // cobre até 5x a maior das duas — bem além de qualquer tela real — e ainda
  // assim é bem menos pixel que o arquivo de origem, que só é grande porque
  // veio de um arquivo de seleção de marca em alta resolução.
  const MAX_WIDTH = 360;

  await mkdir("public/brand", { recursive: true });
  const meta = await sharp(SRC).metadata();

  // .trim() encadeado direto depois de .extract() dá "bad extract area" no
  // sharp — materializar o recorte num buffer antes resolve.
  const cropped = await sharp(SRC)
    .extract({ left: 0, top: TOP_PAD, width: meta.width, height: meta.height - TOP_PAD })
    .png()
    .toBuffer();

  const info = await sharp(cropped)
    .trim({ threshold: 8 })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    // Mesma qualidade dos prints (82): a 360px de largura já é bem maior que
    // o uso real (~68px no rodapé), então qualquer perda por compressão some
    // no downscale do navegador antes de chegar na tela.
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile("public/brand/logo.webp");
  console.log(`  logo.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} kB`);
}

const BG = "#071426";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function og() {
  const W = 1200;
  const H = 630;
  const HORIZON = 0.74; // mesma proporção da hero: céu em cima, mar embaixo

  const backdrop = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0a1c34"/>
          <stop offset="30%"  stop-color="#123a5c"/>
          <stop offset="52%"  stop-color="#4a6c85"/>
          <stop offset="66%"  stop-color="#cc7a71"/>
          <stop offset="${HORIZON * 100}%" stop-color="#f4c483"/>
          <stop offset="${HORIZON * 100 + 2}%" stop-color="#d98b52"/>
          <stop offset="86%"  stop-color="#1d4560"/>
          <stop offset="100%" stop-color="#0d2637"/>
        </linearGradient>
        <radialGradient id="sun" cx="40%" cy="${HORIZON * 100 - 3}%" r="46%">
          <stop offset="0%"   stop-color="#ffe6bc" stop-opacity="0.95"/>
          <stop offset="28%"  stop-color="#f6b269" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#f6b269" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#05101c" stop-opacity="0.82"/>
          <stop offset="42%"  stop-color="#05101c" stop-opacity="0.45"/>
          <stop offset="72%"  stop-color="#05101c" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="${BG}"/>
      <rect width="${W}" height="${H}" fill="url(#sky)"/>
      <rect width="${W}" height="${H}" fill="url(#sun)"/>
      <rect width="${W}" height="${H}" fill="url(#scrim)"/>
    </svg>`);

const type = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#f6c667"/>
        </linearGradient>
      </defs>
      <style>
        .wm  { font: 300 34px "Helvetica Neue", Helvetica, Arial, sans-serif; fill: #fff; letter-spacing: -1px; }
        .wmb { font: 700 34px "Helvetica Neue", Helvetica, Arial, sans-serif; fill: #fff; letter-spacing: -1px; }
        .h   { font: 700 76px "Helvetica Neue", Helvetica, Arial, sans-serif; fill: #fff; letter-spacing: -3.4px; }
        .ha  { font: 700 76px "Helvetica Neue", Helvetica, Arial, sans-serif; fill: #f8dba4; letter-spacing: -3.4px; }
        .sub { font: 400 25px "Helvetica Neue", Helvetica, Arial, sans-serif; fill: #cfd9e4; }
        .tag { font: 600 18px "Helvetica Neue", Helvetica, Arial, sans-serif; fill: #ffe3bd; letter-spacing: 0.6px; }
      </style>

      <text x="72" y="96"><tspan class="wm">surf</tspan><tspan class="wmb">rise</tspan></text>
      <rect x="72" y="110" width="118" height="4" rx="2" fill="url(#rule)"/>

      <text class="h" x="72" y="292">${esc("Surfe.")}</text>
      <text class="h" x="72" y="372">${esc("Analise.")}</text>
      <text class="ha" x="72" y="452">${esc("Evolua.")}</text>

      <text class="sub" x="74" y="512">${esc("Análise do seu surf a partir das mídias da sua sessão.")}</text>

      <rect x="72" y="548" width="330" height="42" rx="21" fill="#e8955b" fill-opacity="0.18" stroke="#f6c667" stroke-opacity="0.42"/>
      <circle cx="96" cy="569" r="4" fill="#f6c667"/>
      <text class="tag" x="112" y="576">${esc("Beta aberto · grátis · sem cartão")}</text>
    </svg>`);

  // Recortado no topo: mostra as notas e corta a barra inferior do app.
  const shotW = 252;
  const shotH = 466;
  const mask = Buffer.from(
    `<svg width="${shotW}" height="${shotH}" xmlns="http://www.w3.org/2000/svg"><rect width="${shotW}" height="${shotH}" rx="26" ry="26" fill="#fff"/></svg>`,
  );
  const shot = await sharp("src/assets/prints/03-analise.png")
    .resize(shotW, shotH, { fit: "cover", position: "top" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const info = await sharp(backdrop)
    .composite([
      { input: shot, left: 856, top: 82 },
      { input: type, left: 0, top: 0 },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile("public/og.jpg");

  console.log(`  og.jpg  ${W}x${H}  ${(info.size / 1024).toFixed(0)} kB`);
}

/**
 * Pôsteres da hero. O largo repete o enquadramento do WebGL (é o que aparece
 * antes do shader carregar e se o WebGL falhar); o alto é o que o mobile usa,
 * onde o three.js nem é baixado.
 *
 * Renderizados em 2x e reduzidos: a cintilância do sol alias feio em 1x.
 */
const POSTERS = [
  { name: "hero-wide", w: 1440, h: 900, framing: FRAMINGS.wide, quality: 74 },
  { name: "hero-tall", w: 620, h: 2000, framing: FRAMINGS.tall, quality: 72 },
];

async function posters() {
  const SS = 2;
  for (const p of POSTERS) {
    const t0 = Date.now();
    const raw = renderHero({ width: p.w * SS, height: p.h * SS, ...p.framing });
    const info = await sharp(raw, {
      raw: { width: p.w * SS, height: p.h * SS, channels: 3 },
    })
      .resize(p.w, p.h, { fit: "fill", kernel: "lanczos3" })
      .webp({ quality: p.quality, effort: 6 })
      .toFile(`public/${p.name}.webp`);
    console.log(
      `  ${p.name}.webp  ${p.w}x${p.h}  ${(info.size / 1024).toFixed(0)} kB  (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
    );
  }
}

console.log("prints:");
await prints();
console.log("logo:");
await logo();
console.log("posters:");
await posters();
console.log("og:");
await og();
