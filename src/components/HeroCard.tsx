import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import ScoreBar from "./ScoreBar";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HeroCard() {
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 90, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 90, damping: 18, mass: 0.6 });

  const rotateY = useTransform(sx, [-0.5, 0.5], [10, -10]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [-8, 8]);

  const handleMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div
      className="sr-herocard-stage"
      onPointerMove={handleMove}
      onPointerLeave={reset}
      ref={ref}
    >
      <motion.div
        className="sr-herocard-tilt"
        style={{ rotateX, rotateY }}
        initial={{ opacity: 0, y: 46, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.55, ease: EASE }}
      >
        <motion.div
          className="sr-herocard"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="sr-herocard-top">
            <span className="sr-herocard-kicker">Sessão de exemplo</span>
            <span className="sr-herocard-date">15 ago</span>
          </div>

          <div className="sr-herocard-score">
            <span className="sr-herocard-number">
              7<span className="sr-herocard-dot" />2
            </span>
            <span className="sr-herocard-note">nota geral</span>
          </div>

          <div className="sr-herocard-chips">
            <span className="sr-chip">
              <WaveIcon /> 0,8 m
            </span>
            <span className="sr-chip">
              <BoardIcon /> Pranchinha Mágica
            </span>
          </div>

          <div className="sr-hairline" />

          <div className="sr-herocard-bars">
            <ScoreBar label="Postura & equilíbrio" value={7.8} index={0} compact color="var(--color-mint)" />
            <ScoreBar label="Fluxo" value={7.2} index={1} compact color="var(--color-mint)" />
            <ScoreBar label="Manobras" value={6.8} index={2} compact />
          </div>
        </motion.div>

        {/* satellite — the analysis keeps working around the card */}
        <motion.div
          className="sr-satellite sr-satellite--plan"
          initial={{ opacity: 0, x: 22, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 1, delay: 1.6, ease: EASE }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="sr-satellite-inner"
          >
            <SparkIcon />
            <span>
              Treino gerado · <b>12 exercícios</b>
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function WaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 8c2.5-2.6 4.5-2.6 7 0s4.5 2.6 7 0 4.5-2.6 6 0M2 16c2.5-2.6 4.5-2.6 7 0s4.5 2.6 7 0 4.5-2.6 6 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 215 512" fill="currentColor" stroke="none" aria-hidden="true">
      <g transform="translate(107.5,0) scale(1.28,1) translate(-107.5,0)">
        <g transform="translate(0,512) scale(0.1,-0.1)">
          <path
            d="M1050 5104 c-348 -126 -710 -1011 -805 -1969 -78 -792 68 -1956 381 -3032 18 -60 51 -103 82 -103 10 0 109 31 220 68 l202 68 202 -68 c216 -73 245 -77 274 -33 17 26 58 164 114 385 262 1037 366 1996 295 2715 -81 815 -356 1594 -663 1875 -105 97 -206 128 -302 94z m24 -4523 c26 -29 86 -29 112 0 19 21 19 75 24 2183 l5 2161 49 -50 c126 -127 270 -409 381 -740 104 -314 183 -707 214 -1065 47 -546 -6 -1230 -155 -1985 -66 -334 -194 -867 -215 -889 -4 -5 -78 15 -173 48 -90 31 -174 56 -186 56 -12 0 -96 -25 -186 -56 -95 -33 -169 -53 -173 -48 -5 5 -29 88 -54 184 -264 1010 -378 1976 -316 2690 31 358 110 751 214 1065 111 331 255 613 381 740 l49 50 5 -2161 c5 -2108 5 -2162 24 -2183z"
            stroke="currentColor"
            strokeWidth={60}
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"
        fill="currentColor"
      />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" fill="currentColor" opacity=".65" />
    </svg>
  );
}
