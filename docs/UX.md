# Coffee Beans War: UX, Input, Game Feel, Accessibility

**Seat:** Allison (Product Design + Accessibility; game-feel scope expansion per `BRIEF.md:7`)
**Status:** v0.1, design phase · **Inherits:** `ART-DIRECTION.md` §1 tone, §8 motion, §9 components + tokens · **Companions:** `BRIEF.md`, `GAME-DESIGN.md`, `QA.md`

I own the flow, the input mechanics, the microcopy, the accessibility floor and game feel (`ART-DIRECTION.md:454`). I do not own colour, type, component shape or sound; where I deviate from Lola I say so out loud with a reason and it is marked **DEVIATION**. Where I need a call from Smith or Emmett it is in §10.

Every number here is a decision. The user is one specific person: **a judge, alone, late, on whatever device is nearest, with nobody else online** (`BRIEF.md:18`). Every call below is checked against that one person.

---

## 0. The three things this document is trying to buy

1. **Under 30 seconds from URL to firing a shot** (`GAME-DESIGN.md:17`), with the world seen on the way, not skipped.
2. **A hidden opponent that reads as a puzzle**, never as a punishment. This is the highest-risk mechanic in the build and §4 is mostly about de-risking it.
3. **A loop that closes in one tap**, on a phone, with a thumb, in the dark, without ever fighting the operating system.

---

## 1. Flow: the state machine

### 1.1 Top-level machine

```
                                  ┌───────────────────────────────────────┐
                                  │                                       │
  [URL]                           ▼                                       │
    │                        ┌─────────┐   first launch    ┌───────────┐  │
    └──► BOOT ──────────────►│ LANDING │──────────────────►│   WORLD   │  │
         (Brewing.)          │ receipt │  Enter the war.   │  the map  │  │
              │              └─────────┘   (900ms fly)     └───────────┘  │
              │                                              │  ▲  │  │   │
              │ returning player (localStorage key)           │  │  │  │   │
              └──────────────────────────────────────────────►┘  │  │  │   │
                                                                  │  │  │   │
        ┌─────────────────────────────────────────────────────────┘  │  │   │
        │                     (700ms return)                         │  │   │
        │                                                            │  │   │
   ┌────┴─────┐   your shot lands   ┌──────────┐  KO   ┌──────────┐  │  │   │
   │ HANDOFF  │◄────────────────────│   DUEL   │──────►│  RESULT  │──┘  │   │
   │  Sent.   │   (async, no KO)    │          │       │ receipt  │     │   │
   └────┬─────┘                     └──────────┘       └────┬─────┘     │   │
        │ NEXT DUEL (inbox not empty)     ▲                 │           │   │
        └─────────────────────────────────┘                 │ ONE MORE GO   │
                                                            └───────────────┘

  WORLD sub-states (all are overlays; the map keeps rendering behind them):
    WORLD.IDLE ─ tap own bean ──► PROFILE (bottom sheet)  ─ Save / Cancel ─► IDLE
               ─ tap other bean ► CHALLENGE (bottom sheet)─ Back ─────────► IDLE
               │                                          └ Challenge ───► DUEL
               ─ tap inbox stub ► INBOX (full sheet) ─ tap row / Play all ► DUEL.POUR
               ─ tap The Roaster ► LEADERBOARD (full sheet) ─ Back ──────► IDLE
               ─ tap free slot ─► WORLD.MOVING (5s walk, cancellable) ───► IDLE

  DUEL sub-states:
    DUEL.INTRO (900ms, uninterruptible)
      └► DUEL.POUR (async only, ≤3.5s, skippable after first ever view)
           └► DUEL.AIM ──fire──► DUEL.RESOLVE (≤2.5s) ──► DUEL.CALL (120ms print)
                 ▲                                              │
                 │                                              ├─ opponent dead ─► DUEL.KO ─► RESULT
                 │                                              ├─ async ─────────► HANDOFF
                 │                                              └─ bot / live ────► DUEL.THEIRS
                 └──────────────────────────────────────────────────────────────────┘

  Global overlays, enterable from any state:
    PAUSE (Esc / Menu chip)   OFFLINE (No steam.)   TOO_SMALL (<320×480)
```

### 1.2 Screen by screen: contents, the single primary action, what is one tap away

| Screen | What is on it | Single primary action | One tap away |
|---|---|---|---|
| **BOOT** | Moka pot + filling cup on `--paper`, `Brewing.` No percentage (`ART-DIRECTION.md:448`) | None. It is never longer than the landing receipt takes to read | Nothing. If assets are still loading at 1.5s, LANDING paints anyway and the button waits |
| **LANDING** | Live bean preview 140px · `NAME` (prefilled) + `ANOTHER` · 3 class beans · 8 origin tags · 6 faces · 8 accents · `ENTER THE WAR` pinned | `ENTER THE WAR` | Every customisation slot. Nothing is behind a step |
| **WORLD** | The map. Top-left your bean chip. Top-centre the inbox stub (hidden at 0, `ART-DIRECTION.md:424`). Top-right `TODAY'S ROAST`. Bottom-right `SOUND` + `MENU`. Bean labels as CSS2D | Tap a bean | Inbox · leaderboard (The Roaster) · your profile · move to a free slot |
| **CHALLENGE** (sheet) | Their bean 200px, name + origin, class chip, machine chip, roast badge, `RIDGE +3 VS BREW 0`, `RECORD 12 W · 4 L`, your machine picker | `CHALLENGE` (goes straight to the duel and your first shot, `GAME-DESIGN.md:161`) | `BACK` · swap your machine |
| **DUEL.AIM** | Stage (you left, them fogged right) · Spotter top-right · two cups · steam chip · angle/power chips + gauge · ammo rack · turn strip · stance chips · `MENU` | Drag to aim, release to fire | Ammo swap (4 chips) · pause |
| **DUEL.POUR** | Receipt letterbox, `MISS MOKA fired · 3h ago`, their shot replaying, `YOUR SHOT` stamp | Watch. Tap skips (after the first ever view) | Nothing. Deliberately |
| **HANDOFF** | Small receipt: `Sent.` · a one-line summary of your shot (`SHOT 3 · Short.`) · the opponent's bean at 64px · `NEXT DUEL` or `BACK TO THE GROUNDS` | `NEXT DUEL` if the inbox has more, else `BACK TO THE GROUNDS` | The other one |
| **RESULT** | Receipt: `DUEL #0412` · `VS MISS MOKA · GTM` · itemised lines · tear line · `RESULT` stamp · RP · roast bar · then the share card slides out | `ONE MORE GO` (autofocused) | `BACK TO THE GROUNDS` · `SHARE` |
| **INBOX** | Header count, `PLAY ALL` at top, rows newest first, `GONE COLD` group below | `PLAY ALL` | Any single row · dismiss a cold duel |
| **LEADERBOARD** | Two stamp tabs `ALL TIME` / `TODAY`, 20 rows, your row inverted | `BACK TO THE GROUNDS` | Tab swap |
| **PROFILE** (sheet) | Same slots as landing, name included (**DEVIATION**, see §8) | `SAVE` | `CANCEL` · every slot |
| **PAUSE** | `RESUME` · `SOUND` · `HAPTICS` · `REDUCED MOTION` · `BRACKET` · `SWAP SIDES` · `LARGER TEXT` · `LEAVE DUEL` | `RESUME` | Every setting |

### 1.3 The async inbox flow, in full

```
WORLD (landing, returning player)
  │  server says: 3 duels awaiting your shot
  ▼
inbox stub prints in (200ms, one steam wisp, ART-DIRECTION.md:348)
  "3 beans are shooting at you."
  │
  ├─ tap the stub ──► INBOX sheet
  │                     ├─ PLAY ALL  ──┐
  │                     └─ tap a row ──┤
  │                                    ▼
  └─ (skip the inbox entirely, tap any bean, start a new duel)
                                       │
                          DUEL.POUR ◄──┘
                            "MISS MOKA fired · 3h ago"
                            their arc replays at 1.0x under THEIR steam
                            their impact marker draws on YOUR side
                            steam veers to YOUR turn's value (visible)
                            YOUR SHOT stamps
                            400ms input lockout
                                       │
                                  DUEL.AIM
                                       │ fire
                                  DUEL.RESOLVE ──► DUEL.CALL
                                       │
                     ┌─────────────────┴─────────────────┐
                 opponent dead                     opponent alive
                     │                                   │
                  DUEL.KO ──► RESULT                  HANDOFF "Sent."
                     │                                   │
              ONE MORE GO ───────────────────────────────┤
                                                         │
                          more in the inbox? ─ yes ─► NEXT DUEL ─► DUEL.POUR (next)
                                              no  ─► BACK TO THE GROUNDS ─► WORLD
```

Three calls in this flow that are not in the source docs:

- **`GAP` → HANDOFF is a missing screen.** `GAME-DESIGN.md:212` lists a result card but no hand-off card, yet in the async default *most duel visits do not end in a result*. They end with your shot fired and the duel waiting. If that moment dumps you back to the world with no acknowledgement, the async loop has no closure and `PLAY ALL` has no rhythm. HANDOFF is the async game's result card. It is small, it prints in 200ms, and its primary button is the next duel. Add it to the screens inventory.
- **`PLAY ALL` chains through HANDOFF, not through the world.** The chain is Pour → aim → fire → Sent. → next. The world is never re-entered mid-chain. The last one in the chain switches its primary to `BACK TO THE GROUNDS`.
- **`GAP` → "challenge declined/expired" is dead copy.** `GAME-DESIGN.md:214` lists it, but `GAME-DESIGN.md:161` removed the accept step ("being on the map means you're fair game"). Nothing can be declined. `Gone cold.` (7-day abandonment) is the only expiry state and it already has a home in the inbox. Cut "declined" from the state list.

### 1.4 The eight entries in `GAME-DESIGN.md` §13, resolved

| # | Entry | Resolution here |
|---|---|---|
| 1 | Landing / name + bean | §8. Prefilled, zero-change path, ≤10s, one screen, no scroll at 390×844 |
| 2 | World map | §1.2 + the hidden bean list for keyboard/SR play (§7.6) |
| 3 | Duel | §3 (input, HUD, thumb zones, edge safety) + §4 (Spotter) |
| 4 | Result card | §1.2, §5.9 (focus), §5 (the share card slide-out), §6 (strings) |
| 5 | Leaderboard | §1.2. `ALL TIME` / `TODAY` as `role="tablist"`, arrow keys, `aria-selected` |
| 6 | Inbox | §1.3. Plus the HANDOFF screen it implies |
| 7 | Share card | §9 |
| 8 | States (loading, offline, opponent disconnected, expiry, first-time hints) | §2 (hints), §6 (all strings), §7 (announcement behaviour). Plus three states the list is missing: **HANDOFF**, **PAUSE**, **TOO SMALL** |

---

## 2. Onboarding in ten seconds

**No tutorial. No modal. No "skip".** The teaching happens because the first thing that occurs to the judge is *being shot at*, which explains the whole game in one arc.

### 2.1 The path, second by second

Assume a cold load on a phone, 4G, first-ever visit.

| t | What the judge sees | What is happening |
|---|---|---|
| **0.00** | White-paper screen. No spinner. | HTML + critical CSS paint. Zero JS needed for this frame |
| **0.15** | The moka pot and an empty cup, `Brewing.` The cup starts filling | Boot receipt. Fonts swap in (`font-display: swap`) |
| **0.60 – 1.50** | The landing receipt, **already filled in**: a bean, a name, a class, an origin, a face, an accent, and `ENTER THE WAR` at the bottom | The world scene continues downloading behind the receipt. `ENTER THE WAR` is enabled from frame one |
| *(judge time)* | They either tap the button immediately, or they spend 3 to 8 seconds poking the class beans and the accents and watching the preview change | The only optional dwell in the whole flow. It costs nothing and it is where identity is bought |
| **+0.12** | The stamp slams onto the receipt | `ART-DIRECTION.md:435` |
| **+0.90** | The camera flies out and the valley opens: ridge top-right, flood bottom-left, tree belt on the diagonal, twelve beans standing on it | `ART-DIRECTION.md:337`. This is the Eye Candy frame. It must be the first *world* thing they see, which is why we do not skip straight to a duel |
| **+1.20** | Bean labels fade in, staggered 40ms, nearest first | Not decoration: the map introducing its population one name at a time |
| **+1.40** | The inbox stub prints top-centre: **`1 bean is shooting at you.`** One steam wisp. No pulse, no red dot (`ART-DIRECTION.md:348`) | **The scripted first challenge.** On a brand-new profile the server (or local bootstrap) has already placed a challenge from **Decaf Dan**, Green, Flood stance, with his first shot fired |
| **+2.50** | If nothing has been touched: hint tag 1 stakes itself into the ground next to the stub | Paper tag on a stirrer (`ART-DIRECTION.md:452`) |
| *(judge taps the stub)* | Inbox opens with exactly one row | 1 row + `PLAY ALL` reads as "there is one thing to do" |
| *(taps the row)* | **The Pour.** Receipt bands feed in, `DECAF DAN fired · just now`, and a bean arcs out of the steam and lands near them | The judge has now seen: the async premise, the arc, the steam, the fog, and that someone is in it. Zero words spent |
| **+3.5s of Pour** | `YOUR SHOT` stamps | 400ms input lockout so the skip-tap does not become an aim |
| **+0.4** | Hint tag 2 appears on a stirrer next to their own bean: `Drag to aim.` | They drag. The barrel pivots with their thumb, the bean plants its feet and puts an arm on the machine, the dotted arc grows, the numbers move |
| (release) | They release | First shot fired. **Elapsed from URL: 9 to 14 seconds** including reading time |

Worst case, a judge who reads everything and customises fully: 25 seconds. Inside the 30 (`BRIEF.md:18`).

### 2.2 Why the scripted first challenge and not a "challenge a bot" prompt

Three reasons and they are all about the categories:

1. **It teaches the async loop by using it**, which is the Most Creative claim (`BRIEF.md:39`). A tutorial that *explains* Draw Something is worthless; being handed a drawing is the product.
2. **It removes the only decision a first-timer cannot make well**: which of twelve strangers to attack. The inbox answers it.
3. **It makes the first duel the softest one in the game** (`GAME-DESIGN.md:57` already tunes the Green bot for this). Decaf Dan is Green, Liberica, Flood (`ART-DIRECTION.md:249` roster), which is the friendliest stance to shoot at: no cover, misses splash harmlessly, a wide flat target.

A judge who skips the stub and taps a random bean instead gets the normal challenge card. Nothing is gated.

### 2.3 The three hint tags, revised

Lola's set (`ART-DIRECTION.md:452`) is `Drag from your bean to aim.` · `Steam moves your shot.` · `Tap any bean to challenge.`

**DEVIATION.** Two changes, both because of the Spotter.

