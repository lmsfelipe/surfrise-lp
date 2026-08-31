# SurfRise — Landing Page

Landing page de aquisição do SurfRise, feita para tráfego vindo de redes sociais.

**Stack:** Astro 5 + React 19 (ilhas) · Three.js (background da hero) · Motion · Tailwind CSS 4 · Lenis.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/
npm run preview  # serve o dist/
npm run check    # typecheck (astro check)
npm run assets   # regera os .webp dos prints e a imagem de og
```

> Node: o projeto foi construído e testado no Node 21.2. O Astro 5 recomenda
> Node 18.17+, 20.3+ ou 22+. Se for subir em CI/host, prefira Node 22 LTS.

---

## O que editar primeiro

Tudo o que muda por campanha está em **`src/data/site.ts`**:

| Campo | O que é |
| --- | --- |
| `ctaUrl` | destino real dos botões "Quero analisar meu surf" |
| `betaUntil` | data que aparece em "Grátis até \_\_\_" (seção 08 e CTA final) |
| `instagram` | link do rodapé |
| `contactEmail` | e-mail do rodapé |

O rodapé aponta para `/termos` e `/privacidade`, que **ainda não existem** —
crie `src/pages/termos.astro` e `src/pages/privacidade.astro` ou troque os links.

---

## Estrutura

```
src/
  data/site.ts             ← links e datas da campanha
  layouts/Base.astro       ← <head>, smooth scroll, reveals, barra de progresso
  pages/index.astro        ← ordem das seções
  styles/global.css        ← design tokens + todos os componentes visuais
  components/
    Nav.astro  Logo.astro  WaveDivider.astro  Footer.astro
    Hero.astro         + HeroCanvas.tsx (Three.js)  HeroCard.tsx
    Problem.astro
    HowItWorks.astro   + HowItWorks.tsx      (celular que acompanha os passos)
    Analysis.astro
    Aspects.astro      + AspectGrid.tsx      (barras de nota animadas)
    Training.astro     + TrainingShowcase.tsx (celular que "rola" com a página)
    Evolution.astro                          (histórico — sem gráfico, ver nota abaixo)
    Proof.astro                              (marquee com os prints reais)
    Access.astro  Faq.astro  FinalCta.astro
    ScoreBar.tsx                             (barra + contagem de nota)
src/assets/prints/        ← os 6 prints originais (.png, não são servidos)
public/prints/            ← os mesmos prints em .webp (é o que a página usa)
src/assets/brand/         ← arquivo de origem da marca (não é servido)
public/brand/logo.webp    ← a marca "surfrise" recortada, pronta pra usar
public/og.jpg             ← imagem de compartilhamento (1200x630)
public/hero-wide.webp     ← pôster da hero, desktop (49 kB)
public/hero-tall.webp     ← pôster da hero, mobile (29 kB)
scripts/build-assets.mjs  ← gera todos os acima
scripts/hero-poster.mjs   ← renderizador em software da hero
```

Para trocar um print: substitua o `.png` em `src/assets/prints/`, rode
`npm run assets` e pronto — os nomes de arquivo continuam os mesmos.
A imagem de og também é gerada por esse script (usa o print `03-analise`);
se quiser uma arte feita à mão, é só sobrescrever `public/og.jpg` e não
rodar mais o script.

**A marca** (`Logo.astro`) é uma imagem, não mais CSS — `public/brand/logo.webp`,
16 kB, gerada a partir de `src/assets/brand/logo-source.png` pela função `logo()`
em `build-assets.mjs`. Essa fonte é um recorte de seleção de marca (o wordmark
sobre um cartão cor de areia, não um PNG limpo), então o script recorta a região
do wordmark, separa texto de traço em degradê pela luminância do canal azul, e
repinta o texto de branco — a marca só aparece sobre fundo escuro na página
(Nav flutuante e rodapé). Se um dia ela precisar aparecer sobre um fundo claro,
isso pede uma segunda variante da imagem, não um filtro de CSS.

Pra trocar a marca: sobrescreva `src/assets/brand/logo-source.png` com um novo
recorte no mesmo formato (wordmark + traço sobre fundo sólido claro) e rode
`npm run assets`. Se o novo arquivo tiver proporções muito diferentes, ajuste a
caixa `CORE` no início da função `logo()` — ela foi medida à mão pra este
arquivo específico.

### Seções (na ordem)

Hero · 01 Problema · 02 Como funciona · 03 A análise · 04 O que é avaliado ·
05 Do diagnóstico ao treino · 06 Evolução · 07 Por dentro · 08 Acesso ·
09 Perguntas · CTA final · Rodapé.

Os tons **alternam** a cada seção (escuro → claro → escuro …). O tema de cada
seção vem de uma classe: `.sr-dark` ou `.sr-light`. Os componentes internos usam
`var(--fg)`, `var(--fg-muted)`, `var(--card)` etc., então funcionam nos dois.

---

## A hero (e o custo dela)

A hero é montada em duas camadas:

1. **pôster estático** (`public/hero-wide.webp` / `hero-tall.webp`) — sempre
   presente, é o que aparece de imediato, o que fica se o WebGL falhar e,
   abaixo de 1000px, a hero inteira;
2. **camada WebGL** — hidratada só com
   `client:media="(min-width: 1000px) and (prefers-reduced-motion: no-preference)"`.
   Fora dessa faixa o three.js **não é baixado**.

Os pôsteres são gerados por `scripts/hero-poster.mjs`, um renderizador em
software que repete a matemática do shader (mesmas ondas, mesma paleta, mesmo
enquadramento) e resolve a interseção com a superfície deslocada por três
iterações de ponto fixo. É por isso que a troca de camada não dá salto: os dois
usam `horizonFromTop = 0.575` e o mesmo sol.

> Atenção ao mexer na paleta: os uniforms de cor passam pelo `THREE.Color`, que
> converte de sRGB para linear antes de chegar ao shader. `hero-poster.mjs` faz
> a mesma conversão em `uniformColor()`. As constantes escritas direto no GLSL
> (as do céu) **não** passam por isso e são usadas como estão nos dois lados.

### Orçamento de GPU

| | antes | agora |
| --- | --- | --- |
| MSAA | 4× | desligado |
| buffer de profundidade | alocado, nunca usado | desligado |
| DPR máximo | 1,6 (3,2 Mpx) | 1,35 (2,65 Mpx) |
| framebuffer | ~117 MB | **10 MB** |
| textura do céu | — | 2,5 MB |
| taxa de quadros | 60 | 30 |

O MSAA era 100 MB dos 117: a água dissolve na neblina e o céu é um quad de tela
inteira, então não há silhueta para suavizar. O fBm das nuvens saiu do loop —
é assado uma vez numa textura de meia resolução, porque as nuvens andam 0,006
unidade por segundo e ninguém percebe.

## A hero

`HeroCanvas.tsx` desenha um mar de verdade em duas passadas de render:

1. **céu** — um quad em espaço de tela: gradiente laranja → rosa → azul, nuvens
   por fBm arrastando devagar e o halo do sol logo acima do horizonte;
2. **água** — um plano com normal analítica, deslocado pela soma de quatro
   trens de onda direcionais. O reflexo vem da direção refletida do olhar (não
   da normal), que é o que faz a água devolver a cor do horizonte no rasante;
   o caminho do sol sai de `pow(R·L, n)`, com `n` caindo com a distância pra
   cintilância não virar ruído. A água dissolve em neblina antes da borda do
   plano, então o horizonte é uma fusão e não uma aresta.

A linha do horizonte é posicionada por `horizonFromTop` e a inclinação da câmera
é derivada dela — mude o valor e o enquadramento se ajusta sozinho. No desktop
fica em 0,575 (texto à esquerda, pôr do sol na diagonal); no mobile desce para
0,82, porque a coluna é única e a copy precisa do céu escuro. O sol e o
fechamento do halo (`haloTightness`) também mudam entre os dois.

O pé da hero termina em `#081625` e a onda logo abaixo (`.sr-hero-foot`) usa a
mesma cor de fundo — é isso que faz a emenda sumir.

