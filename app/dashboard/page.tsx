"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { MiniBars } from "@/components/charts/MiniBars";
import { Card, SectionHeader } from "@/components/ui/Card";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { StatCard } from "@/components/ui/StatCard";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type AnyRow = Record<string, any>;
type ConsoleLayout = {
  network: "testnet" | "mainnet";
  account: string;
  symbol: string;
  limit: number;
  autoRefresh: boolean;
  fundingFilter: string;
  fillsFilter: string;
  fundingSort: "symbol" | "funding" | "oi";
  fundingOrder: "asc" | "desc";
  fillsSort: "symbol" | "fills" | "pnl" | "net";
  fillsOrder: "asc" | "desc";
};

function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function calcFillMetrics(trades: AnyRow[]) {
  const totalPnl = trades.reduce((acc, t) => acc + toNum(t.pnl), 0);
  const totalFees = trades.reduce((acc, t) => acc + toNum(t.fee), 0);
  return {
    fills: trades.length,
    totalPnl,
    totalFees,
    net: totalPnl - totalFees,
  };
}

function bySymbol(trades: AnyRow[]) {
  const map = new Map<string, { fills: number; pnl: number; fees: number; net: number }>();
  for (const t of trades) {
    const symbol = String(t.symbol ?? "UNKNOWN");
    const row = map.get(symbol) ?? { fills: 0, pnl: 0, fees: 0, net: 0 };
    row.fills += 1;
    row.pnl += toNum(t.pnl);
    row.fees += toNum(t.fee);
    row.net = row.pnl - row.fees;
    map.set(symbol, row);
  }
  return [...map.entries()]
    .map(([symbol, row]) => ({ symbol, ...row }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}

function scoreRisk(positions: AnyRow[], marks: Record<string, number>) {
  const notionals = positions.map((p) => Math.abs(toNum(p.amount) * (marks[p.symbol] ?? toNum(p.entry_price))));
  const gross = notionals.reduce((a, b) => a + b, 0);
  const largest = notionals.length ? Math.max(...notionals) : 0;
  const largestShare = gross > 0 ? (largest / gross) * 100 : 0;

  const signed = positions.reduce((acc, p, i) => {
    const side = String(p.side ?? "").toLowerCase();
    const sign = ["bid", "buy", "long", "b"].includes(side) ? 1 : -1;
    return acc + sign * notionals[i];
  }, 0);
  const imbalance = gross > 0 ? (Math.abs(signed) / gross) * 100 : 0;
  const overall = Math.min(100, 0.6 * largestShare + 0.4 * imbalance);
  return { gross, largestShare, imbalance, overall };
}

function fmt(n: number, d = 4): string {
  return Number.isFinite(n) ? n.toFixed(d) : "-";
}

function toPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

function getInjectedSolana(): any | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { solana?: any };
  return w.solana ?? null;
}

function toCsv(rows: AnyRow[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const head = cols.map(esc).join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export default function DashboardPage() {
  const [network, setNetwork] = useState<"testnet" | "mainnet">("testnet");
  const [account, setAccount] = useState("");
  const [symbol, setSymbol] = useState("BTC");
  const [limit, setLimit] = useState(120);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fundingFilter, setFundingFilter] = useState("");
  const [fillsFilter, setFillsFilter] = useState("");
  const [fundingSort, setFundingSort] = useState<"symbol" | "funding" | "oi">("funding");
  const [fundingOrder, setFundingOrder] = useState<"asc" | "desc">("desc");
  const [fillsSort, setFillsSort] = useState<"symbol" | "fills" | "pnl" | "net">("net");
  const [fillsOrder, setFillsOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTour, setShowTour] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [data, setData] = useState<{
    merged: AnyRow[];
    book: AnyRow;
    account: AnyRow | null;
    positions: AnyRow[];
    trades: AnyRow[];
  }>({
    merged: [],
    book: {},
    account: null,
    positions: [],
    trades: [],
  });
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const marketRes = await fetch(`/api/market?network=${network}`, { cache: "no-store" });
      const market = await marketRes.json();
      if (!marketRes.ok) throw new Error(market.error ?? "Market fetch failed");

      const priceMap = new Map<string, AnyRow>((market.prices ?? []).map((p: AnyRow) => [p.symbol, p]));
      const merged = (market.info ?? []).map((i: AnyRow) => ({ ...i, ...(priceMap.get(i.symbol) ?? {}) }));

      const [bookRes, accountRes, positionsRes, tradesRes] = await Promise.all([
        fetch(`/api/book?network=${network}&symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" }),
        account ? fetch(`/api/account?network=${network}&account=${encodeURIComponent(account)}`, { cache: "no-store" }) : Promise.resolve(null),
        account ? fetch(`/api/positions?network=${network}&account=${encodeURIComponent(account)}`, { cache: "no-store" }) : Promise.resolve(null),
        account
          ? fetch(
              `/api/trades?network=${network}&account=${encodeURIComponent(account)}&limit=${limit}`,
              { cache: "no-store" },
            )
          : Promise.resolve(null),
      ]);

      const book = bookRes.ok ? await bookRes.json() : {};
      const accountJson = accountRes && accountRes.ok ? await accountRes.json() : null;
      const positionsJson = positionsRes && positionsRes.ok ? await positionsRes.json() : [];
      const tradesJson = tradesRes && tradesRes.ok ? await tradesRes.json() : { data: [] };

      setData({
        merged,
        book,
        account: accountJson,
        positions: positionsJson,
        trades: tradesJson.data ?? [],
      });
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const shortAccount = account
    ? `${account.slice(0, 4)}...${account.slice(-4)}`
    : "";

  const connectWallet = async () => {
    setWalletConnecting(true);
    try {
      const solana = getInjectedSolana();
      if (!solana) {
        const manual = window.prompt("No wallet extension found. Paste your Solana public key:");
        if (manual && manual.trim()) {
          setAccount(manual.trim());
        }
        return;
      }
      const resp = await solana.connect({ onlyIfTrusted: false });
      const pk = resp?.publicKey?.toString?.() ?? solana?.publicKey?.toString?.();
      if (pk) setAccount(pk);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wallet connection failed";
      setError(msg);
    } finally {
      setWalletConnecting(false);
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("console.layout");
      if (raw) {
        const saved = JSON.parse(raw) as Partial<ConsoleLayout>;
        if (saved.network === "testnet" || saved.network === "mainnet") setNetwork(saved.network);
        if (typeof saved.account === "string") setAccount(saved.account);
        if (typeof saved.symbol === "string" && saved.symbol) setSymbol(saved.symbol);
        if (typeof saved.limit === "number" && Number.isFinite(saved.limit)) setLimit(Math.max(20, saved.limit));
        if (typeof saved.autoRefresh === "boolean") setAutoRefresh(saved.autoRefresh);
        if (typeof saved.fundingFilter === "string") setFundingFilter(saved.fundingFilter);
        if (typeof saved.fillsFilter === "string") setFillsFilter(saved.fillsFilter);
        if (saved.fundingSort && ["symbol", "funding", "oi"].includes(saved.fundingSort)) setFundingSort(saved.fundingSort);
        if (saved.fundingOrder && ["asc", "desc"].includes(saved.fundingOrder)) setFundingOrder(saved.fundingOrder);
        if (saved.fillsSort && ["symbol", "fills", "pnl", "net"].includes(saved.fillsSort)) setFillsSort(saved.fillsSort);
        if (saved.fillsOrder && ["asc", "desc"].includes(saved.fillsOrder)) setFillsOrder(saved.fillsOrder);
      }
    } catch {
      // Ignore malformed local layout.
    }
    setLayoutLoaded(true);
  }, []);

  useEffect(() => {
    if (!layoutLoaded) return;
    const payload: ConsoleLayout = {
      network,
      account,
      symbol,
      limit,
      autoRefresh,
      fundingFilter,
      fillsFilter,
      fundingSort,
      fundingOrder,
      fillsSort,
      fillsOrder,
    };
    localStorage.setItem("console.layout", JSON.stringify(payload));
  }, [
    layoutLoaded,
    network,
    account,
    symbol,
    limit,
    autoRefresh,
    fundingFilter,
    fillsFilter,
    fundingSort,
    fundingOrder,
    fillsSort,
    fillsOrder,
  ]);

  useEffect(() => {
    if (!layoutLoaded) return;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutLoaded]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      void run();
    }, 20000);
    return () => window.clearInterval(id);
  }, [autoRefresh, network, account, symbol, limit]); // keep interval aligned with current query inputs

  useEffect(() => {
    const hidden = localStorage.getItem("tour.dismissed") === "1";
    if (!hidden) setShowTour(true);
  }, []);

  const symbols = useMemo(() => {
    const s = [...new Set(data.merged.map((r) => r.symbol).filter(Boolean))];
    return s.length ? s : ["BTC", "ETH"];
  }, [data.merged]);

  const fillMetrics = useMemo(() => calcFillMetrics(data.trades), [data.trades]);
  const fillsBySymbol = useMemo(() => bySymbol(data.trades), [data.trades]);

  const marks = useMemo(() => {
    const m: Record<string, number> = {};
    for (const row of data.merged) {
      m[String(row.symbol)] = toNum(row.mark || row.mid || row.oracle);
    }
    return m;
  }, [data.merged]);
  const risk = useMemo(() => scoreRisk(data.positions, marks), [data.positions, marks]);

  const bids = (data.book?.l?.[0] ?? []) as AnyRow[];
  const asks = (data.book?.l?.[1] ?? []) as AnyRow[];
  const bestBid = bids.length ? Math.max(...bids.map((r) => toNum(r.p))) : 0;
  const bestAsk = asks.length ? Math.min(...asks.map((r) => toNum(r.p))) : 0;
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;

  const topFunding = [...data.merged]
    .sort((a, b) => Math.abs(toNum(b.next_funding ?? b.funding)) - Math.abs(toNum(a.next_funding ?? a.funding)))
    .slice(0, 8);
  const filteredFunding = topFunding.filter((r) =>
    String(r.symbol ?? "").toLowerCase().includes(fundingFilter.trim().toLowerCase()),
  );
  const sortedFunding = [...filteredFunding].sort((a, b) => {
    const dir = fundingOrder === "asc" ? 1 : -1;
    if (fundingSort === "symbol") return String(a.symbol).localeCompare(String(b.symbol)) * dir;
    if (fundingSort === "oi") return (toNum(a.open_interest) - toNum(b.open_interest)) * dir;
    return (Math.abs(toNum(a.next_funding ?? a.funding)) - Math.abs(toNum(b.next_funding ?? b.funding))) * dir;
  });
  const filteredFills = fillsBySymbol.filter((r) =>
    String(r.symbol ?? "").toLowerCase().includes(fillsFilter.trim().toLowerCase()),
  );
  const sortedFills = [...filteredFills].sort((a, b) => {
    const dir = fillsOrder === "asc" ? 1 : -1;
    if (fillsSort === "symbol") return String(a.symbol).localeCompare(String(b.symbol)) * dir;
    if (fillsSort === "fills") return (toNum(a.fills) - toNum(b.fills)) * dir;
    if (fillsSort === "pnl") return (toNum(a.pnl) - toNum(b.pnl)) * dir;
    return (toNum(a.net) - toNum(b.net)) * dir;
  });

  const hasAccountData = Boolean(account);
  const riskTone = risk.overall > 70 ? "bad" : risk.overall > 40 ? "warn" : "good";
  const fundingRows = topFunding.slice(0, 6).map((r) => ({
    label: String(r.symbol),
    value: toNum(r.next_funding ?? r.funding),
    note: `OI ${r.open_interest ?? "-"}`,
  }));
  const pnlRows = fillsBySymbol.slice(0, 6).map((r) => ({
    label: String(r.symbol),
    value: toNum(r.net),
    note: `${r.fills} fills`,
  }));
  const sessionSeries = data.trades.slice(0, 20).map((t) => toNum(t.pnl) - toNum(t.fee));
  const feeSeries = data.trades.slice(0, 20).map((t) => Math.abs(toNum(t.fee)));
  const spreadSeries = [...bids.slice(0, 10)].map((b, i) => {
    const ask = asks[i];
    return ask ? Math.max(0, toNum(ask.p) - toNum(b.p)) : 0;
  });
  const riskSeries = [risk.largestShare, risk.imbalance, risk.overall];
  const actions = [
    { id: "to-home", label: "Go Home", hint: "Route", onSelect: () => (window.location.href = "/") },
    { id: "refresh", label: "Refresh Dashboard", hint: "Action", onSelect: () => void run() },
    { id: "to-overview", label: "Jump to Overview", hint: "Section", onSelect: () => document.getElementById("overview")?.scrollIntoView({ behavior: "smooth" }) },
    { id: "to-funding", label: "Jump to Funding", hint: "Section", onSelect: () => document.getElementById("funding")?.scrollIntoView({ behavior: "smooth" }) },
    { id: "to-fills", label: "Jump to Fills", hint: "Section", onSelect: () => document.getElementById("fills")?.scrollIntoView({ behavior: "smooth" }) },
  ];
  const riskAlerts = [
    risk.overall > 70 ? "High portfolio risk score. Consider reducing concentrated exposure." : "",
    spread > 0 && spread > bestBid * 0.002 ? "Order-book spread is wide versus best bid. Watch execution quality." : "",
    fillMetrics.net < 0 ? "Session net PnL is negative after fees in selected window." : "",
    topFunding[0] ? `Largest absolute funding signal is ${topFunding[0].symbol}.` : "",
  ].filter(Boolean);

  return (
    <motion.main
      id="main-content"
      className="page dashboard-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <header className="site-nav">
        <div className="brand">Pacifica Risk Desk</div>
        <nav>
          <Link className="nav-link" href="/">Home</Link>
          <a className="nav-link" href="https://docs.pacifica.fi/api-documentation/api" target="_blank" rel="noreferrer">
            API Docs
          </a>
          {account ? (
            <>
              <span className="wallet-state connected">Connected {shortAccount}</span>
              <button
                className="wallet-btn"
                onClick={() => setAccount("")}
                title="Disconnect wallet from dashboard session"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button className="wallet-btn" onClick={connectWallet} disabled={walletConnecting}>
              {walletConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
          <CommandPalette actions={actions} />
          <ThemeToggle />
        </nav>
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar card clean-card">
          <p className="eyebrow">Workspace</p>
          <h3>Trading Console</h3>
          <nav className="side-nav">
            <a href="#overview">Overview</a>
            <a href="#insights">Insights</a>
            <a href="#funding">Funding</a>
            <a href="#fills">Fills</a>
            <a href="#positions">Positions</a>
          </nav>
          <div className="side-meta">
            <span className={`pill ${network === "mainnet" ? "warn" : "good"}`}>{network.toUpperCase()}</span>
            <span className="pill neutral">{hasAccountData ? "Wallet Linked" : "Market Mode"}</span>
          </div>
        </aside>

        <div>
      <section className="hero card clean-card" id="overview">
        <div>
          <p className="eyebrow">Live Trading Console</p>
          <h1 className="title">Pacifica Risk Desk</h1>
          <p className="subtitle">
            Professional trading analytics frontend for market intelligence, execution quality, and portfolio risk.
          </p>
        </div>
      </section>

      <section className="card section controls clean-card">
        <div className="toolbar">
          <div className="field">
            <label>Network</label>
            <select value={network} onChange={(e) => setNetwork(e.target.value as "testnet" | "mainnet")}>
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </select>
          </div>
          <div className="field">
            <label>Account (optional)</label>
            <input value={account} onChange={(e) => setAccount(e.target.value.trim())} placeholder="Solana public key" />
          </div>
          <div className="field">
            <label>Book Symbol</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Trades Limit</label>
            <input
              value={limit}
              onChange={(e) => setLimit(Math.max(20, Number(e.target.value) || 120))}
              type="number"
              min={20}
              step={20}
            />
          </div>
        </div>

        <div className="actions">
          <button className="btn-primary" onClick={run} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Dashboard"}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("console.layout");
              setNetwork("testnet");
              setAccount("");
              setSymbol("BTC");
              setLimit(120);
              setAutoRefresh(false);
              setFundingFilter("");
              setFillsFilter("");
              setFundingSort("funding");
              setFundingOrder("desc");
              setFillsSort("net");
              setFillsOrder("desc");
            }}
          >
            Reset Layout
          </button>
          <label className="toggle-wrap">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <span className="muted">Auto-refresh 20s</span>
          </label>
          <span className="muted">
            {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : "Waiting for first data pull..."}
          </span>
        </div>
      </section>

      {showTour ? (
        <Card className="tour-card">
          <div className="tour-head">
            <strong>Quick Tour</strong>
            <button
              className="theme-toggle"
              onClick={() => {
                setShowTour(false);
                localStorage.setItem("tour.dismissed", "1");
              }}
            >
              Dismiss
            </button>
          </div>
          <ol className="tour-list">
            <li><strong>Set network + wallet:</strong> Use the controls to switch testnet/mainnet and paste an account.</li>
            <li><strong>Read top metrics:</strong> Session Net, Fee Drag, Spread, and Risk score update together.</li>
            <li><strong>Use charts + tables:</strong> Funding and fills views highlight where your edge and risk are.</li>
            <li><strong>Use command palette:</strong> Press <code>⌘K</code> or <code>Ctrl+K</code> to navigate instantly.</li>
          </ol>
        </Card>
      ) : null}

      {error ? <Card className="alert">Error: {error}</Card> : null}

      <section className="grid section metric-grid">
        <StatCard
          label="Session Net"
          value={fmt(fillMetrics.net)}
          sub={`${fillMetrics.fills} fills in selected window`}
          tone={fillMetrics.net >= 0 ? "good" : "bad"}
          icon={<span className="icon-dot">◎</span>}
          series={sessionSeries}
        />
        <StatCard
          label="Total Fees"
          value={fmt(fillMetrics.totalFees)}
          sub="Execution cost monitor"
          icon={<span className="icon-dot">◌</span>}
          series={feeSeries}
        />
        <StatCard
          label={`Book Spread (${symbol})`}
          value={spread ? spread.toFixed(6) : "-"}
          sub={`Bid ${bestBid ? bestBid.toFixed(3) : "-"} | Ask ${bestAsk ? bestAsk.toFixed(3) : "-"}`}
          icon={<span className="icon-dot">◍</span>}
          series={spreadSeries}
        />
        <StatCard
          label="Overall Risk Score"
          value={`${risk.overall.toFixed(1)}/100`}
          sub={`Concentration ${toPct(risk.largestShare)} | Imbalance ${toPct(risk.imbalance)}`}
          tone={riskTone as "good" | "warn" | "bad"}
          icon={<span className="icon-dot">◈</span>}
          series={riskSeries}
        />
      </section>

      <section className="section two-col" id="insights">
        <Card>
          <SectionHeader title="Actionable Insights" />
          <ul>
            <li>
              {risk.overall > 70
                ? "Portfolio risk is elevated. Reduce concentration or directional skew."
                : "Portfolio risk is contained/moderate."}
            </li>
            <li>
              {fillMetrics.net < 0
                ? "Recent window is net negative after fees. Review execution quality."
                : "Recent window is net positive after fees."}
            </li>
            <li>
              {topFunding[0]
                ? `Highest |funding| signal: ${topFunding[0].symbol} (${toNum(
                    topFunding[0].next_funding ?? topFunding[0].funding,
                  ).toFixed(6)}).`
                : "No funding signal available yet."}
            </li>
            <li>{spread ? `Current spread on ${symbol}: ${spread.toFixed(6)}.` : "Spread unavailable."}</li>
          </ul>
        </Card>
        <div className="charts-stack">
          {loading && data.merged.length === 0 ? (
            <Card>
              <SkeletonBlock lines={6} />
            </Card>
          ) : (
            <MiniBars title="Funding Pressure (Top Symbols)" rows={fundingRows.length ? fundingRows : []} />
          )}
          {loading && data.trades.length === 0 ? (
            <Card>
              <SkeletonBlock lines={6} />
            </Card>
          ) : (
            <MiniBars title="Net PnL by Symbol" rows={pnlRows.length ? pnlRows : []} />
          )}
        </div>
      </section>
      <section className="section">
        <Card>
          <SectionHeader title="Risk Alerts" subtitle="Fast checks for execution and portfolio stress." />
          {riskAlerts.length ? (
            <ul>
              {riskAlerts.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No active alerts right now.</p>
          )}
        </Card>
      </section>

      <section className="section" id="funding">
        <SectionHeader title="Funding Radar" subtitle="Ranked by absolute funding pressure." />
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <input
              value={fundingFilter}
              onChange={(e) => setFundingFilter(e.target.value)}
              placeholder="Filter symbol..."
              className="table-filter"
            />
            <select value={fundingSort} onChange={(e) => setFundingSort(e.target.value as typeof fundingSort)}>
              <option value="funding">Sort: Funding</option>
              <option value="oi">Sort: Open Interest</option>
              <option value="symbol">Sort: Symbol</option>
            </select>
            <select value={fundingOrder} onChange={(e) => setFundingOrder(e.target.value as typeof fundingOrder)}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
          <div className="table-toolbar-right">
            <span className="muted">{sortedFunding.length} rows</span>
            <button
              onClick={() => {
                const csv = toCsv(sortedFunding);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "funding_radar.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Mark</th>
                <th>Next Funding</th>
                <th>Open Interest</th>
                <th>24h Volume</th>
              </tr>
            </thead>
            <tbody>
              {sortedFunding.length ? (
                sortedFunding.map((r) => (
                  <tr key={r.symbol}>
                    <td><span className="sym-pill">{r.symbol}</span></td>
                    <td>{r.mark}</td>
                    <td className={toNum(r.next_funding ?? r.funding) >= 0 ? "bad" : "good"}>
                      {toNum(r.next_funding ?? r.funding) >= 0 ? "▲ " : "▼ "}
                      {r.next_funding ?? r.funding}
                    </td>
                    <td>{r.open_interest}</td>
                    <td>{r.volume_24h}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-row">
                    Load data to view funding leaders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" id="fills">
        <SectionHeader title="Fills by Symbol" subtitle="Execution attribution by market." />
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <input
              value={fillsFilter}
              onChange={(e) => setFillsFilter(e.target.value)}
              placeholder="Filter symbol..."
              className="table-filter"
            />
            <select value={fillsSort} onChange={(e) => setFillsSort(e.target.value as typeof fillsSort)}>
              <option value="net">Sort: Net</option>
              <option value="pnl">Sort: PnL</option>
              <option value="fills">Sort: Fills</option>
              <option value="symbol">Sort: Symbol</option>
            </select>
            <select value={fillsOrder} onChange={(e) => setFillsOrder(e.target.value as typeof fillsOrder)}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
          <div className="table-toolbar-right">
            <span className="muted">{sortedFills.length} rows</span>
            <button
              onClick={() => {
                const csv = toCsv(sortedFills);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "fills_by_symbol.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Fills</th>
                <th>PnL</th>
                <th>Fees</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {sortedFills.length ? (
                sortedFills.map((r) => (
                  <tr key={r.symbol}>
                    <td><span className="sym-pill">{r.symbol}</span></td>
                    <td>{r.fills}</td>
                    <td className={r.pnl >= 0 ? "good" : "bad"}>{r.pnl >= 0 ? "▲ " : "▼ "}{fmt(r.pnl)}</td>
                    <td>{fmt(r.fees)}</td>
                    <td className={r.net >= 0 ? "good" : "bad"}>{fmt(r.net)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-row">
                    {hasAccountData ? "No fills returned for this wallet." : "Add a wallet to view fills analytics."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" id="positions">
        <SectionHeader title="Open Positions" subtitle="Current directional exposure by symbol." />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Amount</th>
                <th>Entry</th>
                <th>Mark</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.length ? (
                data.positions.map((p, idx) => (
                  <tr key={`${p.symbol}-${idx}`}>
                    <td><span className="sym-pill">{p.symbol}</span></td>
                    <td className={(String(p.side).toLowerCase().includes("bid") || String(p.side).toLowerCase().includes("long")) ? "good" : "bad"}>
                      {(String(p.side).toLowerCase().includes("bid") || String(p.side).toLowerCase().includes("long")) ? "Long" : "Short"}
                    </td>
                    <td>{p.amount}</td>
                    <td>{p.entry_price}</td>
                    <td>{marks[p.symbol] || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-row">
                    {hasAccountData ? "No open positions for this wallet." : "Add a wallet to view positions."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {data.account ? (
        <section className="section">
          <Card>
          <SectionHeader title="Account Snapshot" subtitle="High-level risk and margin context." />
          <div className="grid compact">
            <div>
              <p className="muted">Equity</p>
              <strong>{data.account.account_equity ?? "-"}</strong>
            </div>
            <div>
              <p className="muted">Available to Spend</p>
              <strong>{data.account.available_to_spend ?? "-"}</strong>
            </div>
            <div>
              <p className="muted">Margin Used</p>
              <strong>{data.account.total_margin_used ?? "-"}</strong>
            </div>
            <div>
              <p className="muted">Open Positions</p>
              <strong>{data.account.positions_count ?? "-"}</strong>
            </div>
          </div>
          </Card>
        </section>
      ) : null}
      <SiteFooter compact />
        </div>
      </div>
    </motion.main>
  );
}
