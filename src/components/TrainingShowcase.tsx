import { PRINT_SIZES, printSrcSet } from "../data/prints";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import { useRef } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The phone "scrolls itself": two consecutive captures of the training plan
 * stacked inside the frame and driven by the page's own scroll progress.
 */
export default function TrainingShowcase() {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const raw = useTransform(scrollYProgress, [0.12, 0.88], ["0%", "-43%"]);
  const y = useSpring(raw, { stiffness: 120, damping: 26, mass: 0.5 });

  const tilt = useTransform(scrollYProgress, [0, 0.5, 1], [7, 0, -6]);
  const tiltSpring = useSpring(tilt, { stiffness: 90, damping: 22 });

  return (
    <div className="sr-training-stage" ref={ref}>
      <div className="sr-training-halo" aria-hidden="true" />

      <motion.div className="sr-training-tilt" style={{ rotateX: tiltSpring }}>
        <div className="sr-phone">
          <div className="sr-phone-screen">
            <span className="sr-phone-notch" aria-hidden="true" />

            <motion.div className="sr-scrollstack" style={{ y }}>
              <div className="sr-shot">
                <img
                  src="/prints/05-treino.webp"
                  srcSet={printSrcSet("/prints/05-treino.webp")}
                  sizes={PRINT_SIZES}
                  alt="Plano de treino gerado pelo SurfRise: 3 treinos e 12 exercícios a partir da sessão."
                  width={706}
                  height={1532}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="sr-shot">
                <img
                  src="/prints/06-treino-detalhe.webp"
                  srcSet={printSrcSet("/prints/06-treino-detalhe.webp")}
                  sizes={PRINT_SIZES}
                  alt="Detalhe de um bloco de treino com exercícios, séries, repetições e instruções."
                  width={706}
                  height={1532}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </motion.div>

            <span className="sr-phone-glare" aria-hidden="true" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
