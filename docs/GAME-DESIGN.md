# Coffee Beans War — Game Design

**Seat:** Smith (game design + producer) · **Status:** v0.1, design phase · **Companion:** `BRIEF.md`, `ART-DIRECTION.md`

Numbers here are starting points for the M0 playtest, not truths. Anything marked ⚖️ is a balance knob we expect to move.

---

## 1. Core loop

```
land → name + bean (10s) → WORLD (see everyone) → challenge → DUEL (2–4 min) → result → rank tick → WORLD
                                       ▲                                                          │
                                       └──────────────── "one more go" is one tap ────────────────┘
```

Session target: a judge should get their first duel inside 30 seconds of landing and their second inside 10 seconds of the first ending.

---

## 2. The duel (M0 is exactly this, vs a bot)

**Format.** 1v1, turn-based. Each turn: pick ammo (optional, default stays), set angle + power, fire. Shot resolves (≤2.5s), then the other bean's turn. First to bring the opponent's cup to empty wins.

**Health.** Each bean has a **cup** (HP). Cup capacity 100. Damage drains it. Visual: the cup empties.

**Input.** One gesture: **drag from your bean to aim, release to fire.** Drag direction = angle, drag length = power (clamped). A thin dotted preview arc shows the first 30% of the trajectory only (skill stays in the player, not the UI). Keyboard: arrows for angle/power, space to fire. Touch and mouse are the same gesture.

**Turn timer.** None in async (the default). 20s in live duels (M3). Bot "thinks" 1.2–2.0s for feel.

**Shot resolution.** Fixed-timestep ballistic sim (see ARCHITECTURE for determinism): gravity, initial velocity from power, ammo mass, **steam** (horizontal wind) applied as constant acceleration. Projectile vs terrain collision → impact. Projectile vs bean → damage. Off-screen → miss.

**Damage.** Direct hit = ammo base damage. Splash ammo = base × falloff over radius. Terrain hit near a bean within splash radius = partial.

**Sudden death ⚖️.** After 8 rounds each, steam doubles and both cups take 5 per turn. Duels end.

---

## 2b. The Spotter (hidden opponent, Diego 2026-09-05)

**Rule:** in a duel you never see the opponent on the main stage. Their side of the stage shows the terrain silhouette (so you know Ridge / Belt / Brew and roughly the height band) but the bean and machine are hidden inside the steam. You learn where they are from three sources only:

1. **The Spotter.** A small round window in the top corner, framed as the bottom of a coffee cup (reading the grounds). It shows a tight, live crop of the opponent: their bean, their machine, and about ±2 units of their immediate surroundings (the rock lip, the canopy, the stilts). What it does NOT show is range: the crop is tight, the background is fogged, and there is no scale cue. You know what they look like and how they're standing, not how far away they are.
2. **Your impacts.** Every shot you land leaves a permanent marker on the main stage (dust ring, splash ring, leaf burst). Fog thins in a 1.5-unit radius around each marker for the rest of the duel, so the opponent's side reveals itself one miss at a time. This is the walking-in loop.
3. **The Spotter's reaction.** After your shot, if it landed inside the Spotter's crop you see it land there, relative to the bean: a bean flinch and `Close.` If it landed outside the crop: `Short.` (fell before them) or `Long.` (flew past them). That is the hot/cold signal, given in the game's own voice.

**Why it works:** the stance still sets the angle problem, the steam still sets the luck, and now range is the skill you earn across turns. First shot is an educated guess; third shot should be a kill for a good player. A hit does not reveal the bean either; a KO does (the Ground. animation plays in the open).

**Machine + class interactions ⚖️**
- **Aeropress sniper** (Medium roast unlock) widens the Spotter crop to ±4 units: it has a scope.
- **Arabica** gets `Close.` calls at ±3 units instead of ±2 (sharper senses). Robusta gets nothing; it has 120 cup instead. Liberica's wild shot ignores fog: if it hits, it hits.
- **Ground coffee** (spread) is the "search" shot: 6 pellets = 6 markers, thins fog fastest. That's its job now, not just anti-canopy.
- **Full cup** splash also thins fog in its 2-unit radius on top of damage.

