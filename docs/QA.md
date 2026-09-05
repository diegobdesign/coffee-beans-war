# Coffee Beans War: QA

**Seat:** Sonny (QA: testing, security, edge cases) · **Status:** v0.1, design phase
**Companions:** `BRIEF.md`, `GAME-DESIGN.md`, `ART-DIRECTION.md`, `ARCHITECTURE.md` (Emmett, pending), `UX.md` (Allison, pending)

This document is written *before* code, which is where QA is worth 100x what it is worth after. Everything here is a check the implementation has to satisfy, not a wish. Each check is one line, testable, pass or fail.

The whole document hangs off one sentence in the brief: **"It has to run. If we can't play it, it doesn't count."** (`BRIEF.md:12`). Every gate below is downstream of that.

---

## 0. The gate that outranks everything

**COLD-START GATE.** A stranger, on a device we have never seen, in a private window, with no account, with nobody else online, taps the link and completes a full duel to a win or a loss without a console error, without a reload, and without asking a question.

If that fails, nothing else in this document matters. It is checked at every milestone, on real hardware, before anything else is checked. It is the only check with a veto.

Three corollaries the code must be built for from day one:

- **C1. The first duel never touches the network.** M0 duel vs bot runs entirely client-side from a local seed. If Supabase is down, paused, rate-limited or blocked by a corporate DNS, the judge still gets a game (`BRIEF.md:38`, `BRIEF.md:50`).
- **C2. Nothing renders a black canvas.** Any uncaught error, any `webglcontextlost`, any WebGL2-unsupported device renders a paper receipt with a readable line and a retry, never a blank frame.
- **C3. The map is never empty.** 12 bots persist regardless of backend state (`GAME-DESIGN.md:159`). If the players table cannot be read, the world still populates with bots from a local manifest.

---

## 1. Per-milestone acceptance lists

Format: every line is pass or fail, no partial credit. A milestone ships when 100% of its MUST lines pass on the device matrix MUSTs in §2. `BRIEF.md:68` is the rule: we never move to M(n+1) with M(n) unplayable.

### M0: Duel vs bot

**Stranger gate (M0):** a first-timer lands, fires a shot within 30 seconds, and beats the Green bot in 4 shots or fewer (`GAME-DESIGN.md:17`, `GAME-DESIGN.md:57`, `GAME-DESIGN.md:221`).

| ID | Check |
|---|---|
| M0-01 | Landing to first shot fired is under 30s for a first-time user with no instruction |
| M0-02 | Drag from the bean sets angle and power; release fires; the same gesture works on touch and mouse (`GAME-DESIGN.md:27`) |
| M0-03 | Keyboard path works: arrows change angle and power, space fires, tab reaches every control |
| M0-04 | The dotted preview shows the first 30% of the arc only and never the landing point |
| M0-05 | A shot resolves in 2.5s or less from release to impact or off-screen (`GAME-DESIGN.md:23`) |
| M0-06 | Off-screen projectile is culled and the turn passes; it never hangs the turn |
| M0-07 | Direct hit applies exact ammo base damage; splash applies base x falloff; terrain-near-bean applies partial |
| M0-08 | Cup drains visually and the duel ends at exactly 0 cup, not below and not at 1 |
| M0-09 | The opponent is invisible on the main stage for the whole duel until KO (`GAME-DESIGN.md:41`) |
| M0-10 | The Spotter window shows a live tight crop with no scale cue and no range information |
| M0-11 | Each landed shot leaves a permanent marker and thins fog in a 1.5 unit radius, and the thinning persists to the end of the duel |
| M0-12 | Exactly one call chip prints per shot: `Close.` `Wide.` or `Long.`, correct against the true impact offset, cleared at the next shot |
| M0-13 | Steam value is visible before the player fires, changes every turn, and its sign matches the arrow direction |
| M0-14 | Steam of +10 and -10 both move a mid shot by roughly one bean width, and neither pushes the projectile off-stage on a nominal shot |
| M0-15 | All 9 stance matchups (3x3) are reachable and the stage silhouette is correct in each |
| M0-16 | Flood misses splash harmlessly, near-misses do half, and the +10% flood damage bonus applies (`GAME-DESIGN.md:73`, `GAME-DESIGN.md:75`) |
| M0-17 | Tree canopy blocks a low shot and absorbs 25% of splash |
| M0-18 | All 3 classes are selectable, and cup values are exactly 90 / 120 / 100 |
| M0-19 | Liberica wild shot fires at 10% +/- 2% over 1000 seeded shots and doubles damage when it triggers |
| M0-20 | French press over-hold misfires at 1 in 6 +/- 1 over 600 seeded holds and the misfire is legible as a misfire, not as a bug |
| M0-21 | Ammo counts are enforced: dark roast 3, ground 2, full cup 1, green infinite; a spent type is unselectable |
| M0-22 | Ground coffee fires exactly 6 pellets, each leaving a marker, each thinning fog |
| M0-23 | Sudden death triggers after 8 rounds each, doubles steam, drains 5 per turn from both, and every duel terminates |
| M0-24 | Bot turn takes 1.2s to 2.0s and never 0s and never over 3s |
| M0-25 | Result card prints with correct HITS / SHOTS / STEAM MAX / DAMAGE / TAKEN and the arithmetic reconciles with the logged turns |
| M0-26 | `ONE MORE GO` starts a fresh duel in under 3s with no reload |
| M0-27 | Zero console errors and zero unhandled rejections across 10 consecutive duels |
| M0-28 | Reload mid-duel does not soft-lock: either resume or a clean fresh start, never a stuck turn indicator |
| M0-29 | Frame time p50 <= 16.7ms and p99 <= 33.3ms on the reference low-end device (§7) |
| M0-30 | Duel draw calls <= 30, visible triangles <= 60k (`ART-DIRECTION.md:629`, `ART-DIRECTION.md:634`) |

### M1: The World

**Stranger gate (M1):** a first-timer lands, understands that the beans are opponents, taps one, and is firing inside a duel without being told to.

| ID | Check |
|---|---|
| M1-01 | Landing receipt is completable in 10s: name, class, origin, face, accent, then `ENTER THE WAR` (`ART-DIRECTION.md:435`) |
| M1-02 | Name accepts 3 to 14 code points, rejects shorter and longer with an inline reason, and preserves accented Latin (`GAME-DESIGN.md:188`) |
| M1-03 | Profile persists across reload, tab close, and 24 hours, via the device key (`GAME-DESIGN.md:195`) |
| M1-04 | 12 bot beans are present on the map at all times, spread across all 3 stances, with roast levels and names |
| M1-05 | Tapping any bean opens the challenge card with their real class, machine, roast, stance-vs-yours line and record |
| M1-06 | Confirming the challenge goes straight into the duel and the first shot, with no accept step (`GAME-DESIGN.md:161`) |
| M1-07 | The world to duel transition completes in 900ms and never leaves the camera stranded between projections |
| M1-08 | Returning from a duel lands your bean back on its slot with the world in the same state, plus the rank tick |
| M1-09 | Tapping a free slot walks your bean there in 5s and your stance changes accordingly (`GAME-DESIGN.md:158`) |
| M1-10 | Tapping an occupied slot never moves you and never silently no-ops without feedback |
| M1-11 | Walk interrupted by navigating away resolves to exactly one position, never two |
| M1-12 | RP awards are exactly +10 bot win, -5 loss floored at 0, +10 first-shot KO, +5 comeback under 20 cup (`GAME-DESIGN.md:137`) |
| M1-13 | Roast level changes only on the world map, never inside a duel, at exactly 50 / 150 / 350 / 700 RP |
| M1-14 | Aeropress is locked below 150 RP and appears in the machine picker at exactly 150 |
| M1-15 | Streak increments on a win, resets to 0 on a loss, and displays next to the bean |
| M1-16 | `TODAY'S ROAST` tag matches the server day, not the device day (§4, DS-07) |
| M1-17 | CSS2D labels visible are capped at 32 and cull outside the viewport (`ART-DIRECTION.md:644`) |
| M1-18 | World draw calls <= 40, visible triangles <= 120k |
| M1-19 | World frame time p50 <= 16.7ms and p99 <= 33.3ms on the reference low-end device |
| M1-20 | Three.js geometry and texture counts return to baseline +/-2 after world to duel to world (§7, PF-07) |
| M1-21 | Profile editor saves and the change is visible on the map bean and the duel HUD within one frame |
| M1-22 | Sound toggle persists across reload and is honoured before the first sound plays |

### M2: Async duels

**Stranger gate (M2):** two strangers who are never online at the same time complete a full duel across separate sessions, and neither one is ever confused about whose turn it is.

