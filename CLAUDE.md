# Huddle

A group decision app. Friends drop options (restaurants, trips, movies, anything with a link), run a quick swipe-and-vote round, state their constraints in plain words ("I'm broke this week", "no seafood"), and Huddle returns **one decision** with a short reason.

## Why it exists
- Group chats are bad at deciding things; polls are clunky and ignore constraints.
- Built first for couples and roommates (2–4 people) who face the same small decisions again and again. Every Huddle is shared by link, so it also spreads through use.

## Core loop (MVP)
1. **Create** — the host names the question ("Dinner Friday?") and gets a share link. No account needed.
2. **Join** — friends open the link, pick a display name, and are in. No signup, no app install.
3. **Add options** — anyone pastes links or types options. Links are unfurled (title, image, price/rating when available).
4. **Constraints** — each person can add a one-line note ("under $20", "must be near downtown").
5. **Swipe** — each person swipes yes / no / love on every option (mobile-first card UI).
6. **Decide** — when everyone is done (or the host closes the round), Huddle scores options from the votes, filters by constraints, and shows the winner plus a one-sentence "why".
7. **Share** — the result is a shareable card. "Start another Huddle" is the main call to action.

## Out of scope for the MVP
User accounts, payments, native apps, booking/reservations, recurring groups, chat. Add these only after the core loop is validated.

## Stack
- **Site:** Next.js (App Router) + TypeScript + Tailwind, exported as static files (`output: "export"`) and hosted on **GitHub Pages**.
- **API + realtime:** a **Cloudflare Worker** in `worker/`. Each huddle is one Durable Object (SQLite-backed) that holds its state, serializes every change, and pushes each device its own view over a hibernating WebSocket.
- **AI:** Claude API (`claude-haiku-5-5` for link/constraint parsing, `claude-sonnet-5-5` for the final decision + reason), called from the Worker only.
- **Tests:** Vitest (unit), Playwright (core loop end-to-end)

## Data model
One `StoredHuddle` document per Durable Object (`worker/src/huddles.ts`): slug, question, status (`collecting` | `voting` | `decided`), version, round number, host id, players (name, color, device hash, budget, note), options, and votes (`playerId → optionId → no | yes | love`). Huddles delete themselves 30 days after creation.

## Decision logic
- The score comes from the votes and is deterministic: love = 2, yes = 1, no = −1 (the soft veto), unmarked = 0. Implemented in `tally()` in `src/lib/round.ts`.
- Options that break a stated constraint (today: your price cap) rank below every option that doesn't.
- The LLM only **parses constraints** and **writes the explanation**. It never picks the winner by itself, so results stay fair and repeatable.
- Break ties by number of "love" votes, then by fewest "no" votes, then by the option added first.

## Conventions
- Mobile-first: design every screen at 375px width first.
- No secrets in client code: the site is public static files. Claude API calls go through the Worker only.
- Participants are identified by an unguessable device token kept in `localStorage` (`huddle_device`) and sent as a Bearer token; the Worker stores only its sha-256 hash. Never put names, notes or tokens in URLs; every write is a JSON POST.
- Keep the Huddle link the only thing someone needs to participate.
- Every AI call has a non-AI fallback (show the raw vote ranking if the API fails).

## Commands
- `npm run dev -- --port 3100`: site dev server (demo round at `/h/?id=demo`, `&players=3|4`, `&reason=fail`)
- `npm --prefix worker run dev`: API on http://localhost:8787 (the site talks to it by default; override with `NEXT_PUBLIC_API_URL`)
- `npm run build`: static export to `out/` (`NEXT_PUBLIC_BASE_PATH=/huddle` for Pages)
- `npm run lint`, `npx tsc --noEmit`: site checks (run `npx next typegen` first on a fresh clone)
- `npm --prefix worker run typecheck`, `npm --prefix worker run lint`: API checks

The site is static: no Server Functions, route handlers, cookies or dynamic routes. A huddle is `/h/?id=<slug>`, read with `useSearchParams` inside `<Suspense>`.

This is Next.js 16: read `node_modules/next/dist/docs/` before using an API you haven't checked (see `AGENTS.md`). Runtime data (`params`, `searchParams`) must be read inside `<Suspense>`.

## Product and design context
- Product truth (users, positioning, principles) lives in `PRODUCT.md`. Keep it updated instead of duplicating it here.
- Visual system lives in `DESIGN.md`; the swipe surface's direction contract is in `.impeccable/surfaces/`.

## Status
**Stages 1 and 2 are done.** Huddles are real and live: create, join, lobby, swipe, call, run it back, with changes pushed to every device.
- `worker/src/huddles.ts`: all domain rules and authorization (host-only actions, locked options, settle-when-done). Every input is `unknown` and checked.
- `worker/src/index.ts`: routing, CORS (`ALLOWED_ORIGINS` in `wrangler.jsonc`), and the `Huddle` Durable Object. Routes: `POST /h`, `GET /h/:slug`, `POST /h/:slug/:action` (`join`, `me`, `add`, `remove`, `start`, `vote`, `call`, `runback`), `GET /h/:slug/live` (WebSocket; first message is `{"token"}`, close code 4404 means the huddle is gone).
- `src/lib/api.ts`: the site's client for that API. `src/lib/view.ts` and `src/lib/round.ts` are shared by the site and the Worker, so keep them free of browser and Node imports.
- `src/lib/view.ts`: `HuddleView`, the only shape a device ever receives. Others' votes stay hidden until the call, and others' budgets never leave the Worker.
- `src/components/huddle/use-huddle.ts`: the WebSocket with reconnect backoff; views only ever move forward by `version`.
- `src/components/round/round-screen.tsx` is driven by a `RoundState`. That comes from `useDemoRound` for the demo and `useLiveRound` for live huddles.

## Deploy
- `.github/workflows/pages.yml` builds the static site and publishes it to GitHub Pages on every push to `main`. It reads the repo variable `HUDDLE_API_URL`.
- `.github/workflows/worker.yml` checks the Worker and runs `wrangler deploy` when the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets are set.

## TypeScript
Strict, with no exceptions: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and typed ESLint (`no-explicit-any`, `no-non-null-assertion`, `switch-exhaustiveness-check`, `no-floating-promises`, `no-unnecessary-condition`). Narrow with guards rather than casts, and run `npx tsc --noEmit` and `npm run lint` before committing.

## Build stages
Each stage ships on its own and keeps the demo working.
1. **Real huddles, no external services.** You can create a huddle, join by link, add typed or pasted options, set a budget and a note, and the host starts the round. Votes are stored on the server. Everyone's progress syncs by polling, and the reveal comes from real votes. The store lives in memory behind an interface, so it resets when the dev server restarts.
2. **Backend and realtime.** Done: a Cloudflare Worker with one Durable Object per huddle and WebSocket pushes; the site is a static export on GitHub Pages.
3. **Claude.** It parses each person's free-text note into constraints and writes the one-sentence reason. Every call falls back to the non-AI path. Needs `ANTHROPIC_API_KEY`.
4. **Link unfurling.** It fetches the title, image, price and rating for pasted links, in the Worker, with a timeout and an SSRF guard.
5. **Ship.** Vitest for `tally()` and the store, Playwright for the core loop across two browser contexts, and a smoke test against the deployed Worker.
