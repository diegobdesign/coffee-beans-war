# Coffee Beans War: Art Direction + Game Design System

**Seat:** Lola (Creative Director) · **Status:** v0.1, design phase · **Companions:** `BRIEF.md`, `GAME-DESIGN.md`
**Targets:** Eye Candy + One More Go, with a world strong enough for Most Creative.
**Bar:** cool and original, not the 2026 best seller. Every asset is coffee. Every number below is a decision, not a suggestion; change it in this file, not in code.

This document is the single visual truth. Allison builds the screens against §9, Emmett builds the renderer against §2 and §13, Smith's `GAME-DESIGN.md` owns the numbers that make things fair; this file owns the numbers that make things look and feel right. Where the two disagree on an inventory item, `GAME-DESIGN.md` §5 to §9 wins and I re-skin.

---

## 1. The story, the world, the tone

### The place: The Grounds

The Grounds is a coffee-growing valley caught permanently at first light: a ridge of violet basalt, a belt of coffee trees heavy with red cherries, and a lowland flooded with hot brewed coffee that steams all day. Every morning exactly one cup gets brewed, and every bean in the valley wants to be in it. So they fight, with the kit that would otherwise brew them, and the winners roast a shade darker each time, until the veterans are burnt and still at it.

That is the whole lore. It gives us: a reason for war (one cup), a reason for the terrain (coffee grows on volcanic highlands, gets washed in water, gets brewed in the lowland), a reason for the steam (the lowland is a lake of hot coffee), a reason for rank (roast is what happens to a bean that keeps getting closer to the cup), and a reason for the kit (moka pots and presses are what beans are afraid of). Nothing needs explaining on screen.

### Tone: deadpan

The beans take the war completely seriously. The game never winks, never shouts, never uses an exclamation mark. Comedy comes from physics (a bean tumbling down three terraces after a miss) and from restraint (the result of a duel prints as an itemised receipt). Reference for the register: Untitled Goose Game, Wes Anderson's flat-front symmetry, the way a Japanese kissaten hands you a ticket.

**Why deadpan and not the alternatives:**

- *Zany / cute* reads as "generic mobile game" in the first 30 seconds, and the judge has seen 40 of those this month. It is also the most expensive tone to execute: every surface has to be loud.
- *Epic-with-a-wink* needs bombast (orchestral stings, particle storms, camera sweeps) that a mid-range phone cannot afford and that fights the readability an artillery game lives on.
- *Deadpan* is mostly restraint, which is cheap, and restraint next to a bright saturated world is contrast, which is the whole job (SKILL.md:134, "Contrast is king"). It is also the Most Creative signal: a war game that reports results as a receipt is the thing nobody saw coming.

**Copy rules that follow from the tone (Allison inherits these for microcopy):**

- System messages are one to three words with a full stop. No exclamation marks anywhere in the game. No emoji anywhere in the game.
- The house lines: `Enter the war.` · `Your shot.` · `Their shot.` · `Challenge accepted.` · `Ground.` (KO) · `Roasted.` (rank up) · `Decaf.` (you lost) · `Gone cold.` (abandoned duel) · `No steam.` (offline) · `One more go.` · `Back to the Grounds.` · `3 beans are shooting at you.` (singular: `1 bean is shooting at you.`)
- Numbers are always shown in the mono face, always with their unit: `62°`, `78%`, `STEAM 4 →`, `+10 RP`.

---

## 2. Visual direction

### The look in one line

A saturated low-poly diorama seen through a long lens at first light: flat-shaded, two-tone per face, no outlines, one warm key light, soft shadows, a milk-white sky, and a black lake of coffee steaming in the lowland.

The world is **green, red and violet-grey**. The beans are the only browns. That inversion is deliberate: a coffee game that is brown everywhere is invisible, and the cream + terracotta look is the named AI-slop combo the `frontend-design` guardrail exists to catch (SKILL.md:44). Brown is the *character* colour, so when 20 beans stand on a green valley, they read as people.

### Reference table: what we take, what we refuse

| Reference | Take | Refuse |
|---|---|---|
| **Monument Valley** | Flat colour planes carry the read, no outlines, one fixed camera angle the player learns | Isometric impossible geometry, pastel softness, silence |
| **Untitled Goose Game** | Deadpan restraint, dot eyes, comedy from physics not faces, one strong key light | English-village desaturation (our valley is tropical highland; more chroma) |
| **Crossy Road** | Silhouette that reads at 40px, shadow on flat colour, customisation as collectible variety | Voxel cubes (beans are ellipsoids; no cubes anywhere except ground-coffee pellets), the runner cadence |
| **Alto's Odyssey** | Fogged silhouette layers as the duel backdrop, the sky gradient as mood carrier | Day/night cycle (fixed first light in v1), motion blur |
| **Tunic** | Long-lens tilt-shift diorama camera, tiny hero on a big world | Hidden-information mystery; nothing in our world is a secret |
| **Overcooked** | Chunky readability, kitchen kit as props, machines 1.2x the size of the bean | Plastic-toy sheen, the shouting UI |
| **Worms** | Wind gauge always on, misses are the funniest part, comedic KO | Destructible terrain expectation, 2D sprites, black outlines |
| **Pocket Tanks** | Last-shot ghost trail, shot resolves in under 2.5s, the ammo rack | 90s UI, 100-weapon bloat |
| **Non-game: Bialetti's 1933 octagon, letterpress coffee-bag labels, thermal receipt paper** | The machine geometry, the UI stamp language, the paper surface | Chalkboards, latte art, barista culture |

Toon outlines are refused for a mechanism reason, not taste: an outline pass is a second render of every mesh (or a post pass), and it is the single strongest "mobile game" tell. Two-tone flat shading from one directional light gives the same edge definition for free.

### Lighting model

| Parameter | Value | Why |
|---|---|---|
| Time of day | Fixed "first light", 07:10. No cycle in v1. | One lighting state means every colour token renders exactly once, and the daily seed does not need a lighting table |
| Key light | `DirectionalLight` colour `#FFF1DC`, elevation 32°, azimuth 40° from screen-left-front | Low sun gives every bean a lit face and a shadow face; that two-tone IS the shading model |
| Fill | `HemisphereLight` sky `#F3EEE4`, ground `#8E3B26`, at 0.55 of key | Shadow sides go warm violet-grey (sky bounce over red soil), never black |
| Ambient | None | Ambient flattens the two-tone |
| Shading | `flatShading: true`, `MeshLambertMaterial` with `vertexColors: true` | Lambert is the cheapest lit material and flat normals give the facet read; one material for every opaque mesh means merged geometry draws in one call |
| Shadows | Yes. One PCF soft shadow map from the key: 2048 desktop, 1024 mobile, shadow camera clamped to the visible 60×60 | Shadows are what make low-poly read as objects in a place rather than icons on a screen (Crossy Road lesson) |
| Fog | Linear, colour `#E7D3B4` (sky.horizon). World: near 45, far 95 units. Duel: near 30, far 70 | Fog in the sky colour dissolves the map edge and turns the far world into Alto's silhouettes at zero cost |
| Tone mapping | `NoToneMapping`, sRGB output | What this document says a token is, is what the screen shows. ACES would desaturate the greens |
| Post-processing | None. No bloom, no SSAO, no DOF, no vignette, no grain (SKILL.md:339; `feedback_no_grain_overlay.md`) | Every post pass is a full-screen cost on a phone and none of them add readability |

The "cinematic on a phone" question from the brief is answered here: cinema comes from the long lens, the low sun, the fog bands and the motion in §8. It never comes from post-processing.

### Camera language: the World

