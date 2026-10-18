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

## Proposed stack
Proposed, not locked in. Change it here if we decide otherwise.
- **Frontend + API:** Next.js (App Router) + TypeScript + Tailwind
- **Database + realtime:** Supabase (Postgres, realtime channels for live vote updates)
- **AI:** Claude API (`claude-haiku-5-5` for link/constraint parsing, `claude-sonnet-5-5` for the final decision + reason)
- **Hosting:** Vercel
- **Tests:** Vitest (unit), Playwright (core loop end-to-end)

## Data model (initial)
- `huddles` — id, slug, question, status (`collecting` | `voting` | `decided`), host_token, created_at
- `participants` — id, huddle_id, display_name, constraint_note, device_token
- `options` — id, huddle_id, added_by, url, title, image_url, metadata (jsonb)
- `votes` — participant_id, option_id, value (`no` | `yes` | `love`)
- `decisions` — huddle_id, option_id, reason, scores (jsonb)

## Decision logic
- The score comes from the votes and is deterministic: love = 2, yes = 1, no = −1 (the soft veto), unmarked = 0. Implemented in `tally()` in `src/lib/round.ts`.
- Options that break a stated constraint (today: your price cap) rank below every option that doesn't.
- The LLM only **parses constraints** and **writes the explanation**. It never picks the winner by itself, so results stay fair and repeatable.
- Break ties by number of "love" votes, then by fewest "no" votes, then by the option added first.

## Conventions
- Mobile-first: design every screen at 375px width first.
- No secrets in client code. Claude API calls go through server routes only.
- Participants are identified by an unguessable device token in localStorage. Never put names or notes in URLs.
- Keep the Huddle link the only thing someone needs to participate.
- Every AI call has a non-AI fallback (show the raw vote ranking if the API fails).

## Commands
- `npm run dev`: dev server (demo round at `/h/demo`, `?players=3|4`, `?reason=fail`)
- `npm run build`: production build
- `npm run lint`: ESLint
- `npx tsc --noEmit`: typecheck (run `npx next typegen` first on a fresh clone)

This is Next.js 16: read `node_modules/next/dist/docs/` before using an API you haven't checked (see `AGENTS.md`). Runtime data (`params`, `searchParams`) must be read inside `<Suspense>`.

## Product and design context
- Product truth (users, positioning, principles) lives in `PRODUCT.md`. Keep it updated instead of duplicating it here.
- Visual system lives in `DESIGN.md`; the swipe surface's direction contract is in `.impeccable/surfaces/`.

## Status
Swipe → waiting → reveal is built against mock data (`demoRound()` in `src/lib/round.ts`). No backend, real-time sync, Claude calls, or link unfurling yet.
