# Coffee Beans War — Game Brief

**Owner:** Diego (concept) · **Producer + game-design seat:** Smith · **Status:** design phase
**Context:** Entry for Jack Roberts' AI Automations Skool "September Comp — Game Builder". Deadline 30 Sep 2026.
**Project folder:** `~/AIwithDiego/Personal/coffee-beans-war/` (this folder becomes the repo)
**Bar (Diego's words):** "something cool and original, not the 2026 best seller."

---

## 1. The competition (verbatim constraints)

- Build a playable game with AI. Any game, any tools. **It has to run. If they can't play it, it doesn't count.**
- Submission: Skool post under "September Comp" + 60s Loom of Diego playing it + GitHub repo / live link.
- Prizes ($150 each): **Best Game** (judges kept playing) · **Most Creative** (nobody saw it coming, and it works) · **Eye Candy** (art, UI, sound, polish) · **One More Go** (replay value) · **First Timer** (never shipped a game) · 2× mystery.

**Targeting strategy:** one build aimed at Eye Candy + One More Go, with a theme strong enough for Most Creative. Best Game is those three seen by a hooked judge. **First Timer: eligible.** Diego confirmed 2026-09-05 he has never shipped a game. Four categories in play with one build.

**Judging reality to design for:** a judge opens the link alone, probably late, on whatever device is in front of them, with nobody else online. The first 30 seconds decide everything.

---

## 2. Concept (Diego's vision, played back)

**Coffee Beans War.** A multiplayer artillery game with a persistent world.

**Layer 1 — The World (lobby).** A single 3D low-poly map. Every connected player is a coffee bean with a war machine, standing wherever they spawned in the terrain: up a tree, in the flooded lowland, on a mountain. You see who is online, who is open to a fight, and you challenge them. The map is the menu; there is no menu.

**Layer 2 — The Battle.** Side-on framing (Street Fighter proportions) rendered with a 3D background. Turn-based artillery: aim angle + power, fire, the shot arcs, the other bean fires back. **Where each bean stands is the difficulty**: a bean on a mountain needs a high lob, a bean in a tree a mid arc, a bean in the flood a flat shot through drifting steam. Alternate until a hit lands. Points, roast rank, back to the world.

**Design lineage:** Worms / Scorched Earth / Pocket Tanks for the duel, with a persistent shared world in front of it (the original part), and the terrain-as-aim-problem twist (the second original part).

---

## 3. Smith's additions (approved by Diego 2026-09-05)

1. **Beans are the art direction.** Varieties as classes: **Arabica** (accurate, fragile), **Robusta** (tank, slow), **Liberica** (wildcard, erratic shot). Roast level = rank: green → light → medium → dark → burnt. Machines are coffee kit turned into weapons: **moka pot mortar**, **French press cannon**, **espresso machine** (fires under steam pressure, charge-up), **Aeropress sniper**. Every asset in the game is coffee.
2. **Wind = steam.** The classic artillery variable, skinned: steam drifts off the flooded lowland and changes each turn. Terrain gives the angle problem; steam gives the reason to replay.
3. **The map is never empty.** Bot beans live in the world permanently and can be challenged. A judge at 11pm with nobody online must get a full game. **This is the single most important requirement after "it runs".**
4. **Async is THE multiplayer (Diego, 2026-09-05: "like Pictionary / Draw Something back in the day").** Nobody needs to be online at the same time. You pick any bean on the map, send a challenge, and fire your first shot right there. When they next open the game they find every challenge waiting for them, play their shots, and the duels move on. Live duels (both online) are a bonus for M3+, not the core. The Skool community itself becomes the multiplayer.
5. **Daily seed + leaderboard.** Same steam pattern and spawn set for everyone each day. Roast rank climbs with wins. Leaderboard visible from the world.
6. **No login.** Pick a name, get a bean. Identity persists per device (local key); optional "claim" later if needed.
7. **Bean profile customisation (Diego, 2026-09-05).** Your bean is yours: variety (class), origin (Colombia, Ethiopia, Brazil, Vietnam, Kenya… shown as a badge), face/expression, an accent colour, a small accessory. Roast level is earned, not chosen. Customisation is visible on the world map and in the duel, so the shared world feels populated by people.
9. **The Spotter: you never see the opponent (Diego, 2026-09-05).** Their side of the duel stage is hidden in steam. A small cup-shaped window shows a tight crop of them, enough to know how they're standing, never how far. Your impacts thin the fog and the Spotter answers `Close.` / `Short.` / `Long.` Range becomes the skill you earn across turns. Full spec in GAME-DESIGN §2b.
8. **The ammunition is coffee beans (Diego, 2026-09-05).** Machines fire beans. Ammo types are bean states: green bean (standard), dark roast (heavy, shorter range, more damage), ground coffee (spread shot), and a rare full cup (splash, area). Ammo variety = pickups/choices per turn, not inventory management.

---

## 4. Pillars (what every decision is checked against)

1. **It runs, everywhere, alone.** Desktop + mobile browser. No account. Playable solo against bots in under 10 seconds from landing.
2. **Feel first.** The shot arc, the hit, the miss, the splash in the flood, the bean tumbling off the mountain: this is where the polish budget goes. Juice over features.
3. **Coffee all the way down.** No generic assets. If it isn't coffee, it isn't in.
4. **One more go.** Every duel ends with the next one one tap away. Rank, streak, daily seed.
5. **Cool and original, not a best-seller.** Small, sharp, memorable. Cut anything that doesn't serve the two layers.

---

## 5. Build order (each step is a shippable submission on its own)

| Milestone | What's playable | Categories unlocked |
|---|---|---|
| **M0 — Duel vs bot** | One battle screen. Aim, power, fire, terrain difficulty, steam, hit/miss, win/lose. Bot opponent. | Eye Candy (partial), First Timer |
| **M1 — The World** | 3D map with your bean + bot beans placed on terrain. Challenge a bot from the map. Roast rank + local streak. | Best Game, One More Go |
| **M2 — Async duels (the multiplayer)** | Real players persist on the map whether online or not. Challenge anyone, fire your shot, leave. They open the game, find their inbox of challenges, play their shots. Leaderboard. | Most Creative (the shared world) + One More Go (community loop) |
| **M3 — Live duels (bonus)** | If both beans are online, a challenge can be played live, turn by turn, with presence rings on the map. | Best Game |
| **M4 — Polish pass** | Sound, music, particles, screen shake, transitions, onboarding, share card for the Skool post. | Eye Candy (full) |

**Rule:** we never move to M(n+1) with M(n) unplayable. At every point there is a live URL a judge can play.

---

## 6. Technical proposal (for Emmett to challenge)

- **One renderer.** Three.js for both layers. World = perspective camera over a low-poly heightmap. Battle = orthographic side camera on the same scene tech, so "2D fighter with a 3D background" is a camera change, not a second engine.
- **Vite + TypeScript, no UI framework.** HTML overlays for HUD/menus (Allison's surface). Canvas for the game.
- **Deterministic simulation.** Ballistics + steam computed from a seed so live and async duels replay identically on both clients; the server stores inputs, not outcomes.
- **Realtime + persistence.** Supabase (Realtime presence + broadcast for the lobby; Postgres for players, duels, turns, leaderboard). Needs a **new Supabase project in Diego's Personal account** (free tier). Emmett to confirm or propose an alternative transport.
- **Hosting.** Public GitHub repo under `diegobdesign`, Vercel for the live link.
- **Assets.** Low-poly models generated (Higgsfield 3D / procedural), textures and SFX generated, music generated. All under Lola's direction, all coffee.
- **Bots.** Scripted, not LLM. Difficulty = aim noise + terrain-aware first guess. No AI surface → no Hank seat.

---

## 7. Team seats for the design phase

**Sequencing (Diego, 2026-09-05): design system FIRST.** Lola produces the art direction + game design system before Allison / Emmett / Sonny are convened, so the whole team builds against one visual truth. Smith writes `GAME-DESIGN.md` in parallel so the design system covers every class, machine, terrain, ammo and HUD element that actually exists.

| Seat | Owns | Deliverable |
|---|---|---|
| **Lola** | World art direction: the map, the beans, the machines, colour, light, motion identity, sound direction, Higgsfield prompt kit for assets | `docs/ART-DIRECTION.md` |
| **Allison** | Screens + flow (landing → world → challenge → duel → result → world), HUD, aim/power input on touch and mouse, onboarding in 10 seconds, microcopy, accessibility floor, **game feel** (scope expansion for this project) | `docs/UX.md` |
| **Emmett** | Architecture: renderer, scene graph, sim determinism, netcode (presence, live turns, async turns), data model, bot design, perf budget on mobile, hosting, build order sanity, **Three.js + realtime scope** (expansion for this project) | `docs/ARCHITECTURE.md` |
| **Sonny** | Playtest matrix per milestone, device matrix, netcode failure cases (disconnect mid-duel, double-accept, stale async turn), determinism tests, perf gates | `docs/QA.md` |
| **Smith** | Game design seat: mechanics, balance (classes, machines, terrain, steam), scoring, rank curve, bot difficulty curve. Producer. | this brief + `docs/GAME-DESIGN.md` |

**Katie pre-flight (Mode 2), 2026-09-05: FLAG → fixed.** Skill-coverage check failed: no persona documents game design / game-engine / game-feel craft. Fix applied at brief level (not SKILL.md): Smith holds the game-design seat; Emmett and Allison receive explicit scope expansions above for this project only. Routing, scope and workflow checks: correct. No AI surface → Hank not seated. Not a client project → dev-protocol lane classification is not mandatory; branch + tsc + PR discipline applied anyway.

---

## 8. Out of scope (v1)

- Accounts, OAuth, email.
- More than one map.
- Team battles, more than 2 players per duel.
- Chat. (Emotes maybe, M4, if cheap.)
- Native apps. Browser only.
- LLM-driven anything.

---

## 8b. Decisions log

| Date | Decision | By |
|---|---|---|
| 2026-09-05 | Design system before any code; concept art via Higgsfield | Diego |
| 2026-09-05 | Async (Draw Something) is the core multiplayer; live is a bonus | Diego |
| 2026-09-05 | The Spotter: opponent hidden, tight cup-window crop, impacts thin fog | Diego |
| 2026-09-05 | Beans have arms and legs ("give them all, game has to be fun") | Diego |
| 2026-09-05 | Coffee trees get round canopies, not pines | Diego |
| 2026-09-05 | Style anchor = `concept/world-anchor-v3-green.png` (green-first, round coffee trees, limbs). v1 stays as the composition reference. | Smith (Diego: "whatever is cool") |
| 2026-09-05 | Design-phase rulings on Emmett's and Sonny's questions: bot RP cap 100/day, stances frozen per duel, discrete charge flags, sudden death on round 8 or day 5, fog derived not stored, anonymous auth, 3D-world abort gate (GAME-DESIGN §16) | Smith |
| 2026-09-05 | Palette: green-first confirmed after the v3 test. Lola's rule holds: the world is green, red and violet; beans are the only brown. Red stays on paths, lake edge and the Roaster yard. | Smith's call |

## 9. Open questions

- **Diego:** create the Supabase project in the Personal account when Emmett confirms the transport.
- **Emmett:** Supabase Realtime vs alternative for live turns; latency tolerance for a turn-based game is generous, so simplicity wins.
- **Lola:** how "cinematic" can the world be on a mid-range phone without killing the feel pillar?
- **Smith:** class/machine balance is unproven; M0 playtest decides.