| Parameter | Value |
|---|---|
| Type | `PerspectiveCamera`, FOV **30°** (long lens; compresses the valley into a diorama) |
| Pitch | **52°** down from horizontal |
| Yaw | Fixed at **35°**, so the composition is always: mountain ridge top-right, flooded lowland bottom-left, tree belt running diagonally between them. Players learn one picture |
| Distance | Set so the 60×60 map fills 85% of the shorter viewport side at zoom 1.0 |
| Zoom | Pinch / wheel, 0.7x to 1.6x, eased 200ms |
| Pan | Drag, clamped to map bounds with 4 units of slack; no rotation ever |
| Labels | HTML overlays (`CSS2DRenderer`), never sprites, so names stay crisp and use the UI type |
| The landmark | The Roaster: a roasting drum at the map centre, 3 units tall, the only metal object in the world. Tap it for the leaderboard. Steam rises from it once every 6s |

### Camera language: the Battle

| Parameter | Value |
|---|---|
| Type | `OrthographicCamera` |
| Placement | On the perpendicular of the line between the two beans, 30 units out, pitch **6°** down (a sliver of ground surface shows, so the stage reads 3D without breaking the side-on read) |
| Frame, landscape | Stage width **28 units**; beans at x = 4 and x = 24; ground line at 22% of viewport height; max arc apex must clear 90% |
| Frame, portrait | Same 28-unit width fitted to the viewport width; ground line at 42% of height; the lower 35% of the screen belongs to the HUD (§9) |
| Motion | The camera **never moves** during a duel. Both beans, the whole arc, and the steam are always on screen. Readability beats drama here |

**How the 3D world becomes a 2D fighter stage:** the stage is a real slice of the map. Everything within ±3 units of the duel line renders in full colour and receives shadows. Terrain in front of the slice is removed with a single `clippingPlane` so nothing occludes the fighters. Behind the slice, the fog does the work in two bands: 3 to 25 units back at ~55% fog (mid ground), beyond 25 units at ~85% (silhouettes). Result: a Street Fighter stage whose backdrop is the actual valley the fight is happening in, and when you return to the world you can see where you were standing.

### The Spotter: you never see the opponent on the main stage (GAME-DESIGN §2b)

| Element | Spec |
|---|---|
| **The fog half** | From the stage midline (x = 14) to the opponent's edge, a dense steam layer: a flat `--sky-horizon` plane at 70% alpha over the terrain plus 120 extra steam sprites at 85% alpha. The terrain silhouette reads through it (Ridge / Belt / Brew and the height band), the bean and machine do not. The fog is a per-duel 64×16 alpha mask over the stage, stored with the turn inputs, sampled by the plane and by the sprite spawner |
| **The Spotter window** | A 112px circle (96px portrait) in the top corner on the opponent's side, framed as the bottom of a coffee cup: 6px `--paper` rim, 1.5px `--ink` outer line, a 3px `--crema` ring inside it (the grounds line), print shadow. Inside: a second orthographic camera rendered to a 256² render target, a tight live crop of ±2 units around the opponent (±4 with the Aeropress: it has a scope), fog at 90% beyond the crop, no ground line reaching the rim, no scale cue. It shows how they look and how they stand, never how far they are |
| **Impact markers** | Permanent for the duel. A 0.6-unit double-ring decal in `--ink` at 60% with a centre dot, skinned by stance (dust ring on the Ridge, splash ring on the Brew, leaf ring on the Belt). Fog thins to 20% in a 1.5-unit radius around each marker (2 units for a full cup). Six pellets are six markers: ground coffee is the search shot |
| **The call chip** | A paper chip directly under the Spotter prints one of three lines for exactly one turn: `Close.` (inside the crop, with a flinch in the window) · `Wide.` (short) · `Long.` (far side). House voice, full stop, nothing else |
| **Stance label** | The fogged side keeps its stance chip: `BREW 0`. The stance is known; the range is not |
| **What lifts the fog** | A KO, and only a KO: the fog lifts 600ms before `Ground.` so the kill plays in the open. A hit does not reveal the bean |
| **Symmetry** | The opponent sees the same about you. The Pour shows their shot arriving on your side and their marker on your side; it never shows their Spotter view of you |

---

## 3. Colour system

All tokens as CSS custom properties and as Three.js `Color` constants with the same names. No colour exists outside this table.

### World

| Token | Hex | Used for |
|---|---|---|
| `--sky-zenith` | `#F3EEE4` | Sky top (milk) |
| `--sky-horizon` | `#E7D3B4` | Sky horizon (latte foam); fog colour |
| `--rock` | `#59566B` | Basalt, shadow face |
| `--rock-lit` | `#7F7B95` | Basalt, lit face (vertex colour; the two-tone is baked, not only lit) |
| `--soil` | `#8E3B26` | Volcanic red earth (Brazilian cerrado); ground between biomes |
| `--canopy-light` | `#7DB35F` | Coffee tree canopy, lit |
| `--canopy-dark` | `#3F7A40` | Coffee tree canopy, shadow; also `--success` |
| `--trunk` | `#5A3A2A` | Tree trunks, stilts, stirrer planks |
| `--cherry` | `#C7382E` | Coffee cherries on the trees (same as `--arabica`; one red in the world) |
| `--flood` | `#2E1A12` | The lake of brewed coffee |
| `--flood-glint` | `#4A2B1B` | Ripple highlights on the flood |
| `--crema` | `#C8925A` | Foam line at the flood edge, cup crema, Burnt-rank trail |
| `--steam` | `#FFFFFF` at 55% alpha, shadow side `#D9D2C7` | Steam sprites |

### Beans

| Token | Hex | Notes |
|---|---|---|
| `--arabica` | `#C7382E` | Ripe cherry red |
| `--robusta` | `#E0A72A` | Yellow Bourbon cherry |
| `--liberica` | `#7D3C5E` | Over-ripe plum. Flat, never a gradient |
| `--roast-green` | `#8F9E6B` | Rank 0, raw bean grey-green |
| `--roast-light` | `#C69C6D` | Rank 1, cinnamon |
| `--roast-medium` | `#8C5A2B` | Rank 2 |
| `--roast-dark` | `#4A2A18` | Rank 3 |
| `--roast-burnt` | `#201410` | Rank 4, with a 0.15 specular so it reads as oily |

The **bean body is always a roast colour**; the class colour never touches the body. Class shows as silhouette (§4) and as the chip colour in UI. This is what makes rank legible from across the map: darker bean = more dangerous, no icon needed.

### Ammo

| Ammo | Body | Trail / particles |
|---|---|---|
| Green bean | `--roast-green` | trail dots `--roast-green` fading to 0 |
| Dark roast | `#3A2115` | smoke thread `#3A2115` at 40% |
| Ground coffee | `#5C3A22` pellets | none; impact sprinkle `#5C3A22` |
| Full cup | cup `--paper`, lid `--ink`, coffee `--flood`, crema ring `--crema` | steam spiral; splash decal `--flood` |

### Player accent (8 swatches, GAME-DESIGN §11)

Applied to: HP cup rim, machine trim, shot trail tint, luggage tag, name-label underline. Never the bean body.

| Name | Hex |
|---|---|
| Crema | `#E8B86D` |
| Cherry | `#D64541` |
| Leaf | `#5FA65A` |
| Milk | `#F6F1E7` |
| Caramel | `#C77A2E` |
| Ink | `#1B120E` |
| Porcelain | `#7FA7C4` (the blue of a classic cup) |
| Cascara | `#D98A9E` (cascara tea) |

