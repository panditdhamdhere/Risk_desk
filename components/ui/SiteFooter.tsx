import Link from "next/link";

type SiteFooterProps = {
  compact?: boolean;
};

export function SiteFooter({ compact = false }: SiteFooterProps) {
  return (
    <footer className={`site-footer card clean-card ${compact ? "compact" : ""}`}>
      <div className="footer-top">
        <div>
          <p className="eyebrow">Built on Pacifica</p>
          <strong>Pacifica Risk Desk</strong>
          <p className="muted">Funding intelligence, execution analytics, and portfolio risk in one operator console.</p>
        </div>
        <div className="footer-links">
          <Link href="/dashboard">Dashboard</Link>
          <a href="https://docs.pacifica.fi/api-documentation/api" target="_blank" rel="noreferrer">
            API Docs
          </a>
          <a href="https://test-app.pacifica.fi/" target="_blank" rel="noreferrer">
            Testnet
          </a>
          <a href="https://github.com/" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
      <div className="footer-bottom muted">© {new Date().getFullYear()} Pacifica Risk Desk · Crafted for production-grade trading workflows.</div>
    </footer>
  );
}
