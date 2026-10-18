# Huddle

Swipe on the options, get one call. A mobile-web group decision app for couples and roommates: everyone marks the options privately (no, yes, love), and Huddle returns one winner with a one-sentence reason and the full board to prove it.

Product context lives in [PRODUCT.md](PRODUCT.md); working notes for contributors and agents in [CLAUDE.md](CLAUDE.md).

Live at https://kushalnaral.github.io/huddle/ once deployed (see below).

## Run it

Two processes: the site and the API.

```bash
npm install
npm --prefix worker install
npm --prefix worker run dev
npm run dev -- --port 3100
```

Open http://localhost:3100 and start a huddle. To be a second device, open the share link in a private window or at `http://127.0.0.1:3100/...`: each origin keeps its own device token.

The loop: create → share the link → everyone joins with a name (and an optional private budget) → add options by typing or pasting a link → the host starts the round → everyone swipes → the call. The host can call it early or run it back. Every change shows up on everyone's screen right away.

Local huddles live in Wrangler's local Durable Object storage (`worker/.wrangler/`), so they survive restarts.

### The demo round

http://localhost:3100/h/?id=demo uses made-up places, prices and ratings, and simulates everyone else's progress. It needs no API.

- `&players=3` or `&players=4` shows the scoreboard with more people.
- `&reason=fail` shows the fallback when the AI-written reason is unavailable.

Controls: swipe the card, tap No / Yes / Love, or use the arrow keys (← no, → yes, ↑ love, Z undo).

## How it fits together

- **Site** (`src/`): Next.js, exported as static files and hosted on GitHub Pages. A huddle lives at `/h/?id=<slug>`.
- **API** (`worker/`): a Cloudflare Worker. Each huddle is one Durable Object that owns its state and pushes each device its own view over a WebSocket. Nobody sees anyone's marks until the call, and budgets never leave the Worker.
- **Identity:** no accounts. Each device keeps a random token in `localStorage`; the Worker stores only its hash.

## Deploy

1. **API.** In Cloudflare, create an API token with the "Edit Cloudflare Workers" template. In this repo's **Settings → Secrets and variables → Actions**, add the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The next push that touches `worker/` (or a manual run of the **API** workflow) deploys it, and the log prints its URL, like `https://huddle-api.<you>.workers.dev`.
2. **Site.** Add a repository *variable* `HUDDLE_API_URL` set to that URL, then re-run the **Site** workflow. Pages must be set to build from GitHub Actions (Settings → Pages → Source).
3. If the site is served from another origin, add it to `ALLOWED_ORIGINS` in `worker/wrangler.jsonc`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Site dev server |
| `npm run build` | Static export to `out/` |
| `npm run lint` / `npx tsc --noEmit` | Site lint and strict typecheck |
| `npm --prefix worker run dev` | API on http://localhost:8787 |
| `npm --prefix worker run typecheck` / `lint` | API strict typecheck and lint |
| `npm --prefix worker run deploy` | Deploy the API by hand |

## Status

Stages 1 and 2 of 5 are done: real huddles, a real backend and live updates. See "Build stages" in [CLAUDE.md](CLAUDE.md) for what's next (Claude, link unfurling, tests).