### UI

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#FBF6EC` | Every UI surface (thermal receipt paper) |
| `--ink` | `#1B120E` | All text, borders, primary button fill |
| `--ink-dim` | `#6B5A4E` | Secondary text, abandoned states |
| `--accent` | `#E8A33C` | The "ready" amber of a machine's light. **Fills and lines only, never text** |
| `--danger` | `#B3261E` | Low cup, misfire, destructive buttons |
| `--success` | `#3F7A40` | Hit confirmed, rank up |

### Contrast, computed (WCAG 2.x ratio; AA is 4.5 text, 3.0 large/UI)

| Pair | Ratio | Verdict |
|---|---|---|
| ink on paper | 17.1 | all text |
| ink-dim on paper | 6.1 | secondary text |
| paper on ink | 17.1 | primary button |
| paper on danger | 6.1 | danger button label |
| paper on success | 4.8 | success stamp |
| ink on accent | 8.5 | text on an accent fill is fine |
| paper on accent | 2.0 | **fails**, hence accent is never a text colour and never a background for paper text |
| ink on sky-zenith | 15.9 | labels over the sky |
| ink on canopy-light | 7.5 | labels over the canopy |
| paper on flood | 15.3 | labels over the lake |
| paper on rock | 6.6 | labels over the mountain |
| paper on arabica / ink on robusta / paper on liberica | 4.8 / 8.5 / 7.3 | class chips |
| ink on roast-green, ink on roast-light | 6.4 / 7.4 | roast badge text, light stops |
| paper on roast-medium / dark / burnt | 5.4 / 11.9 / 16.7 | roast badge text, dark stops |

**The rule that makes contrast a guarantee, not a hope:** HUD text is never drawn raw on the world. Every string sits on a `--paper` chip with a 1.5px `--ink` border. The world map name labels are the one exception, and they get a 2px `--paper` text-stroke so ink stays at 15:1 over any biome.

---

## 4. The beans

### Silhouette per class (the bean is the only thing you customise, so the silhouette must carry class alone at 40px)

| Class | Proportions (h:w:d) | Crease | Stance | Real-world basis |
|---|---|---|---|---|
| **Arabica** | 1.00 : 0.62 : 0.50, slim ellipsoid | S-shaped, deep | Upright, leans 8° forward as if listening | Arabica beans are oval with a wavy S crease |
| **Robusta** | 0.90 : 0.85 : 0.70, near-round | Straight, shallow | Squat, sits 10% lower on the ground, no lean | Robusta beans are rounder with a straight crease |
| **Liberica** | 1.10 : 0.70 : 0.55, asymmetric teardrop with a hooked tip | Off-centre, kinked | Leans 15° off its own axis, tip pointing the wrong way | Liberica beans are large, lopsided and hooked |

Geometry: a lathe of 12 segments around 9 rings, the crease cut in as a 2-vertex groove, flat-shaded: **≤ 240 triangles**. Height of an Arabica = 1.0 world unit. Machines are 1.2 units (Overcooked proportion: the kit is bigger than the bean).

### Face system

- **Limbs (Diego, 2026-09-05: "give them all, game has to be fun").** Every bean has two thin stick legs and two thin stick arms in `--ink`, ≤ 40 tris total, no hands, no feet (a rounded cap). Legs carry the walk-to-slot (§8), the aim stance (feet apart, one arm on the machine), the flinch, and the tumble. Arms hold the stirrer staff and rest on the machine while aiming; otherwise they hang. Limbs never emote on their own: the deadpan lives in the face, the comedy lives in the physics.
- Two eyes, one mouth, all `--ink`, no eye whites (Goose / Crossy Road dot eyes). Eyes are 0.12 units apart on Arabica, 0.16 on Robusta, and on Liberica one eye sits 0.03 higher than the other.
- Faces are a single **SVG sprite sheet, hand-drawn by us, rasterised to a 1024² atlas** at build time, applied as a decal quad on the front hemisphere. 6 face sets × 5 states = 30 cells of 128px in an 8×8 grid.
- **Player-picked face sets (6):** Deadpan (default) · Squint · Grin · Sleepy · Wide · Wink.
- **Gameplay states (5, per set):** idle · aim (eyes narrow toward the target) · hit (eyes shut, mouth an O) · win (eyes closed upward, mouth flat: satisfied, not gleeful) · lose (eyes down, mouth a short line). The deadpan rule holds even in the win face.
- Face never animates between cells; it swaps, hard cut. Blinking: one blink every 4 to 7s, idle only, 80ms.

### Customisation slots (GAME-DESIGN §11, skinned)

| Slot | Treatment |
|---|---|
| **Origin badge** | A luggage tag hanging off the bean's left side, `--paper` with the 3-letter code stamped in `--ink` mono: `COL` `ETH` `BRA` `VNM` `KEN` `GTM` `CRI` `IDN`. No flags (unreadable at 40px, and political). The tag string is the accent colour |
| **Accent colour** | One of 8 (§3). Tag string, HP cup rim, machine trim, trail tint, name-label underline |
| **Face** | One of 6 sets above |
| **Accessory** (Light roast+) | One of 6, all coffee-native, all ≤ 120 tris: **paper cup hat** (a takeaway cup upside down, lid as brim) · **sack scarf** (burlap, `#B99A6A`, flaps in the steam) · **stirrer staff** (held upright beside the bean) · **filter-paper cape** (white cone paper, flaps in the steam) · **leaf sprout** (a single coffee leaf from the top of the bean, the "still green" joke) · **tamper helmet** (a steel espresso tamper worn as a helmet) |
| **Roast** | Not a slot. Body colour, earned |

The scarf and the cape are not decoration: they lean with the steam direction (§7), so an accessorised bean is also a wind sock.

### Reading at two sizes

- **40px, world map:** three things must read and only three: class silhouette, roast colour, accent colour (the tag). Faces and accessories may vanish; that is fine. The machine sits beside the bean at 1.2x and its silhouette is a fourth read for players who care.
- **400px, duel:** face state, crease, accessory, tag code, accent trim on the machine, the roast sheen on Burnt. Nothing new appears at 400 that was not on the mesh at 40; we scale, we never swap models.

### Bot roster (12, permanent; names never exceed 14 chars, per GAME-DESIGN §11)

| Name | Origin | Class | Roast | Stance |
|---|---|---|---|---|
| Decaf Dan | CRI | Liberica | Green | Flood |
| Cold Brew Su | KEN | Arabica | Green | Tree |
| Lil Ristretto | ETH | Arabica | Light | Mountain |
| Frenchie Press | KEN | Liberica | Light | Tree |
| Señor Crema | COL | Arabica | Medium | Mountain |
| Tamp Tamp | IDN | Robusta | Medium | Flood |
| Miss Moka | GTM | Liberica | Medium | Tree |
| Bitter Ted | BRA | Robusta | Dark | Mountain |
| Big Robusto | VNM | Robusta | Dark | Flood |
| Yirga Chef | ETH | Arabica | Dark | Tree |
| Dregs | VNM | Robusta | Burnt | Flood |
| Blend 42 | BRA | Liberica | Burnt | Mountain |

Spread: 4 per stance, every class, every roast stop at least twice. The game never comments on the names; that is the deadpan.

### Streak icon (owed to GAME-DESIGN §8)

Rising steam lines beside the name label: 1, 2 or 3 short wavy strokes in `--ink`, drawn as text glyphs `≈` stacked, for streaks of 1 to 3. From 4 upward: three lines plus `×N` in mono. Never fire, never a flame.

---

## 5. The machines

Four pieces of coffee kit, built from primitives, `--ink` enamel bodies with the player's accent as trim, chrome as `#C9C6C0` with flat facets, glass at 40% alpha. Each **≤ 400 triangles**, one opaque material shared with everything else plus one shared transparent material for glass.

