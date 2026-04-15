# Pacifica Risk Desk

Pacifica Risk Desk is a modern risk and execution intelligence console for perpetual traders on Pacifica.

It helps operators answer three critical questions in seconds:
- Where is portfolio risk concentrated?
- Is execution quality degrading?
- Which thresholds are currently breached and what action should be taken?

## Why this project

Perps traders often monitor raw numbers across multiple views but lack a single operator console that combines:
- exposure concentration,
- execution quality,
- funding stress,
- and fast actionable recommendations.

Pacifica Risk Desk turns live Pacifica market/account/trade data into a decision layer designed for speed.

## What it does

- **Risk Engine v2 Alerts**
  - overall risk band (Low/Medium/High)
  - top-position concentration and funding stress checks
  - position-specific volatility alerts
  - composite portfolio recommendation

- **Execution Quality v2**
  - fee drag ratio
  - slippage proxy (bps)
  - average notional per fill
  - win rate and fee-per-fill diagnostics

- **Threshold Alerts + Demo Preset**
  - configurable alert thresholds (risk, concentration, fee drag, slippage)
  - instant threshold breach feed
  - one-click demo preset for judge-friendly storytelling

- **Per-Symbol Position Intelligence**
  - symbol-level risk badges (Low/Medium/High)
  - tactical recommendation per position (trim/hedge, tighten TP-SL, hold)

- **Operator UX**
  - wallet connect/disconnect in navbar
  - command palette (`⌘K` / `Ctrl+K`)
  - dark/light theme
  - table filtering/sorting + CSV exports
  - local layout persistence

## Tech Stack

- Next.js 16 (App Router)
- React + TypeScript
- Framer Motion
- Pacifica REST API (via Next.js route handlers)

## Architecture

The frontend does not call Pacifica directly from the browser.  
It calls internal API routes that proxy Pacifica endpoints for clean separation and easier control:

- `app/api/market/route.ts` -> `/info`, `/info/prices`
- `app/api/book/route.ts` -> `/book`
- `app/api/account/route.ts` -> `/account`
- `app/api/positions/route.ts` -> `/positions`
- `app/api/trades/route.ts` -> `/trades/history`

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm run start
```

## Environment

Copy `.env.example` to `.env` and set values:

- `PACIFICA_NETWORK` (`testnet` or `mainnet`)
- `PACIFICA_REST_URL` (optional full API base override)
- `PACIFICA_ACCOUNT` (optional public wallet for default dashboard view)
- `PACIFICA_PRIVATE_KEY` (only for optional Python script workflows)

## Product Routes

- `/` -> landing page
- `/dashboard` -> live analytics console


## Important Files

- `app/dashboard/page.tsx` - core analytics console
- `app/page.tsx` - landing experience
- `app/globals.css` - design system styling
- `components/ui/CommandPalette.tsx`
- `components/ui/ThemeToggle.tsx`
- `components/ui/StatCard.tsx`
- `components/charts/Sparkline.tsx`
- `components/charts/MiniBars.tsx`