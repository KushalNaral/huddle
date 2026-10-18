---
version: 1
slug: "src-app-h-slug-page-tsx"
primary_target: "src/app/h/[slug]/page.tsx"
related_targets: ["src/components/round"]
---

# Swipe + reveal surface

## Scope and mode
Operate. The round from first card to reveal: swipe deck, waiting state, one-winner reveal. Production-grade with mock data; no backend yet.

## Audience and task
Couples and roommates (2–4) deciding a small shared thing, phones in hand, often in the same room. Swipe every option privately (votes hidden until reveal; only progress counts are shared), then see one winner with a one-sentence reason and the full vote breakdown.

## Constraints
Swipe is never the only input: buttons and arrow keys too. No confirmation between votes. One-step undo of your last vote. The host can call the round early from the waiting state. Reduced motion: the huddle ring appears without drawing. Never names or notes in URLs. AI reason failure falls back to the plain vote breakdown.

## Anti-goals
Dating-app clone (flame gradients, "It's a match!"), survey/form energy ("Question 3 of 8", rating scales), slow animation between cards, pretty cards that hide price, distance, or rating.

## Direction contract
THESIS: A coach's dry-erase playbook. Each person is a player in their own marker color; the round is drawn on a whiteboard and the reveal is the call made in the huddle. Refuses the stacked rounded photo-card deck with round X and heart buttons.
OWN-WORLD: Turf-green header strip, whiteboard white board, marker black ink, no greys. Marker red, blue, and green belong only to people and vote states; amber only to the winner. Jersey block numerals for counts. Votes are marker strokes: love circled, no struck through, yes ticked. Ballpoint-free: every mark reads as chisel-tip marker.
STORY: The visitor sees whose turn it isn't, what the option really costs and how far it is, votes in one gesture, waits briefly, and sees one call they trust because every mark is on the board.
FIRST VIEWPORT: Turf strip at top: question as the heading, guide line "3 of 8 · next: Pho 88", and each player's jersey-number count (two players mirror across a center line). Board center: option name at display scale, then ruled rows of price, distance, rating, and who added it on one shared column grid; link image when present, text-only card equally composed. Bottom, thumb reach: No, Yes, Love as marker-labeled buttons, plus undo.
FORM: The Playbook, candidate 7 of 7 on the re-rolled grounded list; seed key 1b98a4fe.
SIGNATURE: At the reveal every player's marks gather and a marker ring draws itself closed around the winning option (the huddle), followed by "The call" and the reason.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