| Machine | Default for | Shape language | Fire animation | Recoil | Idle |
|---|---|---|---|---|---|
| **Moka pot mortar** | Robusta | Bialetti octagon, two chambers, the whole pot tilts back on its base as the barrel; the shot leaves through the flipped-open lid | Lid snaps open (60ms), bean lobs out, a fat steam puff from the spout | Body squashes to 0.9 height for 80ms, recovers over 200ms | One thin wisp from the spout every 3s |
| **French press cannon** | Liberica | Glass cylinder on its side is the barrel, the plunger rod is the breech, the spout is the muzzle | Plunger slams forward (the charge: hold to push the plunger; the over-hold misfire from GAME-DESIGN §6 is the plunger hitting the glass and the whole press wobbling 12° with a dull clack) | Cylinder slides back 0.15 units, returns over 250ms | Plunger rises 1mm/s and drops back every 5s |
| **Espresso machine** | Arabica | Boxy enamel body, chrome group head as the barrel, a round pressure gauge on the front. The gauge needle IS the charge UI in the scene: it climbs from 0 to the red zone as you hold | Needle climbs, steam wand hisses, body vibrates at 0.5px rising to 2px; on release a hard crack and a plume from the group head; second hold fires two small beans in a 100ms burst | Whole machine hops 0.1 units | Gauge needle twitches ±2° every 4s |
| **Aeropress sniper** | None (unlock at Medium roast) | Two nested cylinders as a long barrel on a tripod of three stirrers; the filter cap is the scope | Plunger push, tight puff, no plume | 0.05 units, almost none: the accurate one is the still one | Scope glint (one specular sprite, 120ms) every 4s |

Angle is shown by the barrel itself: the machine pivots on its base to the aim angle, so the machine is the aim indicator (§9 adds only the numeral chip and the 30% preview arc from GAME-DESIGN §2).

---

## 6. The ammo

| Ammo | Projectile | Trail | Impact | Sound direction |
|---|---|---|---|---|
| **Green bean** | 0.25-unit ellipsoid, spins on two axes | 5 dots at 60ms intervals, fading over 400ms | 6 green chips, 300ms, a 0.3-unit dust puff | A dry bean clicking on a wooden counter |
| **Dark roast** | 0.32-unit ellipsoid, slow one-axis spin, visibly heavier (drops sooner, GAME-DESIGN §7) | A single smoke thread, 40% alpha, 600ms persistence | Ring of 12 dark chips, 0.5-unit dust, the ground line dips 2px for 2 frames | A bean dropped into an empty tin: low, round |
| **Ground coffee** | 6 pellets, 0.08-unit cubes (the only cubes in the game), fanned ±6° | None | Each pellet: a 3-particle sprinkle | Grinder burst 300ms on fire; a dry `shh` per pellet on impact |
| **Full cup** | A takeaway cup with lid, 0.5 units, end-over-end tumble | A spiral of 8 steam sprites | Splash decal disc 2 units wide in `--flood`, fades over 2s; 16 droplets; a `--crema` ring that expands 0 to 2.4 units over 500ms | A wet splat plus the paper cup clattering once |
| **Burnt-rank cosmetic** | Any of the above | Trail dots become `--crema` | unchanged | unchanged |

All projectiles are rendered as instanced meshes from one bean geometry (scaled) plus one cup and one cube; particles are one 64² white sprite tinted per ammo.

---

## 7. Terrain and steam

### The three stances as places (world) and stages (duel)

| Stance | Name on the map | World treatment | Duel stage treatment | Miss behaviour |
|---|---|---|---|---|
| **Mountain** | The Ridge | Violet basalt in 3 stepped terraces, sparse coffee shrubs, the highest ground, top-right of the composition; rock lip in front of each slot (the 40% cover from GAME-DESIGN §3) | +3 units, rock lip in front of the bean; the far band shows the ridge continuing | The projectile bounces down two terraces (800ms), each bounce a small dust puff and a click; the comedy beat |
| **Tree** | The Belt | 40 to 60 instanced coffee trees (short trunk + 3 stacked flattened spheres as a rounded, blobby canopy; **never cones, the first render read as pines**), cherries as instanced red dots; slots are branch platforms 1.5 units up | +1.5 units, canopy cone behind the bean absorbs splash (25% cover); leaves in the near band | Leaf burst: 10 leaf sprites, 700ms; if the shot goes through the canopy a few cherries drop |
| **Flood** | The Brew | A flat plane of `--flood` with a `--crema` foam edge and slow ripple glints (a 2-frequency sine on 4 vertex rows, no shader work); slots are stilt platforms of stirrers | 0 units, no cover; steam sprites thickest here (GAME-DESIGN §3 "high exposure") | Splash: `--flood` droplet ring 600ms, a 1.5-unit ripple ring, a steam puff; the harmless miss the design promises |

The map's centre is red soil with bean sacks as props and The Roaster (§2). Slots are visible as faint `--paper` rings on the ground at 30% alpha; free slots are hollow rings, taken slots have a bean on them.

**Sudden death (GAME-DESIGN §2):** the flood boils. Ripple amplitude doubles, steam sprite count ×2, the `--crema` edge pulses once per turn. No red screen, no siren; the world just gets angrier.

### Steam: how the player sees the wind before firing

Three redundant reads, all diegetic, so nobody has to find a gauge:

1. **The steam layer.** 40 billboard sprites (128² alpha texture, `--steam`) always present in the duel, on every stage including the mountain (steam rises from the lowland and drifts up the valley). Sprite velocity is exactly the steam value: at `0` they rise straight up at 0.4 units/s; at `±10` they lean 55° and travel 2.4 units/s. Sprites spawn along the bottom of the frame and die at the top over 2.5s, so the flow is always fresh. When the value changes at the turn boundary, sprites veer over 300ms; you watch the wind change.
2. **The wind socks.** Sack scarf and filter cape lean with the steam vector. Trees in the near band sway 2° per steam unit. Both cost nothing (a rotation on a child mesh).
3. **The gauge** (§9): `STEAM 4 →` on a paper chip, with the arrow's length proportional to strength.

Rule: if the steam layer were removed, a player should still be able to read direction from the socks and the trees. If the gauge were removed, nobody should notice for a turn.

---

## 8. Motion identity

Physics of the whole game: **heavy and snappy**. UI eases with `cubic-bezier(0.2, 0.8, 0.2, 1)` at 200ms and never overshoots. Only the beans get squash-and-stretch (1.15 / 0.85 for 80ms on fire and on hit). Text never moves after it lands (SKILL.md:333). Nothing floats, nothing breathes (SKILL.md:334).

### The signature moves, with timing

