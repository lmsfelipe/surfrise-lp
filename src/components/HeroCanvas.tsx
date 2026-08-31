import { useEffect, useRef } from "react";
import * as THREE from "three";

/* --------------------------------------------------------------------------
 * Mar ao pôr do sol.
 *
 * Duas passadas de render: um quad em espaço de tela com o céu (gradiente,
 * nuvens, brilho do sol) e, por cima, um plano deslocado por soma de ondas
 * direcionais com normal analítica — reflexo do céu por Fresnel, cintilância
 * do sol e espuma nas cristas. A água some em neblina antes da borda do
 * plano, então o horizonte é uma fusão suave com o céu.
 * -------------------------------------------------------------------------- */


const screenQuadVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const blitFrag = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  void main() {
    gl_FragColor = texture2D(uMap, vUv);
  }
`;

const skyFrag = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uAspect;
  uniform float uHorizon;   // 0 = base da tela, 1 = topo
  uniform vec2  uSunUv;
  uniform float uHalo;      // >1 fecha o brilho do sol

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float t = vUv.y - uHorizon;          // >0 acima do horizonte
    float a = clamp(t / 0.55, 0.0, 1.0); // 0 no horizonte, 1 lá em cima

    const vec3 ZENITH = vec3(0.055, 0.137, 0.259);  // azul profundo
    const vec3 HIGH   = vec3(0.125, 0.337, 0.529);  // azul de fim de tarde
    const vec3 MID    = vec3(0.376, 0.518, 0.627);  // azul empoeirado
    const vec3 ROSE   = vec3(0.800, 0.478, 0.443);  // rosa de transição
    const vec3 WARM   = vec3(0.980, 0.780, 0.529);  // areia quente
    const vec3 EMBER  = vec3(0.957, 0.549, 0.318);  // brasa no horizonte

    // laranja → rosa → azul: é o rosa que impede o céu de virar cinza
    vec3 sky = mix(WARM, ROSE, smoothstep(0.02, 0.17, a));
    sky = mix(sky, MID, smoothstep(0.13, 0.38, a));
    sky = mix(sky, HIGH, smoothstep(0.30, 0.68, a));
    sky = mix(sky, ZENITH, smoothstep(0.62, 1.0, a));

    // banda quente colada no horizonte
    sky = mix(sky, EMBER, exp(-abs(t) * 9.0) * 0.72);

    // nuvens finas e alongadas, arrastando devagar
    vec2 cp = vec2(vUv.x * uAspect * 1.35 + uTime * 0.006, (t + 0.05) * 4.2);
    float clouds = fbm(cp * 2.2);
    clouds *= smoothstep(0.0, 0.16, t) * smoothstep(0.72, 0.24, t);
    float band = smoothstep(0.52, 0.86, clouds);
    sky = mix(sky, mix(EMBER, vec3(1.0, 0.85, 0.72), 0.45), band * 0.34);
    sky += band * vec3(0.16, 0.09, 0.05) * exp(-abs(t) * 5.0);

    // sol atrás da bruma: núcleo discreto, halo largo
    vec2 d = (vUv - uSunUv) * vec2(uAspect, 1.0);
    float r = length(d);
    float halo = exp(-r * 5.0 * uHalo) * 0.95 + exp(-r * 2.0 * uHalo) * 0.32;
    sky += halo * vec3(1.0, 0.72, 0.42) * 1.05;
    sky = mix(sky, vec3(1.0, 0.94, 0.83), smoothstep(0.034, 0.014, r) * 0.6);

    // abaixo do horizonte só aparece onde a água já desapareceu
    sky = mix(sky, sky * 0.55, smoothstep(0.0, -0.16, t));

    // dither contra banding
    float dth = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    sky += (dth - 0.5) / 240.0;

    gl_FragColor = vec4(sky, 1.0);
  }
`;

