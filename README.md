# Huddle

Swipe on the options, get one call. A mobile-web group decision app for couples and roommates: everyone marks the options privately (no, yes, love), and Huddle returns one winner with a one-sentence reason and the full board to prove it.

Product context lives in [PRODUCT.md](PRODUCT.md); working notes for contributors and agents in [CLAUDE.md](CLAUDE.md).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 and start a huddle. Send the link to someone, or open it yourself at `http://127.0.0.1:3000/h/<slug>`: `127.0.0.1` keeps its own cookies, so it acts as a second device.

The loop: create → share the link → everyone joins with a name (and an optional private budget) → add options by typing or pasting a link → the host starts the round → everyone swipes → the call. The host can call it early or run it back.

Huddles live in server memory for now, so they're gone when the dev server restarts. Supabase replaces that in Stage 2.

### The demo round

http://localhost:3000/h/demo uses made-up places, prices and ratings, and simulates everyone else's progress.

- `/h/demo?players=3` or `?players=4` shows the scoreboard with more people.
- `/h/demo?reason=fail` shows the fallback when the AI-written reason is unavailable.

Controls: swipe the card, tap No / Yes / Love, or use the arrow keys (← no, → yes, ↑ love, Z undo).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (typed rules) |
| `npx tsc --noEmit` | Strict typecheck |

## Status

Stage 1 of 5 is done: real huddles with no external services. See "Build stages" in [CLAUDE.md](CLAUDE.md) for what's next (Supabase and realtime, Claude, link unfurling, tests and deploy).

Not deployable yet: the in-memory store doesn't survive serverless instances.