| Move | Timing | What happens |
|---|---|---|
| **Challenge accepted** (world to duel) | 900ms total | 0 to 150: every other bean fades to 40% and fog near-plane pulls in. 150 to 700: the camera flies along a spline from the world position to the duel side, FOV lerping 30° to 8°; at 700 we cut to the true orthographic camera behind a 60ms steam wipe (a burst of 60 steam sprites across the frame). 700 to 900: HUD chips slide up 24px from the bottom and settle. Sound: steam wand rising 600ms, then a cup set on a saucer as the HUD lands |
| **The Pour** (watch their shot, the async hook) | ≤ 3.5s, skippable by tap after the first time you ever see it; the final stamp always plays | 0 to 400: two `--paper` bands, 48px tall, feed in from top and bottom like a receipt through a printer (a letterbox; the one time the frame changes shape). The top band prints in mono: `MISS MOKA fired · 3h ago`. The opponent's bean holds its aim face; a wisp of steam rises above it. 400 to 2900: their shot replays at 1.0x from stored inputs, under THEIR turn's steam. Impact plays in full (shake, particles, cup drain). 2900 to 3200: hold. 3200 to 3500: the steam veers to your turn's value (visible), the bands retract, and `YOUR SHOT` thumps onto the top of the paper as a stamp (scale 1.3 to 1.0 in 120ms, a rubber-stamp sound). This is the Draw Something "watching the drawing appear" moment; it must feel like receiving something, so it is never faster than 3s on first view |
| **The shot arc** | Sim-driven, ≤ 2.5s | Camera locked. The previous shot's ghost trail (dotted, 30% alpha) stays for exactly one turn so you can correct. The bean squashes on fire; the machine recoils per §5 |
| **The hit** | Hit-stop 60ms; shake 180ms | Screen shake budget: 6px amplitude, 3 oscillations, exponential decay, applied to the camera not the canvas element. Hit bean flashes `--paper` for 2 frames, then hit face for 600ms. ≤ 24 particles. The HP cup drains over 400ms with a 100ms delay so the eye can travel from impact to cup |
| **The miss** | By stance, §7 | Flood splash 600ms · mountain tumble 800ms · canopy leaf burst 700ms. The shooter's face does not change; the deadpan is that nobody reacts to a miss except the terrain |
| **Fog thinning** (every impact on the fog half) | 300ms | A radial reveal from the impact point out to 1.5 units, ease-out, the fog plane alpha and the local sprite density falling together; the marker decal draws in the last 100ms. Permanent for the duel. Six pellets are six overlapping reveals staggered 40ms |
| **The Spotter flinch** (`Close.`) | 80ms, then the chip 120ms later | Inside the window the opponent's bean squashes 1.15 / 0.85 and its face cuts to the hit state for 400ms; the window itself does not move. The call chip prints under the Spotter with the stamp sound. `Wide.` and `Long.` print without a flinch |
| **The KO fog lift** | 600ms, before Ground. | The fog plane fades to 0 and the dense sprites disperse outward from the opponent's position; the Spotter window empties to plain `--sky-horizon`. Then the 1.4s Ground. sequence plays in the open. The kill is the only time you see them on the main stage |
| **The KO** ("Ground.") | 1.4s | 0 to 300: losing bean shakes ±3°. 300 to 800: mesh swaps to a cone of 120 ground-coffee pellets that settles into a heap (the bean has become grounds). 800: winner's face to win state. 900 to 1400: the result receipt prints from the top edge (§9) with a thermal-printer buzz |
| **Return to world** | 700ms | The challenge transition in reverse, faster. The steam wipe covers the ortho-to-perspective cut. Your bean lands on its slot |
| **Rank up** ("Roasted.") | 400ms, on the world map, after landing | Bean body colour lerps one roast stop, a single smoke wisp rises off it with a `tsss`, and `Roasted.` stamps beside the name label. Rank never changes inside the duel; the world is where you see who you have become |
| **Inbox badge print** | 200ms | On landing with pending duels the badge chip slides up 12px and fades in, one wisp of steam rises off it once. No pulse, no bounce, no red dot |

### What never moves

The horizon. The sky gradient (no clouds, no drift; motion budget goes to steam). HUD chip positions once settled. The Spotter window: its position and size are fixed for the duel, and it never zooms or pans, the crop only changes with the Aeropress unlock. The camera during a shot. The beans' world-map positions during someone else's duel. Text.

### Reduced motion

`prefers-reduced-motion`: transitions become 150ms crossfades through the steam wipe, screen shake is replaced by the cup rim flashing `--danger` for 120ms, the steam layer runs at 50% sprite count and speed (it is gameplay information, so it stays), squash-and-stretch is removed.

---

## 9. UI design system

### The call: diegetic paper

Every UI surface is **thermal receipt paper and stamped coffee-bag labels**. Not a chalkboard (the coffee-shop cliché, and dark boards on a bright world go muddy), not clean flat cards (reads as a generic mobile game in one glance). Defence:

1. It is coffee-native without a single illustration: a receipt is what a cup leaves behind.
2. It is nearly free: paper is a flat `--paper` fill, a 1.5px `--ink` border, a serrated edge via `clip-path`, and a 2px hard offset "print" shadow. No texture image, no blur.
3. It gives the deadpan tone a voice. A result printed as `DUEL #0412 · HITS 2 · SHOTS 5 · RESULT: ROASTED` is funnier than any animation we could afford, and it is the screenshot judges will post.

### Typography (2 faces, Google Fonts)

| Role | Face | Weights | Sizes (px, mobile / desktop) |
|---|---|---|---|
| Display | **Bricolage Grotesque** | 700, 800 | Headline 28 / 40 · Title 20 / 24 · Stamp words 40 / 64 |
| Mono (the receipt voice, all data, all labels, all buttons) | **Space Mono** | 400, 700 | Chip 12 · Body 14 / 16 · Number 20 / 28 · Receipt line 14 |

Mono labels are uppercase with letter-spacing 0.08em. Body copy is sentence case. Minimum text size anywhere: 12px mono, and only on chips. Line height 1.3 for mono, 1.1 for display. Numbers use `font-variant-numeric: tabular-nums` so receipts align.

### Tokens

| Token | Value |
|---|---|
| Spacing | 4 · 8 · 12 · 16 · 24 · 32 · 48 |
| Radius | 4 (chips, buttons) · 8 (cards, sheets) · 999 (stamps, badges) |
| Border | 1.5px `--ink`; 1.5px `--ink-dim` on abandoned states |
| Print shadow | `2px 2px 0 var(--ink)`, no blur; removed on press |
| Serrated edge | `clip-path: polygon()` zigzag, 6px teeth, top and bottom of receipts only |
| Chip height | 28 |
| Touch target | 44 minimum |
| Stamp | Circular, 2px double `--ink` ring, mono text on an arc, rotated −8°, 85% opacity as if inked by hand |

### Buttons

| Type | Fill | Text | Border | Press |
|---|---|---|---|---|
| Primary | `--ink` | `--paper`, mono 700, uppercase | none | translate 2px down + 2px right, shadow removed (the print press) |
| Secondary | `--paper` | `--ink` | 1.5px `--ink` | same |
| Danger | `--paper` | `--danger` | 1.5px `--danger` | same |

Height 44 mobile / 40 desktop. Full-width on mobile sheets.

### HUD components (duel)