const waterVert = /* glsl */ `
  uniform float uTime;
  uniform float uSwell;

  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vWorld;

  void main() {
    vec3 pos = position;

    // quatro trens de onda direcionais — comprimentos decrescentes
    const vec2 d1 = vec2(0.9363, 0.3511);
    const vec2 d2 = vec2(0.5735, -0.8192);
    const vec2 d3 = vec2(-0.8619, 0.5070);
    const vec2 d4 = vec2(0.1961, 0.9806);

    float f1 = 0.449, a1 = 0.34, s1 = 0.55;
    float f2 = 0.785, a2 = 0.155, s2 = 0.82;
    float f3 = 1.396, a3 = 0.085, s3 = 1.25;
    float f4 = 2.417, a4 = 0.038, s4 = 1.80;

    float p1 = dot(pos.xz, d1) * f1 + uTime * s1;
    float p2 = dot(pos.xz, d2) * f2 + uTime * s2;
    float p3 = dot(pos.xz, d3) * f3 + uTime * s3;
    float p4 = dot(pos.xz, d4) * f4 + uTime * s4;

    float h = a1 * sin(p1) + a2 * sin(p2) + a3 * sin(p3) + a4 * sin(p4);
    h *= uSwell;

    float dx = a1 * cos(p1) * f1 * d1.x + a2 * cos(p2) * f2 * d2.x
             + a3 * cos(p3) * f3 * d3.x + a4 * cos(p4) * f4 * d4.x;
    float dz = a1 * cos(p1) * f1 * d1.y + a2 * cos(p2) * f2 * d2.y
             + a3 * cos(p3) * f3 * d3.y + a4 * cos(p4) * f4 * d4.y;
    dx *= uSwell;
    dz *= uSwell;

    pos.y += h;

    vHeight = h;
    vNormal = normalize(vec3(-dx, 1.0, -dz));

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const waterFrag = /* glsl */ `
  precision highp float;

  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vWorld;

  uniform vec3  uSunDir;
  uniform vec3  uSunCol;
  uniform vec3  uDeep;
  uniform vec3  uLit;
  uniform vec3  uSkyLow;
  uniform vec3  uSkyHigh;
  uniform vec3  uHaze;
  uniform float uFogNear;
  uniform float uFogFar;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 L = normalize(uSunDir);

    float dist = length(cameraPosition - vWorld);
    float fog = smoothstep(uFogNear, uFogFar, dist);

    // corpo d'água
    vec3 col = mix(uDeep, uLit, clamp(vHeight * 1.3 + 0.5, 0.0, 1.0));

    // reflexo: o que importa é para onde o olhar reflete, não a normal.
    // Rasante devolve o céu junto ao horizonte — ou seja, a cor do pôr do sol.
    vec3 R = reflect(-V, N);
    float up = clamp(R.y * 3.2, 0.0, 1.0);
    vec3 refl = mix(uSkyLow, uSkyHigh, up);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    col = mix(col, refl, fres * 0.88);

    // caminho do sol na água: brilho largo + cintilância nas facetas alinhadas
    float rl = max(dot(R, L), 0.0);
    col += uSunCol * pow(rl, 11.0) * 0.55;
    float glitter = pow(rl, mix(520.0, 90.0, fog));
    col += uSunCol * glitter * mix(3.2, 0.9, fog);

    // espuma só nas cristas mais altas
    float foam = smoothstep(0.36, 0.56, vHeight);
    col = mix(col, vec3(0.87, 0.93, 0.91), foam * 0.26);

    // perspectiva aérea e dissolução no céu
    col = mix(col, uHaze, fog * 0.92);

    float dth = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (dth - 0.5) / 240.0;

    gl_FragColor = vec4(col, 1.0 - fog * fog);
  }
