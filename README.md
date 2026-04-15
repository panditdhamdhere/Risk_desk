# Pacifica Risk Desk

Modern Next.js product UI for Pacifica perps analytics.

It provides a polished trading console with:

- Funding pressure radar
- Session PnL and fee attribution
- Order-book spread tracking
- Portfolio risk scorecard with sparklines
- Command palette (`⌘K` / `Ctrl+K`)
- Dark / light theme toggle

## Tech Stack

- Next.js 16 (App Router)
- React + TypeScript
- Framer Motion (UI transitions and command palette animation)

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

## Product Routes

- `/` — marketing/landing page
- `/dashboard` — live analytics console

## Pacifica Integration

Frontend calls internal API routes that proxy Pacifica REST:

- `app/api/market/route.ts` → `/info`, `/info/prices`
- `app/api/book/route.ts` → `/book`
- `app/api/account/route.ts` → `/account`
- `app/api/positions/route.ts` → `/positions`
- `app/api/trades/route.ts` → `/trades/history`

## UX Features

- Sidebar app shell on dashboard
- Command palette for quick navigation/actions
- Table filters for Funding and Fills sections
- Skeleton loading states
- OpenGraph image + app icon for social sharing and branding

## Important Files

- `app/page.tsx` — landing page
- `app/dashboard/page.tsx` — trading console
- `components/ui/CommandPalette.tsx`
- `components/ui/ThemeToggle.tsx`
- `components/ui/StatCard.tsx`
- `components/charts/Sparkline.tsx`
- `app/opengraph-image.tsx`
- `app/icon.svg`