**Symmetry:** the opponent sees the same about you. Bots use the identical information (their aim noise is now noise around an *estimate* that improves per turn, GAME-DESIGN §10), so the bot's walking-in is honest.

**First-timer safety ⚖️:** the Green bot stands in the centre of its stance band and the first `Close.` radius vs a Green bot is ±3 units, so the first duel stays winnable in ≤4 shots.

**Async:** The Pour replay (§9) shows the opponent's shot arriving at YOUR side in full, and shows their impact marker on your side. It never shows their Spotter view of you. Fog is derived: a pure fold over the stored impact list (ARCHITECTURE.md §3.6); nothing else is persisted.

**HUD additions (Allison / Lola):** the Spotter window, the fog layer on the opponent's half, impact markers with fog-thinning, the `Close.` / `Short.` / `Long.` calls (paper chip under the Spotter, one turn), and a stance label on the fogged side (`BREW 0`, since the stance is known).

---

## 3. Stances (terrain = the aim problem)

Each bean stands on ONE of three stances per duel, decided by where they are on the world map. The two stances define the stage.

| Stance | Where | Height | Cover | Aim problem | Steam exposure |
|---|---|---|---|---|---|
| **Mountain** | high ground, rocky | +3 units | 40% (rock lip) | opponent must lob high; you fire flat and far | low (above the steam) |
| **Tree** | mid, in the canopy | +1.5 units | 25% (leaves absorb splash) | mid arc; canopy blocks low shots | medium |
| **Flood** | lowland, water | 0 | 0% but **misses splash harmlessly**, near-misses do half | flat shot, but steam is thickest here | high |

Height difference drives everything: high vs low is the hardest matchup for the low bean, so **flood gets +10% damage** ⚖️ as compensation and the thickest steam is a shared problem (it moves both shots).

Stage layouts: 9 combinations (3×3), each a fixed silhouette so players learn them. Mirror for left/right.

---

## 4. Steam (the wind)

- Value per turn: −10..+10 (negative = blows left). Changes every turn by a random walk (±0..3), seeded.
- **Always visible before you fire**: steam drifts across the stage as a particle layer; strength shown as a small gauge with an arrow. Flood stages show it strongest visually.
- Effect: constant horizontal acceleration `a = steam × k` ⚖️ (k tuned so ±10 moves a mid shot about one bean-width at landing).
- Daily seed fixes the steam sequence for everyone that day → comparable duels, shareable "today's steam was brutal".

---

## 5. Classes (variety)

All classes can use all machines and ammo. Class changes the **bean**, not the loadout.

| Class | Cup | Shot spread | Movement | Fantasy |
|---|---|---|---|---|
| **Arabica** | 90 | ±0° (dead accurate) | can shuffle 1 step/turn ⚖️ | the marksman |
| **Robusta** | 120 | ±2° | none | the tank |
| **Liberica** | 100 | ±4°, but **10% chance of a "wild shot"**: double damage | none | the gambler |

Spread is applied to the release angle (seeded). The class choice is the profile choice; it's the first decision on landing.

---

## 6. Machines (the coffee kit)

Machines set the **shot profile**. Chosen once per duel at start (default from class; swappable on the challenge card).

| Machine | Default for | Power range | Arc | Special | Feel |
|---|---|---|---|---|---|
| **Moka pot mortar** | Robusta | low–mid | high lob | splash ×1.25 | thump |
| **French press cannon** | Liberica | mid–high | medium | plunger charge: hold to add power, over-hold = misfire (1 in 6) ⚖️ | thunk-whoosh |
| **Espresso machine** | Arabica | mid | flat, fast | steam-pressure charge: fires 2 small beans on the second hold ⚖️ | hiss-crack |
| **Aeropress sniper** | none (unlock at Medium roast) | high | flat, very fast | ignores 50% of steam | pop |

