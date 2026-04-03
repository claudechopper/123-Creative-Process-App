# Draft, Stop & Sharpen — Project Context

## Project Overview
A creative writing web app built on the "Draft, Stop & Sharpen" method — write freely, rest your draft, then return with fresh eyes to sharpen it. Helps writers separate the creative drafting mindset from the critical editing mindset.

**Live URL:** https://123-creative-process-app-123-create-app.up.railway.app
**GitHub:** https://github.com/claudechopper/123-Creative-Process-App

## Tech Stack
- **Frontend:** Vite + React 19, inline styles (no CSS modules)
- **Backend:** Express.js + PostgreSQL on Railway
- **Auth:** Google OAuth via Passport.js
- **Storage:** localStorage primary, cloud sync for authenticated users
- **Deployment:** GitHub → Railway auto-deploy

## Architecture
- **FlowMode.jsx** — Draft page. Timer-based writing sessions with Strict (no backspace) / Gentle modes. File upload support.
- **GapMode.jsx** — Resting page. Shows drafts with 12-hour rest countdown. Project grouping with drag-and-drop reorder, editable project names.
- **RefineMode.jsx** — Sharpen page. Side-by-side editor: original on left, editable on right. Drag cards from left to paste into right.
- **OnboardingPopup.jsx** — Welcome popup with 3 buttons (Got it / Watch Video / Take the Tour).
- **GuidedTour.jsx** — Step-by-step interactive tour with pulsing button highlights.
- **TipsPanel.jsx** — Creative writing prompts that insert into textarea. Silver in draft mode, gold in sharpen mode.
- **Banner.jsx** — Bottom bar with auth status.
- **App.jsx** — Router between modes. Manages tour state.
- **storage.js** — localStorage CRUD for drafts, projects, reordering, sync.
- **AuthContext.jsx** — Google OAuth context provider.
- **api.js** — Backend API calls for cloud sync.

## Color Scheme
- **"Draft"** — Shimmering silver (#A8B4C4) with multi-layer text-shadow glow
- **"Stop"** — Stop-sign red (#C0392B)
- **"& Sharpen"** — Gold (#D4943A) with intense glow
- **Flow page** — Cream background (#FDF6EC)
- **Gap page** — Sage green (#E2EBE0)
- **Refine page** — Dark green (#14201A)
- **Silver buttons** — Gradient (#A8B4C4 → #BEC8D6) with white-core shimmer
- **Gold accents** — #D4943A with 3-layer text-shadow glow

## Key Design Decisions
- localStorage keys use `twomodes_*` prefix (kept from original name to avoid data loss)
- No override for 12-hour rest period (removed)
- Tips wrapped in `***[Tip: ...]***` for bold+italic distinction
- File upload accepts .txt, .md, .csv, .json, .html, .xml, .rtf, .log, .tex, .yml, .yaml
- Project titles 26px serif, click-to-edit inline
- "Ready to Sharpen" button: gold background with bright green text (#1A5C2A)

## Dev Server
```
npm run build    # Build for production
npx vite --port 5178 --host 0.0.0.0   # Dev server
```
Preview config in `.claude/launch.json` — use `twomodes-dev` server name.

## Recent Changes (Round 7)
- Tour with pulsing highlights + cross-page navigation
- Project drag-and-drop rebuilt with full container drop zones
- Editable project titles (click to rename)
- Delete Draft button with confirmation
- Override system removed entirely
- Tips: silver in draft mode, gold in sharpen mode