`;

export default function HeroCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Este componente só é hidratado a partir de 1000px e sem prefers-reduced-
    // motion (ver client:media em Hero.astro). Abaixo disso a hero fica no
    // pôster estático e o three.js nem chega a ser baixado. Estes valores são,
    // portanto, sempre os do enquadramento largo — e o pôster largo usa os
    // mesmos, para a troca ser imperceptível.
    const horizonFromTop = 0.575;
    const sunNdc = new THREE.Vector2(0.06, -0.115);
    const haloTightness = 1.0;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        // A água dissolve na neblina e o céu é um quad de tela inteira: não há
        // silhueta para o MSAA suavizar, e ele custaria ~100 MB de framebuffer.
        antialias: false,
        // Nada escreve profundidade (céu com depthTest off, água com depthWrite
        // off), então o buffer de depth seria alocado e nunca usado.
        depth: false,
        stencil: false,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      return; // sem WebGL o gradiente CSS segura a hero
    }
    renderer.autoClear = false;

    /* ---------------- céu ---------------- */
    const skyScene = new THREE.Scene();
    const skyCam = new THREE.Camera();
    const skyUniforms = {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uHorizon: { value: 1 - horizonFromTop },
      uSunUv: { value: new THREE.Vector2(0.5, 0.5) },
      uHalo: { value: haloTightness },
    };
    const skyMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: screenQuadVert,
        fragmentShader: skyFrag,
        uniforms: skyUniforms,
        depthTest: false,
        depthWrite: false,
      }),
    );
    skyMesh.frustumCulled = false;
    skyScene.add(skyMesh);

    // O céu é caro (fBm de 4 oitavas por pixel) e praticamente estático: as
    // nuvens andam 0,006 unidade por segundo. Assamos uma vez em meia resolução
    // e, a cada frame, só copiamos a textura.
    const skyTarget = new THREE.WebGLRenderTarget(2, 2, {
      depthBuffer: false,
      stencilBuffer: false,
    });
    const blitScene = new THREE.Scene();
    const blitMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: screenQuadVert,
        fragmentShader: blitFrag,
        uniforms: { uMap: { value: skyTarget.texture } },
        depthTest: false,
        depthWrite: false,
      }),
    );
    blitMesh.frustumCulled = false;
    blitScene.add(blitMesh);

    const bakeSky = () => {
      renderer.setRenderTarget(skyTarget);
      renderer.clear();
      renderer.render(skyScene, skyCam);
      renderer.setRenderTarget(null);
    };

    /* ---------------- mar ---------------- */
    const fov = 45;
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.5, 400);
    const camY = 3.2;
    const camZ = 8;
    // Inclinação que coloca a linha do horizonte exatamente em horizonFromTop.
    const ndcH = 1 - 2 * horizonFromTop;
    const pitch = Math.atan(-ndcH * Math.tan(THREE.MathUtils.degToRad(fov / 2)));

    const waterScene = new THREE.Scene();
    const waterUniforms = {
      uTime: { value: 0 },
      uSwell: { value: 1 },
      uSunDir: { value: new THREE.Vector3(0.3, 0.06, -1).normalize() },
      uSunCol: { value: new THREE.Color(0xffc880) },
      uDeep: { value: new THREE.Color(0x11304a) },
      uLit: { value: new THREE.Color(0x24708c) },
      uSkyLow: { value: new THREE.Color(0xf2ab6a) },
      uSkyHigh: { value: new THREE.Color(0x2a5f8c) },
      uHaze: { value: new THREE.Color(0xe89a63) },
      uFogNear: { value: 34 },
      uFogFar: { value: 96 },
    };

    // 160x110 é indistinguível de 240x180 depois da neblina, com 60% menos vértices
    const segX = 160;
    const segZ = 110;
    const geometry = new THREE.PlaneGeometry(220, 170, segX, segZ);
    geometry.rotateX(-Math.PI / 2);

    const waterMesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        vertexShader: waterVert,
        fragmentShader: waterFrag,
        uniforms: waterUniforms,
        transparent: true,
        depthWrite: false,
      }),
    );
    waterMesh.position.z = camZ - 60;
    waterMesh.frustumCulled = false;
    waterScene.add(waterMesh);

    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;";
    host.appendChild(renderer.domElement);

    // Só revela depois do primeiro frame: até lá quem aparece é o pôster.
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      host.style.opacity = "1";
    };

    /* ---------------- enquadramento ---------------- */
    const lookTarget = new THREE.Vector3();
    const sunPoint = new THREE.Vector3();

    const aim = (px: number, py: number) => {
      camera.position.set(px * 0.55, camY + py * 0.22, camZ);
      lookTarget.set(
        camera.position.x + px * 0.25,
        camera.position.y + Math.tan(pitch) * 24,
        camera.position.z - 24,
      );
      camera.lookAt(lookTarget);
      camera.updateMatrixWorld();
    };

    const syncSun = () => {
      sunPoint.set(sunNdc.x, sunNdc.y, 0.5).unproject(camera).sub(camera.position).normalize();
      waterUniforms.uSunDir.value.copy(sunPoint);
      skyUniforms.uSunUv.value.set((sunNdc.x + 1) / 2, (sunNdc.y + 1) / 2);
    };

    const maxDpr = 1.35;
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      skyUniforms.uAspect.value = w / h;
      skyTarget.setSize(
        Math.max(2, Math.ceil((w * renderer.getPixelRatio()) / 2)),
        Math.max(2, Math.ceil((h * renderer.getPixelRatio()) / 2)),
      );
      aim(0, 0);
      syncSun();
      bakeSky();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    /* ---------------- ponteiro, suavizado ---------------- */
    const target = new THREE.Vector2(0, 0);
    const eased = new THREE.Vector2(0, 0);
    const onPointer = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      target.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      );
    };
    if (!reduced) window.addEventListener("pointermove", onPointer, { passive: true });

    /* ---------------- loop ---------------- */
    let visible = true;
    let raf = 0;
    let last = performance.now();

    const draw = () => {
      renderer.clear();
      renderer.render(blitScene, skyCam);
      renderer.render(waterScene, camera);
      reveal();
    };

    // 30 fps é indistinguível para uma ondulação lenta e corta metade do
    // trabalho de GPU e de bateria.
    const FRAME_MS = 1000 / 30;

    function tick(now: number = performance.now()) {
      if (!visible || document.hidden) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);

      if (now - last < FRAME_MS - 1) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      waterUniforms.uTime.value += dt;
      eased.lerp(target, 0.12);
      aim(eased.x, eased.y);
      draw();
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf && !reduced) {
          last = performance.now();
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0 },
    );
    io.observe(host);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (visible && !raf && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Um frame imediato: assim a camada já está correta quando o fade começa,
    // mesmo que o rAF esteja estrangulado (aba em segundo plano).
    waterUniforms.uTime.value = 4.2;
    draw();
    if (!reduced) raf = requestAnimationFrame(tick);

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      skyMesh.geometry.dispose();
      (skyMesh.material as THREE.Material).dispose();
      blitMesh.geometry.dispose();
      (blitMesh.material as THREE.Material).dispose();
      skyTarget.dispose();
      geometry.dispose();
      (waterMesh.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="absolute inset-0 z-[1]"
      style={{ opacity: 0, transition: "opacity 900ms cubic-bezier(0.22,1,0.36,1)" }}
    />
  );
}