| # | Where | String | Appears | Dismisses |
|---|---|---|---|---|
| **1** | World, staked next to the inbox stub (or the nearest bean if the inbox is empty) | `Tap any bean to challenge.` | 2.5s after the world settles, if no input | On opening any challenge card or inbox row. Never on tap |
| **2** | Duel, staked next to **your** bean | `Drag to aim.` | On entering `DUEL.AIM` for the first time ever | On the first successful fire. Never on tap |
| **3** | Duel, staked pointing at the **Spotter** | `They are in the steam.` | 400ms after the **first call chip** prints (so: after your first shot resolves) | On your second fire. Never on tap |

Why:

- **`Drag from your bean` becomes `Drag to aim.`** because the gesture is anchor-relative, not bean-relative (§3.2). Telling a player to start on the bean when they do not have to would make the game feel more fiddly than it is. Three words, full stop, house rule kept (`ART-DIRECTION.md:31`).
- **`Steam moves your shot.` is cut as a tag** and replaced by **`They are in the steam.`** The steam already has three redundant, diegetic reads (`ART-DIRECTION.md:369`: the sprite layer, the wind socks, the gauge) and if those work, the tag teaches something the world already teaches. The hidden opponent has *no* diegetic explanation and it is the mechanic most likely to make a judge close the tab. The third tag goes where the risk is. `Steam moves your shot.` survives as the steam chip's `aria-label` and its desktop hover title.
- Three tags, never four, never two at once. Max one tag on screen at any moment.

---

## 3. The aim and power gesture

### 3.1 The model, stated once

**Direct drag. You drag in the direction you want the shot to go. Direction is angle, length is power, release fires.** (`GAME-DESIGN.md:27`.)

Direct, not slingshot pull-back, for one mechanical reason: **the machine barrel is the aim indicator** (`ART-DIRECTION.md:285`). A barrel that pivots to point where your finger is has an obvious causal read; a barrel that points opposite your finger does not, and it fights the one piece of in-scene UI Lola already built. Now that beans have arms (Diego, 2026-09-05, `ART-DIRECTION.md:225`), the free arm points along the same vector, which doubles the read.

The ergonomic objection to direct drag (a right thumb has to travel toward the far corner) is answered by making the drag **anchor-relative**, below.

### 3.2 Touch

| Property | Value |
|---|---|
| **Drag origin band** | Where a drag may **begin**. Portrait: y from 28% to 65% of the *visual viewport* height. Landscape: the stage minus the bottom HUD strip, minus the top 64px, minus a 120×120 exclusion around the Spotter stack. Full spec and the edge-safety reasoning in §3.7 |
| **Anchor** | Wherever the finger lands inside the origin band. **The drag does not have to start on the bean.** The preview arc always originates at the machine muzzle regardless of where the finger is |
| **Travel** | Once armed, the pointer may travel anywhere on screen including outside the origin band. Only the origin is constrained |
| **Angle** | `atan2(-dy, dx)` of (current − anchor). Clamped **−15° to 90°**. At a clamp, the `°` chip goes `--ink-dim` so pinning is visible |
| **Power** | `clamp(distance / R, 0, 1) × 100`, integer. **R = 40% of the shorter visual-viewport dimension** (390×844 → R = 156px). Device-relative, so a full-power drag is the same thumb effort on every phone |
| **Dead zone** | 12px. Under it, no aim is armed and nothing is drawn |
| **Power floor** | 8%. Releasing below the floor cancels, it does not fire |
| **Minimum drag time** | 120ms. A faster flick is treated as a tap and does nothing on the stage |
| **Live feedback** | 8-dot preview arc covering the **first 30% of the trajectory** (`ART-DIRECTION.md:406`), `--ink` at 60%, integrated by the same function as the sim |
| **Numeral chips** | `62°` and `78%`, mono, tabular (`ART-DIRECTION.md:377`). Update every frame while dragging, freeze and go `--ink-dim` on fire |
| **Pressure gauge** | 96px arc under the chips, 0 to 100, last 15% in `--danger` **with 45° hatching** so the danger zone is not colour-only (§7.4) |

### 3.3 Cancel, and preventing an accidental shot

A shot is irreversible in a turn-based deterministic game. That is correct and we do not add an undo. Instead we make an accident nearly impossible. Six guards, all cheap:

1. **Dead zone** (12px) and **power floor** (8%). A slip is not a shot.
2. **Minimum drag time** 120ms. A stray flick is not a shot.
3. **Commit on release only.** Never on touch-down, never on a long-press timeout.
4. **Return-to-origin cancels.** Drag back inside the dead zone and the arc vanishes, the chips grey, the barrel eases back to its last committed angle and the bean's arm drops. Release fires nothing.
5. **Release over the HUD cancels.** The HUD is not the aim layer; dragging your thumb down onto it and letting go is a deliberate, discoverable escape hatch.
6. **A second finger cancels.** Any second touch during an armed aim aborts it. This catches the two real-world cases: a two-handed regrip, and an attempted pinch-zoom.

Plus `Esc` (keyboard) and right-click (mouse) during a drag. Plus any `visualViewport` resize or `orientationchange` (§3.7.4).

There is **no confirmation dialog on fire**, ever. The confirmation is the recoil.

### 3.4 What the bean and the machine do during the drag

Nothing else on screen moves. This list is the entire response, and it is what makes the drag feel like handling a machine rather than moving a slider.

