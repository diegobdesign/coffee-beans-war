# Coffee Beans War — Joint Design Doc (design phase closed 2026-09-05)

**Status:** design phase complete, M0 build approved to start on Diego's word. **Producer:** Smith.
This is the entry point. It does not restate the seat docs; it says what was decided across them and what M0 is.

## The documents

| Doc | Seat | What it is |
|---|---|---|
| `BRIEF.md` | Smith | competition constraints, concept, pillars, milestones, decisions log |
| `GAME-DESIGN.md` | Smith | mechanics, balance knobs, the Spotter (§2b), rulings (§16, §16b) |
| `ART-DIRECTION.md` + `design-system.html` | Lola | the visual truth: world, tokens, beans, machines, UI, motion, sound, budgets. Live page: https://claude.ai/code/artifact/3949129c-11b9-4a20-b7e5-473123787dac |
| `UX.md` | Allison | flow, 10s onboarding, aim gesture, Spotter UX, feel, string table, accessibility |
| `ARCHITECTURE.md` | Emmett | scaffold, renderer, deterministic sim, data model, RLS, bots, build order, risks, FinOps |
| `QA.md` | Sonny | acceptance per milestone, device matrix, determinism proof, netcode cases, perf gates, playtests, submission day |
| `concept/` | Lola + Smith | 8 Higgsfield images; style anchor `world-anchor-v3-green.png` |

## The game in five lines

A persistent low-poly coffee valley where every player is a bean with a war machine. Tap any bean, fire your first shot, leave. They find your shot waiting when they next open the game (Draw Something). In a duel you never see the opponent: the Spotter shows how they stand, your impacts thin the steam, and the game answers `Close.` `Short.` `Long.` Results print as receipts. Winners roast darker.

## What the seats converged on (the load-bearing decisions)

