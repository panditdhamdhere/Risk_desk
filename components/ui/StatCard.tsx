import { ReactNode, useEffect, useMemo, useState } from "react";
import { Sparkline } from "@/components/charts/Sparkline";

type Tone = "good" | "warn" | "bad" | "neutral";

type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  icon?: ReactNode;
  series?: number[];
};

export function StatCard({ label, value, sub, tone = "neutral", icon, series = [] }: StatCardProps) {
  const toneClass = tone === "neutral" ? "" : tone;
  const parsed = useMemo(() => {
    const m = value.match(/-?\d+(\.\d+)?/);
    if (!m) return null;
    const num = Number(m[0]);
    if (!Number.isFinite(num)) return null;
    return { num, raw: m[0] };
  }, [value]);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!parsed) {
      setDisplay(value);
      return;
    }
    const duration = 460;
    const steps = 24;
    const end = parsed.num;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      const t = Math.min(1, i / steps);
      const eased = 1 - (1 - t) ** 3;
      const cur = end * eased;
      const rep = parsed.raw.includes(".")
        ? cur.toFixed(parsed.raw.split(".")[1]?.length ?? 0)
        : Math.round(cur).toString();
      setDisplay(value.replace(parsed.raw, rep));
      if (t >= 1) {
        window.clearInterval(id);
      }
    }, Math.max(12, Math.floor(duration / steps)));
    return () => window.clearInterval(id);
  }, [parsed, value]);

  return (
    <article className="card clean-card stat-card">
      <div className="stat-head">
        <h3>{label}</h3>
        {icon ? <span className="stat-icon">{icon}</span> : null}
      </div>
      <div className={`metric ${toneClass}`}>{display}</div>
      {sub ? <p className="metric-sub">{sub}</p> : null}
      {series.length ? (
        <div className="sparkline-wrap">
          <Sparkline values={series} tone={tone} />
        </div>
      ) : null}
    </article>
  );
}