**The bean, using its new limbs** (Diego's call, 2026-09-05; `ART-DIRECTION.md:225`). The rule there is that limbs never emote on their own, the deadpan lives in the face and the comedy lives in the physics. Nothing below is emoting: every limb pose is *functional readout*.

| Moment | Pose |
|---|---|
| Idle | Arms hang. Feet together. Blink every 4 to 7s |
| **Arming** (crossing the dead zone) | Feet **plant apart** (0.25 units), knees straighten, the near arm goes onto the machine body. Face cuts to the `aim` cell. One 6ms haptic |
| **During the drag** | The **far arm points along the aim vector**, tracking with the same 60ms follow as the barrel. This is a second, larger, silhouette-scale angle indicator that reads at 40px, needs no colour, survives reduced motion (it is a pose, not an animation) and gives keyboard users a visible response to an arrow key |
| **On fire** | The pointing arm snaps back to the body over 80ms, coincident with the bean squash 1.15 / 0.85 |
| **On cancel** | Both arms drop, feet come together over 150ms. The clearest possible "nothing happened" |
| **On being hit** | Arms fly up, face to the `hit` cell for 600ms |
| **Mountain-tumble miss** | Legs windmill through the 800ms tumble. This is the funniest asset in the game and the limbs are what make it work |

**The machine:**

- **Pivots on its base to the live angle** with a 60ms follow, so it tracks the thumb but has weight (`ART-DIRECTION.md:285`).
- **Power is expressed in the machine, not only in the gauge:**
  - *Moka pot*: the base warms to `--accent`, the spout wisp thickens with power.
  - *French press*: the plunger rises with power and starts to shake above 85%, which is the visible over-hold zone (`GAME-DESIGN.md:111`).
  - *Espresso*: the in-scene pressure gauge needle climbs toward the red zone (`ART-DIRECTION.md:272`).
  - *Aeropress*: the inner cylinder compresses.

**Everything else:**

- **The previous shot's ghost trail stays visible during the drag** (`ART-DIRECTION.md:339`). Against a hidden opponent this is the single most important skill affordance in the game: it is the thing you are correcting *against*. Never dimmed below 30%, never hidden by the preview arc; the preview draws over it.
- **The steam layer keeps drifting.** Never frozen; it is information (`ART-DIRECTION.md:371`).
- **The Spotter keeps running live.** The opponent blinks, their steam rises, their limbs hold their own aim stance. It is a camera, not a portrait.
- **The camera does not move.** Not for the drag, not for the shot (`ART-DIRECTION.md:349`).

### 3.5 Mouse

Identical gesture. Mouse-down anywhere in the origin band, drag, release. Plus two desktop-only precision affordances that make the third shot a kill:

- **Wheel** while an aim is armed: power ±2% per notch.
- **Shift held during the drag** locks the angle, so you can tune power alone. **Alt held** locks power, so you can tune angle alone.
- **Right-click** during a drag cancels.

Cursor: default arrow over the HUD, `crosshair` over the origin band, `grabbing` while armed.

### 3.6 Keyboard: the full duel path

*(Sonny's ask #2.)* The whole game is playable with a keyboard, and this is not a parallel implementation bolted on the side: **the aim UI is real DOM and the drag writes into it.** That single architectural decision is what makes keyboard, screen reader and WCAG 2.2's new dragging criterion all pass by construction.

#### 3.6.1 The DOM the duel actually is

```html
<main aria-labelledby="duel-title">
  <h1 id="duel-title">Duel against Miss Moka</h1>

  <canvas aria-hidden="true"></canvas>

  <p id="turn"  aria-live="polite">Your shot.</p>
  <p id="shotresult" aria-live="polite"></p>
  <p id="call"  aria-live="polite"></p>

  <figure id="spotter" role="img" aria-labelledby="spotter-desc">
    <figcaption id="spotter-desc" class="sr-only">…regenerated per turn, §3.6.4…</figcaption>
  </figure>

  <output id="cup-you"    aria-live="polite">Your cup, 100 of 100.</output>
  <output id="cup-them"   aria-live="polite">Miss Moka's cup, 65 of 100.</output>
  <output id="steam"      aria-live="polite">Steam 4, blowing right.</output>

  <input type="range" id="angle" min="-15" max="90"  step="1" value="45"
         aria-label="Angle, degrees" aria-describedby="stance-you">
  <input type="range" id="power" min="0"   max="100" step="1" value="50"
         aria-label="Power, percent" aria-describedby="bracket">
  <button id="fire">Fire</button>

  <div role="radiogroup" aria-label="Ammunition"> … 4 chips … </div>
  <button id="menu">Menu</button>
</main>
```

The `62°` and `78%` chips and the pressure-gauge arc **are** the visual rendering of those two range inputs. The canvas is `aria-hidden` and contributes nothing to the accessibility tree.

#### 3.6.2 Focus order in the duel

`turn` strip (live region, **not focusable**) → **`Angle`** → **`Power`** → **`Fire`** → ammo rack (one tab stop, arrow keys within, `role="radiogroup"`) → **`Menu`**.

Six tab stops. That is the whole duel.

**Not focusable, deliberately:** the Spotter, both cups, the steam chip, the call chip, the stance chips, the impact markers, the machine-name chip. They are readouts, and they are announced on change (§3.6.4). Making a readout focusable adds a tab stop that returns nothing.

**Focus is never obscured** (WCAG 2.4.11, new in 2.2): every focusable element lives *inside* the fixed HUD block, never underneath it. Focus ring: 2px `--ink` outline, 2px offset, and the print shadow doubles from 2px to 4px so the ring is visible even against a `--paper` chip on `--paper`.

**On entering `DUEL.AIM`, focus moves to `Angle`.** Coming out of the Pour, this happens after the 400ms lockout so the announcement queue does not collide with the `Your shot.` stamp.

#### 3.6.3 Keys

| Key | Action |
|---|---|
| `←` `→` | Angle −1° / +1°. Hold to repeat, accelerating after 500ms |
| `↑` `↓` | Power +1 / −1. Same repeat |
| `Shift` + arrow | 0.1 step (fine tune) |
| `Home` / `End` | Angle or power to its minimum / maximum (native range behaviour, kept) |
| `PageUp` / `PageDown` | ±10 on the focused slider (native, kept) |
| `Space` | **Key-down starts the charge** on charge machines (French press plunger, espresso pressure); **key-up fires**. Non-charge machines also fire on key-up, so the muscle memory is one rule. Works from anywhere in the duel, not only when `Fire` has focus |
| `Enter` | Fires only when `Fire` has focus (native button behaviour) |
| `1` `2` `3` `4` | Select ammo. Scoped to the duel having focus, so it never traps typing (WCAG 2.1.4) and it is disableable in Pause |
| `Esc` | Cancels an armed aim; if none is armed, opens Pause |
| `Tab` / `Shift+Tab` | The six stops above, wrapping inside the duel |

#### 3.6.4 A duel played entirely on a keyboard, keystroke by keystroke

This is the acceptance walkthrough. If it does not describe a winnable game, the DOM is wrong.

| Keystroke | What happens on screen | What the screen reader says |
|---|---|---|
| *(duel opens)* | Focus lands on `Angle` | *"Duel against Miss Moka. Your shot. Angle, slider, 45 degrees."* |
| `→` ×17 | Barrel pivots, the bean's far arm rises with it, preview arc redraws each step | *"46. 47. 48…"* (native slider value, throttled by the AT) |
| `Tab` | Focus to `Power` | *"Power, slider, 50 percent."* |
| `↑` ×28 | Gauge fills, French press plunger rises, arc lengthens | *"51. 52…78."* |
| `Space` (hold 400ms, release) | Charge builds, machine fires, arm snaps back, bean squashes | *"Fired. Angle 62 degrees, power 78 percent."* |
| *(shot resolves, ≤2.5s)* | Arc, impact, marker, fog thins | *"Missed. Landed on the Belt, short of them."* then *"Short. Your shot landed short of them. Add power."* |
| *(new turn)* | Steam changes, focus returns to `Power` (the control most likely to change after a range call) | *"Their shot."* … *"Your shot. Steam 6, blowing right. It moves your shot. Power, slider, 78 percent. Bracket: between 78 and 91 percent."* |
| `↑` ×7 | | *"79…85."* |
| `Space` | | *"Fired."* → *"Hit. 20 damage. Miss Moka's cup, 45 of 100."* → *"Close. Your shot landed inside the cup window."* |
| `2` | Ammo swap | *"Dark roast. 3 left. 35 damage, heavy, shorter range. Selected."* |
| `Space` | | *"Fired."* → *"Hit. 35 damage."* → *"Ground. You won."* |
| *(result prints)* | Receipt prints, focus moves to `One more go.` after 500ms | *"Duel number 412. Result: you won. 2 hits from 5 shots. Plus 25 roast points. One more go, button."* |
| `Enter` | Next duel | *"Duel against Bitter Ted…"* |

#### 3.6.5 How the Spotter and the calls are announced

*(Sonny's ask #2, second half.)* The Spotter is a rendered camera crop, so it has no text of its own. It gets a **generated description that is rebuilt at every turn boundary and at every fog change**, and it is exposed two ways:

**(a) As a static description on the figure.** `<figure role="img" aria-labelledby="spotter-desc">`. The description is composed from facts the sim already has, in a fixed order so it is skimmable by ear:

> *"Spotter. Miss Moka, Liberica, Medium roast, from Guatemala. Standing on a branch platform in the Belt, height plus 1.5, with canopy behind her. French press cannon, aimed left and low. You cannot see how far away she is."*

The last sentence is the mechanic, stated plainly once per duel and then dropped from the string on subsequent turns (it becomes *"Range unknown."*). A screen-reader user must be told the constraint explicitly, because for them the fog is not visible; it would otherwise read as missing information rather than as the game.

**(b) As a `polite` live region on change.** Only three things trigger a re-announcement, so the region does not become a firehose:

| Trigger | Announced |
|---|---|
| The opponent's pose changes (they aimed, they fired) | *"Spotter: she is aiming higher."* |
| A `Close.` flinch inside the window | *"Spotter: she flinched."* |
| The fog lifts at KO | *"The steam has cleared. You can see her."* |

**The call chip** is its own `aria-live="polite"` region, separate from the Spotter, because it is the answer to the question the player just asked and it must not be queued behind a scene description. It announces the word **plus its correction sentence**, which is the sentence a sighted player infers from the glyph:

- `Close.` → *"Close. Your shot landed inside the cup window."*
- `Short.` → *"Short. Your shot landed short of them. Add power."*
- `Long.` → *"Long. Your shot landed past them. Take power off."*

It persists in the DOM until your next fire (§4.2), so a screen-reader user who tabs away and back, or who reopens the duel six hours later, can re-read it. **It is never a timed toast.**

**The impact markers** are exposed as a count plus the newest one's relation, appended to the `Angle` slider's `aria-describedby`: *"Three impact markers. The last one landed short."* Not a list; a list of ring coordinates is noise.

**The bracket** (§4.5d) is exposed on the `Power` slider's `aria-describedby`: *"Bracket: between 78 and 91 percent."* For a screen-reader user this is not a convenience, it is the difference between a playable game and a memory test with no notepad.

### 3.7 Portrait layout, thumb reach, and the bottom-edge safe zone

*(Sonny's ask #1.)* Reference viewport **390 × 844** (iPhone 14/15 class), the most likely judge device.

#### 3.7.1 The layout

```
┌───────────────────────────────────────┐  0     ← visual viewport top
│ safe-area-inset-top                   │
│ ┌─────┐                     ┌───────┐ │  16      YOUR SHOT strip (left), Spotter (right)
│ │YOUR │                     │   ◍   │ │          Spotter 96px, inset 16
│ │SHOT │                     │  cup  │ │  128     opponent cup 40×48, under the Spotter
│ └─────┘                     │ Short.│ │  188     call chip
│                             └───────┘ │
│              STEAM 4 →                │  232     steam chip, top-centre
│┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄│  236   ══ DRAG ORIGIN BAND opens (28%)
│         · · ·                         │
│      ·        ·                       │          preview arc
│   ◒                       ▓▓▓▓▓▓▓▓▓▓  │  355     ground line at 42% (ART-DIRECTION.md:97)
│  you                      fog half    │
│  RIDGE +3                    BREW 0   │  380     stance chips
│                                       │
│┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄│  549   ══ DRAG ORIGIN BAND closes (65%)
├───────────────────────────────────────┤  549     HUD block begins
│  [ 62° ]   [ 78% ]                    │  566     numeral chips
│  ╭───────────────╮                    │  606     pressure gauge 96px
│  ╰───────────────╯                    │
│  [∞][×3][×2][×1]              [MENU]  │  668     ammo rack + menu, 44px each
│  MOKA POT MORTAR                      │  724     machine name chip
│                                       │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  756   ══ BOTTOM DEAD ZONE begins
│░░ no targets · no drag origin ░░░░░░░░│
│░░ safe-area-inset-bottom (34) ░░░░░░░░│  810
└───────────────────────────────────────┘  844
```

#### 3.7.2 The four zones

| Zone | y (390×844) | Rule |
|---|---|---|
| **Readout / unreachable** | 0 – 236 | **Nothing interactive, ever. No drag may start here.** Holds the Spotter, the opponent cup, the call chip, the turn strip, the steam chip. A right thumb cannot reach it one-handed, and nothing here needs reaching |
| **Drag origin band** | 236 – 549 (28% to 65%) | The only region where an aim drag may **begin**. Comfortable for a thumb, 200px clear of the bottom edge, 236px clear of the top |
| **HUD** | 549 – 756 | Chips, gauge, ammo rack, `MENU`. All targets ≥44px with ≥8px spacing. **Releasing a drag here cancels it** |
| **Bottom dead zone** | 756 – 844 (88px) | **No interactive element, no drag origin, no drag release target.** Pure `--paper` and the machine-name chip's bottom margin |

#### 3.7.3 Why the bottom 88px is dead, specifically

The bottom edge of a mobile browser is owned by the operating system and by the browser, not by us. Four separate things live there and every one of them will fight an aim drag:

| Hazard | Where | What goes wrong |
|---|---|---|
| **iOS home indicator** | Bottom 34px | A touch that *starts* in the bottom ~20px and moves upward is a system home / app-switcher gesture. iOS gives the page the first touch and then steals the sequence. The player's drag becomes a half-drag, the aim arms and then the pointer vanishes with no `pointerup`. The game must not put a drag origin there |
| **iOS Safari bottom toolbar** | ~48px above the indicator | Tapping near it summons the toolbar and shrinks the visual viewport mid-drag |
| **Android Chrome URL bar collapse** | Top, but triggered from anywhere | A vertical drag that the browser reads as a scroll collapses or expands the URL bar, reflowing the stage by 56px in the middle of an aim |
| **Android gesture navigation** | Bottom ~24px | Same interception problem as the iOS home indicator |

The 88px band is 34px of `env(safe-area-inset-bottom)` plus a **54px buffer**, which clears the iOS toolbar and both gesture strips with room. On a device with no inset (most Android, older iPhones) the band is still 88px; a constant is easier to reason about than a computed value and the cost is 54px of paper.

**A drag that starts in the origin band and travels down into the dead zone is fine.** Only the origin is constrained, and by the time the pointer reaches the bottom edge the browser has already lost the gesture-arbitration race, because the sequence began 300px higher. The only thing we forbid is *starting* there.

#### 3.7.4 The CSS and event contract Emmett implements

```css
html, body {
  overscroll-behavior: none;      /* kills pull-to-refresh and rubber-band */
  overflow: hidden;               /* the game never scrolls; the URL bar never collapses */
  height: 100dvh;                 /* dynamic viewport unit, not 100vh */
  touch-action: none;             /* no browser panning or zooming anywhere in the game */
  -webkit-user-select: none; user-select: none;
  -webkit-touch-callout: none;    /* no iOS long-press callout on the canvas */
}
.stage { padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)); }
```

- **`100dvh`, never `100vh`.** `100vh` on iOS Safari is the *largest* viewport, so a `100vh` stage is partly under the toolbar at rest, which puts the HUD's bottom row into the dead zone by accident.
- **Pointer Events, with `setPointerCapture` on the arming pointer.** Capture is what guarantees we still receive `pointermove` and `pointerup` when the finger leaves the origin band. Without it, a drag that exits the element silently dies and the player has no idea why nothing fired.
- **`pointercancel` is treated as a cancel, not a fire.** This is the event iOS sends when it steals a gesture, and treating it as a release would fire a shot the player never authorised. This is the single most likely accidental-fire bug in the build.
- **A `visualViewport` `resize` while an aim is armed cancels the aim.** The keyboard is never open during a duel, so the only causes are chrome appearing or an orientation change; both invalidate the anchor coordinates. Cancel, re-lay out, never fire.
- **`orientationchange` cancels the aim**, re-fits the stage, and preserves the *committed* angle and power values (they live in the range inputs, which survive a relayout) so the player loses their gesture but not their setting.
- **No `preventDefault` outside the origin band and the HUD.** Blanket-preventing touch on the whole document breaks the browser's own affordances and gets a game closed.

#### 3.7.5 Two consequences worth stating plainly

- **A full-power drag never leaves the comfortable zone.** Starting at (110, 520) and dragging up-and-right 156px ends around (245, 440). A right thumb does this without regripping and never approaches an edge. That is the entire reason for anchor-relative drag.
- **The Spotter is not interactive.** No tap-to-enlarge, no long-press. It sits in the readout zone by design and it is a window, not a control. A tappable thing in the top-right of a portrait phone is a thing nobody taps.

### 3.8 Landscape

Reference **844 × 390**. Ground line at 22% of height (`ART-DIRECTION.md:96`), HUD as a bottom strip 96px tall rather than a 35% block.

- Spotter 112px, top-right, inset 24. Opponent cup to its **left** (`ART-DIRECTION.md:412`), call chip under it.
- Numeral chips and gauge bottom-centre (Lola's original placement works here; the thumb problem is portrait-only).
- Ammo rack bottom-left, `MENU` bottom-right, both thumbs reach their own corner.
- **Drag origin band:** the stage minus the top 64px, minus the bottom HUD strip, minus a 120×120 exclusion around the Spotter stack. The **bottom dead zone is 56px** here (`env(safe-area-inset-bottom)` in landscape is the home indicator only, and the browser toolbars are thinner or absent).
- **Left and right insets matter in landscape:** `env(safe-area-inset-left/right)` is non-zero on a notched phone held either way. The ammo rack and `MENU` respect them, and the origin band starts 24px inboard of each.
- **Height under 420px** (iPhone SE landscape, 667×375) is the layout that will break. Spotter drops to 88px, the call chip becomes an inline suffix on the stance chip, the machine-name chip is dropped. Sonny: test 667×375 explicitly.

### 3.9 One decision that simplifies everything: you are always on the left

**DEVIATION / new rule.** `GAME-DESIGN.md:78` says stages "mirror for left/right". I am making that deterministic: **the player is always rendered on the left, the opponent always on the right, in both orientations.**

Why:

- The Spotter, the fog half and the opponent's cup are always in the same corner, so the layout never has two mirror variants to design, test or learn.
- The aim drag is always left-to-right and up, which is the comfortable arc for a right thumb and a mouse.
- The `‹‹` / `››` correction glyphs on the call chips (§4.2) have a stable meaning.
- It costs nothing: the camera sits on the other perpendicular of the same duel line, so the backdrop is still a genuine slice of the real valley, just seen from the other side (`ART-DIRECTION.md:100` still holds).

A `Swap sides` setting in Pause mirrors everything for left-handed players. One sign flip, and it also flips the two glyphs.

---

## 4. The Spotter

This is the mechanic that decides whether the judge plays a third duel. Everything below is aimed at one sentence: **a miss must always pay.**

### 4.1 Placement

| | Portrait | Landscape |
|---|---|---|
| Spotter | 96px circle, top-right, inset 16px from right and safe-area top | 112px circle, top-right, inset 24px |
| Opponent cup | Directly **below** the Spotter, 12px gap (width is scarce) | Directly **left** of it, 16px gap (`ART-DIRECTION.md:412`) |
| Call chip | Under the pair, 28px, left-aligned to the Spotter | Directly under the Spotter |
| Stack height | 96 + 12 + 48 + 8 + 28 = 192px, entirely inside the readout zone | 112 + 8 + 28 = 148px |
| Exclusion | 120×120 region excluded from the drag origin band so a stray drag cannot start under it | Same |
| Small landscape (<420 high) | n/a | 88px, call chip merges into the stance chip |

Nothing ever overlaps the Spotter, and it never moves, never zooms and never pans for the whole duel (`ART-DIRECTION.md:350`). Its only change is the ±2 to ±4 crop widening when the Aeropress is equipped (`GAME-DESIGN.md:50`).

### 4.2 The three calls

**DEVIATION, one word. Adopted by Smith, 2026-09-05.** `Wide.` was an off-line word carrying a range meaning (`GAME-DESIGN.md:45` defined it as *short*). On a hidden-opponent artillery game the player's whole job is bracketing along one axis, and a word suggesting the other axis costs real comprehension in the first duel. **The house set is now `Close.` / `Short.` / `Long.`** Three range words, one axis, no ambiguity. `Wide.` is retired; it should not survive anywhere in the strings.

| Call | Glyph | Meaning | Feel |
|---|---|---|---|
| `Close.` | `●` | Landed inside the Spotter crop. Bean flinches in the window | You are on them |
| `Short.` | `‹‹` | Landed short of them | Push it out |
| `Long.` | `››` | Landed past them | Pull it back |

- **Appear:** 120ms after the impact resolves, with the stamp sound (`ART-DIRECTION.md:343`). `Close.` is preceded by the 80ms flinch in the window.
- **Disappear:** **when your next shot leaves the machine. Not on a timer, not on tap.** This matters enormously in async: you may return six hours later and the last call must still be on screen when you re-open the duel. A timed toast would silently delete the most important information in the game. It is also why the call lives in a persistent DOM node, not a transient one (§3.6.5).
- **One at a time.** A new call replaces the old with a hard cut. Text never moves after it lands (`ART-DIRECTION.md:331`).
- **The glyphs are correction instructions, not descriptions.** Because you are always on the left (§3.9), `‹‹` always means "less" and `››` always means "more". A player who never reads the words still learns the game.
- Colour is not used at all in the calls. They pass §7.4's colour-independence rule by construction.

### 4.3 Impact markers

Inherited: 0.6-unit double ring in `--ink` at 60% with a centre dot, skinned per stance, permanent for the duel, fog thins to 20% in a 1.5-unit radius (`ART-DIRECTION.md:414`, `ART-DIRECTION.md:342`).

**One addition, and it is the highest-value line in this section:**

> **The most recent marker draws with a filled centre dot. Every older marker draws hollow.**

One bit of state, no colour, no motion, no extra draw call. It converts a field of five identical rings from "history I have to remember" into "that was my last shot, and those were the others", which is exactly the read a player needs to correct. Paired with the ghost trail that terminates at it (`ART-DIRECTION.md:339`), the pair says *that was me, that is where it went, that is what I do next*.

Six ground-coffee pellets produce six markers (`GAME-DESIGN.md:52`); all six from the same shot count as "most recent" and all six draw filled.

### 4.4 How a first-timer understands "you cannot see them", with no tutorial

Four reads, in the order they land. Each works alone; together they make the concept unmissable.

1. **The Pour teaches it before it is a problem.** The judge's very first duel opens with the opponent's shot *arriving out of a cloud*. The cause is established before the constraint is felt. This is the strongest argument for the scripted first challenge in §2.2: without it, the first thing a first-timer experiences is an absence, and absences do not teach.
2. **The Spotter is a live window with a bean visibly in it.** The main stage has no bean; the cup does. A human resolves that in under a second. This only works if the window is **alive**: the opponent blinks every 4 to 7 seconds, their steam wisp rises, their scarf leans with the wind, their arms hold an aim stance. A static crop reads as an avatar. A moving crop reads as a camera. **The Spotter must never be a still frame, even during your aim.**
3. **The stance chip on the fogged side** (`BREW 0`) says the game knows where they are and is choosing not to show you. That is a puzzle framing. An unlabelled fog is a bug framing.
4. **Hint tag 3, `They are in the steam.`**, staked on a stirrer pointing at the Spotter, printed 400ms after the first call chip. Dismisses on your second shot.

For a screen-reader user, reads 1 to 3 are invisible, so the constraint is stated once in words in the Spotter description (§3.6.5): *"You cannot see how far away she is."*

### 4.5 Puzzle, not punishment: five guarantees

The failure mode is concrete: the judge fires three times into fog, gets `Short. Short. Long.`, feels like they are guessing, and closes the tab. Five design guarantees prevent it.

**(a) Every shot returns three pieces of information.** A marker, a fog reveal, and a call. There is no shot in the game that returns nothing. This is already true in Lola's and Smith's specs and it must survive every optimisation pass.

**(b) The call must be honest along the axis the player controls.** The call is computed as `sign(impact.x − opponent.x)` in stage space, full stop. Not screen space, not distance from the crop centre. If it is anything else, bracketing lies, and a lying hot/cold signal is worse than none. Emmett: the call is computed in the sim and stored with the turn so the async replay shows the same word (§10 Q2).

**(c) The first duel is a guaranteed teach.** `GAME-DESIGN.md:57` already centres the Green bot and widens `Close.` to ±3. Add: **on the first duel only, the first two impact markers thin fog at 2.5 units instead of 1.5.** By shot three the opponent's silhouette is genuinely emerging out of the steam as a direct consequence of the player's own shots. That is the feeling of solving something. (`GAME-DESIGN.md:220` balance philosophy call; §10 Q4.)

**(d) Show the bracket.** Once the player has one `Short.` and one `Long.`, the pressure gauge draws a **bracket band** between those two power values in `--ink` at 25%, with the two bounds ticked, and the same range is exposed to screen readers on the `Power` slider (§3.6.5).

This is my single largest addition and I will defend it directly. Hidden-opponent artillery on a phone, without a notepad, is a memory test. Memory tests are punishments. The bracket band externalises exactly what a good player would write down; it does not aim for you, it does not account for a changed angle, and it does not account for steam, which is where all the actual skill lives. What it does is let the player *see themselves running a search*, which is the difference between "I am guessing" and "I am closing in". It resets when the angle changes by more than 5°, because the bracket is only valid for the angle it was measured at. A `Bracket on / off` setting in Pause, default **on**.

**(e) Four shots to a kill against a Green bot, and shot four is fired at something visible.** `GAME-DESIGN.md:57` promises ≤4. Tie the fog tuning to it: if playtest shows the kill landing on shot five or later, **the fog radius goes up, not the damage.** Raising damage makes the game shorter; raising the reveal makes it clearer. Only one of those is the fix.

---

## 5. Game feel

Built on `ART-DIRECTION.md` §8. Everything below is either a protection order on an existing timing or a specific addition. Physics of the whole game stays **heavy and snappy** (`ART-DIRECTION.md:331`).

### 5.1 The fire

The most-repeated moment in the game. Roughly 40 times per session.

| t | What |
|---|---|
| 0 | Release. Machine recoil per machine (`ART-DIRECTION.md` §5). Bean squash 1.15 / 0.85 for 80ms, pointing arm snaps back. SFX. Haptic `[18]` |
| 0 | The numeral chips **freeze at the fired values and go `--ink-dim`**. A receipt of what you just did, sitting there while the shot flies |
| 0 to 60 | **FEEL MOVE: the preview dots are eaten by the projectile.** They do not fade out. The projectile passes through each of the 8 dots and consumes it. Free (they are already drawn), and it makes the shot feel like it obeyed the plan you made |
| 60 | The old ghost trail is replaced by this shot's |
| throughout | Camera locked (`ART-DIRECTION.md:349`) |

### 5.2 The arc

≤2.5s, sim-driven. Two additions:

- **The projectile scales to 1.4× at apex** and back down. Every good artillery game cheats this so the shot never vanishes into the sky at the top of the frame. Portrait needs it most: the apex is close to the top edge.
- **The trail dots are laid at fixed time intervals (60ms), not fixed distance.** They bunch at apex and spread near the ground, which is a free readout of the shot's speed and the exact information a player needs to judge whether they overshot.

### 5.3 The hit

Hit-stop 60ms, shake 180ms at 6px, 3 oscillations, exponential decay, applied to the camera (`ART-DIRECTION.md:340`).

- **The 60ms hit-stop is the single highest-ratio feel investment in the whole build.** Everything freezes, including the steam and the Spotter. It costs one boolean and it is the difference between "correct" and "good". It is also the first thing that quietly disappears in a sim-loop refactor. **Protect it in the QA matrix.**
- The 100ms delay before the cup drains, so the eye travels impact → cup, is Lola's and it is right. Protect it.
- The 2-frame `--paper` flash on the hit bean is **rate-limited to one flash per 400ms per bean**. See §7.5: unlimited, ground coffee's six staggered pellets produce a 25Hz strobe, which is a seizure risk.
- Haptics: your hit `[14, 30, 30]`. Being hit `[40, 60, 25]`, heavier and slower, so the two are distinguishable without looking.

### 5.4 The miss

Per stance (`ART-DIRECTION.md:341`): flood splash 600ms, mountain tumble 800ms, canopy leaf burst 700ms.

Two protection orders:

- **The shooter's face does not change on a miss.** Every instinct in the build will be to add a sad face. Do not. The joke is that nobody reacts except the terrain, and it stops being funny the moment the bean acknowledges it. (The *tumbling* bean's legs windmill, but that is physics, not emotion, which is exactly the line `ART-DIRECTION.md:225` draws.)
- **The mountain tumble runs the full 800ms** even though it delays the turn. It is the funniest asset in the game (`BRIEF.md:51` names it explicitly) and shaving it to 500ms to speed up the loop would be trading the reason people replay for two-fifths of a second.

### 5.5 The KO

Fog lift 600ms → `Ground.` 1.4s → receipt prints (`ART-DIRECTION.md:344`, `:345`).

- **FEEL MOVE: a 40ms hold at full clarity between the fog lifting and the shake starting.** One beat of *oh, there you are*. The camera never moves in this game, so the fog lift is the only drama we have, and a reveal without a beat is not a reveal.
- The bean-becomes-a-heap-of-grounds mesh swap is the Eye Candy screenshot. **Protect the 120-pellet count on mobile** even when particles are being cut elsewhere. If the budget forces a cut, cut the winner's celebration particles, not the loser's grounds.
- Haptics: win `[30, 50, 30, 50, 90]`. Loss `[120]`, one flat buzz. The deadpan holds in the vibration motor.

### 5.6 The Pour

≤3.5s, never faster than 3s on first view (`ART-DIRECTION.md:338`). This is the async hook, and the whole Most Creative claim rests on it.

- **Skippable by tap after the first ever view. The `YOUR SHOT` stamp always plays**, even on a skip. Lola specced this; protect it, because the stamp is the handover and skipping straight into an armed aim is disorienting.
- **400ms input lockout after the stamp**, so the tap that skipped the replay does not land as an aim anchor. Keyboard focus moves to `Angle` at the end of that lockout, not before.
- The top band's line is a **human time**, never a timestamp: `just now` · `12m ago` · `3h ago` · `yesterday` · `4d ago`. `Intl.RelativeTimeFormat`.
- The impact marker from their shot draws on **your** side during the replay (`ART-DIRECTION.md:414`), so you learn where they are ranging you from too. It never shows their Spotter view of you (`GAME-DESIGN.md:59`).
- Haptic on the stamp: `[18]`. It is the only haptic in the Pour, and it is what makes the handover physical.

### 5.7 The rank-up

`Roasted.`, 400ms, on the world map after landing (`ART-DIRECTION.md:347`). This is the retention moment and in the current spec it is the quietest thing in the game. Three additions:

- **Hold the old colour for 200ms after the bean lands**, then lerp. A colour change you did not watch happen is a colour change that did not happen.
- **The roast badge on your chip re-stamps at the same instant** (scale 1.3 → 1.0 over 120ms). Two synchronised events read as one bigger event.
- **The longest haptic in the game, and the only one over 200ms: `[25, 40, 25, 40, 200]`.** It is earned about five times per player. No confetti, no stars (`ART-DIRECTION.md` §12).

### 5.8 Haptics: the complete table

`navigator.vibrate`. Guard with `'vibrate' in navigator` (iOS Safari ignores it; Android Chrome is the real audience). Gated by a `Haptics on / off` setting, **default off when `prefers-reduced-motion: reduce` is set** (vestibular sensitivity and vibration sensitivity co-occur often enough that opt-in is the right default).

| Event | Pattern (ms) |
|---|---|
| Chip / button press | `[8]` |
| Aim armed (crossing the dead zone) | `[6]` |
| Power crosses 85% into the danger zone | `[10, 40, 10]` |
| Fire | `[18]` |
| Your shot hits | `[14, 30, 30]` |
| Your shot misses | `[8]` |
| You are hit | `[40, 60, 25]` |
| Call chip prints `Close.` | `[10, 30, 10]` |
| French press misfire | `[60, 30, 60]` |
| KO win (`Ground.`) | `[30, 50, 30, 50, 90]` |
| KO loss (`Decaf.`) | `[120]` |
| Rank up (`Roasted.`) | `[25, 40, 25, 40, 200]` |
| Inbox stub prints on landing | `[12, 60, 12]` |
| `YOUR SHOT` stamp after the Pour | `[18]` |

Budget rules: nothing over 200ms, nothing that repeats, no pattern fires more than once per turn, and no haptic on any passive state change.

### 5.9 `ONE MORE GO`: placement and default focus

- **Placement:** the last element of the result receipt, full-width on mobile, sitting **above the safe-area inset and inside the thumb-comfortable zone** (y roughly 620 to 700 on a 390×844, clear of the 88px bottom dead zone). `Back to the Grounds.` secondary directly beneath it. `Share.` as a tertiary text link under both.
- **It receives DOM focus automatically** when the receipt finishes printing (at 500ms), so `Enter` or `Space` starts the next duel with zero navigation and a screen reader announces the loop before the itemisation.
- **Why autofocus is correct here and not an accessibility smell:** moving focus without user intent is the smell. Here the user's own action caused a full context change into a new view, and moving focus into that view is the expected behaviour, not a violation. It lands on the primary action rather than the heading because `RESULT: ROASTED` is already announced by the result live region.
- **Guard:** focus lands only after the print completes, and the button ignores input for a further 250ms. Otherwise a judge mashing `Space` to skip the receipt animation instantly starts a duel they did not choose.
- **The label never changes.** It picks the next inbox duel if there is one, else the nearest bot (`ART-DIRECTION.md:437`), and it says the same three words either way. The deadpan is that the game does not explain itself.
- **Why it is the default focus at all:** `BRIEF.md:53` (pillar four, every duel ends with the next one one tap away) and the One More Go prize. The receipt is a *report*; the button is the *loop*. If the judge has to read to find the next game, the loop leaks.

### 5.10 The feel check

Two moves I would fight for, beyond the spec:

1. **The preview dots are eaten by the projectile** (§5.1). Nobody will consciously notice it. Everybody will feel that their shot did what they told it to.
2. **The 40ms hold at full clarity before the KO** (§5.5). In a game where the camera never moves, this is the only cinematic beat we have, and it costs 40 milliseconds.

And the one I would protect above everything: **the Pour**. It is the only 3.5 seconds in the game where the player is being *given* something instead of doing something, and that is the entire emotional mechanism Draw Something ran on. Inside the duel, the one that must never be lost to a refactor is the **60ms hit-stop**.

---

## 6. Microcopy: the complete v1 string table

House rules inherited (`ART-DIRECTION.md:31`, `:32`, `:33`): one to three words with a full stop for system messages; **no exclamation marks anywhere; no emoji anywhere**; numbers always in mono with their unit.

**Two implementation rules that are mine:**

- **Strings are stored in sentence case and uppercased in CSS** (`text-transform: uppercase`). A DOM string of `ONE MORE GO` gets spelled out letter by letter by some screen readers and it mangles the mono letter-spacing rule. Never store uppercase.
- Every string below that is a control has a **screen-reader label** in the third column. Where it is identical to the visible string, the cell says *same*. Where the visible string is too terse to survive without visual context, the SR label expands it. That is the whole point of the column: `Close.` alone in an audio-only context is meaningless.

### 6.1 Boot, landing, profile

| Key | Visible | Screen reader | Notes |
|---|---|---|---|
| `boot.label` | `Brewing.` | `Loading the game.` | `aria-live="polite"`, no percentage |
| `landing.title` | `The Grounds` | *same* | Small stamp, top of the receipt |
| `landing.name.label` | `Name` | `Your bean's name` | Persistent label, never placeholder-only |
| `landing.name.helper` | `3 to 14 characters.` | *same* | Always visible under the field |
| `landing.name.reroll` | `Another` | `Roll another bean` | Rerolls the whole receipt. 44px |
| `landing.class.legend` | `Class` | `Choose a variety` | `<fieldset><legend>` |
| `landing.class.arabica` | `Arabica` | `Arabica. Accurate. 90 cup. Can move one step per turn.` | Radio |
| `landing.class.robusta` | `Robusta` | `Robusta. Tough. 120 cup. Cannot move.` | Radio |
| `landing.class.liberica` | `Liberica` | `Liberica. Erratic. 100 cup. Sometimes doubles damage.` | Radio |
| `landing.origin.legend` | `Origin` | `Choose an origin` | Chip labels: `Colombia`, `Ethiopia`, `Brazil`, `Vietnam`, `Kenya`, `Guatemala`, `Costa Rica`, `Indonesia`. The visible chip shows the 3-letter code |
| `landing.face.legend` | `Face` | `Choose a face` | `Deadpan`, `Squint`, `Grin`, `Sleepy`, `Wide`, `Wink` |
| `landing.accent.legend` | `Accent` | `Choose an accent colour` | Each swatch labelled by name: `Crema`, `Cherry`, `Leaf`, `Milk`, `Caramel`, `Ink`, `Porcelain`, `Cascara`. **Never colour alone** |
| `landing.cta` | `Enter the war.` | `Enter the war` | House line (`ART-DIRECTION.md:32`). Primary. Enabled from first paint |
| `landing.cta.loading` | `Brewing.` | `Still loading. It will start on its own.` | Only if assets are not ready. Auto-continues |
| `landing.name.blocked` | `Try another name.` | *same* | The **only** error on this screen. Non-blocking; the generated name is used |
| `profile.title` | `Your bean` | *same* | Sheet heading |
| `profile.save` | `Save` | `Save your bean` | Primary |
| `profile.cancel` | `Cancel` | `Cancel, keep the old bean` | Secondary |
| `profile.saved` | `Saved.` | `Bean saved.` | Toast, 2.5s, `aria-live="polite"` |
| `profile.locked` | `Light roast.` | `Locked. Reach Light roast to unlock accessories.` | On locked accessory chips, `aria-disabled="true"` |
| `profile.device` | `This bean lives in this browser.` | `This bean lives in this browser. Clear your data and it is gone. There is no account to sign in to.` | Bottom of the profile sheet, above `Save`. Non-interactive, always visible, never behind an info icon. **Never on the landing receipt** (§13.3) |
| `profile.device.sub` | `Clear your data and it is gone.` | *(read as part of the line above; one `<p>`, one thought)* | Mono 12, `--ink-dim` |

### 6.2 World

| Key | Visible | Screen reader | Notes |
|---|---|---|---|
| `world.inbox.one` | `1 bean is shooting at you.` | *same* | `ART-DIRECTION.md:32`. Hidden entirely at 0 |
| `world.inbox.many` | `{n} beans are shooting at you.` | *same* | ICU plural |
| `world.today` | `Today's roast #A3F1` | `Today's seed, A3F1` | Non-interactive chip |
| `world.leaderboard` | `Leaderboard` | `Open the leaderboard` | Floats on The Roaster |
| `world.sound.on` | `Sound on` | `Sound is on. Turn it off.` | Toggle, `aria-pressed` |
| `world.sound.off` | `Sound off` | `Sound is off. Turn it on.` | |
| `world.menu` | `Menu` | `Open the menu` | |
| `world.bean.label` | `{NAME} · {ORI}` | `{Name}, {Origin}, {Class}, {Roast} roast, on {Stance}. {n} wins, {m} losses.` | The visible label is 2 tokens; the SR label is the whole challenge card, so a screen-reader user does not need to open it to decide |
| `world.bean.bot` | `Bot` | `Bot` | `--ink-dim` tag |
| `world.move.start` | `Walking.` | `Walking to a new slot.` | 5s, cancellable |
| `world.move.done` | `{Stance} now.` e.g. `Ridge now.` | `You are on the Ridge now. Height plus 3.` | Toast 2.5s |
| `world.hint.1` | `Tap any bean to challenge.` | *same* | Hint tag 1 |
| `world.more.one` | `+1 more bean.` | `1 more bean is in the Grounds. Open the roster.` | Bottom-left chip, 44px, clear of the bottom dead zone. Only when the 60-bean render cap bites (§13.1) |
| `world.more.many` | `+{n} more beans.` | `{n} more beans are in the Grounds. Open the roster.` | ICU plural |
| `roster.title` | `Everyone in the Grounds.` | *same* | Sheet header |
| `roster.search.label` | `Find a bean` | `Find a bean by name` | Persistent label. `type="search"`, `autocomplete="off"` |
| `roster.search.helper` | `Name or origin.` | *same* | Helper text under the field |
| `roster.count` | `{n} beans.` | `{n} beans in the Grounds.` | Under the header, mono, `--ink-dim` |
| `roster.row.challenge` | `Challenge` | `Challenge {name}, {class}, {roast} roast, on {stance}` | Row action. Reuses the inbox-row component minus the cups |
| `roster.empty.search` | `No bean by that name.` | *same* | Body: `Try another name.` |
| `roster.empty.offline` | `Only the bots today.` | `The Grounds are offline, so only the 12 bots are listed.` | Offline state of the roster sheet |
| `world.offline.chip` | `No steam.` | `The Grounds are offline. The bots are still here and every duel against them works.` | House line (`ART-DIRECTION.md:32`). Paper chip, top-centre, where the inbox stub would be |
| `world.offline.body` | `The bots are still here.` | *(read as part of the line above)* | Mono 12, `--ink-dim`, under the chip. This is the whole offline message: no `Retry`, no spinner, no apology (§13.2) |
| `world.offline.board` | `Board offline.` | `The leaderboard is offline.` | The Roaster's CSS2D label swaps from `Leaderboard`. `--ink-dim` text and border, `aria-disabled="true"`, not focusable |
| `world.offline.human` | `No steam.` | `Cannot challenge a player while offline.` | The challenge card's primary, disabled, when the target is a human and the backend is down |
| `world.offline.substitute` | `Challenge a bot.` | `Challenge {bot name} instead. Same stance, {roast} roast.` | **Secondary on the same card. The disabled state always offers a local path** (§13.2) |
| `world.online.back` | `Back on.` | `Reconnected. The Grounds are back.` | Toast 3s when the health probe recovers. Also re-renders the humans |
| `world.empty.inbox` | *(nothing rendered)* | n/a | An empty inbox is not advertised (`ART-DIRECTION.md:424`) |

### 6.3 Challenge card

| Key | Visible | Screen reader | Notes |
|---|---|---|---|
| `challenge.record` | `Record {w} W · {l} L` | `Record: {w} wins, {l} losses` | |
| `challenge.stances` | `{YOURS} vs {THEIRS}` e.g. `Ridge +3 vs Brew 0` | `You on the Ridge, plus 3. Them on the Brew, 0. You are shooting downhill.` | The SR line states the tactical consequence the visual states through the silhouette |
| `challenge.machine.legend` | `Machine` | `Choose your machine` | |
| `challenge.cta` | `Challenge` | `Challenge {name} and take your first shot` | Primary. Goes straight to the duel |
| `challenge.back` | `Back` | `Back to the map` | Secondary |
| `challenge.dnd` | `They are not fighting.` | `This bean has do-not-disturb on.` | Only if the optional DND toggle ships |

### 6.4 Duel

| Key | Visible | Screen reader | Notes |
|---|---|---|---|
| `duel.turn.yours` | `Your shot.` | `Your shot.` | House line. Turn strip, `aria-live="polite"` |
| `duel.turn.theirs` | `Their shot.` | `{Name}'s shot.` | |
| `duel.timer.rule` | *(a shrinking 3px rule under the turn strip, no number)* | *(not announced per second; see the three rows below)* | **M3 live duels only.** The element does not exist in async, so there is no layout shift (§13.4) |
| `duel.timer.start` | *(rule at full 96px)* | `Twenty seconds.` | Announced once, at the turn start |
| `duel.timer.warn` | *(rule goes dashed 4-2)* | `Five seconds.` | Shape change, not colour. Haptic `[10, 40, 10]` |
| `duel.timer.zero` | `Time.` | `Time. Your turn passed. No damage.` | House voice, one word. **The turn is skipped, never forfeited** (§13.4) |
| `duel.timer.stepped` | `They stepped out.` | `{Name} missed two turns. The duel has become async. Take your shot and leave.` | Existing string (`ART-DIRECTION.md:450`), reused after two consecutive timeouts |
| `duel.angle` | `{n}°` | `Angle, {n} degrees` | Slider label |
| `duel.power` | `{n}%` | `Power, {n} percent` | Slider label |
| `duel.power.danger` | `{n}%` + hatched gauge segment | `Power {n} percent. Over-pressure zone.` | Not colour alone |
| `duel.bracket` | *(band on the gauge)* | `Bracket: between {a} and {b} percent.` | On the `Power` slider's `aria-describedby` |
| `duel.steam` | `Steam {n} →` / `Steam 0 ·` | `Steam {n}, blowing right. It moves your shot.` | Carries the retired hint |
| `duel.fire` | `Fire` | `Fire` | Keyboard/SR button; visually the release of the drag |
| `duel.hint.aim` | `Drag to aim.` | `Drag anywhere on the stage to aim. Release to fire. Or use the angle and power controls.` | Hint tag 2 |
| `duel.hint.spotter` | `They are in the steam.` | `You cannot see your opponent. The cup window in the corner shows a close crop of them.` | Hint tag 3 |
| `duel.spotter.desc` | *(no text)* | `Spotter. {Name}, {Class}, {Roast} roast, from {Origin}. Standing {stance description}. {Machine}, aimed {direction}. You cannot see how far away they are.` | Regenerated per turn. Last sentence becomes `Range unknown.` after turn 1 |
| `duel.spotter.flinch` | *(flinch in window)* | `Spotter: they flinched.` | On `Close.` |
| `duel.spotter.pose` | *(pose change)* | `Spotter: they are aiming {higher / lower / away}.` | On their turn resolving |
| `duel.spotter.clear` | *(fog lifts)* | `The steam has cleared. You can see them.` | At KO only |
| `duel.call.close` | `Close.` `●` | `Close. Your shot landed inside the cup window.` | Persists until your next fire |
| `duel.call.short` | `Short.` `‹‹` | `Short. Your shot landed short of them. Add power.` | Replaced `Wide.` (Smith, 2026-09-05) |
| `duel.call.long` | `Long.` `››` | `Long. Your shot landed past them. Take power off.` | |
| `duel.shot.hit` | *(no text)* | `Hit. {n} damage.` | `aria-live="polite"` |
| `duel.shot.miss` | *(no text)* | `Missed. Landed on the {stance}, {short of / past} them.` | |
| `duel.markers` | *(rings in scene)* | `{n} impact markers. The last one landed {short / past / close}.` | On the `Angle` slider's `aria-describedby` |
| `duel.cup.yours` | *(no text)* | `Your cup, {n} of 100.` | Announced on change |
| `duel.cup.theirs` | *(no text)* | `{Name}'s cup, {n} of 100.` | |
| `duel.cup.low` | *(tilted cup, dashed rim)* | `Your cup is nearly empty.` | Announced once, at the crossing |
| `duel.stance` | `Ridge +3` / `Belt +1.5` / `Brew 0` | `You are on the Ridge, height plus 3.` | |
| `duel.ammo.standard` | `Green ∞` | `Green bean. Unlimited. 20 damage.` | |
| `duel.ammo.dark` | `Dark ×{n}` | `Dark roast. {n} left. 35 damage, heavy, shorter range.` | |
| `duel.ammo.ground` | `Ground ×{n}` | `Ground coffee. {n} left. Six pellets. Best for finding them.` | |
| `duel.ammo.cup` | `Cup ×{n}` | `Full cup. {n} left. Splash damage over 2 units.` | |
| `duel.ammo.out` | `None left.` | `No {ammo} left. Green bean selected.` | Auto-falls back to green |
| `duel.misfire` | `Misfire.` | `Misfire. You held the plunger too long. Turn lost.` | French press over-hold (`GAME-DESIGN.md:111`) |
| `duel.sudden` | `The flood boils.` | `Sudden death. Both cups lose 5 per turn and the steam has doubled.` | Once, at the crossing |
| `duel.machine` | `{Machine name}` | `Your machine: {name}` | Chip |
| `duel.ko.win` | `Ground.` | `Ground. You won.` | House line, stamp |
| `duel.ko.lose` | `Decaf.` | `Decaf. You lost.` | House line, stamp |

### 6.5 The Pour and the hand-off

| Key | Visible | Screen reader | Notes |
|---|---|---|---|
| `pour.header` | `{NAME} fired · {time}` | `{Name} fired {time}. Watching their shot.` | `just now` / `12m ago` / `3h ago` / `yesterday` / `4d ago` |
| `pour.skip` | *(no visible affordance)* | `Skip the replay` | An invisible full-stage button, only after the first ever view |
| `pour.stamp` | `Your shot.` | `Your shot.` | Always plays, even on skip |
| `handoff.title` | `Sent.` | `Shot sent. The duel is waiting for them.` | House-voice, one word |
| `handoff.summary` | `Shot {n} · {Call}` | `Shot {n}. {Call expanded}.` | e.g. `Shot 3 · Short.` |
| `handoff.next` | `Next duel.` | `Play the next duel in your inbox. {n} left.` | Primary when the inbox has more |
| `handoff.back` | `Back to the Grounds.` | *same* | House line. Primary when the inbox is empty |

### 6.6 Inbox

| Key | Visible | Screen reader | Notes |
|---|---|---|---|
| `inbox.header.one` | `1 bean is shooting at you.` | *same* | |
| `inbox.header.many` | `{n} beans are shooting at you.` | *same* | |
| `inbox.playall` | `Play all.` | `Play all {n} duels, one after another` | Primary, top |
| `inbox.row` | `{NAME} · {ORI}` + `{Stance} ▸ {Stance}` + `fired {time}` | `{Name} from {Origin}. Their cup {n}, your cup {m}. They fired {time}. {They hit you last turn.}` | The `--accent` left bar meaning "they hit you" is **not colour-only**: the SR line says it and a `Hit` micro-stamp prints on the row (§7.4) |
| `inbox.cold.header` | `Gone cold.` | `Abandoned duels` | `--ink-dim` group header |
| `inbox.cold.stamp` | `Cold` | `Abandoned. No shots for 7 days.` | Diagonal stamp |
| `inbox.reheat` | `Reheat.` | `Start a fresh duel with {name}` | Secondary |
| `inbox.dismiss` | `Dismiss.` | `Remove this duel from your inbox` | The swipe target always has a real button too. No swipe-only actions |
| `inbox.empty` | `Nobody is shooting at you.` | *same* | Body: `Tap a bean on the map and fire first.` CTA: `Back to the Grounds.` |

### 6.7 Result, leaderboard, share

| Key | Visible | Screen reader | Notes |
|---|---|---|---|
| `result.id` | `Duel #{n}` | `Duel number {n}` | |
| `result.vs` | `vs {NAME} · {ORI}` | `Against {Name} from {Origin}` | |
| `result.lines` | `Hits {a} / Shots {b} / Steam max {c} / Damage {d} / Taken {e}` | `{a} hits from {b} shots. Highest steam {c}. Damage dealt {d}. Damage taken {e}.` | Itemised receipt |
| `result.stamp.win` | `Roasted.` | `Result: you won.` | House line, `--success` ring |
| `result.stamp.lose` | `Decaf.` | `Result: you lost.` | House line, `--ink-dim` ring |
| `result.rp` | `+{n} RP` / `−{n} RP` | `Plus {n} roast points.` / `Minus {n} roast points.` | Mono, always with the unit |
| `result.rp.bonus.firstshot` | `First shot. +10 RP` | `First-shot bonus, plus 10 roast points.` | |
| `result.rp.bonus.comeback` | `Cold brew comeback. +5 RP` | *same, expanded* | |
| `result.progress` | `[\|\|\|\|\|\|....] {n}` | `{n} roast points. {m} to {next level}.` | Receipt bar |
| `result.rankup` | `Roasted.` | `You reached {level} roast. {Unlock} unlocked.` | Plays on the **world map**, not here (`ART-DIRECTION.md:347`) |
| `result.primary` | `One more go.` | `One more go` | House line. Autofocused |
| `result.secondary` | `Back to the Grounds.` | *same* | |
| `result.share` | `Share.` | `Share your card` | Tertiary text link |
| `board.tab.all` | `All time` | `All time. Tab 1 of 2.` | `role="tab"` |
| `board.tab.today` | `Today` | `Today. Tab 2 of 2.` | |
| `board.row` | `{nn}  {NAME} · {ORI} ..... {n} RP ●` | `Position {nn}. {Name} from {Origin}. {n} roast points. {Level} roast.` | The roast dot is backed by the level word in the SR label |
| `board.you` | *(inverted row)* | `This is you.` | Inversion is shape, not colour |
| `board.empty` | `Nobody has scored today.` | *same* | Body: `Win a duel and you are first.` CTA: `Back to the Grounds.` |
| `share.headline.ko1` | `One shot.` | n/a | First-shot KO |
| `share.headline.comeback` | `Cold brew comeback.` | n/a | Won from ≤20 cup |
| `share.headline.win` | `Ground.` | n/a | Ordinary win |
| `share.headline.streak` | `{n} in a row.` | n/a | Streak ≥5, numeral in mono |
| `share.headline.rankup` | `Roasted.` | n/a | Ranked up this duel |
| `share.headline.lose` | `I got roasted.` | n/a | Loss |
| `share.headline.fresh` | `Still green.` | n/a | No duels played |
| `share.footer` | `coffee-beans-war · the grounds` | n/a | Never a call to action |
| `share.copy` | `Copy card.` | `Copy the card image to your clipboard` | Desktop primary |
| `share.copyline` | `Copy line.` | `Copy the result as text` | Tertiary |
| `share.copied` | `Copied.` | `Card copied to your clipboard.` | Toast 3s |
| `share.saved` | `Saved.` | `Card saved to your downloads.` | Fallback path |

### 6.8 States, errors, empties

| Key | Visible | Screen reader | Notes |
|---|---|---|---|
| `state.offline` | `No steam.` | `The Grounds are offline. The bots are still here and every duel against them works.` | **Never a receipt, never a modal, never a `Retry` button.** It is the ambient world-HUD chip in §6.2 (`world.offline.chip`). Rationale in §13.2 |
| `state.shotheld` | `Held.` | `Your shot is saved. It will send when you are back online.` | Only when a shot is fired at a human and the send fails. The duel continues locally |
| `state.reconnected` | `Back on.` | `Reconnected. Your shots have been sent.` | Toast 3s. Same as `world.online.back` |
| `state.disconnected` | `They stepped out.` | `{Name} left the live duel. It has become an async duel.` | Buttons `Wait.` / `Back to the Grounds.` |
| `state.expired` | `Gone cold.` | `That duel was abandoned.` | House line, toast |
| `state.notfound` | `That bean is gone.` | `That bean is no longer on the map.` | CTA `Back to the Grounds.` |
| `state.turnrejected` | `Already taken.` | `That shot was already played on another device. Showing the latest.` | The async double-submit case. Non-destructive: we show the truth, we do not blame the player |
| `state.toosmall` | `Too small.` | `This screen is too small. The game needs at least 320 by 480.` | Below 320×480. Named, not silently broken |
| `state.error` | `The pot boiled over.` | `Something failed and the game could not continue. Reload to carry on. Your bean and your duels are saved.` | The only non-terse error string. CTA `Reload.` An error may exceed three words when the three-word version would leave the player stuck |

### 6.9 Pause

| Key | Visible | Screen reader |
|---|---|---|
| `pause.title` | `Paused.` | `Paused` |
| `pause.resume` | `Resume.` | `Resume the duel` |
| `pause.sound` | `Sound` | `Sound`, `aria-pressed` |
| `pause.haptics` | `Haptics` | `Vibration`, `aria-pressed` |
| `pause.motion` | `Less motion` | `Reduce motion. Overrides your system setting.`, `aria-pressed` |
| `pause.bracket` | `Bracket` | `Show the power bracket after a short and a long`, `aria-pressed` |
| `pause.swap` | `Swap sides` | `Put your bean on the right`, `aria-pressed` |
| `pause.text` | `Larger text` | `Larger interface text`, `aria-pressed` |
| `pause.slow` | `Slow turns` | `Double the live turn timer to 40 seconds`, `aria-pressed` (M3 only) |
| `pause.leave` | `Leave duel.` | `Leave this duel` |
| `pause.left` | `Left it brewing.` | `You left. The duel is waiting for your shot.` (async: no confirm, nothing is lost) |
| `pause.leave.confirm.title` | `Leave the duel?` | *same* (**live duels only**; leaving forfeits) |
| `pause.leave.confirm.body` | `They win this one.` | `If you leave now, {name} wins this duel.` |
| `pause.leave.confirm.yes` | `Leave duel.` | `Leave and forfeit` (danger) |
| `pause.leave.confirm.no` | `Keep fighting.` | `Stay in the duel` (primary) |

---

## 7. Accessibility floor for a game

### 7.1 Classification

**EAA: OUT OF SCOPE.** Coffee Beans War is a personal, non-commercial competition entry, not a product or service offered to EU consumers. The European Accessibility Act does not apply and no accessibility statement is required. **WCAG 2.2 AA is the craft floor here, not a legal one**, and the carve-outs in §7.3 are taken deliberately and documented rather than discovered.

### 7.2 What we commit to (WCAG 2.2 AA)

| SC | Commitment | How it is met |
|---|---|---|
| **1.4.1** Use of Colour | Every colour-carried meaning has a second, non-colour channel | §7.4 in full |
| **1.4.3** Contrast (Min) | All UI text ≥ 4.5:1; most lands at 17.1:1 | The paper-chip rule (`ART-DIRECTION.md:207`) plus Lola's computed table (`ART-DIRECTION.md:188`) |
| **1.4.11** Non-text Contrast | Chips, gauge, cup outlines, focus rings ≥ 3:1 | All `--ink` on `--paper` |
| **2.1.1 / 2.1.2** Keyboard, no trap | The whole game is playable on a keyboard | §3.6. Pause and every sheet are `<dialog>` with focus trap + `Esc` |
| **2.1.4** Character Key Shortcuts | `1`–`4` and `Space` are scoped to the duel having focus | Satisfies the "active only on focus" exception; also disableable in Pause |
| **2.3.1** Three Flashes | Nothing in the game flashes | §7.5. **The current spec fails this and the fix is mandatory** |
| **2.4.3 / 2.4.7** Focus order, focus visible | Specified per screen | §7.6. 2px `--ink` outline, 2px offset, print shadow doubles to 4px. Never `outline: none` |
| **2.4.11** Focus Not Obscured (2.2) | Every focusable element lives **inside** the fixed HUD, never under it | §3.6.2, §3.7.1 |
| **2.5.1** Pointer Gestures | The aim drag has a non-path-based equivalent | Two range inputs + `Fire` |
| **2.5.7** Dragging Movements (2.2) | **The one criterion an artillery game usually fails.** The drag has a full single-pointer alternative | The chips *are* the sliders; they are tappable steppers as well as keyboard controls |
| **2.5.8** Target Size (2.2) | 44px minimum everywhere (`ART-DIRECTION.md:389`), 8px minimum spacing | Exceeds the 24px AA floor |
| **3.3.1 / 3.3.2** Error identification, labels | One field in the game (`Name`), with a persistent label, helper text, and no ability to block | §6.1 |
| **4.1.2 / 4.1.3** Name/role/value, status messages | Native elements throughout; live regions on every dynamic readout | §3.6.5, §7.7 |

### 7.3 What we consciously do not commit to

Named here so nobody discovers them as bugs.

- **1.4.4 Resize Text to 200%.** The 3D stage does not reflow; a fixed-aspect game camera cannot. We commit instead to **HUD text scaling to 150% without clipping**, and to a `Larger text` setting that lifts chip type 12 → 14 and body 14 → 17. Stated, not silently broken.
- **1.4.10 Reflow at 320 CSS px.** The game requires **320 × 480 minimum**. Below that we render `Too small.` with the reason and the requirement. A named floor beats a broken layout.
- **2.2.1 Timing Adjustable.** Async has no timer (`GAME-DESIGN.md:29`), so we pass by default in the mode that matters. Live duels (M3) carry a 20s turn timer, which falls under the Real-Time Exception. We still ship a `Slow turns` setting that doubles it to 40s, because an exception being available is not a reason to use it.
- **Full audio-only play.** We commit that a screen-reader user can **complete** a duel: every piece of state (angle, power, steam, both cups, the last call, the marker count, the bracket, both stances, the Spotter contents, whose turn it is) is in the DOM and announced (§3.6.4, §3.6.5). We do **not** commit to spatial audio, an audio-only aiming mode, or sonified trajectories. Out of scope, named.
- **AAA.** Not pursued, except contrast, which lands at AAA for free.
- **Captions / transcripts.** No speech and no narrative audio exist in the game, so the criteria do not apply. All sound is redundant with a visual; muting loses nothing mechanical. Worth saying out loud: **the game is fully playable with sound off**, which is the state most judges will be in at 11pm.

One genuine strength worth claiming: **there is no reaction-time requirement anywhere in the game.** Turn-based, no timer in the default mode, no twitch input. For players with motor or cognitive disabilities this makes Coffee Beans War more accessible than almost any action game, and the landing screen's screen-reader intro should say so in one line.

### 7.4 Colour-blind safety, item by item

Tested against protanopia, deuteranopia and tritanopia. Six problems found in the current spec; all six have a fix that costs nothing.

| Element | The risk | Fix |
|---|---|---|
| **HP cup** | The fill level is colour-free and fine. But the low-HP signal is *"the rim turns `--danger`"* (`ART-DIRECTION.md:408`), and `#B3261E` against an `--ink` `#1B120E` rim is a dark-on-dark shift protanopes will not see | **Two extra channels, no numbers, deadpan intact:** at ≤25% the rim also draws **dashed (4-2)** and **the whole cup tilts 6° and stays tilted.** Shape + posture + colour. Static, so it does not break "nothing breathes" (`ART-DIRECTION.md:331`). **DEVIATION** from `ART-DIRECTION.md:408` |
| **Steam gauge** | None. `Steam 4 →` is text plus an arrow whose *length* encodes strength, and `Steam 0 ·` changes the glyph, not the colour (`ART-DIRECTION.md:407`) | Pass as specced |
| **The three calls** | None. They are words | Pass. The `●` `‹‹` `››` glyphs are added for pre-attentive reading, not for colour safety |
| **Class chip dot** | `--arabica` `#C7382E` and `--liberica` `#7D3C5E` both collapse toward muddy olive-grey under deuteranopia (`ART-DIRECTION.md:410` specs an 8px dot in the class colour) | The dot becomes a **shape**: Arabica an ellipse, Robusta a circle, Liberica a hooked teardrop. Same silhouette language as the beans (`ART-DIRECTION.md:213`), three SVG paths, free. The chip already carries the class name in text |
| **Power gauge danger zone** | Colour-only (`ART-DIRECTION.md:406`, "the last 15% in `--danger`") | The segment is drawn with **45° hatching** as well as the fill |
| **Inbox "they hit you" bar** | A 4px `--accent` bar on the left edge (`ART-DIRECTION.md:440`) is pure colour, and `--accent` is amber, the hardest hue for tritanopes | Keep the bar, add a `Hit` micro-stamp on the row and the sentence in the SR label |
| **Accent swatch picker** | Eight colour circles are, by definition, unusable without colour vision | Each swatch has its **name** as its accessible label and shows the name on selection; the selected one gets an `--ink` ring (shape). Accent is cosmetic and never gameplay-critical, so this is sufficient |
| **Roast badge** | Green vs Light are close under protanopia | Already backed by the level word on the arc (`ART-DIRECTION.md:416`). Pass |
| **Result stamps** | `--success` ring vs `--ink-dim` ring | Already backed by the words `Roasted.` / `Decaf.` Pass |

### 7.5 Flashing: the one real hazard in the current spec

`ART-DIRECTION.md:340` specifies the hit bean flashes `--paper` for 2 frames. `GAME-DESIGN.md:127` and `ART-DIRECTION.md:342` specify ground coffee firing **six pellets producing six impacts staggered 40ms**.

Six flashes in 240ms is **25 Hz**. That is far above the 3 Hz general threshold and it is a photosensitive-seizure risk in a game whose *search* ammunition is the thing that causes it.

**Mandatory fix:** the hit flash is **rate-limited to one flash per 400ms per bean.** A ground-coffee volley produces one flash and one accumulated shake, not six of each. The same limiter applies to the reduced-motion substitute (the `--danger` rim flash, `ART-DIRECTION.md:356`) and to the fog-thinning radial reveals, which are staggered 40ms in the same way. Sonny: ground coffee against a Tree-stance opponent is the specific test case.

Nothing else in the game flashes. No screen-wide luminance change exceeds one event per 400ms.

### 7.6 Focus order, all screens

**Landing:** `Name` → `Another` → class radio group (arrow keys within, one tab stop) → origin listbox → face radio group → accent radio group → `Enter the war.`
No skip link needed; there is one form and no navigation.

**World:** your bean chip → inbox stub (if present) → `Leaderboard` → **the bean list** → `Sound` → `Menu`.

> **The bean list is the key move.** A 3D map cannot be tab-navigated meaningfully, so the DOM carries a visually-hidden `<ul>` of every bean on the map, ordered by stance then name. Focusing an item **also moves the 3D camera to that bean and highlights it**, so sighted keyboard users get the identical experience rather than a parallel one. This is the pattern Google Maps uses for its results list, and it is the difference between "keyboard accessible" and "keyboard playable". Each item's accessible name is the whole challenge card in one sentence (§6.2, `world.bean.label`), so a screen-reader user can choose an opponent without opening anything.

**Duel:** the six stops in §3.6.2.

**Result:** heading → `One more go.` (**autofocused**, §5.9) → `Back to the Grounds.` → `Share.`

**Sheets and Pause:** native `<dialog>`. Focus starts on the first interactive element, `Esc` closes, focus returns to the trigger, background gets `inert`.

### 7.7 Screen-reader flow: the duel, narrated

This is what the game sounds like with the screen off. If this narration does not describe a playable game, the DOM is wrong.

> *"Duel against Miss Moka. Your shot.
> You are on the Ridge, height plus 3. Miss Moka is on the Belt, height plus 1.5, hidden in the steam.
> Your cup, 100 of 100. Miss Moka's cup, 65 of 100.
> Steam 4, blowing right. It moves your shot.
> Spotter. Miss Moka, Liberica, Medium roast, from Guatemala. Standing on a branch platform with canopy behind her. French press cannon, aimed left and low. Range unknown.
> Short. Your shot landed short of them. Add power.
> Three impact markers. The last one landed short.
> Angle, slider, 62 degrees. Power, slider, 78 percent. Bracket: between 78 and 91 percent. Fire, button. Green bean, unlimited, 20 damage."*

Live regions, all `polite` except the last:

| Region | Announces |
|---|---|
| Turn strip | `Your shot.` / `Their shot.` |
| Call chip | The call plus its correction sentence |
| Shot result | `Hit. 20 damage.` / `Missed. Landed on the Ridge, short of them.` |
| Your cup | On change only |
| Their cup | On change only |
| Steam chip | At the turn boundary |
| Spotter | Only on pose change, flinch, or KO fog lift (§3.6.5) |
| Errors and misfires | `assertive` |

Not announced, deliberately, to avoid a firehose: angle and power while dragging (the slider reports them natively on keyboard change), individual marker coordinates, particles, steam sprite motion.

Headings: `<h1>` The Grounds (landing) · `<h1>` The Grounds map (world) · `<h1>` Duel against {name} · `<h2>` for the Spotter, the HUD group and the result sections. No level skipping.

### 7.8 Touch targets and motion

- **44 × 44 CSS px minimum, 8px minimum spacing** (`ART-DIRECTION.md:389`). The ammo rack's four chips at 44px with 8px gaps need 200px, which fits at 320px viewport width with 60px to spare.
- **No swipe-only action anywhere.** The inbox's swipe-to-dismiss always has a visible `Dismiss.` button on the row.
- **No hover-only information.** Desktop hover titles are enhancements; every one has a visible or announced equivalent.
- **`prefers-reduced-motion: reduce`**, building on `ART-DIRECTION.md:356`:

| | Default | Reduced |
|---|---|---|
| World ↔ duel transition | 900ms camera fly | **150ms crossfade through the steam wipe. Mandatory, not optional:** a 900ms large-field camera spline is precisely the motion that triggers vestibular symptoms |
| Screen shake | 6px, 3 osc | `--danger` cup rim flash, 120ms, rate-limited to 1 per 400ms |
| Squash and stretch | on | off |
| Limb poses (plant, point, snap back) | on | **on. They are poses, not animation, and they are the angle readout** |
| Steam layer | 40 sprites, full speed | 20 sprites, half speed. **Kept: it is gameplay information** |
| **The projectile arc** | full | **full. Never reduced. It is the game** |
| Hit-stop | 60ms | removed |
| The Pour | bands feed in, replay, stamp | bands appear instantly; **the replay still plays** (information, not decoration); no hit-stop; stamp appears without scale |
| KO fog lift | 600ms disperse | 150ms crossfade |
| KO pellet heap | settles | hard cut |
| Result receipt | prints over 500ms | appears |
| Hint tags | stake in | appear |
| Rank-up colour | 400ms lerp | hard cut, badge re-stamp still fires |
| Haptics | on | **off by default** |

A manual `Less motion` toggle in Pause overrides the OS setting in both directions, because a judge on a borrowed or locked-down machine cannot change system preferences.

### 7.9 Pause and quit: currently missing from every doc

**`GAP`.** Neither `GAME-DESIGN.md` §13 nor `ART-DIRECTION.md` §9 has a pause, a settings surface or a way out of a duel. A game with no exit is both an accessibility failure and a judge-annoyance failure.

- **`Menu` chip**, 44px, bottom-right of the duel HUD and of the world HUD, inside the HUD block and clear of the bottom dead zone. `Esc` opens it.
- Contents: `Resume.` (primary) · `Sound` · `Haptics` · `Less motion` · `Bracket` · `Swap sides` · `Larger text` · `Slow turns` (M3 only) · `Leave duel.` (secondary).
- **Leaving an async duel needs no confirmation.** Nothing is lost; the duel waits. Copy: `Left it brewing.`
- **Leaving a live duel forfeits**, so it gets a confirmation dialog with explicitly named buttons (§6.9), never `OK` / `Cancel`.
- Pause pauses nothing mechanically, since the game is turn-based. That is why it is cheap, and it is why there is no excuse for not having it.

### 7.10 Acceptance criteria (feeds Sonny's matrix)

- [ ] A judge reaches `DUEL.AIM` within 30s of first paint on a cold 4G load, without reading any instruction.
- [ ] `Enter the war.` is pressable at first paint and never blocks on asset loading.
- [ ] Zero changes on the landing receipt produces a valid, playable profile.
- [ ] A full duel is winnable using **only** the keyboard, following the §3.6.4 walkthrough.
- [ ] A full duel is winnable using **only** a screen reader, with no sighted assistance.
- [ ] The Spotter description, the call, the bracket and the marker count are all announced (§3.6.5).
- [ ] **No aim drag can begin in the bottom 88px (portrait) or 56px (landscape).**
- [ ] **A `pointercancel` never fires a shot.** Tested by starting a drag and invoking the iOS home gesture mid-drag.
- [ ] The URL bar never collapses or expands during a duel; the stage never reflows mid-aim.
- [ ] A `visualViewport` resize or an `orientationchange` mid-aim cancels the aim, preserves the committed angle and power, and never fires.
- [ ] No accidental fire in 50 attempted taps, flicks, edge-touches and two-handed regrips on the stage.
- [ ] No sequence of events produces more than 3 luminance flashes per second, **specifically including a ground-coffee volley**.
- [ ] A ground-coffee volley produces six markers, one flash, one shake and one call.
- [ ] Every interactive target is ≥ 44 × 44 px with ≥ 8px spacing, at 320px and at 430px viewport width.
- [ ] `prefers-reduced-motion` removes every non-essential animation while the projectile arc, the steam layer and the limb poses survive intact.
- [ ] The call chip persists across a full app close and reopen of an async duel.
- [ ] Below 320×480 the game shows `Too small.` and not a broken layout.
- [ ] The share card reaches the clipboard as an image on desktop Chrome.
- [ ] Every string on screen matches §6 exactly. No exclamation marks, no emoji, no `Submit`, no `OK`.

---

## 8. Profile customisation

### 8.1 The landing receipt in ten seconds

**The whole screen is one receipt, prefilled, and `Enter the war.` works on tap one.**

On load we generate a complete valid profile:

| Slot | Default |
|---|---|
| Name | Generated, two words, ≤14 chars, excluded against the 12-bot roster (`ART-DIRECTION.md:249`). Field is **prefilled and pre-selected** so typing replaces it in one action |
| Class | **Arabica**, weighted. It is dead accurate (`GAME-DESIGN.md:96`), which makes the first duel legible: a miss was your aim, not your dice |
| Origin | Random of 8 |
| Face | **Deadpan** (the default set, `ART-DIRECTION.md:228`) |
| Accent | Random of 8 |
| Accessory | None. Locked until Light roast |

- **`Another`** (44px, beside the name field) rerolls the entire receipt. This is the one-tap "give me a different one" that people actually enjoy, and it converts customisation from a form into a slot machine for the 60% who will not read the options.
- **The bean preview at 140px is the hero of the screen and it updates instantly on every change**, 120ms hard swap, no crossfade. Class swaps the silhouette, accent re-tints the luggage-tag string, face swaps the cell, and the limbs give the preview a stance rather than a pose. That instant loop is what makes ten seconds feel like a decision rather than a form.
- **No field is required and no field can be invalid.** The name filter trims to 14 characters silently; an emptied field falls back to the generated name shown greyed. **The first screen of the game cannot produce an error**, with exactly one exception: a blocked word on submit swaps in the generated name and prints `Try another name.` as a non-blocking toast.

**Portrait layout, 390 × 844, no scrolling:**

```
  48   THE GROUNDS                      (stamp)
 140   [ live bean preview ]
  64   NAME: Half Caff____   [ANOTHER]
 120   ( Arabica ) ( Robusta ) ( Liberica )     96px beans, names stamped under
  48   [COL][ETH][BRA][VNM][KEN][GTM][CRI][IDN]  horizontal scroll row
  56   [face ×6]
  48   ● ● ● ● ● ● ● ●                          32px swatches
  44   ENTER THE WAR                            pinned above the 88px dead zone
  88   bottom dead zone + safe-area
 ----
 656 + 84 of gaps + 88 = 828 of 844. Fits.
```

At the 320×480 floor the receipt scrolls and the button stays pinned above the dead zone.

**Desktop:** the same receipt at 480px, centred, with **the world already rendering behind it at 40%**, so you can see what you are about to enter. That is the Eye Candy first impression on the device the judge is most likely using.

### 8.2 The edit sheet later

Reached by tapping your own bean on the map (`GAME-DESIGN.md:182`).

- Bottom sheet on mobile at 60% height, drag-to-dismiss plus `Cancel.`; a 480px card on desktop.
- **DEVIATION:** `ART-DIRECTION.md:436` specs the editor as "the same sheet as landing, minus the name". **Keep the name editable.** In a no-login game where identity is a per-device key (`GAME-DESIGN.md:195`), "I typed something stupid in three seconds and now it is on the leaderboard forever" is the single most common regret, and the fix costs one field.
- Changes live-preview on your bean **behind** the sheet, on the actual map, at actual size. You are seeing what everyone else will see.
- Locked slots (accessory below Light roast) render as chips reading `Light roast.` in `--ink-dim`, `aria-disabled="true"`, with the reason in the accessible name. Greyed-without-explanation is the anti-pattern.
- `Save` primary, `Cancel` secondary. `Saved.` toast, 2.5s, polite.
- **Class is editable here** (see §10 Q3): my recommendation is yes, free, between duels only. In a jam game, letting a judge try the tank is worth more than protecting a meta.

---

## 9. The share card and the Skool moment

### 9.1 The moment

The card must arrive as **an object you were given**, not a button you have to find. Draw Something's entire loop is receiving something.

After a win, the result receipt prints from the top edge over 500ms. `One more go.` lands and takes focus. **Then, 400ms later**, the receipt keeps feeding past the tear line and the **share card slides out from under it** at −8°, rendered at about 200px on screen, with a `Share.` chip on it.

The ordering is deliberate: the card must never steal focus from `One more go.` (§5.9). The loop comes first; the trophy arrives second and waits.

### 9.2 The headline is the payload

`ART-DIRECTION.md:442` gives three headlines. A specific headline is a shareable headline, so the set expands to seven, keyed to what actually happened:

| Condition | Headline (display 64) |
|---|---|
| First-shot KO | `One shot.` |
| Won from ≤20 cup | `Cold brew comeback.` |
| Ranked up this duel | `Roasted.` with the new level stamped |
| Streak ≥ 5 | `{n} in a row.` (numeral in mono) |
| Ordinary win | `Ground.` |
| Loss | `I got roasted.` |
| Fresh profile, no duels | `Still green.` |

Card contents otherwise as specced: sky-zenith ground, the bean at 600px with its machine, a receipt on the right third with name, origin, roast badge, `Record 12 W · 4 L`, `Best streak 5`, and `coffee-beans-war · the grounds` in mono at the bottom. **No call to action, no URL banner, no "play now".** The deadpan does the marketing, and a card that looks like an ad does not get posted.

### 9.3 The mechanics that decide whether it actually gets posted

The judge is on **desktop Chrome**, where `navigator.share` with files is not supported. So the desktop primary path is **copy the PNG to the clipboard**, because Skool's composer accepts a paste. This single detail decides whether the card reaches the Skool thread.

| Path | Condition | Copy |
|---|---|---|
| `navigator.share({files})` | Supported (Android Chrome, iOS Safari 16+) | `Share.` |
| `ClipboardItem` with `image/png` | Desktop Chrome / Edge | `Copy card.` → toast `Copied.` |
| Download | Everything else | `Save card.` → toast `Saved.` |
| Text only | Always available as a tertiary | `Copy line.` copies `Duel #0412 · Hits 2 · Shots 5 · Result: Roasted · coffee-beans-war` |

Three tiers plus a text fallback. Something always works, and the button label always tells the truth about which one you are getting.

---

## 10. Open questions

### For Smith (game design): all five resolved, 2026-09-05

| # | Question | Ruling |
|---|---|---|
| 1 | `Wide.` or `Short.` | **`Short.` adopted.** Calls are `Close.` / `Short.` / `Long.` §4.2 and §6.4 updated |
| 2 | The bracket band on the power gauge (§4.5d) | **Yes.** Default on, `Bracket` toggle in Pause |
| 3 | Class editable after the first duel | **Yes**, free, between duels only (§8.2) |
| 4 | 2.5-unit fog radius for the first two markers (§4.5c) | **Yes, scripted first duel only.** Not a general first-duel rule: it applies to the Decaf Dan opener in §2.2 and nothing else |
| 5 | `One more go.` opponent selection | **Fairest matchup for the first two picks**, nearest bot thereafter (§5.9) |

All fourteen deviations in §11 are accepted.

### For Emmett (architecture)

*(His five questions back to me are answered in §13.)*

1. **The aim UI is real DOM** (`<input type="range">` × 2 + `<button>`), with the drag writing into those elements and the canvas `aria-hidden` (§3.6.1). That single decision is what makes keyboard, screen reader and WCAG 2.5.7 pass by construction rather than by a parallel implementation. Does writing to two DOM inputs at 60fps during a drag fight the render loop, and if so what is the cheapest shape that keeps the semantics?
2. **The call is `sign(impact.x − opponent.x)` in stage space and is stored with the turn**, so the async replay prints the same word months later (§4.5b). Confirm the turn record carries the call, not just the inputs.
3. **Fog is now derived, not stored** (`GAME-DESIGN.md:59`, a pure fold over the impact list). Good, and it kills my original persistence worry. Two follow-ons: (a) the **impact list itself** must live server-side with the duel row, not in localStorage, since identity is a per-device key (`GAME-DESIGN.md:195`); (b) the fold must be **stable across clients and across a `Bracket`/`Swap sides` setting change**, because the fog is what the player is reading the stage through. If the fold is order-dependent, two devices can disagree about what is visible.
4. **The pointer contract in §3.7.4** needs an owner: `setPointerCapture` on arming, `pointercancel` treated as a cancel and never a fire, `100dvh` + `overscroll-behavior: none` + `touch-action: none`, and a `visualViewport` resize cancelling an armed aim. Where do those live in your input layer, and is the 88px bottom dead zone a layout constant or computed from `env()`?
5. **Two input-timing guards**: the 400ms lockout after the Pour's stamp, and the 250ms input-ignore on the autofocused `One more go.` View layer or input layer?

---

## 11. Deviations from the source docs, collected

Every one of these changes something Lola or Smith wrote. **All fourteen accepted by Smith, 2026-09-05.** Named here so nobody has to diff.

| # | Source | Change | Reason |
|---|---|---|---|
| 1 | `ART-DIRECTION.md:452` | Hint tag 1 becomes `Drag to aim.`; hint tag 3 becomes `They are in the steam.`; `Steam moves your shot.` is retired to the steam chip's accessible label | The steam has three diegetic reads already; the hidden opponent has none, and it is the mechanic that loses judges |
| 2 | `GAME-DESIGN.md:45` | `Wide.` becomes `Short.` (adopted by Smith, 2026-09-05) | Axis mismatch on the one signal the whole mechanic runs on |
| 3 | `GAME-DESIGN.md:27` | The drag is anchor-relative, not bean-relative, and may only *begin* inside a defined origin band | One-handed portrait reach, and the bottom edge belongs to the OS |
| 4 | `GAME-DESIGN.md:78` | Mirroring is deterministic: **you are always on the left** | One layout instead of two; stable glyph directions; the Spotter is always in the same corner |
| 5 | `ART-DIRECTION.md:408` | Low cup adds a **dashed rim and a fixed 6° tilt** on top of the `--danger` rim | The colour-only signal is invisible to protanopes; the tilt is static so "nothing breathes" holds |
| 6 | `ART-DIRECTION.md:340` | The hit flash is **rate-limited to 1 per 400ms per bean** | Six ground-coffee pellets at 40ms = 25 Hz. Seizure risk |
| 7 | `ART-DIRECTION.md:410` | The class dot becomes a **shape** as well as a colour | Arabica and Liberica collapse together under deuteranopia |
| 8 | `ART-DIRECTION.md:406` | The gauge's danger zone gets **45° hatching** | Colour-only |
| 9 | `ART-DIRECTION.md:440` | The inbox `--accent` bar gains a `Hit` micro-stamp | Colour-only |
| 10 | `ART-DIRECTION.md:436` | The profile editor **keeps the name field** | Regret is the most common no-login failure and the fix is one field |
| 11 | `ART-DIRECTION.md:414` | The **most recent impact marker is filled**, older ones hollow | Turns a field of rings into a correction instrument. One bit of state |
| 12 | `GAME-DESIGN.md:214` | "Challenge declined" is cut from the state list | There is no accept step (`GAME-DESIGN.md:161`), so nothing can be declined |
| 13 | `ART-DIRECTION.md:225` | The limbs get a **functional aim pose**: feet plant, near arm on the machine, far arm points along the aim vector | Diego's limbs decision gives us a free silhouette-scale angle indicator. Still not emoting: it is a readout, which is the line that doc already draws |
| 14 | new | **HANDOFF**, **PAUSE** and **TOO SMALL** are added to the screens inventory | Async duels mostly end in a hand-off, not a result; a game needs a way out; a named floor beats a break |

---

## 12. One honest note on the concept art

Not my seat, and Lola owns it, so this is an observation and not a request.

`ART-DIRECTION.md:43` names cream + terracotta as the AI-slop combination the `frontend-design` guardrail exists to catch, and `ART-DIRECTION.md` §12 says "if a screenshot of the world reads as brown, the palette has drifted". The current duel anchor, `concept/duel-stage-spotter.png`, reads as cream and terracotta with conifers, which is the exact combination the doc refuses. `concept/world-anchor-v3-green.png` is on-spec and the trees are right.

It matters for my seat in one way only: **the duel stage is the screen the judge spends 90% of their time on, and it is the one that has drifted.** The Eye Candy vote is cast on that frame. Worth a second render against v3-green before anything is built.

---

---

## 13. Answers to `ARCHITECTURE.md` §10

Emmett's five, answered in his order. New strings are already folded into §6.

### 13.1 The `+N more beans` chip, and yes, they are reachable

**Who is rendered on the diorama (his proposal, with one addition):**

1. You.
2. The 12 bots (`ART-DIRECTION.md:249`). Always, because `BRIEF.md:38` makes a never-empty map the most important requirement after "it runs".
3. **Every human you have an open duel with.** This is my addition and it is not negotiable: if a bean is shooting at you and you cannot see it standing on the map, the world is lying, and the shared-world claim (`BRIEF.md:39`) is the Most Creative argument. In practice this set is a handful.
4. Then most recently active by `last_seen_at`, up to the 60 cap.

**The affordance:** a paper chip on the **bottom-left** of the world HUD, 44px, clear of the 88px bottom dead zone, reading `+41 more beans.` (singular `+1 more bean.`). The other three corners are taken (bean chip top-left, inbox stub top-centre, today's roast top-right, sound and menu bottom-right), and bottom-left is the one reachable corner left. Hidden entirely at `n = 0`, exactly like the inbox stub (`ART-DIRECTION.md:424`).

**Are the hidden players reachable? Yes, fully.** The chip opens **the roster sheet**: `Everyone in the Grounds.`, a search field, a count line, and one row per player, every row challengeable. Rows reuse the inbox-row component (`ART-DIRECTION.md:440`) minus the two cups, plus a `Challenge` action. Ordering: your open duels first, then bots, then most recently active. Search matches name or origin.

**The argument for building it, in one line:** the roster sheet and the visually-hidden bean list I already specced for keyboard and screen-reader play (§7.6) are **the same component over the same data**. One build, two jobs: the population cap gets an honest affordance and the 3D map gets its accessibility surface. If we only ship one of them we will end up building the other anyway.

Challenging someone from the roster who is not rendered works normally: the duel stage is a slice of the map, not the map, and the challenge card carries their stance, which is the only thing the duel needs.

**What the chip is not:** it is not a "load more". The 60 is a render budget, not a page. Tapping it never adds beans to the diorama.

### 13.2 Offline as a first-class state

**Emmett's placeholder copy has to change.** `THE GROUNDS ARE OFFLINE. THE BOTS ARE STILL HERE.` is nine words in two shouted sentences, and the house rule is one to three words with a full stop (`ART-DIRECTION.md:31`). The content is right; the form is not.

**The chip:**

```
        ┌─────────────────────────────┐
        │  No steam.                  │   house line, ART-DIRECTION.md:32
        │  The bots are still here.   │   mono 12, --ink-dim
        └─────────────────────────────┘
```

Top-centre, where the inbox stub would be, because those two can never coexist (offline means we cannot know the inbox count). No `Retry`, no spinner, no percentage, no apology. The client already probes and recovers on its own (`ARCHITECTURE.md` §4.1), so a `Retry` button would be a control that does what the app is doing anyway, which is theatre. When the probe recovers, the humans render in and a `Back on.` toast prints for 3s.

**The principle for every disabled affordance, and it is the whole answer:**

> **Nothing goes grey and gets left there.** An offline affordance either **disappears**, because its content is unknowable, or **offers a local substitute**, because a bot can do the job. Greyed-out-and-stranded is the failure mode, and it is what makes an offline state feel like a broken app rather than a smaller game.

| Affordance | Cold offline (boot with the backend down) | Warm offline (it drops mid-session) |
|---|---|---|
| **Inbox stub** | **Disappears.** The count is unknowable, and you cannot disable a number you do not have | Disappears. The count it was showing is now stale, and a stale count is worse than none |
| **Leaderboard** (The Roaster label) | Label swaps `Leaderboard` → **`Board offline.`**, `--ink-dim` text and border (`ART-DIRECTION.md:379` abandoned-state border), `aria-disabled="true"`, **not focusable**. The label is the explanation, so there is no toast to tap for | Same |
| **Human beans on the map** | **Absent.** Only you and the 12 bots. The map shows what we can prove is there; a diorama of greyed-out ghosts is worse than an honest smaller valley | Already rendered, so they stay but drop to **40% opacity** (the same treatment as `ART-DIRECTION.md:337`) with `--ink-dim` labels |
| **Challenge card, human target** | n/a (no humans on the map) | Opens normally. Primary becomes **`No steam.`**, disabled. Secondary becomes **`Challenge a bot.`**, which picks the nearest bot in the *same stance* so the matchup you wanted is preserved |
| **Roster sheet** | Opens, lists the 12 bots, empty state `Only the bots today.` | Same |
| **`+N more beans.` chip** | Absent (n is unknowable) | Absent |
| **Share card** | Works. It is an offscreen canvas render with no network in it | Works |
| **`One more go.`** | Works. Falls through to the nearest bot, which is already the specced fallback (`ART-DIRECTION.md:437`) | Works |
| **A shot fired at a human** | n/a | Queued locally, `Held.` toast, sends on reconnect |

**What is explicitly not disabled:** the duel against any of the 12 bots, the full profile editor, local RP, local streak, the daily seed (it is a hash of the date, `GAME-DESIGN.md:201`, so it needs no network), sound, haptics and every setting. That list is the point. **A judge at 11pm with the database paused still gets the whole game** (`BRIEF.md:38`), and the chip's second line is what tells them so.

**Screen reader:** the chip is `role="status"` (`aria-live="polite"`), announced once on entering the state and once on recovery, never repeated. Disabled controls carry the reason in their accessible name, never just `aria-disabled` with no explanation.

### 13.3 Second-device loss

**Keep Emmett's line. It is already the house voice** and it states the fact without apologising, which is the whole register (`ART-DIRECTION.md:21`). It needs one sub-line, because the sentence carries only half the truth: device-bound is one fact, clearing site data is the other.

```
This bean lives in this browser.        display, 14
Clear your data and it is gone.         mono 12, --ink-dim
```

**Placement: the bottom of the profile sheet, above `Save`.** Always visible, never behind an info icon, never a tooltip. The point of the line is honesty, and honesty behind a disclosure control is not honesty.

**Not on the landing receipt.** The first ten seconds are the whole competition (`BRIEF.md:18`) and a caveat on the door buys nothing: a first-time judge has nothing to lose yet and the line would read as a warning about a product they have not tried. The profile sheet is the right moment because the player is looking at a bean they have already invested in, and it is the screen they open before they would think about a second device.

Screen reader: the two lines are one `<p>`, so it reads as one thought, with a third clause the visual does not need: *"There is no account to sign in to."* That clause exists because a screen-reader user cannot see the absence of a sign-in button.

### 13.4 The 20 second live turn timer (M3)

**A shrinking rule, not a chip and not a rim.** Lola already specced the shape (`ART-DIRECTION.md:409`, "the 20s timer prints as a shrinking receipt line under the strip") and it is the right answer. Confirming it with the reasoning, because two of the three options are actively wrong:

- **Not a chip with a number.** A counting clock is stressful, and it would be the only urgent numeral in a game whose HP display deliberately refuses to be a number (`ART-DIRECTION.md:408`, "you do not get a percentage, you get a cup").
- **Not a rim. Reject this one outright.** A coloured frame is colour-carried and fails 1.4.1 without a second channel, and `--danger` on a rim **already means low cup**. Two red rims meaning two different things on one screen is the worst option available.
- **The rule works** because length encodes magnitude, which is the same vocabulary as the steam arrow (`ART-DIRECTION.md:407`), it is colour-free, and it sits in the readout zone under the turn strip where nothing is tappable.

| Property | Spec |
|---|---|
| Geometry | 96px wide at 20s, 3px tall, 1.5px `--ink`, directly under the turn strip. Shrinks linearly to 0 |
| Async | **The element does not exist.** Not hidden, not zero-width: absent from the DOM. The stance chips already sit 60px below the strip, so there is no layout shift between modes |
| No number | Consistent with the cup |
| At 5s | The rule goes **dashed (4-2)**. Shape change, not colour, and the same dash vocabulary as the low-cup rim (§7.4). Haptic `[10, 40, 10]` |
| Reduced motion | The rule does not shrink continuously; it **steps in five segments** (20 / 15 / 10 / 5 / 0). Continuous peripheral motion is exactly what these users are avoiding, and five steps carries the same information |
| `Slow turns` setting | Doubles it to 40s (§6.9). Confirmed |

**At 0: the turn is skipped, never forfeited.** The chip prints `Time.`, the turn passes, no damage, no RP penalty. **Forfeiting on a timer, in a game whose default mode has no timer, would be enforcing a rule the player never agreed to.**

**After two consecutive timeouts by the same player, the duel silently converts to async** and the other player sees the existing `They stepped out.` string (`ART-DIRECTION.md:450`). Someone who has missed two turns has walked away, and async is the game's core, so this is not a failure path: it is a downgrade to the default. Nobody loses a duel to a phone call.

**Screen reader:** never a per-second announcement. `Twenty seconds.` at the turn start, `Five seconds.` at the warning, `Time. Your turn passed. No damage.` at zero. The live value stays *queryable* without being announced, as part of the turn strip's accessible description: *"Your shot. 12 seconds left."* read when the user tabs to any control.

### 13.5 The drag-to-power curve: linear, confirmed

**Confirmed linear.** Two pure functions, no device state inside either, called by the HUD preview and by the input quantiser:

```ts
/** CSS px on the visual viewport. Computed once per layout, never per frame. */
export function dragRadius(vw: number, vh: number): number {
  return 0.40 * Math.min(vw, vh);
}

/** dist and R in CSS px. Returns Emmett's powerPerMille domain, 0..1000. Pure. */
export function powerPerMilleFromDrag(dist: number, R: number): number {
  const t = dist / R;
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.round(c * 1000);
}

/** deg is the raw atan2 result in degrees. Returns deciDegrees. Pure. */
export function angleDeciDegFromDrag(deg: number): number {
  const c = deg < -15 ? -15 : deg > 90 ? 90 : deg;
  return Math.round(c * 10);          // -150 .. 900
}
```

**Why linear and not a curve.** An ease-in on power would buy finer resolution at the low end, and it is the obvious thing to reach for. It is wrong here for one specific reason: **the bracket band (§4.5d) is a bisection over the power axis, and bisection only reads honestly on a linear axis.** On a curved axis the visual midpoint of the band is not the numeric midpoint, so the band would quietly lie about where to aim next, which defeats the entire reason the band exists. Linear is not the lazy choice, it is the one the mechanic requires.

**The rule that keeps the preview and the sim in agreement:** the preview arc must call **the same quantiser** and integrate from the **quantised integer**, never from the raw float. A preview drawn from `dist / R` and a shot fired from `round(dist / R * 1000)` disagree by up to 0.05% of power. That is invisible in the middle of a shot and decisive at the edge of a splash radius, which is precisely where a player will notice and where they will be right to blame us. **The preview is the sim, run for 30% of its steps** (§3.2). One integrator, one entry point.

**One conflict to resolve, and it is in your court.** `ARCHITECTURE.md` §3.4 gives `angleDeciDeg` a domain of `0..1800`. My clamp is **−15° to 90°**, which is `−150..900`, so the negative end falls outside your stated range. I would widen yours rather than floor mine: firing slightly downhill from the Ridge at a Brew opponent is a legitimate shot and clamping it at 0° removes a real line from the game. The good news is that **no code has to change** for it: your `sinDeciDeg` already normalises with `((dd % 3600) + 3600) % 3600`, so negative decidegrees look up correctly today. Only the type comment and the validation range need widening. With the always-on-the-left rule (§3.9) the shooter never fires leftward, so `0..1800` was over-wide in one direction and short in the other; `−150..900` is the true domain.

**Two input-layer rules the sim never sees:** the 12px dead zone (below it, no aim is armed) and the 8% power floor (`powerPerMille < 80` cancels rather than fires). Both live in the gesture layer and are resolved before anything reaches `TurnInput`, so they cannot affect determinism.

### 13.6 Acceptance criteria added by this section

- [ ] With more than 60 beans in the world, the `+N more beans.` chip appears, and every hidden player is challengeable from the roster sheet.
- [ ] Every human with an open duel against you renders on the diorama regardless of the cap.
- [ ] The roster sheet and the screen-reader bean list are the same component over the same data.
- [ ] With the backend down at boot, a full duel against a bot is playable, and no control is greyed out without either disappearing or offering a local substitute.
- [ ] The offline chip is never a modal and never has a `Retry` button.
- [ ] The profile sheet shows both device-loss lines, always visible, never behind a disclosure control.
- [ ] The landing receipt shows no device-loss caveat.
- [ ] In an async duel there is no timer element in the DOM.
- [ ] A live turn timer reaching 0 skips the turn and never forfeits; two consecutive timeouts convert the duel to async.
- [ ] The preview arc and the fired shot land on the same pixel for 100 random drags, because both integrate from the same quantised integers.

---

*v0.1, 2026-09-05. Written against `BRIEF.md`, `GAME-DESIGN.md` v0.1, `ART-DIRECTION.md` v0.1 §1, §2, §8, §9, `docs/design-system.html` as rendered, and Sonny's two asks from `QA.md` (portrait drag safe zone → §3.7; full keyboard duel path and Spotter/call announcement → §3.6). Owes Smith five calls in §10. Owes Emmett five in §10. Owes Lola acknowledgement of the fourteen deviations in §11. §13 answers `ARCHITECTURE.md` §10; Smith's five rulings folded in 2026-09-05.*