| ID | Check |
|---|---|
| M2-01 | A real player's bean stays on the map after they close the tab and is challengeable |
| M2-02 | Challenging a human creates a duel and commits turn 0 in the same flow; a duel with zero turns never appears in anyone's inbox |
| M2-03 | Opponent's next session shows `N BEANS ARE SHOOTING AT YOU` with the correct N, and the badge is hidden entirely at 0 (`ART-DIRECTION.md:426`) |
| M2-04 | Inbox lists only duels where it is your turn, newest first, with correct opponent, stance glyphs, both cup states, and relative time |
| M2-05 | The Pour replays the opponent's shot from stored inputs at 1.0x, under *their* turn's steam, and never faster than 3s on first view (`ART-DIRECTION.md:338`) |
| M2-06 | The Pour never shows the opponent's Spotter view of you (`GAME-DESIGN.md:59`) |
| M2-07 | Fog state persists across sessions per duel and matches on both devices |
| M2-08 | `PLAY ALL` chains Pour to shot to next, is interruptible at any point, and never preloads more than the next duel |
| M2-09 | A duel completed by the opponent while you were away shows its result once and moves out of the inbox |
| M2-10 | Turn commit is idempotent: a double submit produces exactly one turn row and the UI treats the duplicate as success (§4, NC-02) |
| M2-11 | Out-of-order turn is rejected server-side and the client resyncs to true state without losing the player's aim (§4, NC-03) |
| M2-12 | Two clients racing the same turn index produce exactly one row and zero double damage (§4, NC-04) |
| M2-13 | Offline at commit shows `No steam.` with RETRY, preserves the exact original inputs, and survives a reload (§4, NC-05) |
| M2-14 | Duels with no shot from either side for 7 days read as `GONE COLD`, and `REHEAT` creates a new duel rather than mutating the old (§4, NC-06) |
| M2-15 | Leaderboard shows top 20 by RP, excludes bots, and the TODAY tab resets at Dublin midnight (`GAME-DESIGN.md:149`, `GAME-DESIGN.md:201`) |
| M2-16 | Leaderboard RP is computed server-side; a client that posts an RP value has it ignored (§9, SEC-06) |
| M2-17 | Inbox with 50 duels renders in <= 300ms and scrolls at 60fps on the reference low-end device (§4, NC-08) |
| M2-18 | Every write path is covered by an RLS policy that a second device cannot bypass (§9) |
| M2-19 | With Supabase unreachable, the world still loads with bots and a bot duel is still playable (C1, C3) |
| M2-20 | Realtime reconnect uses exponential backoff with jitter and a hard attempt cap; no unbounded retry loop |

### M3: Live duels (bonus)

| ID | Check |
|---|---|
| M3-01 | With both players online, the challenged bean gets a prompt and the duel runs turn by turn without leaving |
| M3-02 | The 20s live turn timer expires into a defined outcome (skip or forfeit turn), never into a hang |
| M3-03 | Opponent disconnect shows `They stepped out.` and the duel silently converts to async with no state loss (`ART-DIRECTION.md:450`) |
| M3-04 | Presence rings appear and disappear within 10s of a player joining or leaving |
| M3-05 | A live duel and an async duel between the same pair cannot both exist simultaneously |
| M3-06 | Both clients show identical damage and identical fog for every shot (determinism, §3) |
| M3-07 | Network latency of 500ms and packet loss of 10% degrade feel but never desync the outcome |
| M3-08 | M3 can be feature-flagged off at build time and M2 remains fully playable |

### M4: Polish

| ID | Check |
|---|---|
| M4-01 | Audio unlocks on the first user gesture and total audio transfer is <= 3MB (`ART-DIRECTION.md:647`) |
| M4-02 | With the iOS physical mute switch on, the game runs identically and nothing throws |
| M4-03 | With sound off, every piece of gameplay information is still available visually (calls, steam, turn, damage) |
| M4-04 | `prefers-reduced-motion` removes shake and squash, halves steam sprites and speed, and the steam layer still reads as gameplay information (`ART-DIRECTION.md:356`, `ART-DIRECTION.md:650`) |
| M4-05 | Reduced motion does not change any simulated outcome; a golden replay under reduced motion produces the identical state hash |
| M4-06 | The 3 first-time hints appear at most once each, dismiss on the successful action and never on tap (`ART-DIRECTION.md:452`) |
| M4-07 | Share card generates a 1080x1080 PNG in under 2s and downloads on iOS Safari and Android Chrome |
| M4-08 | Share card canvas is never tainted: `toBlob` succeeds with all fonts and images same-origin or CORS-clean (§9, SEC-09) |
| M4-09 | Player names on the share card are drawn with `fillText` from a validated string and cannot overflow the receipt panel |
| M4-10 | First playable transfer is <= 1.5MB gzipped (`ART-DIRECTION.md:648`) |
| M4-11 | Particles never exceed 24 per event and 96 alive; steam sprites never exceed 40 world / 80 duel |
| M4-12 | The degradation ladder fires under load in the documented order and never cuts the steam layer (`ART-DIRECTION.md:650`) |
| M4-13 | 10 consecutive duels with full audio and particles keep JS heap growth under 5MB per duel |

---

## 2. Device and browser matrix

A judge opens the link alone, late, on whatever is in front of them (`BRIEF.md:18`). The matrix is built for that, not for our machines.

### MUST (a failure here blocks submission)

| # | Target | Why it is a MUST | Orientation |
|---|---|---|---|
| D-01 | **iOS Safari, current shipping major** (iOS 26.x as of Sep 2026) | Largest single slice of "whatever phone is in front of them"; also the least forgiving WebGL host | Portrait + landscape |
| D-02 | **iOS Safari, n-1 major** (iOS 18.x) | Long tail of iPhones that never updated; still a meaningful share | Portrait |
| D-03 | **iOS Safari on the major that ships in mid-September 2026** | Apple ships a new iOS every mid-September. Judging is 30 Sep. A release we never tested lands 2 weeks before judging. Re-run the full M0-M4 smoke on it within 48h of release | Portrait |
| D-04 | **Android Chrome, current stable, on a Pixel 6a / Galaxy A53 class device** | This is the perf reference in `ART-DIRECTION.md:625` | Portrait + landscape |
| D-05 | **Desktop Chrome, current stable, macOS and Windows** | Most likely judging device after a phone | 1440x900 |
| D-06 | **Desktop Safari, current stable, macOS** | Different WebGL backend from Chrome; catches Metal-specific shader and context bugs | 1440x900 |
| D-07 | **Desktop Firefox, current stable** | Third JS engine (SpiderMonkey). This is the determinism canary, not just a render check | 1440x900 |
| D-08 | **Low-end reference phone** (Pixel 6a or a device throttled to 4x CPU / 4x GPU slowdown) | The 30fps hard floor is defined here | Portrait |
| D-09 | **Any MUST device with `prefers-reduced-motion: reduce`** | Motion is heavy in this game; a vestibular-sensitive judge must still get the gameplay information | Portrait |
| D-10 | **Any MUST device with system sound off / mute switch on** | Judges play late and silently. If the game needs sound to be understood, it fails for most judges | Portrait |
| D-11 | **Private / incognito window, logged out, cold cache** | This is exactly the submission-day condition (§10) | Both |

### SHOULD (fix if time; document if not)

| # | Target | Note |
|---|---|---|
| D-12 | Android Chrome on a 2019-class device (Snapdragon 6xx) | 30fps floor with the degradation ladder engaged |
| D-13 | Desktop Edge | Chromium, so covered in practice by D-05 |
| D-14 | iPad Safari, landscape | Layout only; the duel HUD is designed portrait-first |
| D-15 | Samsung Internet | Chromium fork with its own quirks around `touch-action` |
| D-16 | Android Firefox | Second engine on mobile |
| D-17 | Desktop at 1280x720 and 2560x1440 | HUD scaling extremes |
| D-18 | 200% browser zoom / 320px CSS width | Layout does not break; not a gameplay gate |

### Hard floor and graceful refusal

- **Minimum capability:** WebGL2 + ES2020 + `localStorage` + `Pointer Events`. Below this the game must render a paper receipt reading that this browser cannot brew, with a link, and never a black canvas (C2).
- **Do not claim iOS coverage from Playwright WebKit.** Playwright's WebKit on Linux is not iOS Safari: different GPU stack, different memory pressure, different audio session, different toolbar viewport behaviour. WebKit in CI is a regression net; iOS coverage is a real device, manually, per §11.

### Mobile-specific traps that must be designed for, not discovered

