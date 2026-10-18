# Huddle

Swipe on the options, get one call. A mobile-web group decision app for couples and roommates: everyone marks the options privately (no, yes, love), and Huddle returns one winner with a one-sentence reason and the full board to prove it.

Product context lives in [PRODUCT.md](PRODUCT.md); working notes for contributors and agents in [CLAUDE.md](CLAUDE.md).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000/h/demo.

The demo round uses made-up places, prices and ratings. Everyone else's progress is simulated.

- `/h/demo?players=3` or `?players=4` shows the scoreboard with more people.
- `/h/demo?reason=fail` shows the fallback when the AI-written reason is unavailable.

Controls: swipe the card, tap No / Yes / Love, or use the arrow keys (← no, → yes, ↑ love, Z undo).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Status

The swipe → waiting → reveal round is built against mock data. No backend yet: no Supabase, no real Claude calls, no link unfurling.