| Component | Spec |
|---|---|
| **Aim / power** | The machine barrel shows the angle in-scene (§5). A 30%-of-trajectory dotted preview (GAME-DESIGN §2), 8 dots, `--ink` at 60%. Numerals on two chips bottom-centre: `62°` and `78%`. Power is also a **pressure-gauge arc** 96px wide under the chips: 0 to 100, the last 15% in `--danger` (French press over-hold zone, espresso red zone) |
| **Steam indicator** | Chip top-centre: `STEAM 4 →`; the arrow is a drawn line whose length is 6px per unit, direction by sign. Value 0 shows `STEAM 0 ·` |
| **HP as a cup** | 40×48 SVG takeaway cup per bean, top corners of the stage, rim in the player's accent. Fill is `--flood` with a 3px `--crema` line at the top; drains top-down over 400ms. At ≤ 25% the rim turns `--danger`. The cup is the only HP display; no numbers (the deadpan: you do not get a percentage, you get a cup) |
| **Turn indicator** | A paper strip top-left: `YOUR SHOT` or `THEIR SHOT` with the bean's name. In-scene: a single steam wisp above whichever bean is active. Live duels (M3): the 20s timer prints as a shrinking receipt line under the strip |
| **Class / machine / ammo chips** | Stamped-label chips, mono 12, in a rack bottom-left. Ammo chips show count as `×3`; standard shows `∞`. Active chip inverts (`--ink` fill). Class chip has a 8px dot in the class colour |
| **Stance labels** | Tiny mono chips under each bean: `RIDGE +3` `BELT +1.5` `BREW 0`. The fogged side keeps its chip: the stance is known even when the bean is not |
| **The Spotter window** | 112px circle (96px portrait), top corner on the opponent's side, above the fog half. Cup-bottom frame: 6px `--paper` rim, 1.5px `--ink` outer line, 3px `--crema` ring inside, 2px print shadow. Contents: the live ±2-unit crop from §2, background fogged to `--sky-horizon`. Nothing overlaps it; the opponent's HP cup sits beside it, not on it |
| **Call chip** | Directly under the Spotter, 28px paper chip, display face 700 at 14px, sentence case with a full stop: `Close.` `Wide.` `Long.` Prints for one turn (120ms after the flinch), then is removed at the next shot. Never two calls at once |
| **Impact marker** | In-scene decal, 0.6 units, double ring `--ink` at 60% with a centre dot, skinned per stance (dust / splash / leaf). Permanent for the duel; also drawn in the Pour replay on your own side when the opponent hits your half |
| **Fog half** | Not a HUD element but reads as one: the opponent's half at 70% `--sky-horizon` plus dense steam; thinned circles around markers at 20%. Lifts only at KO |
| **Roast rank badge** | A circular date-stamp: the roast swatch in the centre (16px), the level name around the arc (`MEDIUM ROAST`), 40px total. In the HUD next to the name |
| **Machine name** | Mono chip beside the rack: `MOKA POT MORTAR` |

### World HUD

| Component | Spec |
|---|---|
| **Your bean chip** | Top-left: 32px bean render (offscreen canvas, cached per profile), name, `RP 120`, roast badge, streak steam lines |
| **"N beans are shooting at you"** | Top-centre, a receipt stub pinned with a stamp: the count in the stamp (`3`), the sentence in mono under it. Tap opens the Inbox. Prints in per §8. Hidden entirely at 0 (an empty inbox is not a state we advertise) |
| **Today's roast** | Top-right chip: `TODAY'S ROAST #A3F1` (GAME-DESIGN §12) |
| **Leaderboard** | Not a button: tap The Roaster landmark. A small `LEADERBOARD` chip floats on it as a CSS2D label |
| **Sound toggle** | Bottom-right chip: `SOUND ON` / `SOUND OFF` |
| **Bean labels** | CSS2D: `NAME · ETH`, mono 12, `--ink` with 2px `--paper` stroke, accent underline 2px, streak lines to the right; bots get a small `BOT` tag in `--ink-dim` |

### Cards and sheets

| Component | Spec |
|---|---|
| **Challenge card** (tap a bean) | Bottom sheet on mobile, 360px card on desktop. Receipt layout: their bean at 200px, name + origin, class chip, machine chip, roast badge, `RIDGE +3 vs BREW 0` stance line, `RECORD 12 W · 4 L`. Machine picker (your 3 or 4 chips). Primary: `CHALLENGE`. Secondary: `BACK`. Confirming goes straight to the duel and your first shot (GAME-DESIGN §9) |
| **Name entry / landing** | One receipt, full height on mobile. `NAME: ______` with a blinking mono caret; three big beans (140px each) as the class picker with their names stamped under; origin as a row of 8 tag chips; face as a row of 6 bean thumbnails; accent as 8 swatches (24px circles, `--ink` ring on the selected). Primary: `ENTER THE WAR`. On confirm, a stamp slams onto the receipt (120ms) and the world reveals. Whole screen usable in 10s |
| **Profile editor** | Same sheet as landing, minus the name, with `SAVE` |
| **Result card** | A receipt printing from the top edge over 500ms with printer buzz: `DUEL #0412` · `VS MISS MOKA · GTM` · itemised lines `HITS 2 / SHOTS 5 / STEAM MAX 4 / DAMAGE 100 / TAKEN 45` · a dashed tear line · `RESULT` with a stamp `ROASTED` (`--success` ring) or `DECAF` (`--ink-dim` ring) · `+25 RP` · roast progress as a receipt bar `[||||||....] 150` · Primary `ONE MORE GO` · Secondary `BACK TO THE GROUNDS` · Tertiary text link `SHARE`. `ONE MORE GO` picks the next inbox duel if any, else the nearest bot |
| **Leaderboard** | A long receipt. Tabs as two stamps: `ALL TIME` / `TODAY`. Row: `01  SEÑOR CREMA · COL ........ 340 RP  ●` where the dot is the roast swatch. Your row inverts. 20 rows, bots excluded |
| **Inbox** | Header: `3 BEANS ARE SHOOTING AT YOU`. Primary at top: `PLAY ALL` (chains The Pour → your shot → next). Rows below, newest first. Below them, a `--ink-dim` header `GONE COLD` with abandoned duels |
| **Inbox row** | 64px tall: 48px opponent bean render · name + origin code (mono 14) · stance glyphs `RIDGE ▸ BREW` · two mini cups (12×14) for their cup and yours · `fired 3h ago` in `--ink-dim` · chevron. Tap opens The Pour directly. A `--accent` 4px bar on the left edge marks duels where they hit you last turn |
| **Abandoned duel** | Row goes `--ink-dim` on text and border, a diagonal `COLD` stamp across it. Actions: `REHEAT` (secondary, re-challenges the same bean with a fresh duel) or swipe to dismiss. Triggered at 7 days with no shot from either side (GAME-DESIGN §9) |
| **Share card** (M4) | 1080×1080 PNG built on an offscreen canvas: sky-zenith background, the bean rendered at 600px with machine, a receipt on the right third with name, origin, roast badge, `RECORD 12 W · 4 L`, `BEST STREAK 5`, and a deadpan headline in display 64: `I got roasted.` after a loss, `Ground.` after a KO win, `Still green.` for a fresh profile. Bottom line mono: `coffee-beans-war · the grounds` |

### States

| State | Treatment |
|---|---|
| Loading | A moka pot on `--paper` with a cup beside it; the cup fills as assets load. Mono line `Brewing.` No percentage |
| Offline | Receipt: `No steam.` with `RETRY`. The world stays visible behind, greyed to `--ink-dim` |
| Opponent disconnected (live, M3) | Receipt: `They stepped out.` with `WAIT` / `BACK TO THE GROUNDS`; the duel silently converts to async |
| Challenge expired | Toast chip: `Gone cold.` |
| First-time hints (max 3) | Paper tags tied to a stirrer stuck in the ground next to the relevant thing: `Drag from your bean to aim.` · `Steam moves your shot.` · `Tap any bean to challenge.` Each dismisses on the first successful action, never on tap |

Allison owns the flow, the input mechanics and the final microcopy; she inherits the components, tokens and tone rules above.

---

## 10. Sound direction

### Sourcing rule

Every sound in the game is made from coffee. Before generating anything, **record the real kit on a phone in Diego's kitchen** (20 minutes: burr grinder, kettle tick, steam wand, moka pot gurgle, French press plunge, Aeropress push, beans poured into a tin, a cup on a saucer, a spoon on a cup, a paper cup dropped). Real recordings beat generated SFX for a deadpan game because they are slightly wrong in the way real things are. Music is generated (Higgsfield `generate_audio`) from the descriptions below. Convert everything to mono OGG at 44.1kHz, SFX ≤ 1s each, loops ≤ 1.5 MB.

### Music