| ID | Trap | Required handling |
|---|---|---|
| MB-01 | iOS Safari toolbar collapse changes viewport height mid-play | Size to `100dvh` and listen to `visualViewport.resize`, debounced; never rebuild render targets on every resize event |
| MB-02 | A drag-to-aim gesture starting near the bottom edge triggers the iOS home indicator / toolbar reveal | `touch-action: none` on the gesture layer, `preventDefault` on `gesturestart`, and no bean or aim origin within 44px of the bottom edge in portrait (`ART-DIRECTION.md:389`) |
| MB-03 | Double-tap zoom and pinch zoom on the canvas | `touch-action: none`; do not rely on `user-scalable=no`, which iOS Safari ignores |
| MB-04 | WebGL context loss on tab background / memory pressure | Handle `webglcontextlost` (preventDefault) and `webglcontextrestored`; on restore, re-upload and resume from the current turn, never lose the duel |
| MB-05 | Backgrounding the tab pauses `requestAnimationFrame` mid-shot | The sim is fixed-timestep and clock-independent; on `visibilitychange` resume, do not fast-forward physics with a giant delta |
| MB-06 | Landscape phone: the Spotter, HUD chips and ammo rack collide with the safe areas | `env(safe-area-inset-*)` on all four sides; landscape layout verified on a notched device |
| MB-07 | Autoplay policy blocks the AudioContext until a gesture | Single AudioContext unlocked on the `ENTER THE WAR` pointerdown; every audio call is fire-and-forget and a failure never blocks the loop |
| MB-08 | Low Power Mode caps rAF at 30fps on iOS | The game must be fully playable at 30fps; nothing is tied to a 60Hz assumption |
| MB-09 | 120Hz ProMotion displays deliver rAF at 120Hz | Fixed-timestep sim decoupled from render rate; verify the shot takes the same wall-clock time at 60 and 120Hz |

---

## 3. Determinism tests

Determinism is not a nice-to-have here. It is the load-bearing assumption of async duels: the server stores inputs, not outcomes (`BRIEF.md:76`), and The Pour replays the opponent's shot on *your* device (`GAME-DESIGN.md:165`). If the sim diverges by one pixel across engines, two players see two different duels and the game is quietly broken in the exact way nobody notices until a judge notices.

### 3.1 The rules the sim must obey (for Emmett's `ARCHITECTURE.md`)

These are constraints, not suggestions. Each one is separately testable.

| ID | Rule |
|---|---|
| DT-R1 | The sim module is pure: no DOM, no Three.js, no `window`, no `Date`, no `Math.random`, no `performance.now`, no network. It takes `(seed, inputs[])` and returns state. Enforced by a lint rule and an import-boundary test |
| DT-R2 | **No transcendental `Math` functions in the sim.** `Math.sin`, `cos`, `tan`, `atan2`, `pow`, `exp`, `log`, `cbrt`, `hypot` are implementation-defined in ECMA-262 and *do* differ between V8, JavaScriptCore and SpiderMonkey. Only `+ - * /`, `Math.sqrt`, `Math.abs`, `Math.min/max`, `Math.floor/ceil/round/trunc` and `Math.fround` are IEEE-754-exact and therefore allowed. Angle to velocity uses a precomputed sine table over a fixed-point angle index with linear interpolation done in allowed ops only |
| DT-R3 | The PRNG is integer-based (`Math.imul` + `>>>`, e.g. mulberry32 or xorshift128), seeded, and every consumer draws from an explicitly-named stream (`steam`, `spread`, `wild`, `misfire`, `botNoise`) so adding a consumer never shifts another's sequence |
| DT-R4 | Fixed timestep only. The integrator advances in exact `dt` steps with an integer step counter; render interpolation is separate and never feeds back into state |
| DT-R5 | No iteration over `Object` keys, `Set` or `Map` in a way that affects state; entity order is an explicit sorted array with a stable integer id |
| DT-R6 | All sim state is `number` in a flat typed layout; no `undefined`, no `NaN`, no `-0` (normalise `-0` to `0` before hashing) |
| DT-R7 | Fog state, impact markers and the Spotter call are computed inside the sim from the same inputs, not in render code. They are gameplay state and they are stored with the turn (`GAME-DESIGN.md:59`) |
| DT-R8 | The daily seed is a server value, never `new Date()` on the client (§4, NC-07) |

**Sonny/Emmett coordination point:** if Emmett's `ARCHITECTURE.md` proposes a fixed-point integer sim instead, that is strictly better and DT-R2 becomes moot. If it proposes float64 with the DT-R2 restriction, that is acceptable and is what these tests are written against. If it proposes float64 *without* DT-R2, I block it. Flag either way in the joint doc.

### 3.2 Golden-file test design

**Fixture format.** One JSON file per scenario in `tests/golden/`:

```jsonc
{
  "id": "g-042-flood-vs-ridge-steam-max",
  "simVersion": 3,                 // bumped only on an intentional sim change
  "seed": "cbw-2026-09-30",
  "duelSeed": 918273645,
  "setup": { "a": {"class":"arabica","machine":"espresso","stance":"brew"},
             "b": {"class":"robusta","machine":"moka","stance":"ridge"} },
  "inputs": [
    {"t":0,"p":"a","angle":6200,"power":7800,"ammo":"green"},
    {"t":1,"p":"b","angle":11450,"power":6100,"ammo":"dark"}
  ],
  "expect": {
    "stateHashPerTurn": ["8f3a...","c11d...", "..."],
    "finalHash": "a90e...",
    "trajectorySampleHash": "5b2c...",
    "damage": [0, 35, 20],
    "fogRevealCount": [0, 1, 2],
    "calls": [null, "Wide.", "Close."],
    "winner": "b",
    "turns": 7
  }
}
```

- Angles and powers are stored as **integers** (hundredths of a degree, hundredths of a percent) so the fixture itself has no float-parsing ambiguity.
- `stateHashPerTurn` is what makes a failure diagnosable: it tells you the *turn* where divergence started, not just that the duel ended differently.
- `trajectorySampleHash` hashes every Nth integrator step of the projectile, so a divergence that happens mid-flight but still lands in the same crater is still caught.

**Hashing.** FNV-1a or xxhash over the **raw IEEE-754 bits** of the state vector, read through a `DataView` on the underlying `Float64Array` in a fixed field order, with `-0` normalised to `0` and a hard assert that no field is `NaN`.

**Float tolerance policy: zero.**

- Primary assertion is bit-exact hash equality. Not "close enough".
- Rationale: a 1-ULP divergence at step 12 of a 150-step flight compounds into a different crater, a different fog reveal and a different call chip. A tolerance would hide exactly the class of bug we are testing for.
- Tolerance exists only in the **diagnostic** path: when a hash fails, the reporter prints per-step positions quantised to 1e-6 units so we can see instantly whether it is 1 ULP (a transcendental leaked in) or a structurally different run (a logic or ordering bug). The diagnostic never makes a test pass.
- The only place a tolerance is legitimate is the *render* layer, which is not under determinism test.

**Fixture set: 40 scenarios minimum, covering**
1. All 9 stance matchups, nominal shot.
2. Steam at -10, 0, +10 and a full 8-turn random-walk sequence.
3. Each ammo type including ground coffee (6-pellet ordering is the classic divergence source) and full cup splash.
4. Each machine including French press over-hold misfire and espresso double-bean.
5. Liberica wild shot triggering and not triggering on adjacent seeds.
6. Arabica spread at exactly 0, Robusta at +/-2, Liberica at +/-4.
7. Sudden death entry and both cups hitting 0 on the same turn (tie resolution must be defined and deterministic).
8. A shot that leaves the stage bounds; a shot that hits the shooter's own terrain; a shot at power 0 and power 100; angle at exactly 0 and 180.
9. Fog fully thinned; fog untouched for 8 turns; six overlapping reveals from one ground-coffee shot.
10. Bot vs bot for each of the 4 difficulty tiers, full duel.

**Generation and drift discipline.** Goldens are generated once by a Node script, committed, and **only regenerated on a deliberate `simVersion` bump with a one-line reason in the commit**. Regenerating a golden to make a red test go green is the single worst thing anyone can do to this project, so it is called out explicitly here and in CI (the CI job fails if `tests/golden/*.json` changes without `simVersion` also changing).

### 3.3 Cross-engine proof

Vitest runs on Node, which is V8. Passing there proves nothing about Safari. The cross-engine proof is a Playwright test that runs **the same sim bundle in-page** on chromium, firefox and webkit, and compares the produced hashes to the committed goldens generated in Node.

