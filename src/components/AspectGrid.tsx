import { motion, useInView } from "motion/react";
import { useRef, type CSSProperties } from "react";
import { scoreColor } from "./ScoreBar";

const EASE = [0.22, 1, 0.36, 1] as const;

const aspects = [
  { name: "Drop", desc: "como você entra e absorve a descida", value: 6.5 },
  { name: "Fluxo", desc: "se o surf conecta ou trava entre manobras", value: 6.8 },
  { name: "Postura & equilíbrio", desc: "centro de gravidade e base", value: 7.0 },
  { name: "Escolha da onda", desc: "leitura, posicionamento, timing", value: 7.2 },
  { name: "Manobras", desc: "amplitude, comprometimento, finalização", value: 5.8 },
  { name: "Braços", desc: "condução da rotação", value: 6.0 },
];

export default function AspectGrid() {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <ul className="sr-aspects" ref={ref}>
      {aspects.map((a, i) => {
        const color = scoreColor(a.value);
        return (
          <motion.li
            key={a.name}
            className="sr-aspect"
            style={{ "--accent": color } as CSSProperties}
            initial={{ opacity: 0, y: 26 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.85, delay: i * 0.075, ease: EASE }}
          >
            <div className="sr-aspect-head">
              <h3 className="sr-aspect-name">{a.name}</h3>
              <span className="sr-aspect-score" style={{ color }}>
                {a.value.toFixed(1).replace(".", ",")}
              </span>
            </div>

            <div className="sr-scorebar-track sr-aspect-track">
              <motion.div
                className="sr-scorebar-fill"
                style={{ background: color, "--glow": color } as CSSProperties}
                initial={{ width: 0 }}
                animate={inView ? { width: `${(a.value / 10) * 100}%` } : {}}
                transition={{ duration: 1.15, delay: 0.15 + i * 0.075, ease: EASE }}
              />
            </div>

            <p className="sr-aspect-desc">{a.desc}</p>
          </motion.li>
        );
      })}
    </ul>
  );
}