Only 3 of 4 exist at M0 (no Aeropress). Aeropress is the first rank unlock, so rank means something.

---

## 7. Ammo (beans)

Per duel you get an ammo rack. Each turn you fire ONE type. Standard is infinite; the rest are counted.

| Ammo | Count/duel | Damage | Mass | Radius | Notes |
|---|---|---|---|---|---|
| **Green bean** | ∞ | 20 | 1.0 | 0 (direct) | the workhorse |
| **Dark roast** | 3 | 35 | 1.6 (drops fast, shorter range) | 0.5 | heavy, satisfying |
| **Ground coffee** | 2 | 5 × 6 pellets, spread ±6° | 0.4 (steam-sensitive) | per pellet | shotgun; great vs Tree cover |
| **Full cup** | 1 | 25 | 1.2 | 2.0 splash, 50% falloff | area; the comeback shot |

⚖️ Everything in this table.

---

## 8. Scoring, roast rank, leaderboard

**Duel result:** win/loss + **Roast Points (RP)**.
- Win vs bot: +10 · win vs human: +25 · loss: −5 (never below 0) · first-shot KO bonus +10 · win from <20 cup: +5 ("cold brew comeback").

**Roast levels** (earned, shown as the bean's own colour):

| Level | RP | Unlocks |
|---|---|---|
| Green | 0 | — |
| Light | 50 | accessory slot |
| Medium | 150 | Aeropress sniper |
| Dark | 350 | second accent colour |
| Burnt | 700 | golden crema trail on shots (cosmetic) |

**Leaderboard:** top 20 by RP, plus **today's** (daily seed) best. Bots are excluded from the board.

**Streak:** consecutive wins shown on the world map next to the bean (🔥 isn't coffee; Lola picks the icon, maybe rising steam lines).

---

## 9. The world (M1 → M2)

- One map, ~60×60 units, three biomes matching the stances: a mountain ridge, a tree belt, a flooded lowland. Beans spawn on a stance-tagged slot; your slot is your stance for every duel until you move.
- **Moving** ⚖️: tap a free slot to walk there (5s walk, no cost). Moving changes your stance. Keeps the map alive and gives "positioning" meaning.
- **Population floor:** 12 bot beans always present, spread across stances, names in coffee-pun style (Lola names them). Bots have roast levels so the map looks lived in.
- **Everyone is always on the map (M2).** A player's bean stays on the map after they leave, on the slot they chose. The map shows the whole community, not just who is online. Online beans get a subtle presence ring (M3).
- **Challenge = your first shot.** Tap a bean → challenge card (their class, machine, roast, stance vs yours, record) → confirm → you go straight into the duel and fire shot one. Then you leave the duel; it waits. No accept step: being on the map means you're fair game (that's the war). ⚖️ Optional "do not disturb" toggle if it gets spammy.
- **The inbox (Draw Something model).** Next time the opponent opens the game, the world HUD shows "N beans are shooting at you". The inbox lists every duel where it is their turn, newest first. They tap one, watch the opponent's last shot replay (≤3s), take their shot, next. Playing your whole inbox should feel like a coffee break, not a chore.
- **Duel states:** `your turn | their turn | finished (won/lost) | abandoned (no shot from either side in 7 days)`. There is no decline: being on the map means you're fair game.
- **Live duels (M3, bonus):** if both beans are online, the challenged bean gets a prompt and the duel runs turn by turn without leaving. Same data model; the only difference is nobody has to wait.
- **Replays are the glue.** Because the sim is deterministic, every shot is stored as inputs and replayed on the opponent's device. The "watch their shot" moment before you fire is the async game's hook, exactly like watching the drawing appear in Draw Something.

---

## 10. Bots

Scripted, deterministic given the seed.

- **Aim model:** bot computes the ideal angle/power for a direct hit against its *estimate* of your position (stance-band centre on turn 1, then updated by its own impact feedback per §2b), then adds Gaussian noise `σ` in degrees and power %. Difficulty tiers: Green bot σ=6°, Light σ=4°, Medium σ=2.5°, Dark σ=1.5°.
- **Learning within a duel:** after a miss, next shot's noise mean shifts toward the error (it "walks in"), so bots feel like they're adjusting, not random.
- **Ammo use:** dumb but plausible: dark roast when the target is close, ground coffee vs Tree, full cup when losing.
- **Bot names + faces:** from Lola's roster. Same customisation system as players so the map reads as people.

---

## 11. Bean profile (customisation)

Set on first landing, editable from the world map (tap your own bean).

| Slot | Options | Visible where |
|---|---|---|
| Name | 3–14 chars, filtered | map label, duel HUD, leaderboard |
| Class | Arabica / Robusta / Liberica | silhouette |
| Origin | Colombia, Ethiopia, Brazil, Vietnam, Kenya, Guatemala, Costa Rica, Indonesia | badge on chip + map label flag-style mark |
| Face | 6 expressions ⚖️ | bean face |
| Accent | 8 colours from the palette | cup, machine trim, shot trail tint |
| Accessory | (Light roast+) 6 coffee-native items | on bean |

Roast level colours the bean body. Not a slot.

Identity: per-device key in localStorage; the profile row is keyed by it. No login. "Claim with email" is out of scope for v1.

---

## 12. Daily seed

`seed = hash("cbw" + YYYY-MM-DD in Europe/Dublin)` drives: steam sequence per duel, bot spawn layout, class spread rolls. Shown on the map as "Today's roast: #A3F1" style tag. The leaderboard's daily tab resets at midnight Dublin.

---

## 13. Screens inventory (for the design system)

1. **Landing / name + bean** (single screen, 10s): name field, class picker (3 big beans), origin, face, accent → "Enter the war" button.
2. **World map**: 3D map, HUD strip (your bean chip, RP + roast, streak, "your turn" badge, leaderboard button, sound toggle), bean labels, challenge card (modal), profile editor (sheet).
3. **Duel**: stage with YOUR side in the clear and THEIR side fogged, the Spotter window (§2b), impact markers, both cups, steam gauge, ammo rack, turn indicator, aim/power gesture layer, machine name, tiny stance labels, `Close.`/`Short.`/`Long.` call chip.
4. **Result card**: win/lose, damage dealt/taken, RP delta, roast progress bar, "One more go" (primary) / "Back to the world" (secondary), share.
5. **Leaderboard**: all-time / today tabs, rows.
6. **Inbox** (M2, core): "N beans are shooting at you" badge on the world HUD; list of duels awaiting your shot with the opponent's bean, stance, cup state and time since their shot; "play all" flow that chains them.
7. **Share card** (M4): 1080×1080 image of your bean + record for the Skool post.
8. **States:** loading, offline, opponent disconnected, challenge declined/expired, first-time hints (3 tooltips max).

---

## 14. Balance philosophy

- Terrain is the skill layer, steam is the luck layer, class/machine/ammo is the expression layer. Skill must dominate: a good player on Flood beats a bad one on Mountain most of the time.
- The first duel vs a Green bot is winnable for a first-timer in ≤4 shots. The Dark bot should beat Smith.
- No mechanic needs a tutorial longer than a tooltip.

## 15. Not in v1
Team duels, more maps, destructible terrain (tempting; M5 if we're early), items on the map, chat, accounts.

---

## 16. Design-phase rulings (Smith, 2026-09-05, answering ARCHITECTURE.md §10 and the cross-seat challenges)

| # | Question (Emmett) | Ruling |
|---|---|---|
| 1 | Bot RP cap per day | **100 RP/day from bots**, confirmed. Human wins are uncapped. An idle grinder tops out at Light roast in a day and Medium in three; Dark and Burnt need humans. |
| 2 | Does walking to a new slot change in-flight duels? | **No.** Stance is frozen on the duel row at creation (both sides). Moving affects only duels created after the move. The exploit reading is correct. |
| 3 | `chargeMs` as a continuous sim input? | **Discrete.** Two flags, chosen before the drag, not during: French press over-hold is "power in the last 15% of the gauge" (already a sim input via power), which rolls the 1-in-6 misfire from the seeded PRNG; espresso double-shot is a per-turn toggle chip (`doubleShot: boolean`) that fires two small beans in a 100ms burst at 60% damage each ⚖️. No timing input in the sim. The HUD still animates the gauge needle for feel, but the needle is presentation. |
| 4 | Sudden death in async | **Both triggers, whichever first:** round 8 for each player, OR 5 days since duel creation. In async it applies from the next turn after the trigger. Abandonment at 7 days stays (§9). |
| 5 | Stance mismatch after a move | **Cosmetic, accepted.** The duel stage renders the frozen stance; the world map renders the current slot. The challenge card shows "as of the challenge" stances. No fix in v1. |

**Cross-seat challenges, ruled:**
- **Fog mask is derived, not stored** (Emmett §3.6): accepted. §2b "fog state persists per duel and is stored with the turn inputs" now reads: fog is a pure fold over the stored impact list; nothing else is persisted.
- **World-map beans have no individual faces** (Emmett §2.3, owed to Lola): accepted on Lola's behalf per ART-DIRECTION §4 "at 40px faces may vanish". Faces appear in the duel, the Spotter, the inbox row render and the profile sheet.
- **Face atlas 512²** (Emmett §8.5): accepted; 30 cells of 64px is enough at the duel's 400px bean.
- **Determinism via restricted float64 + sine table, zero tolerance** (Sonny DT-R2, Emmett §3.4): accepted; ⚖️ balance knobs must therefore be expressed in the sim's allowed operations (no `pow` curves; use lookup tables or polynomials).
- **Supabase Anonymous Auth as the identity** (Sonny SEC-01, Emmett §4.2): accepted. "No login" holds for the player.
- **Abort gate on the 3D world** (Emmett §8.1): accepted as a rule, not a date: if M1 cannot hold 60fps on the reference phone with the degrade ladder in, freeze the world at whatever it is and spend the remainder on the duel. A gorgeous duel beats a stuttering world in every category we're chasing.

### 16b. Rulings on UX.md §10 (Allison) and §11 deviations

| # | Question (Allison) | Ruling |
|---|---|---|
| 1 | `Wide.` or `Short.` | **`Short.`** The three calls are `Close.` / `Short.` / `Long.` Updated in §2b. |
| 2 | Bracket band on the gauge | **Yes.** It removes the memory test, not the skill: the player still has to read stance, steam and the bracket together. Skill stays in the first shot and in the steam shift between turns. |
| 3 | Class editable after the first duel | **Yes, free, between duels only.** Frozen on the duel row as Emmett specified. |
| 4 | First-duel fog radius 2.5 for the first two markers | **Yes, for the scripted first duel only** (vs the Green bot). Everything after uses 1.5. |
| 5 | Fairest matchup for a new player's first two "One more go" picks | **Yes.** First two picks choose a Green bot in the same or a lower stance than the player. From the third pick, nearest bot, then inbox order. |

**All 14 deviations in UX.md §11 accepted.** Notably: you are always on the left; hint tags become `Drag to aim.` / `Tap any bean to challenge.` / `They are in the steam.`; the hit flash is rate-limited to one per 400ms per bean (strobe safety); colour-only signals get a shape (class dot), hatching (gauge danger zone), a dashed rim + 6° tilt (low cup), and a `Hit` stamp (inbox bar); "challenge declined" is cut; HANDOFF (`Sent.`), PAUSE and TOO SMALL join the screens inventory; the limbs get a functional aim pose. Lola re-skins these in ART-DIRECTION at the next pass.