## Movimento

| Efeito | Onde |
| --- | --- |
| Mar ao pôr do sol em WebGL | `HeroCanvas.tsx` — céu assado em textura + plano deslocado por soma de ondas (só ≥1000px) |
| Scroll com inércia | Lenis, em `Base.astro` (desktop, desligado com `prefers-reduced-motion`) |
| Entrada das seções | `[data-reveal]` + IntersectionObserver (`Base.astro` + `global.css`) |
| Cortina entre seções | classe `.sr-curtain` — cantos arredondados + sobreposição negativa |
| Ondas nas trocas de tom | `WaveDivider.astro` |
| Prints animados | `HowItWorks.tsx` (troca por passo), `TrainingShowcase.tsx` (rola junto com a página) |
| Números e barras | `ScoreBar.tsx`, `AspectGrid.tsx` |

Tudo respeita `prefers-reduced-motion`: o Lenis não inicia, os reveals já
nascem visíveis e as animações de CSS são neutralizadas.

### Performance

O `three` é o maior pedaço do bundle (~128 kB gzip) e só é baixado a partir de
1000px, sem `prefers-reduced-motion`. No celular a hero é o pôster e o primeiro
carregamento sai com **6 kB de JS**. No desktop o pôster (49 kB) entra na frente
para o primeiro paint e o shader cruza por cima quando fica pronto. O loop de
render pausa quando a hero sai da tela ou a aba vai para segundo plano.

Os prints são WebP (332 kB no total, contra 1,6 MB em PNG) e todos, menos o
primeiro, entram com `loading="lazy"`. O `dist/` final tem ~1,7 MB.

---

## Ajustes de copy feitos a partir do `surfrise-lp-copy-v2.md`

- As seções 3 e 4 tinham o mesmo H2 ("Meça o que realmente importa no seu surf").
  A seção 4 manteve o título; a 3 virou "Da sensação ao diagnóstico. Do
  diagnóstico à ação.", que é o que o corpo dela já dizia.
- A seção 5 terminava em "O objetivo é simples:" sem continuação. Foi completada
  com "…transformar o que a análise apontou em algo que você consegue treinar em
  terra, antes da próxima sessão." — **revisar**.
- A frase da seção 7 ("Seu surf deixa de ser só sensação. Ele vira histórico.")
  fechou a seção 6; a 7 virou a vitrine de prints ("Telas reais. Sessões reais.").
- Depoimentos ainda não existem: há um comentário em `Proof.astro` marcando onde
  entram.
- O aviso do treino ("procure um profissional de educação física") e o do rodapé
  ("não substitui a avaliação de um profissional") foram trazidos do próprio app.
- **A seção 06 não tem gráfico, e isso é proposital.** A plataforma não tem
  visualização de evolução; desenhar uma na LP prometeria uma tela que o usuário
  não encontraria depois. A seção se apoia no que é real — o histórico de
  sessões — e lista os campos que ficam registrados em cada uma.

## Números mostrados na página

As notas são as da conta real dos prints (Canal 1, 15/ago: 6,5 geral — Drop 6,5 ·
Fluxo 6,8 · Postura 7,0 · Escolha da onda 7,2 · Manobras 5,8 · Braços 6,0) e o
card da hero usa a "sessão de exemplo" 7.2 que veio da copy. Se trocar os
prints, atualize também `AspectGrid.tsx`.