| ID | Check |
|---|---|
| DT-01 | All 40 goldens hash-match in Node (V8) |
| DT-02 | All 40 goldens hash-match in Playwright Chromium |
| DT-03 | All 40 goldens hash-match in Playwright Firefox (SpiderMonkey; the transcendental canary) |
| DT-04 | All 40 goldens hash-match in Playwright WebKit |
| DT-05 | All 40 goldens hash-match on a real iOS Safari device, run manually via a `/#determinism` dev route that prints the hash list and a single PASS/FAIL, screenshotted per release |
| DT-06 | All 40 goldens hash-match on a real Android Chrome device via the same route |
| DT-07 | Static check: `grep -nE "Math\.(sin|cos|tan|atan2|pow|exp|log|hypot|cbrt|random)" src/sim/` returns zero matches |
| DT-08 | Static check: `src/sim/` imports nothing from `three`, `src/render/`, `src/net/` or the DOM (import-boundary test) |
| DT-09 | Same duel replayed twice in the same process yields identical hashes (no hidden mutable module state) |
| DT-10 | Same duel replayed after 200 other duels yields identical hashes (no cross-duel state leak) |
| DT-11 | Replay under `prefers-reduced-motion`, at 30fps, at 120fps and with the tab backgrounded mid-shot yields identical hashes (render rate cannot touch sim state) |
| DT-12 | An async duel played across two real devices (iOS + Android) produces the same final result card on both, verified by screenshot |
| DT-13 | Timezone smoke: same duel replayed with the device TZ set to `Pacific/Kiritimati`, `UTC` and `Pacific/Midway` yields identical hashes |
| DT-14 | Locale smoke: device locale `ar-EG` (Eastern Arabic numerals) and `tr-TR` (dotless i) do not change any parse or hash. Any `toLocaleString` in the sim path is a bug |

**The `/#determinism` dev route** is a small piece of build cost that pays for itself: it is the only practical way to prove DT-05 and DT-06 on a borrowed phone in 20 seconds, and it is also the fastest triage tool if something looks wrong on judging day. Keep it in the production bundle behind a hash route, since it is read-only and costs nothing.

---

## 4. Netcode and async failure cases

Every case below has a defined, tested outcome. "Undefined" is not an acceptable answer for any of them, because async duels are exactly where a jam game rots.

| ID | Case | Required behaviour | Test |
|---|---|---|---|
| NC-01 | **Challenge a bean that was deleted** | Players are never hard-deleted; `active = false` soft delete. Duel FK is `ON DELETE RESTRICT`. Challenge card on a missing or inactive player shows `Gone cold.` and offers the nearest bot instead of failing | Soft-delete a player mid-flow, tap their bean, assert the receipt and the bot fallback. Also assert an already-running duel with them is playable to completion |
| NC-02 | **Double-submit a turn** | Unique constraint `(duel_id, turn_index)`. Client sends an idempotency key; on constraint violation the client treats it as success and refetches. Fire button disabled while in flight | Fire, then replay the exact same request 5x. Assert exactly one turn row, one damage application, and a success UI, not an error receipt |
| NC-03 | **Turn out of order** | Insert trigger rejects unless `turn_index = max(turn_index)+1` for that duel AND `player_id = duel.whose_turn`. Client on rejection resyncs and re-enters The Pour, preserving the aim it had | Post turn 5 when 3 is next. Assert rejection, assert no state mutation, assert the client recovers without a reload |
| NC-04 | **Both fire "at the same time" on a stale state** | Structurally impossible: a duel has exactly one `whose_turn`. The loser of the race gets a constraint violation and resyncs. There is no merge, no last-write-wins, no conflict resolution to get wrong | Two headless clients post turn N within 50ms. Assert exactly one row, zero double damage, both clients converge to the same state hash within 3s |
| NC-05 | **Client offline mid-shot** | The shot is authoritative only once the row is committed. Local playback is optimistic for feel, but on commit failure the client shows `No steam.` with RETRY and preserves the **exact original inputs** (so the retry cannot re-roll spread or misfire), persisted to `localStorage` so it survives a reload | Kill the network at `pointerup`. Assert the receipt, reload, assert the pending shot is still there with identical angle/power/ammo, restore network, assert it commits once |
| NC-06 | **7-day abandonment** | Derived at read time from `now() - last_turn_at > interval '7 days'`, not a cron-written column (a cron is a thing that can be down on judging day). `REHEAT` creates a **new** duel row; it never mutates the abandoned one | Backdate `last_turn_at` to 6d23h59m (not cold) and 7d00h01m (cold). Assert the `GONE COLD` section, assert REHEAT creates a new row and leaves the old one intact |
| NC-07 | **Clock skew on the daily seed** | The daily seed comes from Postgres: a `cbw_today()` function using `timezone('Europe/Dublin', now())` (`GAME-DESIGN.md:201`). The client caches it with a monotonic offset and **never** derives the day from `new Date()`. If the server is unreachable, the client uses the last known day and shows the tag dimmed rather than inventing one | Set the device clock +2 days, -1 day, and to 23:59:59 Dublin. Assert the seed and TODAY leaderboard match the server in all three. Test the Dublin DST boundary (last Sunday of October, 02:00 to 01:00 local): the day must not roll twice or skip |
| NC-08 | **Inbox with 50 duels** | Paginated 20 at a time. `PLAY ALL` chains but preloads at most the next duel. Bean renders come from the per-profile PNG cache (`ART-DIRECTION.md:645`) | Seed 0, 1, 50 and 200 duels. Assert render <= 300ms at 50, scroll at 60fps, memory flat across the whole list, and that 200 does not fetch 200 rows |
| NC-09 | **Forged turn from a hostile client** | See §9 SEC-05. **We detect and reject:** non-participant, wrong turn, non-sequential index, out-of-range angle/power, unknown ammo enum, ammo budget exceeded, machine/class that does not match the duel's frozen loadout, and any client-supplied outcome or RP field. **We accept for v1:** a modified client that aims perfectly (an aimbot), and a client that lies about its own fog state (self-only, harmless). Rejections are written to a `rejected_turns` table so we can see it happening | Craft each rejection case with raw `fetch` against the API and assert a rejection plus an audit row. Document the accepted risks in the README |
| NC-10 | **Orphan duel** (duel row created, turn 0 never committed) | A duel with zero turns is not a duel: it never appears in an inbox and is swept on read. The safer design is a single RPC that creates the duel and turn 0 in one transaction, which is the recommendation | Kill the network between the two writes. Assert nothing appears in the opponent's inbox and nothing is stuck in yours |
| NC-11 | **Two tabs, same device, same duel** | Both tabs read the same device identity. The second tab's turn hits the unique constraint (NC-02). No duplicated profile, no duplicated RP | Open two tabs, fire in both. Assert one turn, one RP award |
| NC-12 | **Realtime channel drops** | Exponential backoff with jitter, hard attempt cap, then fall back to poll-on-focus. Never an unbounded retry loop (that is how a free-tier project gets rate-limited on judging day) | Kill the socket 10x. Assert backoff spacing grows, assert the cap holds, assert the game stays playable on the polling fallback |
| NC-13 | **Supabase project paused or 5xx** | The world renders with bots, bot duels are fully playable, the inbox shows an honest `No steam.` receipt with RETRY. **Never a spinner that never resolves** | Point the client at a dead URL. Assert C1 and C3 hold and that first paint is unaffected |
| NC-14 | **Duplicate profile from one device key** | `unique` on the identity column. A second create is an update, not a second row | Clear and re-enter twice concurrently. Assert one row |
| NC-15 | **Opponent changes class or machine mid-duel** | The loadout is **frozen onto the duel row at creation**. Changing your profile never retroactively changes a running duel's sim inputs, because that would break every stored replay | Change the profile mid-duel on device A. Assert device B's replay of the old turns is unchanged and hash-identical |
| NC-16 | **A player challenges themselves** | Rejected at the RPC. Also reject a second concurrent duel between the same pair | Attempt both. Assert clean refusals with a receipt, not an error |

---

## 5. Bot tests

Bots are the reason a judge at 11pm gets a game at all, which the brief calls the single most important requirement after "it runs" (`BRIEF.md:38`). They get real tests.