1. **It runs alone.** The first duel is fully local. Bots ship in the bundle. The backend is optional at every milestone and this is gated at M2 by unsetting the env var on a preview deploy. (Sonny's cold-start gate, Emmett §4.1, BRIEF pillar 1.)
2. **One renderer, two cameras.** Three.js 0.185, perspective for the world, orthographic for the duel, one scene. Instanced trees, cherries, beans, particles; five materials; static shadow map; DPR ladder before shadows. Budgets from ART-DIRECTION §13 are enforced by a headless CI test and a `?stats=1` overlay.
3. **Deterministic sim, zero tolerance.** Restricted float64 (no transcendental Math, enforced by ESLint on `src/sim/**`), committed sine table, fixed 1/120s step, runs to completion before the renderer plays the trajectory back. Server stores inputs and an outcome hash; both clients recompute. Fog is derived from the impact list, never stored. Proven by golden hashes across V8, JavaScriptCore and SpiderMonkey.
4. **Async is the multiplayer.** Supabase free tier: `players` (id = anonymous auth uid), `duels` (loadout, class, stance and slot frozen at creation), `turns` (PK duel_id + turn_index, `whose_turn` trigger, ammo budget checked server-side), `player_daily`. One `play_turn` RPC, no client INSERT on turns, RP is column-granted never client-written. Daily seed from Postgres in Europe/Dublin. Daily Vercel Cron keep-alive so the project never pauses before judging.
5. **No login, honest limits.** Supabase anonymous auth: zero interaction, real RLS. Second device = new bean (one line of copy says so). Alt-account RP farming is accepted for a competition entry and said so in the README. Names are text-only everywhere (stored-XSS through map labels is the top defect class).
6. **You are always on the left.** One duel layout for both orientations, the Spotter always top-right, drag origin anywhere in a 28% to 65% band with an 88px dead zone at the bottom, `pointercancel` is never a fire. The aim UI is real DOM (two ranges + Fire) so keyboard and screen reader work by construction.
7. **Onboarding is a scripted first challenge, not a tutorial.** Land, valley opens, `1 bean is shooting at you.`, tap, the Pour arcs a shot at you out of the steam, `Your shot.` First fire at 9 to 14 seconds. Three hint tags: `Drag to aim.` `Tap any bean to challenge.` `They are in the steam.`
8. **Puzzle, not punishment.** Bracket band on the gauge between your last Short. and Long.; the newest impact marker is filled; first scripted duel uses a 2.5-unit fog radius; a new player's first two "One more go" picks are fair matchups.
9. **Feel is protected by name.** The Pour (never under 3s on first view) and the 60ms hit-stop are the two moments no refactor may lose. Hit flash rate-limited to 1 per 400ms per bean (strobe safety). Nothing loops, nothing floats.
10. **The 3D world has an abort gate.** If M1 cannot hold 60fps on the reference phone with the degrade ladder in, the world freezes and the rest of the month goes to the duel. A gorgeous duel beats a stuttering world in every category we chase.

## Rulings made by Smith (game-design seat) during the phase

See GAME-DESIGN §16 and §16b. Headlines: bot RP capped at 100/day; stances frozen per duel; charge inputs are discrete flags, not timings; sudden death on round 8 or day 5; `Wide.` renamed `Short.`; class editable between duels; all 14 of Allison's deviations accepted; Emmett's three challenges to Lola accepted (derived fog, no faces on map-scale beans, 512² face atlas).

## Owed by Diego (no action until asked)
- **Supabase project** in the Personal account, free tier, when M2 starts. Smith cannot create projects.
- **Kitchen recording** of the 22 SFX (about 20 minutes) before M4. Generated audio is the fallback.
- **Playtest round 1** at M0 (Diego + Smith + one more), round 2 at M1 (3 strangers), round 3 at M2 (5 Skool members).
- **The 60-second Loom** and the Skool post on submission day.

## Still open (small)
- Emmett and Allison have answered each other's questions (ARCHITECTURE §11, UX §13). Two consequences to carry into the build: `turns.call` is stored (derive physics, store balance), and `duels.sudden_death_from` freezes the day-5 trigger to a turn index so no wall clock enters the replay. One domain fix to apply when writing the sim types: `angleDeciDeg` is `-150..900` (Allison's -15° clamp), which Emmett's sine table already handles.
- `concept/duel-stage-spotter.png` and `duel-stage.png` were derived from v1 (pines, red ground). Regenerate from the v3 anchor before any of them is used publicly (Skool post, README). Not needed for the build.
- Lola re-skins Allison's accepted deviations into ART-DIRECTION §9 and the page at the next design-system iteration.

## M0: Duel vs bot. Zero network.

**Definition of done (Sonny's M0 list governs; the short form):** a stranger opens the production URL on a phone in a private window and plays a full duel against a Green bot, aim by drag, Spotter + fog + calls working, KO prints a receipt, `One more go.` starts the next duel, no console errors, 60fps on the reference phone, determinism goldens green in CI.

**Ships:** Vite 8 + TS 6.0.3 scaffold with Emmett's folder layout and lint rules; `src/sim` (rng, trig table, terrain slice, ballistics, duel state, hash) with golden vectors; bot solver with walking-in; one duel scene with the five materials, ortho camera, the two stances of the scripted matchup first, then all nine; the drag gesture on DOM ranges; HUD chips, gauge with bracket band, cup HP, steam layer and gauge, Spotter render target, impact markers, calls; the KO and receipt; localStorage profile + RP; `?stats=1` overlay; CI (tsc, lint, vitest sim tests, budget test, Playwright smoke on the preview).

**Stubbed:** world map (result card offers a re-challenge card), leaderboard, inbox, Supabase (package not installed).

**Process:** public repo `diegobdesign/coffee-beans-war`, `main` protected, feature branches, PR per slice with the preview URL, tsc before every commit, Vercel deploy on the first commit that renders anything. Order of slices: 1 scaffold + CI + deploy, 2 sim + goldens, 3 duel scene rendering a static stage, 4 gesture + shot playback, 5 Spotter + fog + calls, 6 bot + KO + receipt + One more go, 7 perf pass on device, 8 playtest round 1.

*Written 2026-09-05 by Smith after the four seat docs landed. Update this file when a decision here changes; the seat docs own the detail.*