| Loop | Spec |
|---|---|
| **World** | 84 BPM, 32 bars, "kitchen percussion": a marimba-like melody played on tapped cups of different fill levels, a shaker made from beans in a tin, a kettle tick as the hi-hat, a soft upright-bass line, tape-warm and dry. No bossa nova, no lo-fi hip hop beat, no café playlist feel. Reference: the pace of someone making coffee alone in the morning. Ducks to 40% under a sheet |
| **Duel** | 112 BPM, 16 bars, two stems. Base: a grinder burst as the snare, moka-pot gurgle pitched as the bassline, cup taps as the melody. Tension stem (fades in when either cup ≤ 25% or in sudden death): a steam-wand hiss as a sustained hi-hat and the tempo of the cup taps doubling. Never a drop, never a choir |

### SFX list (22)

| # | Event | Direction |
|---|---|---|
| 1 | Moka pot fire | Gurgle-pop then a fat steam puff |
| 2 | French press fire | Plunge thunk then a whoosh |
| 3 | French press misfire | Plunger clacking against glass, dull |
| 4 | Espresso charge | Steam wand hiss rising in pitch over the hold |
| 5 | Espresso fire | A hard `ksh-TAK`, like a portafilter locking in |
| 6 | Aeropress fire | A tight `pff-thup` |
| 7 | Green bean impact | One bean clicking on a wooden counter |
| 8 | Dark roast impact | A bean dropped into an empty tin |
| 9 | Ground coffee fire | Grinder burst, 300ms |
| 10 | Ground coffee impact | Dry `shh` per pellet |
| 11 | Full cup impact | Wet splat plus one paper-cup clatter |
| 12 | Flood splash (miss) | A spoon dropped into a full mug |
| 13 | Mountain tumble (miss) | Three bean clicks descending in pitch |
| 14 | Canopy leaf burst (miss) | A handful of dry leaves rustled once |
| 15 | Steam turn change | A short steam release, 250ms |
| 16 | UI tick (chip tap, toggle) | A single bean dropped on paper |
| 17 | Stamp (confirm, YOUR SHOT, result stamp) | A rubber stamp on a counter |
| 18 | Receipt print | Thermal printer buzz, 500ms |
| 19 | Challenge accepted | Steam wand rise 600ms then a cup set on a saucer |
| 20 | Win sting ("Roasted.") | Beans poured into a jar, 600ms, ending on one cup clink |
| 21 | Lose sting ("Decaf.") | A kettle switching off: click, then the boil dying |
| 22 | KO ("Ground.") | Grinder running down to a stop, 900ms |

No UI whoosh library sounds. No orchestral hits. If it did not come from a kitchen, it is not in.

---

## 11. Asset production kit

### The plan: build it, do not generate it

Everything in the scene is primitives and lathes built in code from the numbers in §4 to §7. The reason is consistency and control: a generated GLB from Higgsfield 3D comes back at 20k to 80k triangles with its own material logic, and four of them will never share a silhouette language. Low-poly from spec ships in one style by construction, weighs nothing, and lets the palette be tokens instead of textures.

Higgsfield is used for exactly four **images**: two style anchors the team builds toward before any code, a bean line-up, and the Skool post cover. One `generate_3d` prompt is included as a fallback for the espresso machine only, the one asset with enough parts to be worth a shortcut, and it gets decimated to ≤ 400 tris and re-vertex-coloured to tokens if used.

### Asset count (say the number)

| Class | Count | Method |
|---|---|---|
| Bean bases | 3 | code (lathe) |
| Face sprite sheet | 1 | hand-drawn SVG, rasterised 1024² |
| Accessories | 6 | code (primitives) |
| Machines | 4 | code (primitives) |
| Terrain | 1 | seeded heightmap 128×128, vertex-coloured by height and biome mask, baked once |
| Vegetation | 2 | coffee tree (trunk + 3 flattened spheres, rounded canopy, cherries instanced), mountain shrub |
| Stance props | 2 | stilt platform (stirrers), branch platform |
| Map props | 3 | bean sack, The Roaster landmark, slot ring decal |
| Ammo | 2 | takeaway cup, pellet cube (bean projectile reuses bean base) |
| Sprites | 2 | steam 128², particle 64² white |
| Sky | 1 | two-colour gradient shader |
| UI textures | 0 | paper is CSS |
| **Built assets** | **27** | |
| Generated images | 4 | Higgsfield |
| Music loops | 2 | Higgsfield audio |
| SFX | 22 | recorded, generated only as fallback |
| **Total files** | **55**, of which 27 never leave code | |

### Consistency strategy for generated images

1. Generate the **world style anchor** first. Pin its seed. Every later image is image-to-image off it, opening with "preserve composition and colours" and describing only what changes (SKILL.md:273).
2. Every prompt ends with the same **style suffix**, verbatim: `low-poly flat-shaded 3D render, no outlines, two-tone facets, one warm directional light at low angle, soft shadows, milk-white sky, linear fog in pale latte, saturated matte colours, diorama long lens, no text, no post-processing, no bloom, no grain`.
3. Palette hexes are named in the prompt. The anchors are reference for the team, not textures; nothing generated ships inside the game except the Skool cover.

### Prompts (Lola's format, SKILL.md:243 to 251)

**A. World style anchor**

```
MODEL: Nano Banana 2 (image)
PLATFORM: Higgsfield
SETTINGS: 16:9, 2K, seed pinned on first good result
START FRAME: n/a (text to image)
END FRAME: n/a
PROMPT:
A low-poly diorama of a coffee-growing valley at first light seen from a high 52-degree angle through a long lens. Top-right: a ridge of violet-grey basalt (#59566B and #7F7B95) in three stepped terraces with sparse shrubs. Diagonal middle: a belt of small coffee trees with stacked cone canopies in two greens (#7DB35F lit, #3F7A40 shadow) dotted with tiny red cherries (#C7382E). Bottom-left: a flat lake of black brewed coffee (#2E1A12) with a thin foam edge (#C8925A), white steam drifting off it and up the valley. Red volcanic soil (#8E3B26) between biomes with burlap bean sacks and one small metal roasting drum at the centre. Scattered tiny coffee beans, each a different roast brown, standing upright on the terrain beside small coffee-machine shapes. Sky milk white (#F3EEE4) to pale latte (#E7D3B4) at the horizon, the far edge of the valley dissolving into that fog. low-poly flat-shaded 3D render, no outlines, two-tone facets, one warm directional light at low angle, soft shadows, milk-white sky, linear fog in pale latte, saturated matte colours, diorama long lens, no text, no post-processing, no bloom, no grain
```

**B. Duel style anchor**

```
MODEL: Nano Banana 2 (image)
PLATFORM: Higgsfield
SETTINGS: 16:9, 2K, image-to-image from A, same seed
START FRAME: use image A
END FRAME: n/a
PROMPT:
Preserve composition and colours. Change the camera to a strict orthographic side view, almost no perspective, 6 degrees down. Left: a slim oval coffee bean in medium roast brown (#8C5A2B) with two black dot eyes and a straight mouth, standing on a violet basalt terrace 3 units up behind a rock lip, beside an octagonal moka pot tilted back like a mortar. Right: a round chunky bean in dark roast (#4A2A18) standing on a platform of wooden stirrers over the black coffee lake, beside a glass French press lying on its side like a cannon. White steam sprites drift left to right across the whole stage. Behind the stage the valley recedes in two fog bands, mid ground half-fogged, far ridge as a pale silhouette. A dotted arc of small green beans mid-flight between them. low-poly flat-shaded 3D render, no outlines, two-tone facets, one warm directional light at low angle, soft shadows, milk-white sky, linear fog in pale latte, saturated matte colours, diorama long lens, no text, no post-processing, no bloom, no grain
```