| ID | Check |
|---|---|
| BT-01 | Bots are deterministic: the same seed and the same player inputs produce a byte-identical bot shot sequence, across all four engines |
| BT-02 | **Green bot is beatable in <= 4 shots by a first-timer.** Statistical bar: over 500 simulated duels where the player model fires with 6 degrees of aim error, the player wins in <= 4 shots at least 70% of the time (`GAME-DESIGN.md:57`, `GAME-DESIGN.md:221`) |
| BT-03 | **Dark bot beats Smith.** Over 20 real duels played by Smith, the Dark bot wins at least 12. If it does not, sigma is retuned, not the acceptance bar |
| BT-04 | Tier separation holds: over 500 seeded duels each against a fixed reference player, win rates are monotonic Green < Light < Medium < Dark with at least 10 points between adjacent tiers |
| BT-05 | Measured aim noise matches spec: over 2000 shots per tier, the standard deviation of release angle is 6 / 4 / 2.5 / 1.5 degrees +/- 0.3 (`GAME-DESIGN.md:173`) |
| BT-06 | **Walking in improves shot to shot.** Over 500 seeded duels, mean absolute miss distance strictly decreases from turn 1 to 2, 2 to 3 and 3 to 4 for every tier |
| BT-07 | Walking in is not instant: turn 2 mean miss distance is not below 40% of turn 1 for Green and Light, so it reads as adjusting rather than snapping |
| BT-08 | **Bots never fire out of bounds.** Over 5000 seeded shots: launch angle is within the machine's legal range and directed toward the opponent's half, power is within the machine's range, and the projectile's landing point is inside the stage AABB or a legitimate off-stage miss, never NaN, never behind the bot |
| BT-09 | **Bots never self-damage.** Over 5000 seeded shots, bot self-damage is exactly 0 and no bot shot collides with terrain within 1 unit of its own position |
| BT-10 | **Bots respect the Spotter information rules.** The bot's aim estimate is a pure function of (its stance band centre, its own impact markers, its own Close/Wide/Long calls). Proof test: run a duel, then re-run the identical seed with the opponent's true position perturbed by +2 units *after* the bot computes its turn-1 estimate. The bot's turn-1 angle and power must be byte-identical. If it moves, the bot is cheating (`GAME-DESIGN.md:55`) |
| BT-11 | Bot estimate error on turn 1 is at least the stance band half-width: the bot cannot start with better range knowledge than a human would |
| BT-12 | Bot ammo use follows §10: dark roast when close, ground vs Tree, full cup when losing. Assert each branch fires at least once across 200 seeded duels and that no bot ever exceeds an ammo budget |
| BT-13 | Bot "think" time is 1.2s to 2.0s, is not blocking the main thread, and does not extend under load |
| BT-14 | Bot vs bot duels always terminate: 1000 seeded bot-vs-bot duels all reach a winner within the sudden-death bound, zero infinite loops |
| BT-15 | The 12 world bots are present, unique in name, spread across all 3 stances with at least 3 per stance, and carry plausible roast levels (`GAME-DESIGN.md:159`) |
| BT-16 | Bots are excluded from the leaderboard in every query path, including the TODAY tab (`GAME-DESIGN.md:149`) |
| BT-17 | Bots never appear in the inbox and never initiate a challenge unless that is an explicit design decision (right now it is not) |
| BT-18 | A bot duel never writes to the network in M0, and writes only the result in M1+ |

---

## 6. Balance instrumentation

`GAME-DESIGN.md:5` says every number is a starting point and everything marked with the scales icon will move. That only works if the moves are driven by data. Instrumentation is a feature, scheduled in M0, not a nice-to-have added at M4.

### What we log, per duel, in dev

One NDJSON record per duel, written on completion:

```jsonc
{
  "duelId":"d-0412", "simVersion":3, "daySeed":"cbw-2026-09-30", "duelSeed":918273645,
  "mode":"bot|async|live", "botTier":"green|light|medium|dark|null",
  "a":{"class":"arabica","machine":"espresso","stance":"brew","roast":"light"},
  "b":{"class":"robusta","machine":"moka","stance":"ridge","roast":"green"},
  "turns":[
    {"i":0,"p":"a","angle":6200,"power":7800,"ammo":"green","steam":-4,
     "spreadRoll":0.31,"wild":false,"misfire":false,
     "impact":{"x":12.44,"y":3.10},"distToTarget":2.9,"damage":0,
     "call":"Wide.","fogRevealedPct":0.06,"cupAfter":{"a":90,"b":120},
     "aimTimeMs":4210,"retargets":3}
  ],
  "shotsToKO":6, "firstHitTurn":3, "ammoUsed":{"green":4,"dark":1,"cup":1},
  "steamMin":-9,"steamMax":8,"suddenDeath":false,
  "result":"a","rpDelta":{"a":10,"b":-5},"durationMs":168000
}
```

`aimTimeMs` and `retargets` (how many times the drag was released and restarted before firing) are the confusion signals, and they matter as much as the balance numbers.

### The aggregations Smith actually tunes from

| ID | Report | Bar |
|---|---|---|
| BI-01 | Shots-to-KO histogram per bot tier | Green median <= 4; Dark median >= 7 |
| BI-02 | Stance matchup win-rate grid, all 9 cells, at equal skill | No cell outside 40-60% with n >= 30 per cell |
| BI-03 | Class win-rate table | No class outside 45-55% with n >= 50 |
| BI-04 | Machine win-rate and pick-rate table | No machine below 15% pick rate (a machine nobody picks is dead content) |
| BI-05 | Ammo usage: count fired per type per duel, and win rate when Full cup is used vs not | Full cup used in >= 60% of duels that reach turn 5 (if not, it is invisible) |
| BI-06 | Steam extremes: turns where abs(steam) >= 8, and hit rate on those turns vs baseline | Hit rate on extreme-steam turns is not below 50% of baseline (steam is a spice, not a coin flip) |
| BI-07 | First-hit-turn distribution | Median first hit is turn 2 or 3, which is the walking-in fantasy from `GAME-DESIGN.md:47` |
| BI-08 | Actual vs theoretical proc rates: Liberica wild 10%, French press misfire 1/6 | Within 2 points over n >= 1000 |
| BI-09 | Duel length in turns | Median 5-9 turns; p95 under the sudden-death bound |
| BI-10 | Fog reveal percentage at first hit | Median 15-40%: below means fog is decorative, above means fog is a chore |
| BI-11 | Aim time and retargets on turn 1 vs turn 5 | Turn 1 median under 12s; a much higher number means the gesture is not landing |
| BI-12 | Abandonment: async duels that go cold as a share of async duels started | Under 25%; anything higher means the inbox loop is not hooking |

### How it is stored, and the guard rails

- Dev only, behind `VITE_TELEMETRY=1`. **Off in the production bundle by default**, for privacy (no login means no consent surface) and for the Supabase free-tier budget.
- Local ring buffer in `localStorage` (last 200 duels) plus an optional `duel_telemetry` table when the flag is on.
- **Never log the raw player name in telemetry.** Log the player id. Names are user input and telemetry is a place user input goes to get read by a script later.
- Export command produces NDJSON; the aggregations are a single script in `scripts/balance-report.ts` that prints the BI-01 to BI-12 table. If the report is not one command, nobody will run it, and the knobs get tuned on vibes.

---

## 7. Performance gates

Sources: `ART-DIRECTION.md:625` (60fps on Pixel 6a class, 30fps hard floor) and the budget table at `ART-DIRECTION.md:627-648`. Emmett owns the measurement instrumentation; I own the gate.

### The dev overlay (build it in M0, keep it behind `?perf=1`)

Must show, live: frame time p50 / p95 / p99 over a rolling 300-frame window, a frame-time histogram, `renderer.info.render.calls`, `.triangles`, `renderer.info.memory.geometries` and `.textures`, active particle and steam-sprite counts, current `devicePixelRatio` and whether the degradation ladder has fired, and `performance.memory.usedJSHeapSize` where available.

### The numbers that fail a build

| ID | Metric | Measured how | PASS | FAIL (blocks) |
|---|---|---|---|---|
| PF-01 | Duel frame time, low-end reference | Overlay, 60s of active duel | p50 <= 16.7ms and p99 <= 33.3ms | p50 > 33.3ms, or p99 > 50ms, or any single frame > 100ms |
| PF-02 | World frame time, low-end reference | Overlay, 60s panning the map | same as PF-01 | same as PF-01 |
| PF-03 | Draw calls | `renderer.info.render.calls` peak | World <= 40, duel <= 30 | 41 / 31 |
| PF-04 | Visible triangles | `renderer.info.render.triangles` peak | World <= 120k, duel <= 60k | any excess |
| PF-05 | First playable transfer | Built bundle, gzipped, everything needed before the first duel can start | <= 1.5MB | 1.51MB |
| PF-06 | Total audio transfer | Sum of shipped audio | <= 3MB | 3.01MB |
| PF-07 | **Resource leak** | `renderer.info.memory` after world to duel to world x10 | geometries and textures back to baseline +/-2 | any monotonic growth |
| PF-08 | **Heap leak** | `usedJSHeapSize` after 10 consecutive duels | growth < 5MB per duel | >= 5MB per duel, or a crash |
| PF-09 | Steam sprites | Overlay counter | <= 40 world, <= 80 duel sudden death, <= 20 under reduced motion | any excess |
| PF-10 | Particles alive | Overlay counter | <= 24 per event, <= 96 total | any excess |
| PF-11 | Degradation ladder | Force 20ms+ frames for 60 frames | DPR drops to 1.0, then particles, sprites, shadows, fog in that order. **The steam layer is never cut** (`ART-DIRECTION.md:650`) | steam cut, or the ladder never fires |
| PF-12 | Shell LCP | Lighthouse mobile, simulated throttling, on the landing route with canvas boot deferred | <= 2.5s | > 4s |
| PF-13 | Shell CLS | Lighthouse mobile | <= 0.05 | > 0.1 |
| PF-14 | TTFB | Lighthouse mobile | <= 800ms | > 1.8s |
| PF-15 | Time to interactive landing receipt | Manual stopwatch on the low-end device, cold cache, 4G | <= 3s | > 5s |
| PF-16 | Shot resolution wall clock | Overlay timer | <= 2.5s (`GAME-DESIGN.md:23`) | > 3s |
| PF-17 | Share card generation | Timer around `toBlob` | <= 2s | > 4s |

