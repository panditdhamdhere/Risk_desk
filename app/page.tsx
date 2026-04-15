"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const features = [
  {
    title: "Funding Radar",
    desc: "Track markets with the strongest funding pressure and crowding risk in real time.",
  },
  {
    title: "Execution Analytics",
    desc: "Break down fills, fees, and net PnL by symbol to expose execution quality.",
  },
  {
    title: "Portfolio Risk Engine",
    desc: "Monitor concentration, directional imbalance, and account stress before it hurts PnL.",
  },
  {
    title: "Operator Workflow",
    desc: "Single workspace for market scan, order-book microstructure, and post-trade review.",
  },
];

const endpoints = [
  "/api/v1/info",
  "/api/v1/info/prices",
  "/api/v1/book",
  "/api/v1/account",
  "/api/v1/positions",
  "/api/v1/trades/history",
];

export default function LandingPage() {
  const actions = [
    { id: "go-dashboard", label: "Open Dashboard", hint: "Route", onSelect: () => (window.location.href = "/dashboard") },
    { id: "go-product", label: "Jump to Product", hint: "Section", onSelect: () => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }) },
    { id: "go-integration", label: "Jump to Integration", hint: "Section", onSelect: () => document.getElementById("integration")?.scrollIntoView({ behavior: "smooth" }) },
    { id: "open-docs", label: "Open API Docs", hint: "External", onSelect: () => window.open("https://docs.pacifica.fi/api-documentation/api", "_blank") },
  ];

  return (
    <motion.main
      className="page landing"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <header className="site-nav">
        <div className="brand">Pacifica Risk Desk</div>
        <nav>
          <a className="nav-link" href="#features">Product</a>
          <a className="nav-link" href="#integration">Integration</a>
          <a className="nav-link" href="/dashboard">Dashboard</a>
          <CommandPalette actions={actions} />
          <ThemeToggle />
        </nav>
      </header>

      <section className="landing-hero card clean-card">
        <p className="eyebrow">Perps Analytics Platform</p>
        <h1 className="title">Institutional-grade analytics for Pacifica traders</h1>
        <p className="subtitle">
          Transform raw Pacifica market and account events into real-time decision intelligence: funding pressure,
          execution quality, and portfolio risk in a single operating console.
        </p>
        <div className="landing-cta">
          <Link href="/dashboard" className="btn-primary btn-link">
            Launch Platform
          </Link>
          <a className="btn-ghost" href="https://docs.pacifica.fi/api-documentation/api" target="_blank" rel="noreferrer">
            Developer Docs
          </a>
        </div>
        <p className="subtle-note">Coverage: Funding, order-book microstructure, account, positions, and fills.</p>
        <div className="hero-preview">
          <div className="hero-preview-head">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
            <p>Live Console Preview</p>
          </div>
          <div className="hero-preview-grid">
            <div>
              <p className="muted">Session Net</p>
              <strong className="good">+1,248.32</strong>
            </div>
            <div>
              <p className="muted">Fee Drag</p>
              <strong>83.17</strong>
            </div>
            <div>
              <p className="muted">Risk Score</p>
              <strong className="warn">46.2 / 100</strong>
            </div>
            <div>
              <p className="muted">Spread</p>
              <strong>0.00062</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <span>Real-time Market Data</span>
        <span>Execution Attribution</span>
        <span>Risk Monitoring</span>
        <span>Testnet/Mainnet</span>
      </section>

      <section className="section" id="features">
        <h2>Product Modules</h2>
        <div className="grid compact feature-grid-clean">
          {features.map((f, idx) => (
            <article key={f.title} className="card feature-card clean-card">
              <p className="feature-index">0{idx + 1}</p>
              <h3>{f.title}</h3>
              <p className="muted">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section card clean-card" id="integration">
        <h2>Deep Pacifica Integration</h2>
        <p className="muted">
          Every panel is powered by Pacifica REST endpoints. No mock data layer. No abstraction that hides exchange reality.
        </p>
        <div className="endpoint-grid">
          {endpoints.map((e) => (
            <code key={e} className="endpoint-pill">
              {e}
            </code>
          ))}
        </div>
      </section>

      <section className="section card clean-card product-proof">
        <h2>Built for real operator workflows</h2>
        <div className="proof-grid">
          <div>
            <p className="muted">Pre-trade</p>
            <strong>Funding crowding scan + spread checks</strong>
          </div>
          <div>
            <p className="muted">In-trade</p>
            <strong>Position concentration + directional exposure</strong>
          </div>
          <div>
            <p className="muted">Post-trade</p>
            <strong>Symbol-level PnL and fee attribution</strong>
          </div>
        </div>
      </section>
      <section className="section final-cta card clean-card">
        <h2>Ready to trade with confidence?</h2>
        <p className="muted">
          Launch the live dashboard, connect a wallet, and monitor funding pressure, execution quality, and risk from one
          modern operator console.
        </p>
        <div className="landing-cta">
          <Link href="/dashboard" className="btn-primary btn-link">
            Open Dashboard
          </Link>
          <a className="btn-ghost" href="https://test-app.pacifica.fi/" target="_blank" rel="noreferrer">
            Open Pacifica Testnet
          </a>
        </div>
      </section>
      <SiteFooter />
    </motion.main>
  );
}
