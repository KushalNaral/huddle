# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Delegated: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres + realtime for live votes), Claude API through server routes only, hosted on Vercel. Chosen because a link-based mobile web app needs fast first load, live multi-person state, and zero install. Recommendation accepted by the user.

## Users
Couples and roommates: 2–4 people who share a life and keep facing the same small decisions: what to eat tonight, what to watch, what to do this weekend. They are usually on their phones, often in the same room or messaging each other, and tired of the "I don't mind, you pick" loop. The job: get to one answer both (or all) of them are fine with, fast, without anyone having to be the one who decides.

Larger friend groups and trip-planning groups are possible later audiences, not the launch focus.

## Product Purpose
Huddle turns a stalled "what should we…?" into one decision. People add options (links or plain text), each person states any constraints in plain words, everyone swipes on the options, and Huddle returns a single winner with a one-sentence reason.

Success means a decision in under a minute with no account and no install, and the same pair or household coming back the next time the question comes up.

## Positioning
Unlike a chat poll or a scheduling tool, Huddle:
- **returns one answer**, not a tally to argue over;
- **respects constraints** stated in plain words ("I'm broke this week", "no seafood"), which filter and weigh the options;
- **is fun to swipe**: quick and playful, never a form;
- **has zero friction**: open the link and you're in, with no account and no app.

## Operating Context
- Started from a phone, usually mid-conversation. The host shares the Huddle link through iMessage, WhatsApp, or similar.
- Participants open the link in their mobile browser, pick a display name, and join.
- Options are often links pasted from delivery apps, maps, streaming services, or booking sites, or just typed text.
- Use is repeated: the same 2–4 people decide again and again (dinner tonight, a movie Friday).

## Capabilities and Constraints
- Core loop: create → share link → join → add options → add constraint note → swipe (no / yes / love) → decide → share result.
- The winner comes from deterministic vote scoring (love = 2, yes = 1, no = −1 as a soft veto; options that break a stated constraint rank below those that don't; ties go to the option with more "love" votes, then fewer vetoes, then the one added first). The AI only parses constraints and writes the explanation; it never picks the winner by itself.
- Every AI step has a non-AI fallback: if the API fails, show the plain vote ranking.
- Participants are identified by a device token. Names and notes never appear in URLs.
- Out of scope for the MVP: accounts, payments, native apps, bookings or reservations, chat.
- Undecided: whether recurring "households" (a saved group of the same people) arrive soon after the MVP; monetization.

## Brand Commitments
Working name: **Huddle**. No logo, voice guide, or visual identity exists yet.

## Evidence on Hand
None yet: no users, testimonials, usage data, or press. Future work must not invent any.

## Product Principles
1. **One answer, always.** Every round ends in a decision; ambiguity is the product's failure, not the user's.
2. **Fairness you can trust.** Votes decide; the AI explains. Anyone should be able to see why the winner won.
3. **Faster than arguing.** If it takes longer than the "you pick" back-and-forth, it has failed.
4. **The link is the whole onboarding.** Nothing stands between opening the link and voting.
5. **Built for the same people again.** Second and tenth uses matter more than the first-time novelty.

## Accessibility & Inclusion
Swiping must never be the only input: every swipe action also needs tappable buttons and keyboard support. Target WCAG 2.2 AA.