**Deliberate call on Lighthouse:** I gate the **shell**, not the Lighthouse Performance score. A WebGL game legitimately tanks TBT and TTI, and gating a composite score would either be always-red (and therefore ignored) or force us to game it. What actually matters to a judge is: the landing receipt paints fast, does not shift, and the canvas boots behind it. So PF-12 to PF-14 are the Lighthouse gates and the score itself is recorded but not gated. Bytes (PF-05, PF-06) are gated hard, in CI, because bytes are the thing that silently creeps.

**Baseline discipline.** `qa/perf-baseline.md` records the numbers per milestone. A change that keeps a metric inside PASS but moves it more than 20% in the wrong direction is flagged, investigated and either explained or reverted. Absolute thresholds catch cliffs; baselines catch drift, and drift is what actually kills a jam game two days before the deadline.

---

## 8. Playtest protocol

Three rounds. Each has a bar. Failing a bar is a design finding, not a QA failure, and it goes back to Smith and Allison.

### The script (identical in all three rounds)

1. Hand over an unlocked device with the link already open on the landing screen. Say exactly: **"Here's a game. Play it."** Nothing else.
2. Start a stopwatch. **Say nothing for the first 3 minutes**, no matter what happens. Do not answer questions; write them down verbatim, because an unprompted question is the highest-value signal in the room.
3. Note timestamps for: name entered, `ENTER THE WAR` tapped, first drag started, first shot fired, first hit landed, first duel finished, second duel started (unprompted or not).
4. Note every retarget (drag started and abandoned) on turn 1.
5. After 3 minutes, or after the first duel ends, you may answer questions. Keep observing.
6. Stop at 10 minutes or when they stop voluntarily. **Record whether they stopped voluntarily** and at what point.

### What we watch

| Signal | How it is measured | Bar |
|---|---|---|
| Time to first duel | Landing to first shot fired | Median <= 30s (`GAME-DESIGN.md:17`) |
| First-shot confusion | Retargets on turn 1, plus whether they tried to tap-to-aim before dragging | <= 2 retargets for the median player |
| Spotter comprehension | Exit question 2, unprompted | >= 60% describe it as "seeing the other guy" without being told |
| Call comprehension | Exit question 3 | >= 70% correctly read `Wide.` as "short" |
| "One more go" rate | Tapped `ONE MORE GO` without being prompted | >= 50% |
| Session length | Total voluntary play | Median >= 6 minutes |
| Rage points | Every audible frustration, with a timestamp | Zero repeated across 2+ testers |

### Round 1: M0, internal (Diego + Smith + 1)

Bars: the duel is completable, zero soft-locks, the Green bot loses in <= 4 shots to Diego on his first try, the drag gesture works on the first attempt on a phone. Output: the balance-knob shortlist and any gesture rework. This is the round that decides whether the Spotter is a great idea or an infuriating one, and it happens before a single line of world code.

### Round 2: M1, 3 strangers (not in the Skool, not told what to expect)

Bars: all seven signals above hit their bar for at least 2 of 3 testers. Every tester finds the world map understandable without help. No tester asks "what am I supposed to do" after the first 30 seconds. Output: onboarding hint copy locked (the 3 tags at `ART-DIRECTION.md:452`), microcopy fixes, first-time-hint placement.

### Round 3: M2, 5 Skool members (async, on their own devices, over 48 hours)

This one is not observed, it is instrumented, because async is a multi-day loop and you cannot watch it. Bars: at least 4 of 5 return for a second session unprompted; at least 3 async duels complete end to end; abandonment (BI-12) under 25%; zero reports of a stuck turn, wrong replay or wrong result. Ship a 6-question form after 48 hours.

### Exit questions (ask verbatim, in this order, do not lead)

1. What was the game asking you to do?
2. There's a small round window in the corner. What is it showing you?
3. It said `Wide.` after one of your shots. What did that mean?
4. What made your shot miss?
5. Right now, would you play one more? Yes or no.
6. What was the one thing that annoyed you most?
7. Have you played anything like this before? *(the Most Creative probe from `BRIEF.md:14`)*

Question 5 is the One More Go metric and it is asked before question 6, deliberately, so the annoyance does not colour the answer.

---

## 9. Security checklist for a no-login public game

"No login" (`BRIEF.md:41`) does not mean "no authorisation". It means the authorisation must be invisible. Category by category.

### The one architectural change I am asking for

**SEC-01 (HIGH, design-phase). Use Supabase Anonymous Auth, not a raw device UUID with permissive RLS.**

A device key in `localStorage` (`GAME-DESIGN.md:195`) is a bearer credential the database cannot verify. If RLS policies read a `player_id` out of the request body or a header, then `using (true)` is doing the work and any visitor can write any row: submit turns as anyone, edit any name, forge the leaderboard. `supabase.auth.signInAnonymously()` gives a real JWT and a real `auth.uid()`, persists in `localStorage` exactly like the device key, requires zero user interaction, and makes every policy expressible as `auth.uid() = players.auth_uid`. It preserves "no login" completely, and it is the difference between RLS that is real and RLS that is decoration. **Emmett: if you disagree, name the alternative that gives the database a verifiable identity, because otherwise §9 collapses.**

### Checklist