**C. Bean line-up (the character sheet; run the Higgsfield character-sheet workflow first per the MCP instructions)**

```
MODEL: Nano Banana 2 (image)
PLATFORM: Higgsfield
SETTINGS: 3:2, 2K, image-to-image from A for palette, same seed
START FRAME: use image A
END FRAME: n/a
PROMPT:
Preserve colours and lighting. Replace the scene with a plain milk-white studio (#F3EEE4) and a red soil floor (#8E3B26). Three low-poly coffee beans standing upright in a row, front view, each one unit tall with a single crease and two black dot eyes and a straight deadpan mouth, no eye whites. Left: Arabica, slim oval, S-shaped crease, leaning slightly forward, light roast tan (#C69C6D), wearing a small upside-down paper takeaway cup as a hat. Middle: Robusta, almost round and squat, straight shallow crease, medium roast (#8C5A2B), with a burlap sack scarf. Right: Liberica, taller asymmetric teardrop with a hooked tip, crease off-centre, leaning off its own axis, dark roast (#4A2A18), with a white filter-paper cape. Each has a small paper luggage tag hanging off its left side. low-poly flat-shaded 3D render, no outlines, two-tone facets, one warm directional light at low angle, soft shadows, milk-white sky, linear fog in pale latte, saturated matte colours, diorama long lens, no text, no post-processing, no bloom, no grain
```

**D. Skool post cover**

```
MODEL: Nano Banana 2 (image)
PLATFORM: Higgsfield
SETTINGS: 1:1, 2K, image-to-image from B, same seed
START FRAME: use image B
END FRAME: n/a
PROMPT:
Preserve colours and lighting. Reframe square. Centre a single dark roast bean (#4A2A18) with dot eyes narrowed in aim, standing beside a chrome-and-black espresso machine whose pressure gauge needle is in the red, a plume of white steam bursting from its group head, on the black coffee lake with steam drifting. Leave the upper third empty milk-white sky for a title. low-poly flat-shaded 3D render, no outlines, two-tone facets, one warm directional light at low angle, soft shadows, milk-white sky, linear fog in pale latte, saturated matte colours, diorama long lens, no text, no post-processing, no bloom, no grain
```

**E. Fallback only: espresso machine via generate_3d**

```
MODEL: Higgsfield generate_3d (image-to-3D preferred: feed a crop of image D)
PLATFORM: Higgsfield
SETTINGS: single object, no scene, lowest poly option available
START FRAME: crop of image D, machine only
END FRAME: n/a
PROMPT:
A single small espresso machine as a low-poly toy: boxy black enamel body, one chrome cylindrical group head protruding from the front like a short barrel, a round pressure gauge on the front face, a thin steam wand on the right side, a drip tray. No cups, no background, no text. Flat faceted surfaces, minimal detail, clean silhouette, suitable for decimation to 400 triangles.
```

Post-process if used: decimate to ≤ 400 tris in Blender, strip materials, assign vertex colours from tokens (`--ink` body, chrome `#C9C6C0`, accent trim), flat shade, export GLB.

---

## 12. Anti-patterns: what this game is NOT

- **Not Clash-of-Clans plastic.** No specular glossy shading, no bevelled highlights, no rim light. Two tones per face, matte.
- **Not photoreal.** No PBR textures, no roughness maps, no image textures on the world at all.
- **Not a "cute mobile game."** No big sparkling eyes, no bouncing UI, no confetti, no stars, no coin sounds, no exclamation marks, no emoji.
- **Not brown.** The world is green, red and violet-grey. If a screenshot of the world reads as brown, the palette has drifted.
- **Not cream + serif + terracotta.** No serif faces anywhere. The red soil stays a minority colour and is `#8E3B26`, not terracotta.
- **No purple gradients.** Liberica's plum is flat and it is the only purple-adjacent token in the game.
- **No grain, noise or vignette overlays** (SKILL.md:339).
- **No outlines, no cel-shading passes, no bloom.**
- **No chalkboards, latte art, barista culture, café playlists.** The coffee here is a valley and a war, not a shop.
- **No flags** on origin badges.
- **No fire or lightning iconography.** Streak is steam. Danger is a red cup rim.
- **No camera movement during a shot.** Drama comes from the arc, not the lens.
- **No generic UI whooshes, no orchestral stings, no drop.**
- **Nothing that is not coffee.** The stirrer tripod, the paper tags, the burlap, the tamper: all of it is from the kit or the crop. If someone proposes a rock, a sword, a flag or a star, the answer is which coffee thing does that job.

---

## 13. Performance guardrails for the look

Target: **60 fps on a 2022 mid-range Android (Pixel 6a / Galaxy A53 class) in Chrome, 30 fps hard floor**, desktop Safari and Chrome at 60. Emmett owns the measurement; these are the ceilings the art must fit under, and Sonny gates against them per milestone.

| Budget | World | Duel |
|---|---|---|
| Visible triangles | ≤ 120k | ≤ 60k |
| Per bean (base + accessory + tag) | ≤ 240 + 120 + 20 | same |
| Per machine | ≤ 400 | same |
| Terrain | 128×128 grid, ~32k tris, one merged mesh | clipped slice of the same mesh |
| Trees | ≤ 60 instances × 90 tris, one `InstancedMesh`; cherries one `InstancedMesh` of ≤ 600 × 8 tris | near band ≤ 12 trees |
| Draw calls | ≤ 40 | ≤ 30 |
| Materials | 1 opaque Lambert (vertex colours), 1 transparent (glass, steam, particles share it via alpha), 1 sky shader, 1 flood material | same |
| Lights | 1 directional (casting) + 1 hemisphere. Nothing else, ever | same |
| Shadow map | 1024² mobile, 2048² desktop, `PCFSoftShadowMap` | same map, tighter frustum |
| Textures in VRAM | face atlas 1024² (1 MB), steam 128², particle 64². That is the complete list | same |
| Steam sprites | ≤ 40 (20 under reduced motion) | ≤ 80 in sudden death |
| Particles alive | ≤ 24 per event, ≤ 96 total, one instanced pool | same |
| Pixel ratio | `min(devicePixelRatio, 2)` desktop, `min(devicePixelRatio, 1.5)` on mobile; drop to 1.0 if the frame time exceeds 20ms for 60 consecutive frames | same |
| Antialias | Renderer MSAA on (cheap at capped DPR); no FXAA/SMAA pass | same |
| Post-processing | None | None |
| CSS2D labels | ≤ 32 visible; cull beyond the viewport | ≤ 4 |
| Bean renders for UI | Cached PNG per profile from an offscreen 128² render, regenerated only on profile change | same |
| Fonts | 2 families, 4 weights total, `font-display: swap`, subset to Latin + Latin Extended (for Señor) | same |
| Audio | ≤ 3 MB total, decoded lazily after first interaction | same |
| First playable | ≤ 1.5 MB JS + assets gzipped before the first duel can start | |

Two rules keep the look alive under the budget: **merge and instance everything that shares a material**, and **when something has to go, cut particles before sprites, sprites before shadows, shadows before fog, and never cut the steam layer** because it is gameplay information.

---

*v0.1, 2026-09-05. Written against `BRIEF.md` (async-by-default multiplayer, Diego's 2026-09-05 direction) and `GAME-DESIGN.md` v0.1 §2 to §13. Owes Smith: the 12-bot roster (§4), the streak icon (§4), the house copy lines (§1). Next pass after Diego reads it: an HTML design-system page built from these tokens, then the four anchor images.*
