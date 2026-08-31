import { motion, useInView, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, type CSSProperties } from "react";

export function scoreColor(n: number) {
  if (n >= 7.2) return "var(--color-brand)";
  if (n >= 7.0) return "var(--color-mint)";
  return "var(--color-amber)";
}

/** Counts a number up once its row scrolls in. */
function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 70, damping: 20, mass: 0.8 });
  const text = useTransform(spring, (v) => v.toFixed(1).replace(".", ","));

  useEffect(() => {
    if (!inView) return;
    const start = setTimeout(() => mv.set(value), delay * 1000);
    // If rAF is throttled (page opened in a background tab) the spring never
    // runs — land on the real number rather than leaving a stale 0,0 on screen.
    const settle = setTimeout(() => {
      if (Math.abs(spring.get() - value) > 0.05) spring.jump(value);
    }, delay * 1000 + 2400);
    return () => {
      clearTimeout(start);
      clearTimeout(settle);
    };
  }, [inView, value, delay, mv, spring]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{text}</motion.span>
    </span>
  );
}

export default function ScoreBar({
  label,
  value,
  index = 0,
  compact = false,
  color: colorOverride,
}: {
  label: string;
  value: number;
  index?: number;
  compact?: boolean;
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const delay = 0.12 + index * 0.09;
  const color = colorOverride ?? scoreColor(value);

  return (
    <div ref={ref} className={compact ? "sr-scorebar sr-scorebar--compact" : "sr-scorebar"}>
      <div className="sr-scorebar-head">
        <span className="sr-scorebar-label">{label}</span>
        <span className="sr-scorebar-value" style={{ color }}>
          <CountUp value={value} delay={delay} />
        </span>
      </div>
      <div className="sr-scorebar-track">
        <motion.div
          className="sr-scorebar-fill"
          style={{ background: color, "--glow": color } as CSSProperties}
          initial={{ width: 0 }}
          animate={inView ? { width: `${(value / 10) * 100}%` } : { width: 0 }}
          transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