| ID | Category | Verdict and required fix |
|---|---|---|
| SEC-02 | **Anon key in the bundle** | Fine, by design. The `anon` key is a public key. What is *not* fine is the `service_role` key ever reaching the client. CI greps the built bundle for `service_role`, `SUPABASE_SERVICE`, `sk_`, `eyJ...role":"service_role` and fails the build on a hit |
| SEC-03 | **RLS coverage** | Every table has RLS enabled with an explicit policy per operation. No table is reachable with `using (true)` on write. Test: with a second anon session, attempt update and delete on another player's profile, another duel's turns, and the leaderboard view. All must fail. `authenticated` is not the same as `anon`; test the role the game actually uses (`feedback_supabase_rls_and_postgrest_gotchas`) |
| SEC-04 | **Authorisation on turns** | Enforced in a Postgres trigger or an RPC, not in the client: participant check, `whose_turn` check, sequential index check, ammo-budget check against turns already stored, loadout frozen on the duel row. The client cannot be the guard because the client is the attacker |
| SEC-05 | **Forged turn: detect vs accept** | **Detect and reject:** non-participant, wrong turn, non-sequential index, angle outside 0-18000 hundredths, power outside 0-10000, unknown ammo, ammo over budget, mismatched loadout, any client-supplied `damage`, `result`, `winner` or `rp` field (the schema simply has no such client-writable columns). **Accept for v1:** aim quality (aimbot), self-fog lying. Documented in the README as a known limit. Rejections write to `rejected_turns` |
| SEC-06 | **Leaderboard integrity** | RP is computed by a Postgres function on duel completion and written by a trigger. `players.rp` is not client-writable, full stop. A forged leaderboard is the one failure that is publicly embarrassing in a Skool post, so this is the highest-value server-side check in the whole game |
| SEC-07 | **XSS via CSS2D labels, CRITICAL, the top risk in this build** | `CSS2DObject` takes a real DOM element. If a bean label is built with `innerHTML` from a player name, one player named `<img src=x onerror=...>` runs script in every other player's browser, permanently, on the world map. **Required: `textContent` only, everywhere a name is rendered** (map label at `ART-DIRECTION.md:428`, challenge card `:434`, inbox row `:440`, leaderboard `:438`, result receipt `:437`, duel turn strip). Zero `innerHTML`, zero `insertAdjacentHTML`, zero template-string DOM building with user data. Enforced by lint (`no-inner-html` / `react/no-danger` equivalent) and a Playwright test that creates a player named with a live payload and asserts nothing executes on any of those six surfaces |
| SEC-08 | **Name validation** | Server-side `CHECK` plus client-side. NFKC normalise, then match `^[\p{L}\p{N} '._-]{3,14}$` with the `u` flag. Length counted in **code points**, not UTF-16 units (an emoji is 2 units and would slip a 14-unit check). Strip zero-width (`U+200B-200D`, `U+FEFF`), bidi overrides (`U+202A-202E`, `U+2066-2069`), combining-mark stacks (Zalgo, which breaks the CSS2D layout as well as looking broken), and collapse whitespace. Reject names that normalise to an existing name (homoglyph impersonation) |
| SEC-09 | **CSS injection via accent colour** | Accent, origin, class, face, machine, roast are **integer indices into fixed tables**, never free strings, and never interpolated into `style` or a CSS custom property. A free-string accent would allow `red; background: url(...)` style injection and a data-exfiltration vector via CSS. Test: post an accent value of `0; --paper: url(https://evil/)` and assert the row is rejected by a `CHECK` constraint |
| SEC-10 | **Share card canvas taint** | `canvas.toBlob` / `toDataURL` throw a `SecurityError` if any cross-origin image or font was drawn without CORS. Google Fonts loaded via CSS are fine for text, but any image asset must be same-origin or served with `crossOrigin="anonymous"` and correct CORS headers. Test on real iOS Safari, which is the strictest. Also: the name drawn on the card must be measured and truncated with an ellipsis, so a 14-character wide name cannot break the layout of the artifact we are posting publicly |
| SEC-11 | **Profanity and impersonation** | Filter runs **server-side** (a trigger or an Edge Function), because a client-side list ships in the bundle and is bypassable by a `curl`. Match after normalising leetspeak and homoglyphs. Plus a `hidden boolean` column Diego can flip manually, which is the realistic mitigation for a two-week jam: any filter will miss things, so the escape hatch matters more than the list. Names are also the only free-text surface in the game, and keeping it that way is the security design |
| SEC-12 | **Rate limits** | Per `auth.uid()`, enforced in Postgres against a counter table: 1 profile per uid, 5 name changes per day, 20 duels created per hour, 60 turns per hour, 10 walks per minute. Rationale is not abuse alone; it is the Supabase free tier, which a runaway loop can exhaust before judging day |
| SEC-13 | **IDOR on ids** | Duel and player ids are UUIDs, not sequential integers. Reading another player's public profile is fine (it is a public game); reading or writing their turns before they are played is not, and is blocked by RLS |
| SEC-14 | **PII** | None collected: no email, no auth provider, no IP stored, no analytics with a user identifier. The display name is user-chosen and public by design. Say this plainly in the README, because "no login" plus a public leaderboard invites the question |
| SEC-15 | **Secrets in the repo** | `.env` is gitignored, `.env.example` has placeholders only, CI greps the build output and the git history. No service key, no Higgsfield key, no OpenAI key ever reaches the repo. The global pre-commit hook covers the local case; the CI grep covers the case where somebody bypasses it |
| SEC-16 | **Dependencies** | Small tree by design (Vite, TypeScript, Three.js, supabase-js). `npm audit --audit-level=high` in CI. Pin Three.js exactly: a minor Three.js bump can change render defaults and quietly blow the draw-call budget |
| SEC-17 | **CSP** | Ship a real Content-Security-Policy header from Vercel: `default-src 'self'`, `connect-src 'self' https://<project>.supabase.co wss://<project>.supabase.co`, `img-src 'self' data: blob:`, `style-src 'self' 'unsafe-inline'` (Three.js CSS2D writes inline styles), `script-src 'self'`, `object-src 'none'`, `base-uri 'none'`. This is the belt to SEC-07's braces, and it is 10 minutes of work |
| SEC-18 | **localStorage integrity** | Everything in `localStorage` is attacker-controlled in the attacker's own browser, so nothing security-relevant is read from it. Corrupt, truncated or hostile JSON in any key must be caught and reset to defaults, never thrown. Test: set every key to `{`, `null`, a 1MB string, and a deeply nested object, then reload. The game must start |
| SEC-19 | **`postMessage` and iframes** | The game does not listen for `postMessage` and is not designed to be embedded. `frame-ancestors 'none'` in the CSP |

### Defensive patterns to use

- Validate at the database boundary with `CHECK` constraints and triggers, not only in TypeScript. TypeScript types are erased at runtime and the network is not typed.
- One RPC per state transition (`create_duel_with_first_turn`, `submit_turn`), each in a single transaction, each returning the new authoritative state. Not a set of table writes the client orchestrates.
- Unique constraints as the concurrency control (`(duel_id, turn_index)`). Let the database be the referee; do not write a client-side lock.
- Fail closed: an unknown enum value, an unparseable row, a missing field is a rejection, never a default that keeps going.
- `textContent` for every string that originated from a user, on every surface, without exception.
- Frozen loadouts on the duel row, so stored replays can never be invalidated by a later profile edit.

### Anti-patterns to avoid

- Do not write RLS as `using (true)` with a "we check it in the client" comment. That is the whole vulnerability, written down.
- Do not accept a `damage`, `winner` or `rp` field from the client. The columns should not exist as client-writable.
- Do not build any DOM with `innerHTML` and a template literal containing a name. Not once, not "just for the debug label".
- Do not put the profanity list in the client bundle and call it filtered.
- Do not use `Math.random()` anywhere in `src/sim/`.
- Do not derive the daily seed from the device clock.
- Do not regenerate a golden fixture to make a test pass.
- Do not let a retry loop run unbounded against a free-tier backend.
- Do not ship the telemetry writer enabled by default.
- Do not gate the first duel on any network response.

---

## 10. Submission-day checklist

Run this end to end, on the day, in order. Every line is verified by doing it, not by remembering that it worked.

| ID | Check |
|---|---|
| SD-01 | **Supabase project is not paused.** Free-tier projects pause after 7 days of inactivity. If the build finishes on the 20th and judging is the 30th, the backend can be asleep when the first judge arrives. Verify it is awake, and have a daily keep-alive (a Vercel Cron hitting a trivial endpoint) running since at least a week before. This is the single most likely cause of "it doesn't run" on judging day |
| SD-02 | The **production** URL works (not a preview URL, which can be superseded or deleted). Custom domain or the stable `.vercel.app` production alias |
| SD-03 | Open the link on a phone, in a **private window**, logged out, cold cache, on cellular data (not the home wifi), and complete a full duel |
| SD-04 | Repeat SD-03 on iOS Safari and on Android Chrome, both |
| SD-05 | Repeat SD-03 on desktop Chrome, Safari and Firefox |
| SD-06 | Hard refresh with cache disabled: no stale-asset 404, no service-worker serving a dead build |
| SD-07 | The world shows 12 bots with the backend deliberately unreachable (block the Supabase domain in DevTools) and a bot duel completes |
| SD-08 | Console is clean: zero errors, zero unhandled rejections, across a full duel on every SD-04 and SD-05 device |
| SD-09 | Repo is **public** on GitHub under `diegobdesign` |
| SD-10 | Clean clone into an empty directory: `npm ci && npm run build` succeeds on a machine with no `.env`. If env vars are required, the build fails with a readable message naming the missing variable, and the README says where to get it |
| SD-11 | `npm run dev` from that clean clone reaches a playable bot duel with no backend configured |
| SD-12 | `grep -rE "service_role|SUPABASE_SERVICE|sk_[A-Za-z0-9]" dist/ .` returns nothing, and the git history is clean of secrets |
| SD-13 | README has: one-paragraph what-it-is, a play link, how to run locally, the controls, the known limits (SEC-05 accepted risks), and credits for generated assets |
| SD-14 | LICENSE file present |
| SD-15 | The determinism route `/#determinism` returns PASS on the phone we hand around |
| SD-16 | Share card generates and downloads on iOS Safari (SEC-10) |
| SD-17 | Leaderboard has real entries and no test or profane names |
| SD-18 | A test player created two days earlier still exists, still has RP, and their duel is still playable |
| SD-19 | Sound off, reduced motion on: the game is still fully understandable (M4-03, M4-04) |
| SD-20 | Tag the submitted commit (`submission-v1`) so a later push cannot change what was judged |

### The 60s Loom plan (beat sheet)

| Time | Beat |
|---|---|
| 0-5s | Landing receipt. Diego types a name, taps a bean, taps `ENTER THE WAR`. No talking over it; let the stamp land |
| 5-13s | The world reveals. One slow pan. Diego says one line: what the map is and that everyone on it is real or a bot, and all of them are fair game |
| 13-20s | Tap a bean, the challenge card prints, `CHALLENGE` |
| 20-32s | The duel. The fogged half and the Spotter get named in one sentence. First shot: drag, release, arc, miss, `Wide.`, fog thins around the crater |
| 32-42s | Second shot: `Close.` Third: the hit, the cup drains, the KO fog lift, `Ground.` |
| 42-50s | Result receipt prints. `ONE MORE GO` |
| 50-60s | Cut to the inbox: `3 BEANS ARE SHOOTING AT YOU`, one Pour replay, one shot, done. Last line: it is async, so nobody has to be online. End on the world map |

Record it in one take on a phone if possible, since a judge watching a phone recording of a phone game is the honest demo. Record at least two takes. Verify audio is audible and that no personal notifications appear on screen.

### The Skool post contents

