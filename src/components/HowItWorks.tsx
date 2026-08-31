import { PRINT_SIZES, printSrcSet } from "../data/prints";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

const steps = [
  {
    n: "1",
    title: "Registre sua sessão",
    text: "Onde, quando e como estava o mar.",
    img: "/prints/01-home.webp",
    alt: "Tela inicial do SurfRise com a lista de sessões registradas e suas notas.",
  },
  {
    n: "2",
    title: "Envie suas mídias",
    text: "Foto ou vídeo. Do jeito que você tem.",
    img: "/prints/02-sessao.webp",
    alt: "Tela da sessão no SurfRise com nota geral, condições e as fotos enviadas.",
  },
  {
    n: "3",
    title: "Receba seu diagnóstico",
    text: "Notas, pontos fortes, pontos fracos e o que ajustar.",
    img: "/prints/03-analise.webp",
    alt: "Tela de análise do SurfRise com a nota geral e a pontuação por aspecto.",
  },
  {
    n: "4",
    title: "Treine",
    text: "Um plano criado a partir do que sua sessão mostrou.",
    img: "/prints/05-treino.webp",
    alt: "Tela de treino do SurfRise com os blocos e exercícios gerados para a sessão.",
  },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const nodes = stepRefs.current.filter(Boolean) as HTMLLIElement[];
    if (!nodes.length) return;

    /*
     * O passo cujo centro está mais perto do centro da janela vence.
     *
     * Isto já foi um IntersectionObserver e não funcionava: o `entries` do
     * callback só traz os alvos que MUDARAM de estado, não todos os observados.
     * Quando um passo saía da faixa sem que o seguinte entrasse no mesmo lote,
     * nada era atualizado e o telefone ficava na tela anterior. Pior, com a
     * faixa em 16% da janela e passos bem mais altos que isso, a razão de
     * interseção nunca chegava perto de 1 — os limiares altos nunca disparavam.
     *
     * A comparação por distância não tem estado: para qualquer posição de
     * rolagem existe exatamente um vencedor, sem lacunas e sem depender de
     * quais eventos chegaram antes.
     */
    let ticking = false;

    const update = () => {
      ticking = false;
      const mid = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const b = nodes[i].getBoundingClientRect();
        const d = Math.abs(b.top + b.height / 2 - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      setActive(best);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="sr-how-grid">
      {/*
        O espaço de percurso do sticky fica neste wrapper, não na <ol>: assim a
        régua vertical (que é filha da lista) termina junto com os passos em vez
        de continuar sozinha pelo vazio.
      */}
      <div className="sr-how-col">
      <ol className="sr-how-steps">
        <span className="sr-how-rail" aria-hidden="true">
          <motion.span
            className="sr-how-rail-fill"
            animate={{ scaleY: (active + 1) / steps.length }}
            transition={{ duration: 0.8, ease: EASE }}
          />
        </span>

        {steps.map((s, i) => (
          <li
            key={s.n}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            className={`sr-how-step${i === active ? " is-active" : ""}`}
          >
            <span className="sr-how-num" aria-hidden="true">
              {s.n}
            </span>
            <div className="sr-how-body">
              <h3 className="sr-h3">{s.title}</h3>
              <p className="sr-body">{s.text}</p>

              {/* inline phone for narrow screens */}
              <div className="sr-how-phone-inline">
                <Phone src={s.img} alt={s.alt} eager={i === 0} />
              </div>
            </div>
          </li>
        ))}
      </ol>
      </div>

      <div className="sr-how-sticky">
        <div className="sr-how-stickyinner">
          <div className="sr-how-phonewrap">
            <div className="sr-how-halo" aria-hidden="true" />
            <div className="sr-phone">
              <div className="sr-phone-screen">
                <span className="sr-phone-notch" aria-hidden="true" />
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.img
                    key={steps[active].img}
                    src={steps[active].img}
                    alt={steps[active].alt}
                    width={706}
                    height={1532}
                    loading="lazy"
                    decoding="async"
                    initial={{ opacity: 0, y: 26, scale: 1.03 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -22, scale: 0.985 }}
                    transition={{ duration: 0.65, ease: EASE }}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                  />
                </AnimatePresence>
                <span className="sr-phone-glare" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="sr-how-dots" role="presentation">
            {steps.map((s, i) => (
              <span key={s.n} className={`sr-how-dot${i === active ? " is-on" : ""}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Phone({ src, alt, eager }: { src: string; alt: string; eager?: boolean }) {
  return (
    <div className="sr-phone">
      <div className="sr-phone-screen">
        <span className="sr-phone-notch" aria-hidden="true" />
        <img
          src={src}
          srcSet={printSrcSet(src)}
          sizes={PRINT_SIZES}
          alt={alt}
          width={706}
          height={1532}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
        <span className="sr-phone-glare" aria-hidden="true" />
      </div>
    </div>
  );
}