1. Title with the game name and the one-line hook.
2. The share card image as the lead visual (it is 1080x1080 and it is built for exactly this, `ART-DIRECTION.md:442`).
3. The live link, first, above the fold, unshortened.
4. The 60s Loom, embedded.
5. Three lines on what is original: the persistent shared world as the menu, terrain as the aim problem, and the Spotter (you never see your opponent).
6. One line that it is async, so you can shoot at anyone and they will find your shot waiting.
7. The GitHub link.
8. An explicit invitation with a name to shoot at, so the first reader has something to do, which is what turns the post into the multiplayer.
9. First Timer eligibility stated plainly (`BRIEF.md:16`).

---

## 11. Phase 5 execution plan

### Repo layout

```
src/
  sim/            pure sim, no DOM, no three, no net  (the determinism boundary)
  render/         three.js scenes, cameras, materials
  ui/             HTML overlays, HUD, receipts
  net/            supabase client, RPCs, realtime
  bots/           bot policy (imports sim, never render)
tests/
  unit/           vitest: sim, prng, ballistics, damage, fog, calls, seed, validation
  golden/         *.json fixtures + generate.ts + the drift guard
  e2e/            playwright specs
  e2e/fixtures/   seeded db state, hostile payloads
qa/
  test-matrix-m0.md ... test-matrix-m4.md
  perf-baseline.md
  visual-baselines/
scripts/
  balance-report.ts
supabase/
  migrations/     schema + RLS + triggers
  tests/          pgTAP or plain SQL assertions for RLS and turn validation
```

### Automated: Vitest (fast, every commit)

| Suite | Covers |
|---|---|
| `unit/sim` | Ballistics, damage, splash falloff, stance modifiers, sudden death, tie resolution, cup floor at 0 |
| `unit/prng` | Stream independence, reproducibility, distribution of wild shot and misfire (BT/BI proc rates) |
| `unit/fog` | Reveal radius, overlap, persistence, 6-pellet staggering |
| `unit/spotter` | Close/Wide/Long thresholds including the Arabica +/-3 and Aeropress +/-4 variants |
| `unit/validation` | Name normalisation and rejection set (SEC-08), enum bounds (SEC-09), localStorage corruption (SEC-18) |
| `unit/seed` | Daily seed derivation, Dublin DST boundary, timezone independence |
| `golden` | All 40 fixtures, bit-exact (DT-01), plus the drift guard that fails if a fixture changed without a `simVersion` bump |
| `bots` | BT-01, BT-04 to BT-14 as statistical tests over seeded batches |

### Automated: Playwright (on a preview URL, per PR)

Specs in `tests/e2e/`:

| Spec | Covers |
|---|---|
| `smoke.spec.ts` | The COLD-START GATE: land, name, enter, challenge, fire, complete a duel, zero console errors. Runs on chromium, firefox, webkit, and at 375x667, 390x844 landscape, 1440x900 |
| `determinism.spec.ts` | DT-02 to DT-04: runs the sim bundle in-page in all three engines and compares to the committed goldens |
| `xss.spec.ts` | SEC-07: creates players with live payloads and asserts no execution on all six name surfaces, plus a `page.on('dialog')` trap |
| `rls.spec.ts` | SEC-03 to SEC-06: raw `fetch` from a second anon session attempting every forbidden write; asserts rejection and audit rows |
| `async.spec.ts` | NC-02, NC-03, NC-04, NC-10, NC-11 with two browser contexts against a seeded preview database |
| `offline.spec.ts` | NC-05, NC-13, C1, C3 via route interception (abort the Supabase domain) |
| `inbox.spec.ts` | NC-08 at 0, 1, 50, 200 duels; render-time and scroll assertions |
| `a11y.spec.ts` | axe-core on landing, world, duel HUD, result, inbox, leaderboard; keyboard-only completion of a full duel; focus order; contrast on the paper chips (`ART-DIRECTION.md:207`) |
| `budget.spec.ts` | PF-03, PF-04, PF-07, PF-09, PF-10 by reading the perf overlay via `page.evaluate` on a scripted duel |
| `visual.spec.ts` | Screenshot baselines with animations disabled, at three viewports, for landing, world, duel, result |

### Manual only (and honest about why)

| Area | Why it cannot be automated here |
|---|---|
| iOS Safari, all of it | Playwright WebKit on Linux is not iOS Safari (§2). Real device, per release, plus a mandatory pass on the mid-September iOS |
| Real-device frame time and the 30fps floor | Emulated throttling is a proxy; the gate is defined on real hardware (`ART-DIRECTION.md:625`) |
| Game feel: the arc, the hit, the KO, the Pour | The whole point of pillar 2 (`BRIEF.md:51`) and not machine-checkable |
| Sound, and sound-off comprehension | M4-01 to M4-03 |
| Reduced-motion *feel* (the automated check only proves the flag is honoured) | M4-04 |
| The three playtest rounds | §8 |
| Share card on a real iOS device | SEC-10; canvas taint and the iOS download path both differ from desktop |
| Submission-day checklist | §10, by definition |

### CI shape (GitHub Actions)

**Workflow `ci.yml`, on `pull_request` and on push to any branch:**

| Job | Steps | Fails the build when |
|---|---|---|
| `check` | `npm ci`, `npx tsc --noEmit`, `npx eslint .` (with the `no-innerHTML` rule and the `src/sim` import-boundary rule), `npm audit --audit-level=high` | Any type error, any lint error, any high CVE |
| `test` | `npx vitest run --coverage` including the golden suite and the golden-drift guard | Any failing test, or a golden changed without a `simVersion` bump |
| `budget` | `npm run build`, then a script asserting gzipped first-playable <= 1.5MB and audio <= 3MB, then the secret grep over `dist/` | PF-05, PF-06 or SEC-02, SEC-15 breached |
| `sql` | `supabase db reset` against a service container, then the RLS and turn-validation assertions in `supabase/tests/` | Any policy or trigger assertion fails |

**Workflow `e2e.yml`, on `deployment_status` (so it runs against the real Vercel preview, not localhost):**

| Job | Steps | Fails when |
|---|---|---|
| `e2e` | Playwright on chromium + firefox + webkit, running `smoke`, `determinism`, `xss`, `rls`, `async`, `offline`, `inbox`, `a11y` | Any spec fails. `smoke` and `determinism` and `xss` are required checks; the rest are required from M2 onward |
| `perf` | Lighthouse mobile on the preview, asserting PF-12 to PF-14; upload the JSON as an artifact | LCP > 4s, CLS > 0.1, TTFB > 1.8s |
| `visual` | Screenshot diff against `qa/visual-baselines/` with `pixelmatch` at 0.1 | A diff on a PR that did not intend a visual change (advisory until M4, required at M4) |

**Branch discipline.** Feature branches, PRs, no direct push to `main`, `npx tsc --noEmit` green before commit. This is a personal project, not a client one, so the dev-protocol lane classification is not mandatory (`BRIEF.md:96`), but the branch, tsc and PR habits cost nothing and the pre-commit hook enforces them anyway.

**The required-checks set, stated plainly:** a PR merges only if `check`, `test`, `budget`, `sql` and the `smoke` + `determinism` + `xss` e2e specs are green. Everything else is advisory until its milestone lands.

---

## 12. Go / no-go

I own the call. It is one line per milestone and one line for submission.

| Gate | Condition |
|---|---|
| **M0 go** | COLD-START GATE passes on D-01, D-04, D-05. All M0 MUST lines pass. DT-01 to DT-04, DT-07, DT-08 pass. PF-01, PF-03, PF-04 pass on the low-end reference |
| **M1 go** | M0 still passes. All M1 lines pass. PF-02, PF-07, PF-08 pass. Playtest round 2 meets its bars |
| **M2 go** | M1 still passes. All M2 lines pass. Every §4 case has its tested outcome. SEC-01, SEC-03 to SEC-08, SEC-11, SEC-12 verified. Playtest round 3 meets its bars |
| **M3 go** | M2 still passes with M3 flagged off. All M3 lines pass. If M3 is not solid by the freeze date, it ships **off**, and that is not a failure |
| **M4 go** | All M4 lines pass. PF-05, PF-06, PF-11 to PF-14 pass. axe-core: zero critical, zero serious |
| **SUBMIT** | All 20 SD lines pass, on the day, done by hand, on real devices. SD-01 is checked first and re-checked last |

**Standing veto:** if the COLD-START GATE fails on any MUST device at any point, work stops and that is the only thing being worked on. `BRIEF.md:12` is not a preference.

---

*v0.1, 2026-09-05. Written against `BRIEF.md`, `GAME-DESIGN.md` v0.1 and `ART-DIRECTION.md` §8 to §13. Open dependencies on Emmett's `ARCHITECTURE.md`: the sim numeric policy (§3.1 DT-R2, fixed-point vs restricted float64), the identity model (§9 SEC-01, anonymous auth vs raw device key), and the turn-submission RPC shape (§4, §9 SEC-04). Open dependency on Allison's `UX.md`: the aim gesture safe zone in portrait (§2 MB-02) and the keyboard path (M0-03).*
