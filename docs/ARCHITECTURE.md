# Coffee Beans War: Architecture

**Seat:** Emmett (Senior Dev, architecture + design review) · **Status:** v0.1, design phase
**Written against:** `BRIEF.md` §5 §6 §9, `GAME-DESIGN.md` §2 §2b §9 §10 §12, `ART-DIRECTION.md` §2 §7 §8 §11 §13, `design-system.html`
**Scope expansion held for this project:** Three.js rendering, game loop, netcode (`BRIEF.md:92`)

This is the architecture section of the joint design doc. Allison owns `docs/UX.md`, Sonny owns `docs/QA.md`, Lola owns `docs/ART-DIRECTION.md`. Where I contradict another doc I say so and give the mechanism, not the opinion.

---

## 0. Approach in three sentences

One Vite + TypeScript static site, one Three.js scene, two cameras, and a pure dependency-free simulation module that both clients run to get identical results from the same stored inputs. Supabase (anonymous auth + Postgres + RLS) holds players, duels and turn inputs; it is never on the critical path for the first duel, so the game runs fully when the backend is asleep, blocked or not yet built. Everything that can be derived is derived: fog of war, duel state, terrain and the stage silhouette are pure functions of a seed and a turn list, so the only durable data in the system is a list of integers per shot.

**The single most important architectural decision in this document:** the game is playable end to end with the network layer switched off. `BRIEF.md:12` says *"It has to run. If they can't play it, it doesn't count."* Every other decision here is subordinate to that.

---

## 0.1 Verdicts on Sonny's QA constraints (`QA.md` DT-R2, SEC-01, SEC-04, NC-03, NC-04, NC-07, SD-01)

Sonny's QA plan landed while this was being written. Seven constraints, all answered here rather than left to the implementer.

| # | Sonny's constraint | Verdict | Where |
|---|---|---|---|
| 1 | Bit-exact goldens across V8 / JSC / SpiderMonkey, zero tolerance, no transcendental `Math` in `src/sim` | **Accept in full.** Restricted float64 plus a committed sine table, **not** fixed-point. Reasoning in §3.4. Enforced by a lint rule, not by discipline (§1.5) | §1.5, §3.4, §3.6 |
| 2 | Supabase Anonymous Auth instead of a raw localStorage device UUID | **Accept, already the design (§4.2).** One amendment to his shape: `players.id` **is** the `auth.users(id)`, so policies read `auth.uid() = players.id` with no `auth_uid` column and no extra index. Same verifiable identity, one fewer column and one fewer join on the hottest query in the game | §4.2, §4.4 |
| 3 | `turns` unique on `(duel_id, turn_index)` plus a `whose_turn` trigger so simultaneous fires are structurally impossible | **Accept in full, and adopt his column name.** `duels.whose_turn` replaces my `to_move_id` throughout so his NC-03 / NC-04 tests and this schema are the same object. The composite PK was already there; the trigger is added as defence in depth behind the RPC (§4.6) | §4.4, §4.6 |
| 4 | Loadouts frozen on the duel row | **Accept, and he found a real gap.** Stances, machines and slots were already frozen; **`bean_class` was not**, and class drives shot spread (`GAME-DESIGN.md:100`). A player editing their class from the profile sheet mid-async-duel would have silently changed the replay of every stored turn. `challenger_class` / `opponent_class` added to `duels` | §4.4 |
| 5 | Daily seed from Postgres `timezone('Europe/Dublin', now())`, never `new Date()` | **Accept.** `cbw_today()` in SQL, and `duels.daily_seed` defaults from it, so the seed is server-assigned at duel creation and no client clock touches it. One documented exception: a purely local bot duel has no server, so it uses the last server-supplied day and dims the tag (§3.3) | §3.3, §4.4 |
| 6 | Vercel Cron keep-alive so the free-tier project is not paused on judging day | **Accept, already the design.** One daily cron doing keepalive plus abandonment plus prune (§4.8), and it is the mitigation ranked in §8.4 | §4.8 |
| 7 | First duel fully local so a paused backend still yields a playable bot duel | **Accept, and go further.** M0 ships with the Supabase package not even installed; bot duels never write `turns` at all (§5.4); the offline path is gated at M2, not M4 (§7) | §4.1, §5.4, §7 |

Two additional items from his plan folded in below without argument, because he is right: an **ammo-budget check** in `play_turn` against turns already stored (SEC-04, and my first draft would have let a player fire five dark roasts from a rack of three), and the **`/#determinism` production route** (DT-05) as the on-device golden runner, replacing my `?stats=1` self-check for that job.

One tie-break he asks for and this document owes him (DT-07, "both cups hitting 0 on the same turn"): **the shooter wins.** You cannot be killed by your own splash while killing your opponent. One `case` in `settle_duel`, deterministic, and it is now stated so it cannot be decided twice.

---

## 1. Project scaffold

### Confirm / challenge on each item from `BRIEF.md` §6

| Proposal | Verdict | Reason |
|---|---|---|
| Vite + TypeScript | **Confirm** | Static output, instant HMR, and the entire game is one bundle behind one URL. |
| No UI framework, HTML overlays | **Confirm, strongly** | React is ~45KB gzip against a 1.5MB total that already spends ~200KB on Three. The HUD is chips, receipts and stamps, all of which are `textContent` and a class toggle. See §1.4 for what replaces it. |
| Three.js for both layers | **Confirm** | See §2. |
| Deterministic sim, server stores inputs | **Confirm, with corrections** | See §3. The doc's claim needs a transcendental ban and a checksum to actually hold. |
| Supabase | **Confirm, with a named failure mode** | See §4. The free tier's 7 day auto-pause is a competition-killer and needs an explicit mitigation. |
| Public GitHub `diegobdesign`, Vercel | **Confirm** | `gh api user` returns `diegobdesign`. Vercel Hobby is legitimate here: personal, non-commercial, one static site plus one cron. |
| Bots scripted, no LLM | **Confirm** | No AI surface, so no Hank seat, as `BRIEF.md:96` says. |

### 1.1 Pinned versions (exact, verified on npm 2026-09-05)

```json
{
  "dependencies": {
    "three": "0.185.1",
    "@supabase/supabase-js": "2.115.0"
  },
  "devDependencies": {
    "@types/three": "0.185.4",
    "typescript": "6.0.3",
    "vite": "8.2.2",
    "vitest": "5.0.0",
    "eslint": "10.10.0",
    "typescript-eslint": "8.69.0",
    "prettier": "3.9.6",
    "tsx": "4.23.13"
  }
}
```

**Pin TypeScript to `6.0.3`, not `7.0.2`.** `typescript@7.0.2` is `latest` on npm, but `typescript-eslint@8.69.0` declares `peerDependencies.typescript: ">=4.8.4 <6.1.0"` and there is no v9 of `typescript-eslint` yet (dist-tags are `latest: 8.69.0`, `canary: 8.69.1-alpha.0`). Installing TS 7 means either no type-aware linting or a `--force` install that produces confusing parser errors. Not worth it on a project with this deadline. Revisit after the competition.

Exact pins, no carets. A patch bump to Three mid-build that changes a material default is not a debugging session anyone wants during a game jam. `package-lock.json` is committed.

Zero runtime dependencies beyond `three` and `@supabase/supabase-js`. No physics engine, no state library, no PRNG library (`seedrandom` is 8KB for something that is 12 lines here, and its `quick()` path uses float arithmetic we do not want). No `stats.js`.

### 1.2 Folder layout

```
coffee-beans-war/
├─ api/
│  └─ cron.ts                  Vercel Node function: keepalive + abandon + prune
├─ docs/                       BRIEF, GAME-DESIGN, ART-DIRECTION, UX, ARCHITECTURE, QA,
│                              design-system.html, concept/
├─ public/
│  ├─ fonts/                   self-hosted woff2 subsets (see §8.5)
│  ├─ face-atlas.png           512² (challenged down from 1024², §8.5)
│  └─ sfx/                     lazy loaded after first interaction
├─ scripts/
│  ├─ gen-trig.ts              emits src/sim/trig.table.ts (committed)
│  ├─ gen-golden.ts            emits test/golden/vectors.json (committed)
│  └─ gen-bots.ts              emits supabase/migrations/0004_bots.sql from Lola's roster
├─ src/
│  ├─ main.ts                  boot, mode router: landing | world | duel
│  ├─ core/
│  │  ├─ types.ts              cross-cutting unions (Stance, BeanClass, Machine, Ammo)
│  │  ├─ store.ts              ~40 line typed pub/sub, the whole "state management" layer
│  │  ├─ clock.ts              rAF loop, frame time EMA, visibility handling
│  │  └─ env.ts                parsed import.meta.env, Zod-free hand validation
│  ├─ sim/                     PURE. No DOM, no three, no supabase, no Date, no Math.sin
│  │  ├─ rng.ts                fnv1a32 + mulberry32 + turnRng
│  │  ├─ trig.ts               sinDeciDeg / cosDeciDeg over the committed table
│  │  ├─ trig.table.ts         generated, committed, 901 decimal literals
│  │  ├─ terrain.ts            seeded heightmap + heightAt(x, z) + duel slice sampling
│  │  ├─ ballistics.ts         fixed-step integrator + swept terrain collision
│  │  ├─ rules.ts              ammo / class / machine / stance constant tables
│  │  ├─ duel.ts               simulateShot, applyShot, replayDuel, spotterCall
│  │  └─ hash.ts               int32 outcome checksum
│  ├─ bots/
│  │  ├─ solver.ts             aim search over src/sim
│  │  ├─ estimate.ts           the walking-in belief state (GAME-DESIGN §10, §2b)
│  │  └─ roster.ts             the 12 bots, generated from Lola's list
│  ├─ render/
│  │  ├─ renderer.ts           WebGLRenderer setup, context-loss handling
│  │  ├─ materials.ts          the five shared materials, created exactly once
│  │  ├─ cameras.ts            perspective world cam, ortho duel cam, spotter cam
│  │  ├─ perf.ts               PerfGovernor: DPR ladder + degrade ladder
│  │  ├─ stats.ts              the ?stats=1 overlay
│  │  ├─ world/                terrain, trees, beans (instanced), props, labels, scene
│  │  └─ duel/                 stage, fog, spotter, steam, particles, trajectory, markers
│  ├─ net/
│  │  ├─ client.ts             supabase client, or the null client when unconfigured
│  │  ├─ auth.ts               signInAnonymously + session persistence
│  │  ├─ players.ts duels.ts turns.ts leaderboard.ts
│  │  └─ offline.ts            localStorage mirror + degrade banner
│  ├─ ui/
│  │  ├─ screens/              landing, world HUD, duel HUD, result, leaderboard, inbox
│  │  ├─ components/           chip, receipt, stamp, sheet, card (plain DOM builders)
│  │  └─ a11y.ts               reduced-motion, focus ring, live region for the calls
│  └─ assets/                  code-built geometry: bean.ts, machines.ts, accessories.ts,
│                              trees.ts, props.ts  (ART-DIRECTION §11 "build it, do not generate it")
├─ supabase/migrations/        0001_init.sql .. 0005_cron.sql
├─ test/
│  ├─ golden/vectors.json      500 frozen sim outcomes
│  ├─ sim/                     unit + property tests
│  └─ budget.spec.ts           headless triangle / material / mesh budget gate
├─ eslint.config.js
├─ vercel.json
└─ vite.config.ts
```

The `sim` boundary is the important one and it is **enforced by the linter, not by discipline** (§1.5).

### 1.3 npm scripts (exact)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "npm run typecheck && vite build",
    "preview": "vite preview --host",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:determinism": "vitest run test/golden",
    "test:budget": "vitest run test/budget.spec.ts",
    "gen:trig": "tsx scripts/gen-trig.ts > src/sim/trig.table.ts",
    "gen:golden": "tsx scripts/gen-golden.ts > test/golden/vectors.json",
    "gen:bots": "tsx scripts/gen-bots.ts > supabase/migrations/0004_bots.sql",
    "analyze": "vite build && npx vite-bundle-visualizer"
  }
}
```

`build` runs `typecheck` first. That is deliberate: it makes `npx tsc --noEmit` (CLAUDE.md dev-protocol rule 2) a **server-side gate on Vercel**, not a local hook someone can `--no-verify` past. A type error fails the deploy, which is the enforcement boundary that actually holds.

### 1.4 What replaces the UI framework

`src/core/store.ts`, about 40 lines:

```ts
type Listener<T> = (value: T) => void;

export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(fn: Listener<T>): () => void;
}

export function createStore<T>(initial: T): Store<T> { /* Set<Listener>, no batching */ }
```

Screens are functions that take a root element, build DOM once, and return a `dispose()` that unsubscribes. No virtual DOM, no diffing, no reconciler. The HUD updates that happen every frame (the steam gauge arrow, the cup drain) write directly to a cached element reference and a CSS custom property, never through the store, because a per-frame store notification on a phone is a garbage generator.

**Trap to name up front:** every per-frame DOM write must be a `transform` or a custom property that feeds a `transform` / `opacity`. Writing `width`, `height`, `top` or `left` per frame forces layout, and on a Pixel 6a that is the difference between 60fps and 40fps with a flat GPU graph. `ART-DIRECTION.md` §8 already says "screen shake applied to the camera not the canvas element", which is the same instinct.

### 1.5 Lint and format

ESLint 10 flat config, `typescript-eslint` in `strictTypeChecked`, Prettier for format only (no `eslint-plugin-prettier`, run them separately). Three project-specific rule blocks, all of which encode a decision from this document so it cannot silently rot:

```js
// eslint.config.js (excerpt)
const NON_DETERMINISTIC = [
  'sin','cos','tan','asin','acos','atan','atan2',
  'pow','exp','expm1','log','log1p','log2','log10',
  'hypot','cbrt','sinh','cosh','tanh','random'
];
// Math.fround is deliberately NOT on this list: it is exactly specified
// (round to nearest float32) and therefore deterministic. Corrected on
// Sonny's read; QA.md's allow-list is right and my first draft was wrong.

export default [
  // 1. The sim is pure. Nothing from the app may leak into it.
  {
    files: ['src/sim/**/*.ts', 'src/bots/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        'three', 'three/*', '@supabase/*', '**/render/**', '**/ui/**', '**/net/**', '**/core/store'
      ]}],
      'no-restricted-globals': ['error',
        { name: 'Date', message: 'The sim has no clock. Pass turn index.' },
        { name: 'performance', message: 'The sim has no clock.' }
      ],
      'no-restricted-properties': ['error', ...NON_DETERMINISTIC.map(p => ({
        object: 'Math', property: p,
        message: 'Implementation-defined across V8 / JSC / SpiderMonkey. Use src/sim/trig.ts, ' +
                 'plain arithmetic, or the Irwin-Hall gaussian in src/bots. See ARCHITECTURE §3.4.'
      }))]
    }
  },
  // 2. No `any`, no unchecked `as`, exhaustive switches. SKILL.md standard.
  { rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error'
  }},
  // 3. Nothing outside src/render may import three. Keeps the bundle boundary honest.
  { files: ['src/{sim,net,ui,core,bots}/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['three', 'three/*'] }] } }
];
```

`tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noImplicitOverride: true`, `verbatimModuleSyntax: true`, `moduleResolution: "bundler"`, `target: "ES2022"`. `noUncheckedIndexedAccess` matters more than usual here because the sim is full of typed-array and lookup-table indexing, and the byjosem null-sort incident that created the dev-protocol was exactly this class of bug.

### 1.6 Repo and hosting

- Repo: `github.com/diegobdesign/coffee-beans-war`, **public**. The competition asks for a repo link (`BRIEF.md:13`), so the repo is part of the submission and its README is a judged surface. It gets the same care as the game: one screenshot, one link, one paragraph, the controls.
- Branching: `main` is always deployable. Feature branches `feat/m1-world`, `fix/duel-tunnelling`. PR per milestone slice, Vercel preview URL on every PR. This is not a client project, so lane classification is not mandatory (`BRIEF.md:96`), but branch + tsc + PR discipline applies.
- Vercel: static output from `dist/`, plus one Node serverless function at `api/cron.ts`. `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron", "schedule": "0 4 * * *" }],
  "headers": [
    { "source": "/assets/(.*)", "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]},
    { "source": "/fonts/(.*)", "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]}
  ]
}
```

Vercel Hobby allows 2 cron jobs at a maximum of once per day. One daily job fits exactly, and that one job does three things (§4.8).

**Secrets:** only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` reach the client, which is correct (the anon key is a public identifier, RLS is the boundary). `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are server-only Vercel env vars used by `api/cron.ts` and never prefixed `VITE_`. No `.env` committed (CLAUDE.md dev-protocol rule 5).

---

## 2. Rendering

### 2.1 One scene, two cameras: confirmed, with the honest caveat

`ART-DIRECTION.md` §2 specifies a `PerspectiveCamera` (FOV 30°, pitch 52°, yaw 35°) for the world and an `OrthographicCamera` (pitch 6°, 28 unit stage width) for the duel, on the same scene, with a clipping plane removing terrain in front of the duel slice. Confirmed. One `THREE.Scene`, one `WebGLRenderer`, one `CSS2DRenderer`, three cameras (world, duel, spotter), and a mode router that toggles `Object3D.visible` and swaps which camera the render loop uses.

The caveat that must be understood before anyone writes the duel stage: **a clipping plane is a fragment-stage discard, not a geometry reduction.** `material.clippingPlanes` costs you the whole terrain mesh's vertex processing every frame regardless of how much it hides. That is fine here (the merged terrain is ~32k tris in one draw call and vertex-bound cost on a Pixel 6a at that size is negligible), but the `ART-DIRECTION.md` §13 line "Terrain: clipped slice of the same mesh, ≤60k tris" is describing *visible* triangles, not *submitted* ones. The `?stats=1` overlay reports `renderer.info.render.triangles`, which counts submitted. Sonny gates against submitted, and the duel number will read ~32k for terrain alone. That is expected and correct, not a regression.

Two mechanical requirements that are easy to miss:

```ts
renderer.localClippingEnabled = true;              // global flag, off by default
material.clippingPlanes = [duelSlicePlane];
material.clipShadows = true;                       // otherwise the clipped terrain still casts
```

Without `clipShadows`, the terrain you clipped away keeps throwing a shadow across the stage and nobody will work out why for an hour.

### 2.2 Materials: five, not four

`ART-DIRECTION.md` §13 budgets four. I want five, and the fifth is not a budget breach, it is the transparent material split that the art direction implies but does not separate:

| # | Material | Config | Used by |
|---|---|---|---|
| 1 | `opaque` | `MeshLambertMaterial({ vertexColors: true, flatShading: true })` | terrain, beans, machines, trees, cherries, props, accessories, markers |
| 2 | `veil` | `MeshBasicMaterial({ transparent: true, depthWrite: false, blending: NormalBlending })` | steam sprites, particles, fog plane |
| 3 | `glass` | `MeshLambertMaterial({ transparent: true, opacity: 0.35, depthWrite: true })` | espresso machine glass, the full-cup ammo |
| 4 | `sky` | `ShaderMaterial`, two-colour vertical gradient, `depthWrite: false`, `side: BackSide` | sky dome |
| 5 | `flood` | `MeshLambertMaterial({ vertexColors: true, flatShading: true })` with a per-frame vertex offset | the lake (needs its own instance because its geometry animates) |

Splitting `veil` from `glass` matters: steam with `depthWrite: true` produces the classic transparent-sorting artefact where a sprite behind another sprite punches a hole in it. Glass with `depthWrite: false` disappears behind the machine it sits on. They cannot share one material.

**The vertex-colour trap, and it will bite on the first commit.** Three has had `ColorManagement` on by default since r152. Vertex colours in a `BufferAttribute` are interpreted as being in the **linear working space**, not sRGB. Writing the design-system hex tokens straight into a `Float32BufferAttribute` as `0x7DB35F / 255` produces a washed out, milky world that looks like a bad Instagram filter, and every attempt to "fix the palette" makes it worse. The correct write:

```ts
const c = new THREE.Color();
c.setHex(0x7DB35F, THREE.SRGBColorSpace);   // converts sRGB literal -> linear working space
colors[i * 3 + 0] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
```

Same for `InstancedMesh.setColorAt`. And `renderer.outputColorSpace = THREE.SRGBColorSpace` (the r152+ default) with `renderer.toneMapping = THREE.NoToneMapping`, exactly as `ART-DIRECTION.md` §2 asks. With this in place, "what this document says a token is, is what the screen shows" is true. Without it, it is not, and the art direction will be blamed for a colour-management bug.

### 2.3 Instancing plan

`ART-DIRECTION.md` §13 budgets trees and cherries as `InstancedMesh`. It does not budget **beans**, and that is the gap that breaks M2.

At M1 there are 12 bots plus you: 13 beans × (240 base + 120 accessory + a machine at 400) is ~10k triangles and, naively, 39 draw calls. That is the entire 40 draw call budget spent on beans alone before the terrain is drawn. At M2, with the whole Skool community persisting on the map (`GAME-DESIGN.md:160` "Everyone is always on the map"), it is unbounded.

**Decision: every repeated object on the world map is an `InstancedMesh`, and beans on the world map do not have individual faces.**

| Object | Technique | Instances | Draw calls | Tris |
|---|---|---|---|---|
| Terrain (merged, vertex-coloured) | one `Mesh` | 1 | 1 | ~32k |
| Flood plane | one `Mesh` | 1 | 1 | ~1k |
| Sky dome | one `Mesh`, `BackSide` | 1 | 1 | 60 |
| Coffee trees (trunk + 3 canopy spheres merged into one 90-tri geometry) | `InstancedMesh` | ≤60 | 1 | 5.4k |
| Cherries | `InstancedMesh` | ≤600 | 1 | 4.8k |
| Bean bodies | 3 `InstancedMesh`, one per class silhouette, `instanceColor` = roast body colour | ≤60 total | 3 | ≤14.4k |
| Accessories | 6 `InstancedMesh`, one per accessory type | ≤60 total | ≤6 | ≤7.2k |
| Machines | 4 `InstancedMesh`, one per machine | ≤60 total | ≤4 | ≤24k |
| Slot rings (decal) | 1 `InstancedMesh` of a flat ring | ≤120 | 1 | 2.9k |
| Bean sacks + Roaster | merged into one `Mesh` | 1 | 1 | ~2k |
| Steam | 1 `InstancedMesh` of a 2-tri billboarded quad | ≤40 | 1 | 80 |
| **Opaque subtotal** | | | **≤21** | **~94k** |
| Shadow pass (casters only, §2.5) | | | **+8** | |
| Transparent (steam, sky, flood glints) | | | **+3** | |
| **World total** | | | **≈32** | **≈94k** |

Under 40 draw calls and under 120k triangles with headroom. `instanceColor` covers roast level and accent tint per bean with zero extra draw calls.

**Faces.** The face atlas needs a per-instance UV offset, which means patching the Lambert shader via `onBeforeCompile` and an `InstancedBufferAttribute`. That is real, fiddly work for a feature that is invisible: at the world camera's FOV 30° / pitch 52° framing, a bean's face is roughly 8 to 14 screen pixels. **My call: world map beans use one shared neutral face baked into the bean geometry's vertex colours. Individual faces render in the duel (2 beans), in the Spotter, in the challenge card, and in the cached 128² profile PNG that `ART-DIRECTION.md` §13 already specifies.** Nobody will notice, and it saves a custom shader on the critical path. Flag to Lola so she can veto with eyes open.

**Population cap.** `GAME-DESIGN.md:160` promises the whole community on the map. Render at most 60 beans: your own, the 12 bots, then the most recently active humans, with a `+N` paper chip on the world HUD for the rest. This is honest (nobody can visually parse 200 beans on a 60×60 diorama anyway), it caps the render cost at a constant, and it gives Allison a real HUD element instead of a silent truncation.

**The one thing not to do: `THREE.Sprite`.** Each `Sprite` is its own `Object3D` with its own draw call. Forty steam sprites as `Sprite` objects is forty draw calls and the entire budget. Steam and particles are one `InstancedMesh` of a quad, billboarded in the vertex shader by zeroing the rotation part of the modelView matrix. One draw call for the layer.

### 2.4 CSS2DRenderer labels

Confirmed per `ART-DIRECTION.md` §2 ("HTML overlays, never sprites, so names stay crisp"). Constraints:

- `CSS2DRenderer` writes a `transform` to every registered label's element **every frame**. At 32 labels that is 32 style writes per frame, which is fine. At 120 it is measurable on a Pixel 6a. The §13 budget of ≤32 visible is therefore a real budget, not a suggestion. Enforce with an explicit cull each frame: sort labels by squared distance to the camera, `object.visible = true` for the nearest 32 plus always your own bean, `false` for the rest. `CSS2DObject` respects `visible` and sets `display: none`.
- The label layer sits in its own absolutely-positioned div with `pointer-events: none` on the container and `pointer-events: auto` on individual labels only if they are tappable. `GAME-DESIGN.md:161` says "tap a bean" opens the challenge card, so tapping goes through a raycast on the 3D bean, not the label. Keep labels non-interactive; a 12px text node is not a 44px touch target (`ART-DIRECTION.md` §9 Tokens: touch target 44 minimum).
- Set `contain: layout style` on the label container and `will-change: transform` on nothing (per-element `will-change` on 32 elements creates 32 compositor layers and blows GPU memory on a mid-range phone).
- Label text is set with `textContent`, never `innerHTML`. Names come from other players. See §6.3.

### 2.5 Shadows

One `DirectionalLight` casting, `PCFSoftShadowMap`, 1024² mobile / 2048² desktop, per `ART-DIRECTION.md` §2 and §13.

```ts
key.castShadow = true;
key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
key.shadow.camera.left = -34; key.shadow.camera.right = 34;   // tight to the 60x60 map + slack
key.shadow.camera.top  =  34; key.shadow.camera.bottom = -34;
key.shadow.camera.near = 1;   key.shadow.camera.far  = 120;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;  // flat-shaded low-poly acnes badly without this
```

**The win nobody remembers: turn the shadow map off the per-frame path.**

```ts
renderer.shadowMap.autoUpdate = false;
// world:  needsUpdate = true only when a bean is added/removed/moved, or on DPR change
// duel:   needsUpdate = true only while a projectile is airborne or a bean is animating
```

The world map is a static diorama with a fixed light. Re-rendering the shadow map 60 times a second for a scene that has not changed is pure waste, and it is roughly a second full geometry pass. On the world map the shadow map should update a handful of times per session. This single line is worth more than any other perf tweak in this document.

Casters: terrain, trees, beans, machines, the Roaster, bean sacks. **Non-casters: cherries, slot rings, sky, flood, steam, particles, markers.** That is what keeps the shadow pass at 8 draw calls rather than 21.

### 2.6 The Spotter render target

`ART-DIRECTION.md` §2 specifies "a second orthographic camera rendered to a 256² render target". That is a **second full render pass every frame** and it needs three constraints or it silently costs 15% of the frame on a 6a:

1. **Layers, not the whole scene.** `spotterCamera.layers.set(LAYER_SPOTTER)`; only the opponent bean, their machine, their local terrain patch and the local steam are enabled on that layer. Six to eight draw calls, not twenty.
2. **20Hz, not 60Hz.** The Spotter shows a bean standing still, a slow steam drift and an occasional 80ms flinch (`ART-DIRECTION.md` §8). Render it on every third frame into a persistent `WebGLRenderTarget`, and force an immediate render on the flinch frame. Two thirds of the cost gone, zero visible difference.
3. **Render it first, then the main pass.** `setRenderTarget(rt) → render → setRenderTarget(null) → render`. Never interleave; a mid-frame framebuffer bind is a pipeline flush.

The render target is displayed as a `<canvas>`-backed CSS element inside the cup-window frame, or as a textured quad in an orthographic HUD overlay. Prefer the HUD overlay quad: one more draw call, and it composites with the paper rim in the same pass rather than forcing a `texImage2D` readback.

### 2.7 DPR policy and the frame-time guard

`ART-DIRECTION.md` §13: `min(dpr, 2)` desktop, `min(dpr, 1.5)` mobile, drop to 1.0 if frame time exceeds 20ms for 60 consecutive frames. I want a ladder with hysteresis instead of a one-way cliff, because a one-way drop means a single GC pause during the challenge transition permanently downgrades a phone that could have run at 1.5.

```ts
// src/render/perf.ts
const RUNGS_DESKTOP = [2.0, 1.5, 1.0] as const;
const RUNGS_MOBILE  = [1.5, 1.25, 1.0] as const;

const DROP_MS = 20;      // frame time above this counts as bad
const DROP_FRAMES = 60;  // consecutive bad frames before dropping a rung
const HEAL_MS = 14;      // frame time below this counts as good
const HEAL_FRAMES = 300; // consecutive good frames before recovering a rung
const MAX_HEALS = 2;     // then lock, so we never oscillate

export type DegradeLevel = 0 | 1 | 2 | 3 | 4 | 5;
// 0 full · 1 DPR rung 1 · 2 particles 96->32 · 3 DPR rung 2
// 4 shadow map halved · 5 shadows off, steam 40->20
```

The ladder order deliberately differs from `ART-DIRECTION.md` §13's "cut particles before sprites, sprites before shadows, shadows before fog". A DPR rung is the single largest fill-rate saving available and it is far less visible than losing shadows, so it goes first and second. **Steam sprite count is the last thing cut and never goes below 20, because steam is gameplay information (`ART-DIRECTION.md` §7 rule).** Fog is never cut: it is the Spotter mechanic. Flag this reordering to Lola.

Manual override for testing: `?perf=low` forces level 5, `?perf=high` locks level 0. Sonny needs both to reproduce a report.

Frame time is measured on the rAF timestamp delta, EMA'd over 20 frames, and the counter resets on `visibilitychange` (a backgrounded tab produces one enormous delta which must not be counted as a bad frame).

### 2.8 Enforcing the §13 budgets in code

Two gates, split by what can actually be measured where.

**Gate A: CI, headless, no WebGL.** Three's geometry classes work in Node. `test/budget.spec.ts` builds the real scene graph from the real builders with a 120-player fixture and asserts:

```ts
import { buildWorldScene } from '../src/render/world/scene';
import { measureScene } from './helpers/measure';

it('world scene fits ART-DIRECTION §13', () => {
  const scene = buildWorldScene(FIXTURE_120_PLAYERS);
  const m = measureScene(scene);          // traverse; InstancedMesh counts tris * instanceCount
  expect(m.triangles).toBeLessThanOrEqual(120_000);
  expect(m.uniqueMaterials).toBeLessThanOrEqual(5);
  expect(m.drawableNodes).toBeLessThanOrEqual(40);   // proxy for draw calls
  expect(m.shadowCasters).toBeLessThanOrEqual(8);
  expect(m.css2dLabels).toBeLessThanOrEqual(32);
});

it('duel scene fits ART-DIRECTION §13', () => { /* ≤60k tris, ≤30 nodes */ });
```

This runs in `npm test` and blocks the PR. A budget in a markdown table is a wish; a budget in a failing test is a budget.

**Gate B: on device, on the deployed build.** `?stats=1` renders a small paper-styled overlay (design-system chip styling, ~3KB) showing:

```
FRAME  14.2ms  p95 18.9      DPR 1.50  L0
CALLS  27      TRIS 91,204
PROG   5       GEO 31  TEX 3
SIM    0.41ms  LABELS 24
```

Values come from `renderer.info.render.{calls, triangles}`, `renderer.info.programs.length`, `renderer.info.memory.{geometries, textures}`, plus our own timers. **This ships in the production bundle**, not just dev. Three kilobytes buys Sonny the ability to gate a real Pixel 6a against the real deployed artefact instead of a dev server on a MacBook, and it makes `ART-DIRECTION.md` §13's "Emmett owns the measurement" enforceable rather than aspirational. It is also the device self-check surface for §3.6.

`renderer.info` is free to read; it is a counter Three already maintains.

### 2.9 Context loss

Mandatory, not optional, because iOS Safari drops WebGL contexts on backgrounding and under memory pressure, and a judge who alt-tabs and comes back to a black canvas has stopped playing.

```ts
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); pauseLoop(); showSteamCurtain(); });
canvas.addEventListener('webglcontextrestored', () => { rebuildGpuResources(); resumeLoop(); });
```

`preventDefault()` on the lost event is what makes restoration possible at all; without it the context is gone permanently. All GPU-side resources (materials, geometries, render targets) are created by factory functions in `materials.ts` / `scene.ts` so `rebuildGpuResources()` is a re-run of those factories, not a page reload. Game state lives in `src/sim` and `src/core/store`, which are pure JS and survive untouched. Cover it with a "steam curtain" (the existing steam-wipe transition from `ART-DIRECTION.md` §8), so the recovery reads as an intentional transition.

---

## 3. Deterministic simulation

This is the load-bearing part. `BRIEF.md:76` claims the sim is deterministic so "the server stores inputs, not outcomes". As written, that claim does not hold on real devices. Here is what makes it hold.

### 3.1 The shape of the thing

```ts
// src/sim/types.ts
export type Stance    = 'mountain' | 'tree' | 'flood';
export type BeanClass = 'arabica' | 'robusta' | 'liberica';
export type Machine   = 'moka' | 'press' | 'espresso' | 'aeropress';
export type Ammo      = 'green' | 'dark' | 'ground' | 'cup';
export type Side      = 0 | 1;

/** The complete stored record of one shot. Integers only, deliberately. */
export interface TurnInput {
  readonly turnIndex: number;      // 0..63
  readonly angleDeciDeg: number;   // 0..1800  tenths of a degree, measured from +x
  readonly powerPerMille: number;  // 0..1000
  readonly ammo: Ammo;
  readonly chargeMs: number;       // 0..3000  French press plunger / espresso hold
}

/** Fixed for the whole duel. Comes from the duel row; never changes. */
export interface DuelSetup {
  readonly duelSeed: number;       // uint32
  readonly dailySeed: number;      // uint32
  readonly sides: readonly [SideSetup, SideSetup];
}
export interface SideSetup {
  readonly playerId: string;
  readonly beanClass: BeanClass;
  readonly machine: Machine;
  readonly stance: Stance;
  readonly slotId: number;         // indexes the world heightmap: fixes x and ground y
}

export interface Impact {
  readonly turnIndex: number;
  readonly firedBy: Side;
  readonly x: number;
  readonly y: number;
  readonly fogRadius: number;      // 1.5, or 2.0 for a full cup (ART-DIRECTION §2)
  readonly kind: 'dust' | 'splash' | 'leaf' | 'direct' | 'offstage';
}

/** Derived, never stored. Always the fold of TurnInput[0..n] over INITIAL. */
export interface DuelState {
  readonly turnIndex: number;
  readonly toMove: Side;
  readonly hp: readonly [number, number];              // integers
  readonly ammoLeft: readonly [AmmoRack, AmmoRack];    // integers
  readonly steam: number;                              // -10..10 integer, THIS turn's value
  readonly impacts: readonly Impact[];                 // the fog of war, both sides
  readonly outcome: 'active' | 'side0' | 'side1' | 'draw';
}

export interface ShotResult {
  readonly trajectory: Float64Array;  // [x,y] pairs, one per fixed step, for playback
  readonly steps: number;
  readonly impacts: readonly Impact[]; // 1, or 6 for ground coffee
  readonly damage: number;             // integer
  readonly hitSide: Side | null;
  readonly call: 'close' | 'wide' | 'long';   // GAME-DESIGN §2b
  readonly hash: number;               // int32 checksum of the outcome. See §3.6
}

export function simulateShot(setup: DuelSetup, state: DuelState, input: TurnInput): ShotResult;
export function applyShot(state: DuelState, result: ShotResult): DuelState;
export function replayDuel(setup: DuelSetup, turns: readonly TurnInput[]): DuelState;
export function spotterCall(setup: DuelSetup, shooter: Side, impact: Impact): 'close' | 'wide' | 'long';
```

`replayDuel` is the entire replay contract in one signature. Every screen that needs duel state (the inbox card, the Pour, the duel HUD, the result receipt) calls it. There is no other way to obtain duel state, which means there is no second code path that can drift.

### 3.2 Fixed timestep, decoupled from the render loop

```ts
const DT = 1 / 120;          // seconds. Fixed. Never derived from rAF.
const MAX_STEPS = 400;       // 3.33s of flight, then the shot is 'offstage'
```

The sim runs **to completion, synchronously, the moment the shot is fired**, and produces a trajectory buffer. The renderer then plays that buffer back over the ≤2.5s window from `ART-DIRECTION.md` §8, interpolating between steps for smooth motion at whatever framerate the device manages.

This is the decision that makes everything else work:

- The simulation is frame-rate independent by construction, not by an accumulator that someone will get subtly wrong.
- Replay is free. The Pour (`ART-DIRECTION.md` §8, the async hook) is the same function with a different playback rate.
- A 400 step integration of six floats is roughly 0.2 to 0.5ms. The bot's aim solver can afford to run it 200 times inside its "thinking" pause (§5).
- The renderer can drop to 20fps under load and the shot still lands in exactly the same place.

**Never run the sim inside `requestAnimationFrame`.** That is the single rule that keeps determinism alive, and the linter rule banning `performance` and `Date` inside `src/sim` is what enforces it.

Integration is semi-implicit (symplectic) Euler:

```
v += a * DT
p += v * DT
```

with `a = { x: steam * K_STEAM / mass, y: G }`. Semi-implicit rather than explicit Euler because it is one line, it is exactly as cheap, and it does not gain energy over 400 steps. No RK4: at DT = 1/120 with constant acceleration, Euler's error is already below the pixel.

### 3.3 Seeded PRNG and seed derivation

```ts
// src/sim/rng.ts
export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One INDEPENDENT stream per turn. This is not an optimisation, it is a correctness rule. */
export function turnRng(duelSeed: number, turnIndex: number): () => number {
  return mulberry32((duelSeed ^ Math.imul(turnIndex + 1, 0x9e3779b1)) >>> 0);
}
```

`mulberry32` over `seedrandom`: 12 lines, zero dependencies, and it uses only `Math.imul`, `>>>`, `^` and `+` on uint32s. Every one of those is an exactly specified integer operation, so it produces bit-identical output on V8, JavaScriptCore, SpiderMonkey and Hermes. The single float division at the end is by a power of two, which is exact.

Seed derivation, per `GAME-DESIGN.md` §12:

```ts
const TERRAIN_SEED = 0xc0ffee01;                              // build constant, NEVER the daily seed
const dailySeed  = fnv1a32(`cbw:${dublinDay}`);               // e.g. "cbw:2026-09-14"
const duelSeed   = fnv1a32(`${dailySeed.toString(16)}:${duelId}`);   // duelId is the DB uuid
const rng        = turnRng(duelSeed, turnIndex);
```

**`dublinDay` is a value, never `new Date()`** (`QA.md` NC-07). For any duel that exists in the database, the day is irrelevant to the client: `duels.daily_seed` is assigned by `cbw_daily_seed()` at insert time from `timezone('Europe/Dublin', now())`, and the client reads the number off the row. The client keeps `dublinDay` only for two display jobs (the `Today's roast: #A3F1` tag and the TODAY leaderboard tab), and it takes that value from the server's response, caching it with a monotonic offset. A device clock two days fast changes nothing about any duel, which is the point. The **only** place a client derives the day itself is a fully local bot duel with no backend, where there is no server to ask; that duel is never replayed on another device, so the derivation cannot cause a divergence, and the HUD dims the daily tag to say so honestly.

The Dublin DST boundary (last Sunday of October, 02:00 falls back to 01:00) is handled by Postgres, not by us, which is the second reason the clock lives there. `feedback_timezone_dublin.md`: Europe/Dublin always, never Madrid.

**Terrain must be a build constant, not the daily seed.** `GAME-DESIGN.md:201` says the daily seed drives "steam sequence per duel, bot spawn layout, class spread rolls". It must not drive terrain, or a duel started on Monday and finished on Wednesday would replay against different ground, which silently breaks every stored turn. Explicit, and worth a comment in the code.

**One independent RNG stream per turn, never a shared instance.** If one `rng()` instance were carried across the duel, the number of draws taken on turn 3 would change the numbers seen on turn 4. Then the inbox (which replays turns to derive state) and the live path (which does not) would diverge, and a Liberica wild-shot roll would come out differently depending on the order in which the player opened their duels. This is the classic turn-based determinism bug and the per-turn stream removes it by construction.

**Steam is a function of turn index, not a stateful walk.** `GAME-DESIGN.md:83` describes a random walk. A walk is order-dependent state. Implement it as an order-independent fold:

```ts
export function steamAt(duelSeed: number, turnIndex: number): number {
  let v = 0;
  for (let t = 0; t <= turnIndex; t++) {
    const r = turnRng(duelSeed ^ 0x5734, t);
    v += Math.round(r() * 6) - 3;          // -3..+3, GAME-DESIGN §4
    v = Math.min(10, Math.max(-10, v));
  }
  return v;
}
```

Same behaviour, computable from `turnIndex` alone, O(16) worst case.

### 3.4 Floats or fixed-point: the decision

**Decision: careful IEEE-754 doubles, with every implementation-defined function banned from the sim. Documented tolerance: zero. The contract is bit-exact.**

The reasoning:

- The four basic operations (`+ - * /`), comparison, and `Math.sqrt` are **exactly specified** by IEEE-754 and mandated by ECMA-262. Every conforming engine produces identical bits.
- `Math.sin`, `Math.cos`, `Math.tan`, `Math.pow`, `Math.exp`, `Math.log`, `Math.atan2` and `Math.hypot` are **implementation-defined**. V8, JavaScriptCore and SpiderMonkey use different libm paths and genuinely differ in the last few ULPs. In an artillery sim, `sin` and `cos` sit at the very first step (angle to velocity vector), so a 1 ULP difference is amplified by 400 integration steps and can move an impact point enough to flip a splash-radius boundary.
- Fixed-point would also work and would be provably exact, but it costs a rewrite of every formula into scaled integers, makes the code hostile to read, and introduces a whole new class of overflow bug (a 32-bit fixed-point velocity squared overflows at surprisingly ordinary values). That trade is wrong for a game jam.

`QA.md` DT-R2 asks for one or the other, explicitly. **The answer is the sine table.** Restricted float64 gets the same zero-tolerance guarantee as fixed-point, because the guarantee never came from the number format: it came from only using operations the spec pins down. Fixed-point would buy nothing further and would cost a rewrite of every line in `src/sim`. Both approaches need exactly the same lint rule to stay honest, which is the tell that the lint rule is the real control.

So: keep doubles, remove the transcendentals.

**The trig table.** `scripts/gen-trig.ts` emits `src/sim/trig.table.ts`, a **committed** array of 901 decimal literals: sin from 0.0° to 90.0° in 0.1° steps.

```ts
// src/sim/trig.table.ts  GENERATED by `npm run gen:trig`. Do not edit. Commit this file.
export const SIN_DECIDEG: readonly number[] = [
  0, 0.0017453283658983088, 0.003490651415223732, /* ... 898 more ... */ 1
];
```

```ts
// src/sim/trig.ts
import { SIN_DECIDEG } from './trig.table';

/** dd = tenths of a degree, any integer. Exact lookup, no interpolation, no Math.sin. */
export function sinDeciDeg(dd: number): number {
  let d = ((dd % 3600) + 3600) % 3600;
  if (d <= 900)  return SIN_DECIDEG[d]!;
  if (d <= 1800) return SIN_DECIDEG[1800 - d]!;
  if (d <= 2700) return -SIN_DECIDEG[d - 1800]!;
  return -SIN_DECIDEG[3600 - d]!;
}
export function cosDeciDeg(dd: number): number { return sinDeciDeg(dd + 900); }
```

Why a committed table is bit-exact: JavaScript's decimal-literal-to-double conversion is exactly specified (round to nearest, ties to even). Every engine parses `0.0017453283658983088` to the same 64 bits. Generating the table at boot from `Math.sin` would reintroduce the exact divergence we are removing, so the generation step runs once, on Diego's machine, and its output is source.

Size: 901 literals at roughly 20 characters is ~18KB raw, ~7KB gzipped. 0.5% of the 1.5MB first-playable budget. Cheap.

**Why angle and power are integers.** `TurnInput.angleDeciDeg` is `0..1800` and `powerPerMille` is `0..1000`. The drag gesture produces a float; it is quantised at the input boundary, before it becomes a sim input. So both devices simulate from the same integers, and the lookup table is indexed by an integer with no interpolation. There is no float in the input path at all.

**Everything else the sim needs, without transcendentals:**

| Need | Banned | Use instead |
|---|---|---|
| Angle to velocity | `Math.sin/cos` | `sinDeciDeg` / `cosDeciDeg` |
| Distance | `Math.hypot` | `Math.sqrt(dx*dx + dy*dy)` (`sqrt` is exact) |
| Distance compare | `Math.sqrt` then compare | compare squared distances, no sqrt at all |
| Squaring | `x ** 2`, `Math.pow` | `x * x` |
| Splash falloff | exponential | linear `1 - d / r`, per `GAME-DESIGN.md:128` "50% falloff" |
| Class spread | gaussian via Box-Muller (`log`, `cos`) | Irwin-Hall: `(sum of 12 uniforms) - 6`, §5.2 |
| Damage / HP | any float | integers throughout, `Math.round` at the boundary |

**Keep all game state integers.** HP, damage, ammo counts, RP and steam are integers. Only the trajectory is float. This bounds the blast radius of any residual float difference: two devices would have to disagree enough to cross an integer rounding boundary before the *game* diverges, rather than the pixel.

### 3.5 Terrain and collision

The world heightmap is a pure function: `heightAt(x, z)` over a 128×128 grid generated from `TERRAIN_SEED` by value noise built on `mulberry32` (no `Math.sin`, no simplex library). Generated once at boot, cached in a `Float64Array`, identical everywhere.

The duel stage is a **slice** of that map: sample along the line between the two slots at 0.25 unit spacing across the 28 unit stage from `ART-DIRECTION.md` §2, giving 113 heights. Derived, never stored, because the terrain seed is a build constant.

Collision is **swept, not point-sampled**:

```
for each step:
  p1 = p0 + v * DT
  h0 = heightAt(p0.x), h1 = heightAt(p1.x)
  if (p1.y <= h1)  -> crossing in this segment
       binary search 8 iterations on t in [0,1] along p0->p1 for y - heightAt(x) == 0
       -> exact impact point, deterministic (8 iterations of + - * / only)
  also test the segment against each bean's capsule (radius 0.45, height 1.0)
```

Point sampling at the end of each step tunnels. An Aeropress shot (`GAME-DESIGN.md:113` "flat, very fast") at ~40 units/s covers 0.33 units per 120Hz step, which is comparable to the 0.5 unit rock lip on a Ridge stance. Point sampling would let it pass straight through the cover that the game design says is 40% cover. Swept plus binary search removes the class of bug entirely and costs 8 extra iterations on the one step where it matters.

Bean capsule test happens on the same segment so a direct hit cannot be skipped either.

### 3.6 The replay contract and the desync escape hatch

**Stored per turn:** `turn_index, angle_dd, power_pm, ammo, charge_ms, outcome_hash, damage`. That is it. Seven integers.

**Not stored:** the trajectory, the impact point, the fog mask, the HP after the shot, or anything else derivable. Both clients call `replayDuel(setup, turns)` and get the same `DuelState`.

**Explicit challenge to `ART-DIRECTION.md` §2 and `GAME-DESIGN.md:59`,** which both say the fog mask is "stored with the turn inputs". Do not store it. The fog is the set of impact markers, and the impacts are a pure function of the turn list, so a stored mask is redundant data that can disagree with the turns it was derived from. Storing it also puts a 64×16 blob on every turn write for no gain. **Fog is derived by folding `replayDuel` over the turns, exactly like HP.** Cost: 16 turns × 400 steps, well under a millisecond, once, when the duel screen opens. Cheaper, smaller, and it cannot desync from its own source.

**`outcome_hash` is the honest belt-and-braces.** `hash.ts` computes an int32 checksum from `(impactX, impactY)` quantised to 1e-4, plus `damage`, `hitSide` and the resulting HP pair. The firing client writes it; the receiving client recomputes and compares.

```ts
if (recomputed.hash !== stored.outcome_hash) {
  reportDesync(duelId, turnIndex, recomputed.hash, stored.outcome_hash);
  // Render the stored damage and an approximated arc. The duel continues.
}
```

This turns a silent, unreproducible desync into a logged, non-fatal event with a device fingerprint attached. `reportDesync` writes to a `desyncs` table (§4.4) so that if it ever fires we know which engine, which OS, which turn. Without it, a determinism bug on one judge's phone looks like "the game glitched" and cannot be debugged after the fact.

**Golden vectors.** `scripts/gen-golden.ts` emits 500 `(setup, state, input) → hash` tuples covering all 9 stance combinations, all 4 ammo types, all 3 classes, all 4 machines, the steam extremes and the boundary angles. `npm run test:determinism` asserts them in CI on Node. On device, a **40-vector subset** runs behind the `/#determinism` route that `QA.md` DT-05 asks for: a read-only page in the production bundle that prints the hash list and a single `PASS` / `FAIL`, so a borrowed phone gives a determinism verdict in twenty seconds. 500 in CI where the time is free, 40 on device where the screen is the constraint. `/#determinism` replaces the golden self-check I had put behind `?stats=1`; `?stats=1` keeps the frame and draw-call overlay only, which is a cleaner split of responsibilities anyway.

---

## 4. Data model and transport

### 4.1 Transport decision

**Recommendation: Supabase, free tier, new project in Diego's Personal account.** Confirming `BRIEF.md:77`.

| Option | Verdict |
|---|---|
| **Supabase** (Postgres + RLS + anonymous auth + Realtime) | **Chosen.** The async core is an inbox query over durable rows, which is Postgres's home ground. RLS lets the browser talk to the DB directly with no API layer to write. Anonymous auth gives real JWTs without a login screen. Realtime is there for M3 and costs nothing if unused. Diego's estate is Supabase-fluent, which matters more than elegance on a deadline. |
| Cloudflare Durable Objects / PartyKit | Rejected. Excellent for live rooms, wrong for the core. The core is async: an inbox, a leaderboard and a 7 day abandonment sweep. DO gives none of that, so we would add D1 alongside, and now there are two systems and a hand-written API layer. We would be buying M3 (the bonus) at the cost of M2 (the core). |
| Firebase | Rejected. Technically fine, but security rules are a second authorisation language to learn under this deadline and the estate has no Firebase muscle memory. |
| Vercel Postgres / KV | Rejected. Postgres without RLS from the browser means writing and maintaining an API layer by hand. That is more code and more surface for the same result. |

**The honest caveat, and it is the one that can lose the competition: Supabase Free auto-pauses a project after 7 days of inactivity.** A judge opening the link at 11pm two weeks after submission would hit a paused database. Mitigations, both mandatory:

1. **Daily keepalive.** `api/cron.ts` runs at 04:00 and touches the DB. Documented in §4.8.
2. **The game runs with the backend down.** `src/net/client.ts` returns a null client when `VITE_SUPABASE_URL` is absent, when the health probe fails, or when any request errors past a 4 second timeout. In that state: full duel against the 12 bots, local profile, local RP, local streak, and one paper chip on the world HUD reading `THE GROUNDS ARE OFFLINE. THE BOTS ARE STILL HERE.` This is the `graceful env no-op` pattern from `aiwithdiego_OS` in the Reusable Features Library (`~/AIwithDiego/Documentation/Smith/_Ops/reusable-features/library.md:94`), lifted rather than reinvented. **It is built in M2, not in M4.**

### 4.2 Identity and the auth posture

**Decision: Supabase Anonymous Auth (`supabase.auth.signInAnonymously()`), not a hand-rolled device key.**

`BRIEF.md:41` and `GAME-DESIGN.md:195` specify "per-device key in localStorage, no login". Anonymous auth delivers exactly that user experience while giving us real infrastructure:

- The player never sees an auth screen. `signInAnonymously()` runs during the boot splash, before the name prompt.
- It mints a real JWT with a real `auth.uid()`, so every RLS policy is the standard `auth.uid() = ...` form rather than a bespoke header scheme.
- Refresh-token rotation and localStorage persistence are handled by `supabase-js`. We write no crypto.
- Anonymous sign-ins are rate-limited server-side by default (30/hour/IP), which caps bulk identity creation for free.

A hand-rolled device key would require either trusting a client-supplied header (worthless) or an Edge Function minting our own JWTs with `SUPABASE_JWT_SECRET` (about 40 lines of custom crypto to reimplement a first-party feature). Anonymous auth is strictly better and strictly cheaper.

`players.id` is therefore `references auth.users(id)`, and "device key" becomes "the anonymous session in this browser's localStorage".

**One amendment to `QA.md` SEC-01's shape.** Sonny writes the policy as `auth.uid() = players.auth_uid`, implying a separate column. Make `players.id` **be** the auth uid instead. Same verifiable identity, same policy strength, and it removes a column, a unique index and a join from the world-map read, which is the single hottest query in the game and the one that governs the free-tier egress projection in §9. The `duels` foreign keys then point at `players(id)` directly rather than hopping through an alias. This is agreement on the substance with a simpler key, not a disagreement on the control.

**What this protects and what it does not. Stated plainly, because a no-login model has real limits:**

| Threat | Protected? | How |
|---|---|---|
| Forging a turn as another player | **Yes** | Turns are inserted only through a `SECURITY DEFINER` RPC that checks `duels.whose_turn = auth.uid()`. There is no direct INSERT policy on `turns`. |
| Editing your own RP / wins / rank | **Yes** | Column-level `GRANT` restricts the `authenticated` role to cosmetic columns only. RP is written by the RPC. RLS alone cannot do this; `GRANT` can. |
| Claiming absurd damage | **Yes** | The RPC clamps damage to the ammo type's theoretical maximum from a server-side constant table. |
| Renaming yourself into another player's name | **Yes** | `unique index` on `lower(name)`. |
| Creating many anonymous players | **Partly** | Rate-limited per IP by Supabase. A determined person with a proxy pool defeats it. |
| Farming RP against your own alt accounts | **No** | Undetectable without identity. Mitigation is a design one: see the open question to Smith in §10. |
| Playing physically impossible shots as yourself | **No in v1** | The sim does not run server-side. See §4.3. |
| Reading the opponent's exact position despite the Spotter fog | **No, by construction** | The opponent's slot is public on the world map, so the fog is a presentation rule, not a confidentiality boundary. Hiding it would need server-side stage generation with the x withheld. **We accept this.** For a competition entry the cost of closing it exceeds the value. |

**The posture in one line: we defend the interesting shared state (RP, rank, the leaderboard, whose turn it is) with server-side computation, and we do not defend against a determined cheater. For a $150 game-jam entry with no economy, that is the correct trade, and it is a deliberate decision rather than an oversight.**

### 4.3 Server-side sim validation

**Decision: no for v1. Trust the client, clamp the outcome, keep the door open by construction.**

Running the sim in a Supabase Edge Function (Deno) is genuinely feasible here, because `src/sim` is pure, dependency-free TypeScript that imports nothing. That is not an accident, it is why the linter enforces the boundary. But shipping it in v1 means a second deployment target, a second CI path, and Deno/V8 vs browser-JSC determinism to prove on top of everything else. That is a week of budget spent on an anti-cheat surface that a game jam does not need.

What we ship instead, which costs almost nothing:

1. `play_turn` clamps `damage` to `AMMO_MAX_DAMAGE[ammo]` server-side.
2. `CHECK` constraints reject out-of-range angle, power, ammo and charge before they hit a row.
3. HP, winner, RP, streak and the daily board are computed by the RPC from the clamped damage. The client never writes them.
4. `outcome_hash` is stored, so a validator added later has something to compare against without a migration.

If cheating ever becomes visible, the upgrade is deploying the existing `src/sim` module to an edge function and comparing hashes. No rewrite.

### 4.4 Schema

```sql
-- supabase/migrations/0001_init.sql
create extension if not exists pgcrypto;

create type public.duel_state as enum ('active', 'finished', 'abandoned');
create type public.stance     as enum ('mountain', 'tree', 'flood');
create type public.bean_class as enum ('arabica', 'robusta', 'liberica');
create type public.machine    as enum ('moka', 'press', 'espresso', 'aeropress');

-- ── the day, and only from here (GAME-DESIGN §12, QA.md NC-07) ────────────
-- feedback_timezone_dublin.md: Europe/Dublin, always. Postgres owns the clock
-- because a device clock is an assertion by the client, not a fact.
create or replace function public.cbw_today() returns date
  language sql stable as $$ select (timezone('Europe/Dublin', now()))::date $$;

-- FNV-1a 32. The SAME function as src/sim/rng.ts::fnv1a32, in SQL, because the
-- seed is server-assigned and the client must be able to re-derive it offline.
-- Two implementations of one hash is a drift risk, so test/sql/seed.spec.ts
-- asserts they agree for 400 consecutive days. That test is the reason this is
-- safe to duplicate.
create or replace function public.fnv1a32(p text) returns bigint
language plpgsql immutable as $$
declare h bigint := 2166136261; i int;
begin
  for i in 1 .. length(p) loop
    h := (h # ascii(substr(p, i, 1)));
    h := (h * 16777619) & 4294967295;
  end loop;
  return h;
end $$;

create or replace function public.cbw_daily_seed() returns bigint
  language sql stable as $$
    -- FNV-1a 32 over 'cbw:YYYY-MM-DD'. Must match src/sim/rng.ts::fnv1a32 exactly;
    -- test/sql/seed.spec asserts the two agree for 400 consecutive days.
    select public.fnv1a32('cbw:' || to_char(public.cbw_today(), 'YYYY-MM-DD'))
  $$;

-- ── players ───────────────────────────────────────────────────────────────
create table public.players (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text        not null
                  check (name ~ '^[A-Za-z0-9][A-Za-z0-9 ._-]{1,12}[A-Za-z0-9]$'),
  name_norm     text        generated always as (lower(name)) stored,
  bean_class    public.bean_class not null,
  origin        text        not null check (origin in (
                  'colombia','ethiopia','brazil','vietnam',
                  'kenya','guatemala','costa_rica','indonesia')),
  face          smallint    not null default 0 check (face      between 0 and 5),
  accent        smallint    not null default 0 check (accent    between 0 and 7),
  accessory     smallint             check (accessory between 0 and 5),
  slot_id       smallint    not null check (slot_id   between 0 and 119),
  rp            integer     not null default 0 check (rp >= 0),
  wins          integer     not null default 0 check (wins   >= 0),
  losses        integer     not null default 0 check (losses >= 0),
  streak        integer     not null default 0 check (streak >= 0),
  is_bot        boolean     not null default false,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create unique index players_name_norm_key on public.players (name_norm);
create index players_map_idx  on public.players (last_seen_at desc) where is_bot = false;
create index players_slot_idx on public.players (slot_id);
create index players_rp_idx   on public.players (rp desc, wins desc) where is_bot = false;

-- ── duels ─────────────────────────────────────────────────────────────────
create table public.duels (
  id                 uuid primary key default gen_random_uuid(),
  challenger_id      uuid not null references public.players(id) on delete cascade,
  opponent_id        uuid not null references public.players(id) on delete cascade,
  -- Loadout frozen at creation (QA.md SEC-04). bean_class belongs here because
  -- class drives shot spread (GAME-DESIGN.md:100): a player editing their class
  -- from the profile sheet mid-duel would otherwise rewrite every stored replay.
  challenger_class   public.bean_class not null,
  opponent_class     public.bean_class not null,
  challenger_stance  public.stance  not null,
  opponent_stance    public.stance  not null,
  challenger_machine public.machine not null,
  opponent_machine   public.machine not null,
  challenger_slot    smallint not null,
  opponent_slot      smallint not null,
  -- Server-assigned. No client clock ever touches the seed (QA.md NC-07).
  daily_seed         bigint   not null default public.cbw_daily_seed(),
  duel_seed          bigint   not null,
  state              public.duel_state not null default 'active',
  next_turn_index    smallint not null default 0 check (next_turn_index between 0 and 64),
  whose_turn         uuid not null references public.players(id),
  challenger_hp      smallint not null default 100 check (challenger_hp between 0 and 120),
  opponent_hp        smallint not null default 100 check (opponent_hp   between 0 and 120),
  winner_id          uuid references public.players(id),
  created_at         timestamptz not null default now(),
  last_turn_at       timestamptz not null default now(),
  constraint duel_two_players check (challenger_id <> opponent_id)
);

-- THE inbox query index. GAME-DESIGN §9 "the inbox lists every duel where it is their turn".
create index duels_inbox_idx on public.duels (whose_turn, last_turn_at desc)
  where state = 'active';
create index duels_challenger_idx on public.duels (challenger_id, created_at desc);
create index duels_opponent_idx   on public.duels (opponent_id,   created_at desc);
create index duels_stale_idx      on public.duels (last_turn_at)  where state = 'active';

-- ── turns: the only durable game data, seven integers per shot ────────────
create table public.turns (
  duel_id      uuid     not null references public.duels(id) on delete cascade,
  turn_index   smallint not null check (turn_index   between 0 and 63),
  player_id    uuid     not null references public.players(id) on delete cascade,
  angle_dd     smallint not null check (angle_dd     between 0 and 1800),
  power_pm     smallint not null check (power_pm     between 0 and 1000),
  ammo         smallint not null check (ammo         between 0 and 3),
  charge_ms    smallint not null default 0 check (charge_ms between 0 and 3000),
  damage       smallint not null check (damage       between 0 and 120),
  outcome_hash integer  not null,
  created_at   timestamptz not null default now(),
  primary key (duel_id, turn_index)
);

-- ── today's board (GAME-DESIGN §8 "plus today's (daily seed) best") ───────
create table public.player_daily (
  player_id uuid    not null references public.players(id) on delete cascade,
  day       date    not null,
  rp        integer not null default 0,
  wins      integer not null default 0,
  bot_rp    integer not null default 0,          -- capped, see §5.4
  primary key (player_id, day)
);
create index player_daily_board_idx on public.player_daily (day, rp desc);

-- ── desync telemetry (§3.6) ───────────────────────────────────────────────
create table public.desyncs (
  id          bigserial primary key,
  duel_id     uuid,
  turn_index  smallint,
  expected    integer,
  actual      integer,
  ua          text,
  created_at  timestamptz not null default now()
);
```

**`primary key (duel_id, turn_index)` is doing real work.** It makes a double-submit (double tap, retry after a flaky mobile connection, the Draw Something habit of hammering the button) an idempotent no-op rather than a duplicated shot. Sonny's "double-accept / stale async turn" cases (`BRIEF.md:93`) are handled by the schema, not by client-side guarding.

**Slots.** `slot_id` is deliberately **not** unique. A unique constraint would cap the world at 120 beans forever, and a partial unique index over "recently active" cannot be expressed in Postgres (the predicate must be immutable and `now()` is not). Instead, slot allocation lives in one `claim_slot` RPC that takes the slot if it is free or held by a player whose `last_seen_at` is older than 7 days, and otherwise returns the nearest free slot in the same stance band. One place, one rule, no constraint that lies.

### 4.5 RLS, and the part RLS cannot do

```sql
-- supabase/migrations/0002_rls.sql
alter table public.players      enable row level security;
alter table public.duels        enable row level security;
alter table public.turns        enable row level security;
alter table public.player_daily enable row level security;
alter table public.desyncs      enable row level security;

-- The map and leaderboard are public on purpose: the landing screen shows a
-- populated world behind the name form, before sign-in. `using (true)` here is a
-- deliberate publication decision, not the absence of a policy.
create policy players_read_public on public.players
  for select to anon, authenticated using (true);

create policy players_insert_self on public.players
  for insert to authenticated
  with check (id = auth.uid() and is_bot = false);

create policy players_update_self on public.players
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_bot = false);

-- Duels and turns are visible to their two participants only.
create policy duels_read_participants on public.duels
  for select to authenticated
  using (challenger_id = auth.uid() or opponent_id = auth.uid());

create policy turns_read_participants on public.turns
  for select to authenticated
  using (exists (
    select 1 from public.duels d
    where d.id = turns.duel_id
      and (d.challenger_id = auth.uid() or d.opponent_id = auth.uid())));

-- No direct writes to duels or turns. Ever. Everything goes through the RPCs.
-- Absence of an INSERT/UPDATE policy already denies, but state it so the intent
-- is legible to the next reader rather than looking like an omission.
create policy duels_no_direct_write on public.duels for insert to authenticated with check (false);
create policy turns_no_direct_write on public.turns for insert to authenticated with check (false);

-- Defence in depth behind the RPC (QA.md NC-03, NC-04). The RPC is the only
-- caller today, but an invariant that lives in a function can be bypassed by
-- the next function someone writes; an invariant in a trigger cannot.
create or replace function public.turns_guard() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare d public.duels; v_used smallint; v_rack smallint;
begin
  select * into d from public.duels where id = new.duel_id;
  if d.state <> 'active'            then raise exception 'duel is %', d.state; end if;
  if new.player_id <> d.whose_turn  then raise exception 'not that player''s turn'; end if;
  if new.turn_index <> d.next_turn_index then
    raise exception 'out of order: expected %, got %', d.next_turn_index, new.turn_index;
  end if;
  -- Ammo budget: green is infinite, dark 3, ground 2, cup 1 (GAME-DESIGN §7).
  v_rack := (array[32767, 3, 2, 1])[new.ammo + 1];
  select count(*) into v_used from public.turns
   where duel_id = new.duel_id and player_id = new.player_id and ammo = new.ammo;
  if v_used >= v_rack then raise exception 'ammo rack empty for type %', new.ammo; end if;
  return new;
end $$;

create trigger turns_guard_biu before insert on public.turns
  for each row execute function public.turns_guard();

create policy daily_read_public on public.player_daily
  for select to anon, authenticated using (true);
create policy desyncs_insert_any on public.desyncs
  for insert to anon, authenticated with check (true);
```

**RLS cannot restrict columns. `GRANT` can, and this is the control that stops the obvious cheat:**

```sql
revoke update on public.players from authenticated;
grant  update (name, bean_class, origin, face, accent, accessory, slot_id, last_seen_at)
  on public.players to authenticated;
```

Without this, `players_update_self` lets any player set their own `rp` to 999999, because the policy is satisfied (`id = auth.uid()`) and RLS has no opinion about which columns the UPDATE touched. This is the single most common Supabase RLS mistake and it is exactly the failure the shared gotchas file warns about (`using (true)` is not authorisation, and a row policy is not a column policy). Column grants close it in two lines.

### 4.6 The RPCs

Three `SECURITY DEFINER` functions with `set search_path = public, pg_temp` on each (a `SECURITY DEFINER` function without a pinned `search_path` is a privilege-escalation vector).

```sql
-- supabase/migrations/0003_rpc.sql

-- 1. claim_slot(slot) -> the slot actually granted
create or replace function public.claim_slot(p_slot smallint)
returns smallint
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_holder uuid; v_free smallint;
begin
  select id into v_holder from public.players
    where slot_id = p_slot and id <> auth.uid()
      and (is_bot or last_seen_at > now() - interval '7 days')
    for update;
  if v_holder is null then
    update public.players set slot_id = p_slot, last_seen_at = now() where id = auth.uid();
    return p_slot;
  end if;
  -- occupied: hand back the nearest free slot in the same stance band
  select s into v_free from generate_series(0, 119) s
    where (s / 40) = (p_slot / 40)
      and not exists (select 1 from public.players p
                      where p.slot_id = s
                        and (p.is_bot or p.last_seen_at > now() - interval '7 days'))
    order by abs(s - p_slot) limit 1;
  if v_free is null then raise exception 'THE GROUNDS ARE FULL'; end if;
  update public.players set slot_id = v_free, last_seen_at = now() where id = auth.uid();
  return v_free;
end $$;

-- 2. play_turn: the ONLY way a turn enters the system
create or replace function public.play_turn(
  p_duel uuid, p_turn smallint,
  p_angle smallint, p_power smallint, p_ammo smallint,
  p_charge smallint, p_damage smallint, p_hash integer)
returns public.duels
language plpgsql security definer set search_path = public, pg_temp as $$
declare d public.duels; v_actor uuid := auth.uid();
        v_max smallint; v_target_is_challenger boolean; v_dmg smallint;
begin
  select * into d from public.duels where id = p_duel for update;
  if d is null              then raise exception 'no such duel'; end if;
  if d.state <> 'active'    then raise exception 'duel is %', d.state; end if;
  if d.next_turn_index <> p_turn then raise exception 'stale turn: expected %', d.next_turn_index; end if;

  -- The actor is the player to move, OR the human opponent of a bot to move.
  if d.whose_turn <> v_actor then
    if not exists (select 1 from public.players b
                   where b.id = d.whose_turn and b.is_bot
                     and v_actor in (d.challenger_id, d.opponent_id))
    then raise exception 'not your turn'; end if;
  end if;

  -- The turns_guard trigger has already checked participant, order and ammo rack.
  -- Server-side damage clamp. green 20 / dark 35 / ground 30 / cup 25, +25% moka.
  v_max := (array[20,35,30,25])[p_ammo + 1] * 5 / 4;
  v_dmg := least(greatest(p_damage, 0), v_max);

  insert into public.turns (duel_id, turn_index, player_id, angle_dd, power_pm,
                            ammo, charge_ms, damage, outcome_hash)
  values (p_duel, p_turn, d.whose_turn, p_angle, p_power, p_ammo, p_charge, v_dmg, p_hash);

  v_target_is_challenger := (d.whose_turn <> d.challenger_id);
  if v_target_is_challenger
    then d.challenger_hp := greatest(0, d.challenger_hp - v_dmg);
    else d.opponent_hp   := greatest(0, d.opponent_hp   - v_dmg);
  end if;

  if d.challenger_hp = 0 or d.opponent_hp = 0 then
    d.state := 'finished';
    -- QA.md DT-07 tie-break: if both cups reach 0 on one turn, THE SHOOTER WINS.
    -- You cannot be killed by your own splash while killing your opponent.
    d.winner_id := case when d.challenger_hp = 0 and d.opponent_hp = 0
                        then d.whose_turn
                        when d.challenger_hp = 0 then d.opponent_id
                        else d.challenger_id end;
    perform public.settle_duel(d.id, d.winner_id);
  else
    d.whose_turn := case when d.whose_turn = d.challenger_id
                         then d.opponent_id else d.challenger_id end;
  end if;

  d.next_turn_index := p_turn + 1;
  d.last_turn_at    := now();
  update public.duels set state = d.state, winner_id = d.winner_id,
         whose_turn = d.whose_turn, challenger_hp = d.challenger_hp,
         opponent_hp = d.opponent_hp, next_turn_index = d.next_turn_index,
         last_turn_at = d.last_turn_at
   where id = d.id;
  return d;
end $$;

-- 3. finish_bot_duel: bot duels never touch `turns`. See §5.4.
create or replace function public.finish_bot_duel(
  p_bot uuid, p_won boolean, p_shots smallint, p_first_shot_ko boolean, p_low_hp_win boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$ /* ... */ $$;

revoke all on function public.play_turn(...) from anon;
grant execute on function public.play_turn(...) to authenticated;
```

`select ... for update` on the duel row is what makes concurrent double-submits safe: the second transaction blocks, then finds `next_turn_index` already advanced and raises `stale turn`. Combined with the composite primary key on `turns`, a duel cannot be advanced twice by the same shot under any interleaving.

`settle_duel` applies the RP table from `GAME-DESIGN.md:137` and upserts `player_daily`. RP is never a client input.

### 4.7 Queries the client actually makes

```ts
// The world map. Ten columns, not `*`. Bots always, humans active in 7 days, cap 60.
supabase.from('players')
  .select('id,name,bean_class,origin,face,accent,accessory,slot_id,rp,streak,is_bot')
  .or(`is_bot.eq.true,last_seen_at.gt.${sevenDaysAgo}`)
  .order('last_seen_at', { ascending: false })
  .limit(60);

// The inbox. GAME-DESIGN §9. One index hit on duels_inbox_idx.
supabase.from('duels')
  .select('id,challenger_id,opponent_id,challenger_stance,opponent_stance,' +
          'challenger_hp,opponent_hp,next_turn_index,duel_seed,daily_seed,last_turn_at')
  .eq('whose_turn', me).eq('state', 'active')
  .order('last_turn_at', { ascending: false }).limit(30);

// Leaderboard: all-time and today.
supabase.from('players').select('id,name,bean_class,origin,accent,rp,wins,streak')
  .eq('is_bot', false).gt('rp', 0).order('rp', { ascending: false }).limit(20);
supabase.from('player_daily').select('rp,wins,players(name,bean_class,accent)')
  .eq('day', dublinToday).order('rp', { ascending: false }).limit(20);
```

Never `select('*')` on `players`. It is the single easiest way to turn a 25KB map read into a 200KB one and burn the free-tier egress (§9).

Client-side caching: the world map response is held in memory for 30 seconds and refreshed on focus, not polled. The inbox is fetched on landing and after each turn, not polled. **There is no polling loop anywhere in this game.** A turn-based game where turns take hours does not need one, and `feedback_no_high_frequency_pg_cron_pg_net.md` is the same lesson from the other side of the wire.

### 4.8 The one cron

```ts
// api/cron.ts  Node runtime (service role key needs Node, not Edge).
export const config = { runtime: 'nodejs' };

export default async function handler(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('nope', { status: 401 });
  }
  const db = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await db.rpc('daily_maintenance');   // 1. abandon stale  2. prune  3. touch = keepalive
  return Response.json({ ok: true });
}
```

```sql
create or replace function public.daily_maintenance()
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare v_abandoned int; v_pruned int; v_users int;
begin
  update public.duels set state = 'abandoned'
   where state = 'active' and last_turn_at < now() - interval '7 days';   -- GAME-DESIGN §9
  get diagnostics v_abandoned = row_count;

  delete from public.player_daily where day < current_date - 14;
  get diagnostics v_pruned = row_count;

  -- Anonymous auth rows are permanent. Reap the ones that never became a player
  -- or never scored, so a scraper cannot grow auth.users without bound.
  delete from auth.users u
   where u.is_anonymous
     and u.created_at < now() - interval '30 days'
     and not exists (select 1 from public.players p where p.id = u.id and p.rp > 0);
  get diagnostics v_users = row_count;

  return json_build_object('abandoned', v_abandoned, 'pruned', v_pruned, 'users', v_users);
end $$;
```

Every statement has a `WHERE`. Every statement is idempotent. Nothing here calls out over the network from inside a transaction, which is the `pg_net` trap the estate already learned once (`feedback_no_high_frequency_pg_cron_pg_net.md`, and the Toroko forced upgrade of 2026-05-19). This is `pg_cron`-free: a single daily Vercel Cron is easier to observe, and it doubles as the keepalive that stops the Free-tier auto-pause.

### 4.9 Realtime (M3 only)

Presence and Broadcast, never `postgres_changes`.

```ts
const world = supabase.channel('world', { config: { presence: { key: myId } } });
world.on('presence', { event: 'sync' }, () => updatePresenceRings(world.presenceState()));
world.subscribe(s => { if (s === 'SUBSCRIBED') world.track({ slot: mySlot }); });

const duel = supabase.channel(`duel:${duelId}`);
duel.on('broadcast', { event: 'turn' }, ({ payload }) => applyRemoteTurn(payload));
```

`postgres_changes` is heavier, is limited harder on the free tier, and would leak duel rows through the replication stream regardless of RLS-on-select subtleties. Broadcast carries the same seven integers the RPC already wrote, and the durable state is still the DB row, so a dropped broadcast costs a re-fetch and nothing else. **The live path writes through `play_turn` first, then broadcasts.** Broadcast is a notification, never a source of truth. A player who reloads mid-live-duel lands back in the async path with no special handling, which also solves Sonny's "disconnect mid-duel" case for free.

---

## 5. Bots

### 5.1 Where the solver runs

**On the client, in `src/bots/`, importing `src/sim`.** No server involvement, no network round-trip, and the same physics the player fights.

The bot's aim uses `simulateShot` directly, which is the whole point of making the sim pure and synchronous: the solver can run it 200 times inside the 1.2 to 2.0 second "thinking" pause from `GAME-DESIGN.md:29` and still finish in under 100ms.

### 5.2 The solver

There is no closed-form launch angle once steam is a constant horizontal acceleration and ammo mass varies, so search instead:

```ts
// 12 angle candidates across the machine's arc band, bisect power for each.
// 12 * 16 * 400 steps ≈ 77k integration steps ≈ 2 to 5 ms on a Pixel 6a.
export function solveAim(setup: DuelSetup, state: DuelState, self: Side,
                         estimate: Estimate, rng: () => number): TurnInput {
  let best: { angle: number; power: number; err: number } | null = null;
  for (const angle of angleCandidates(setup.sides[self].machine)) {
    const power = bisectPower(setup, state, self, angle, estimate.x);   // 16 iterations
    const err = Math.abs(landingX(setup, state, self, angle, power) - estimate.x);
    if (!best || err < best.err) best = { angle, power, err };
  }
  // Difficulty is noise around the SOLUTION, GAME-DESIGN §10.
  const sigmaDeg = SIGMA_BY_TIER[tier];              // 6.0 / 4.0 / 2.5 / 1.5
  const jitterDd = Math.round(gaussianIrwinHall(rng) * sigmaDeg * 10);
  return { turnIndex: state.turnIndex,
           angleDeciDeg: clampDd(best!.angle + jitterDd),
           powerPerMille: clampPm(best!.power + Math.round(gaussianIrwinHall(rng) * 30)),
           ammo: chooseAmmo(state, self, estimate), chargeMs: 0 };
}

/** Gaussian without Math.log or Math.cos. Irwin-Hall, mean 0, sd ~1. */
function gaussianIrwinHall(rng: () => number): number {
  let s = 0; for (let i = 0; i < 12; i++) s += rng();
  return s - 6;
}
```

Box-Muller would need `Math.log` and `Math.cos`, both banned in `src/sim` and `src/bots` by the lint rule in §1.5. Irwin-Hall is pure arithmetic, close enough to gaussian for aim noise, and deterministic.

### 5.3 Walking in

`GAME-DESIGN.md:174` ("after a miss, next shot's noise mean shifts toward the error") and §2b (the bot uses the identical `Close./Wide./Long.` information the player gets). The belief state:

```ts
export interface Estimate { x: number; sigma: number; }

export function initialEstimate(targetStance: Stance): Estimate {
  const band = STANCE_BAND[targetStance];              // the stage band, ART-DIRECTION §7
  return { x: band.centre, sigma: band.halfWidth };
}

export function update(e: Estimate, impactX: number,
                       call: 'close' | 'wide' | 'long'): Estimate {
  switch (call) {
    case 'close': return { x: impactX, sigma: e.sigma * 0.35 };
    case 'wide':  return { x: e.x + e.sigma * 0.5, sigma: e.sigma * 0.6 };  // fell short
    case 'long':  return { x: e.x - e.sigma * 0.5, sigma: e.sigma * 0.6 };
    default: { const _never: never = call; return _never; }
  }
}
```

The `call` comes from `spotterCall()` in `src/sim`, the exact function the player's HUD uses. That is what makes `GAME-DESIGN.md:55` ("the bot's walking-in is honest") literally true rather than a claim: there is one implementation of the hot/cold signal and both sides consume it.

`GAME-DESIGN.md:57` first-timer safety (Green bot stands in its band centre, first `Close.` radius ±3) is a constant in `rules.ts`, not special-casing in the bot. It applies symmetrically, which keeps it honest.

### 5.4 How bot duels are recorded

**Bot duels never write to `turns`. They are played entirely client-side and reported once, on completion, via `finish_bot_duel`.**

Three reasons:

1. **M0 must ship with no backend at all.** `BRIEF.md:62` puts "Duel vs bot" at M0 and Supabase does not exist yet. If bot duels required turn rows, M0 could not be a static site and the "always a live URL" rule (`BRIEF.md:68`) would be blocked on backend work.
2. Eight to sixteen round-trips per bot duel, for a duel nobody will ever replay, is pure latency and pure free-tier egress for zero product value. There is no inbox entry for a bot duel and no Pour to watch.
3. It removes an entire class of bug (who signs the bot's turn, what happens if the human closes the tab mid-bot-duel) by not having the state.

The bot duel still counts: `finish_bot_duel` writes wins, losses, streak and RP, so bot wins feed the roast rank exactly as `GAME-DESIGN.md:137` specifies (+10 vs bot).

**Bots on the leaderboard: excluded, in three places, so no single filter is load-bearing.**
- `players_rp_idx` is a partial index `where is_bot = false`.
- Both leaderboard queries filter `is_bot = false`.
- `finish_bot_duel` writes to `player_daily` only for the human.

Bots still carry an `rp` value so the map reads as lived-in (`GAME-DESIGN.md:159` "Bots have roast levels so the map looks lived in"). That value is static seed data from `0004_bots.sql`, never accumulated, and the insert policy on `players` forbids a client from creating a row with `is_bot = true`.

**Bot RP farming cap.** `finish_bot_duel` accumulates into `player_daily.bot_rp` and stops awarding RP past **100 bot-RP per day** (10 bot wins). Prevents an idle tab from grinding to Burnt roast overnight and keeps the leaderboard meaning something, at the cost of one column and one `if`. Flagged to Smith as a balance decision, not an architecture one (§10).

---

## 6. Identity without login

### 6.1 The model

- `signInAnonymously()` on boot, before any UI. Session and refresh token live in localStorage under `supabase-js`'s own key.
- The landing screen (`GAME-DESIGN.md:207`) collects name, class, origin, face, accent, then inserts the `players` row with `id = auth.uid()` and calls `claim_slot`.
- `last_seen_at` is bumped on every app open and every `play_turn`. That one column drives the world-map filter, the slot reclamation and the abandonment sweep.

### 6.2 Second device

**Accept the loss for v1. Say it in the UI, do not hide it.**

A second device is a new anonymous user and therefore a new bean. There is no email, no OAuth, nothing to link against. That is the direct consequence of `BRIEF.md:41` ("No login") and it is the right trade for a 30-second-to-first-duel game.

Two cheap honesty measures rather than an account system:
- The profile sheet carries one line of microcopy (Allison's, in house voice): `This bean lives in this browser.`
- Clearing site data loses the bean. Same line covers it.

The escape hatch we are **not** building in v1 but which the schema does not preclude: a short transfer code that moves `players.id` to a new `auth.uid()`. It is a one-table, one-RPC addition later, and it would need rate-limiting to not become an account-theft vector. Out of scope, and I would push back on adding it before M4 is done.

### 6.3 Name filtering

Three layers, in order of who they stop:

1. **Shape, in the database.** `check (name ~ '^[A-Za-z0-9][A-Za-z0-9 ._-]{1,12}[A-Za-z0-9]$')`. This is not cosmetic. It bans zero-width joiners, RTL override characters (U+202E), combining-mark stacks and emoji. **The real risk here is not XSS** (labels are set via `textContent`, so markup cannot execute) **but layout destruction**: a single U+202E in a bean name flips the direction of the surrounding text in a CSS2D label, and combining-mark stacks ("Zalgo") extend vertically across the whole world map. A regex on the allowed set kills all of it in one line, which is why it belongs in a `CHECK` and not in client validation.
2. **Uniqueness.** `unique index players_name_norm_key on players (lower(name))`, so nobody can impersonate the top of the leaderboard.
3. **Profanity.** A ~200 word client-side list in `src/ui/screens/landing.ts`, checked as substrings on the normalised name. Deliberately client-side and deliberately small: it is a politeness filter for a Skool community, not a moderation system, and pretending otherwise would be dishonest. Anyone determined gets through. The mitigation that actually matters is that Diego can `update players set name = 'REDACTED'` from the Supabase dashboard in ten seconds if one slips through during judging.

Bot names come from Lola's roster and are inserted by migration, so they bypass all three by construction (`0004_bots.sql` runs as the migration role).

---

## 7. Build order

Mapped to `BRIEF.md` §5, honouring the `BRIEF.md:68` rule: never move to M(n+1) with M(n) unplayable, and there is always a live URL.

**M0: Duel vs bot. Zero network.**
- Ship: Vite scaffold, `src/sim` complete (rng, trig table, terrain, ballistics, duel, hash), golden vectors, `src/bots` solver, one duel scene, ortho camera, the five materials, the aim gesture, the HUD, the Spotter, fog, impact markers, the calls, the KO.
- Stubbed: world map (result card returns to a re-challenge card), profile in localStorage, RP in localStorage, no Supabase package installed yet.
- Gates from day one: `?stats=1` overlay, `?perf=low`, the headless budget test, `npm run test:determinism` in CI.
- **Deployed to Vercel on the first commit that renders anything.** The URL exists before the game does.

**M1: The World. Still zero network.**
- Ship: terrain from `TERRAIN_SEED`, instanced trees / cherries / beans / machines / slot rings, perspective camera with the fixed 30°/52°/35° framing, the challenge transition spline (`ART-DIRECTION.md` §8), CSS2D labels with the 32 cull, 12 bots from a local JSON, roast rank, streak.
- Stubbed: other humans, leaderboard shows local-only, no inbox.
- Gate: the world scene hits 60fps on a real Pixel 6a with the shadow map on `autoUpdate = false`. This is the milestone where the project can go wrong (§8.1), so measure it before adding anything to it.

**M2: Async duels. Supabase enters.**
- Ship: anonymous auth, `players` / `duels` / `turns` / `player_daily`, RLS + column grants, `claim_slot`, `play_turn`, `settle_duel`, `finish_bot_duel`, inbox, the Pour replay, leaderboard (all-time + today), the daily seed tag, `api/cron.ts`.
- **Ship in the same milestone: the offline degrade path.** Not M4. The whole value of the M2 backend is that it is optional.
- Stubbed: presence rings, live duels.
- Gate: pull the plug on Supabase (unset the env var on a preview deploy) and confirm the game is still fully playable against bots.

**M3: Live duels. Bonus.**
- Ship: presence channel, presence rings on the map, `duel:<id>` broadcast, the live turn prompt, the 20 second turn timer from `GAME-DESIGN.md:29`.
- Nothing above depends on this. If the calendar tightens, M3 is the first thing cut and the game is unaffected.

**M4: Polish.**
- Ship: 22 SFX + 2 music loops (lazy-decoded after the first gesture), particle pools, screen shake, transitions, the 3 onboarding tooltips, the 1080² share card, `prefers-reduced-motion` handling, the README, the Loom-friendly first 30 seconds.

**What "always a live URL" means mechanically:** `main` auto-deploys to production; every PR gets a preview URL; the production URL is playable at every point from the first M0 commit. Sonny gates each milestone against the **production** URL on a real device, not a dev server.

---

## 8. Risks, ranked

### 8.1 The 3D world eats the month (highest)

M1 is the largest unbounded surface in the project: terrain generation, biome masks, instanced population, camera framing, the challenge transition spline, slot rings, labels, and the moment where Lola's art direction meets a real GPU. It is also the milestone with the least direct effect on the categories being targeted.

Mitigations:
- The duel is M0 and never depends on the world. The world can be cut to a **static challenge card grid** and the game is still a complete, polished, playable artillery duel that competes for Eye Candy, One More Go and First Timer.
- Terrain is a seeded function, not authored geometry. There is no modelling loop, no export pipeline, nothing to iterate on visually except constants.
- Everything on the world map is instanced from the same primitives the duel already uses. If M1 slips, nothing built for it is wasted.
- **Explicit abort condition, expressed as a gate rather than a date:** if the M1 world scene cannot hold 60fps on a real Pixel 6a after the degrade ladder is in and the shadow map is static, stop adding to the world, freeze M1 at whatever renders, and spend the remaining budget on M4 polish of the duel. A gorgeous duel beats a stuttering world in every category on the list.

### 8.2 Determinism drift

**Mitigations, all specified above:** transcendentals banned by lint rule (§1.5), committed trig table (§3.4), integer inputs (§3.1), per-turn RNG streams (§3.3), integer game state, 500 golden vectors in CI and on-device (§3.6), `outcome_hash` comparison with a non-fatal fallback and a `desyncs` telemetry row (§3.6).

**Residual risk:** a device whose engine differs in `+ - * /` (none exist) or a bug in the table generator. The `outcome_hash` fallback means the worst realistic outcome is one slightly-wrong arc animation with the correct damage applied, plus a row we can debug from.

### 8.3 WebGL on iOS Safari

Judges use whatever is in front of them at 11pm and a meaningful share of that is an iPhone. Concrete failure modes and the concrete mitigation for each:

| Failure | Mitigation |
|---|---|
| Context lost on backgrounding / memory pressure | `webglcontextlost` handler with `preventDefault()`, factory-based GPU resource rebuild (§2.9) |
| Shader compile stall on first frame (200 to 600ms for Lambert + shadows + clipping) | `renderer.compile(scene, camera)` during the loading screen; check `KHR_parallel_shader_compile` and await it before hiding the splash |
| `devicePixelRatio` 3 on recent iPhones | DPR cap at 1.5 mobile (§2.7) |
| Low Power Mode caps rAF at 30fps | The sim is decoupled from rAF (§3.2), so the game is correct at 30fps. The degrade ladder must not treat a 33ms frame as a failure when the device is capped: detect a stable ~33ms cadence and lock rather than descend |
| Audio requires a user gesture | "Enter the war" is the gesture (`GAME-DESIGN.md:207`); audio is lazily decoded after it |
| `100vh` includes the collapsing address bar | `100dvh` everywhere (SKILL.md:179 to 191) |
| The aim drag scrolls the page instead of aiming | `touch-action: none` on the canvas and the gesture layer (SKILL.md:200); Pointer Events, not parallel mouse/touch handlers |
| iOS zooms on input focus below 16px | The name field is 16px minimum (SKILL.md:227) |
| Safe area / home indicator over the bottom HUD | `viewport-fit=cover` plus `padding-bottom: max(env(safe-area-inset-bottom), 1rem)`. `ART-DIRECTION.md` §2 gives the lower 35% of the portrait screen to the HUD, so this is a real collision |

**Test on a physical iPhone before M1 is called done.** The simulator does not reproduce context loss, thermal throttling or Low Power Mode.

### 8.4 Supabase Free auto-pause

Covered in §4.1. Daily keepalive cron plus a game that plays fully offline. This risk is ranked here rather than higher precisely because the offline path demotes it from fatal to cosmetic.

### 8.5 Asset size against the 1.5MB first-playable budget

| Item | Estimate (gzip) | Note |
|---|---|---|
| `three` (tree-shaken: Lambert, InstancedMesh, shadows, CSS2D) | 180 to 220KB | The largest single item, and unavoidable |
| `@supabase/supabase-js` | 45 to 60KB | **Dynamic import, loaded only when entering the world.** Not on the M0 critical path |
| Game code (sim, render, ui, bots) | 60 to 90KB | |
| Trig table | 7KB | §3.4 |
| Fonts: Bricolage Grotesque (variable, wght 700-800) + Space Mono 400/700 | 55 to 75KB | **Self-hosted woff2, subset to Latin + Latin Extended, `font-display: swap`.** Do not use the Google Fonts CDN in the game: it is a third-party connection on the critical path and the design-system HTML's `<link>` is for the doc, not the build. Self-hosting also closes `QA.md` SEC-10 (share-card `canvas.toBlob` throwing `SecurityError` on a tainted canvas) for free, since every drawn resource is then same-origin |
| Face atlas | 40 to 70KB | **Challenge: 512², not the 1024² in `ART-DIRECTION.md` §13.** Faces render at ≤64px even in the Spotter window, so 1024² is 4x the bytes for zero visible gain. Flagged to Lola |
| Steam 128² + particle 64² | ~6KB | |
| **First playable total** | **~400 to 480KB** | Comfortably inside 1.5MB |
| Audio (22 SFX + 2 loops) | ≤3MB | Lazy, after first interaction, never counted against first playable (`ART-DIRECTION.md` §13 agrees) |

The budget is not the risk here; **the risk is a late decision to add a GLB.** `ART-DIRECTION.md` §11 already rules against it ("build it, do not generate it") and a single Higgsfield GLB at 20 to 80k triangles would blow both the size and the triangle budget at once. Hold that line. If the espresso machine fallback GLB is ever used, it must be decimated to ≤400 tris and re-vertex-coloured as §11 requires, and it must not add a second material.

### 8.6 Realtime free-tier limits

Free tier: 200 concurrent Realtime connections, 2M messages/month. M3 only. At competition scale (a Skool cohort) this is not reachable. Named for completeness: if 200 people are simultaneously in the world map, we have a wonderful problem and $25 solves it.

### 8.7 Map crowding and slot exhaustion

120 slots, 60 rendered, `+N` chip for the rest, `claim_slot` reclaims slots from players idle over 7 days. Handled in §2.3 and §4.6. Named here because it is the kind of thing that looks fine at 12 players and looks broken at 200.

---

## 9. FinOps

**Assumptions:** competition month; a player opens the app 30 times and plays 20 duels, half of them against humans; a human duel is ~12 turns; a bot duel writes no turns.

| System | Tier | 10 players | 100 players | 1000 players | Cliff |
|---|---|---|---|---|---|
| **Supabase DB size** (500MB free) | Free | <1MB | ~2MB | ~22MB | ~3M turn rows. Unreachable |
| **Supabase egress** (5GB free) | Free | ~8MB | ~80MB | **~800MB** | ~5,000 players at this query shape, **or immediately if anyone ships `select('*')` on `players` in a poll loop** |
| **Supabase MAU** (50K free) | Free | 10 | 100 | 1,000 | 50,000. Unreachable. Anonymous users are reaped at 30 days by `daily_maintenance` |
| **Supabase Realtime** (200 concurrent) | Free | trivial | trivial | trivial unless simultaneous | 200 concurrent in M3 |
| **Supabase Edge Functions** (500K free) | Free | 0 | 0 | 0 | We use none. All server logic is RPCs inside Postgres |
| **Vercel bandwidth** (100GB Hobby) | Hobby | ~15MB | ~150MB | **~1.5GB** | ~65,000 players. Static assets are immutable-cached, so repeat visits are ~0 |
| **Vercel functions** (Hobby) | Hobby | 30/mo | 30/mo | 30/mo | One daily cron. Never a factor |
| **LLM API** | n/a | $0 | $0 | $0 | No AI surface (`BRIEF.md:96`) |

**Answer to the forcing-function question ("if this succeeds at 10x, what breaks first and what does fixing it cost?"): nothing breaks. At 1000 players over a month the free tier is at roughly 16% of its egress headroom and 4% of its database headroom. The first thing that would move is Supabase egress, and it would take about 5,000 active players to reach it, at which point $25/month on Supabase Pro solves it entirely.**

**The realistic cost risk is not volume, it is shape.** Three specific patterns would cross the egress cliff at competition scale, and all three are cheap to avoid at design time:
1. `select('*')` on `players` instead of the ten named columns. 8x the payload.
2. Any polling loop. There is none in this design and there must not be one added; a 5-second world-map poll at 100 concurrent players is 720,000 requests/day.
3. `postgres_changes` instead of Broadcast in M3. Replication payloads carry full rows.

**What would force a paid tier, ranked by likelihood:** (1) a polling loop added under deadline pressure, (2) sustained traffic past ~5,000 players, (3) M3 exceeding 200 concurrent Realtime connections. None of these is a competition-month scenario.

**Vercel Hobby is legitimate here**: personal project, no commercial use, no revenue. Worth stating explicitly since the estate's other Vercel projects are client work on Pro.

**One monitoring note, per `feedback_monitoring_end_to_end_at_cutover.md`:** there is no Sentry on this project and I am not proposing one. A game jam entry with no revenue does not need a $0-to-$26/month error pipeline. What it needs instead is already specified: the `desyncs` table (§3.6), the `?stats=1` overlay (§2.8), and the `daily_maintenance` return payload logged in the Vercel cron output. Three surfaces, zero cost, and each answers a question we will actually ask.

---

## 10. Open questions

### For Smith (game design)

1. **Bot RP cap.** I propose 100 bot-RP per day (§5.4) so an idle tab cannot grind to Burnt. That is a balance decision, not an architecture one. Confirm the number or replace it.
2. **`GAME-DESIGN.md:158` "tap a free slot to walk there".** Does moving reset your active duels' stances? A duel stores `challenger_stance` at creation, so an in-flight duel keeps the stance it started with. Confirm that is intended; the alternative (stance follows the bean) would mean a player could dodge a walked-in shot by moving, which sounds like an exploit dressed as a feature.
3. **Machine `chargeMs`.** The French press misfire (1 in 6) and the espresso second-hold both need `chargeMs` as a stored sim input. Confirm the hold is a continuous value the player controls, not a discrete two-state choice. If it is discrete, `TurnInput` gets smaller and the input gesture gets simpler.
4. **Sudden death (`GAME-DESIGN.md:35`) with async pacing.** "After 8 rounds each" is fine live; in async a duel could take a week to reach round 8. Should sudden death trigger on round count, on elapsed days, or both?
5. **First-shot challenge and stance mismatch.** `GAME-DESIGN.md:161` says challenging fires shot one immediately. If the target moves slots between your challenge and their reply, they play from the stance recorded in the duel row, which may not match where their bean now stands on the map. Cosmetic inconsistency or a real problem?

### For Allison (UX)

1. **The `+N more beans` chip.** I cap the world map at 60 rendered beans (§2.3). That needs a HUD element and a rule for who is shown (I propose: you, the 12 bots, then most recently active). Your call on the affordance and whether the hidden players are reachable at all.
2. **Offline state.** The game must be fully playable with the backend down (§4.1). One paper chip, house voice, non-blocking, and every network-dependent affordance (inbox, leaderboard, challenge-a-human) needs a disabled state. Please spec the chip copy and the disabled treatment; it is a first-class state, not an error.
3. **Second-device loss (§6.2).** One line of microcopy in the profile sheet, in house voice. `This bean lives in this browser.` is my placeholder, not a proposal.
4. **The 20 second live turn timer (M3)** versus no timer in async (`GAME-DESIGN.md:29`). The same duel screen has to carry both. Does the timer appear as a chip, a rim, or something else, and what happens visually at 0?
5. **Aim gesture quantisation.** Angle is quantised to 0.1° and power to 0.1% before it becomes a sim input (§3.4). On a phone, one pixel of drag is roughly 0.3° at typical drag lengths, so the quantisation is invisible. Confirm the drag-length-to-power curve is linear, or specify the curve you want, because it has to be a pure function that both the HUD preview arc and the sim agree on.

---

## Appendix A: enforcement summary

Every claim in this document that could rot is backed by a mechanism, not a memory:

| Claim | Enforced by |
|---|---|
| The sim is pure | `no-restricted-imports` on `src/sim/**` (§1.5) |
| The sim has no transcendentals | `no-restricted-properties` on `Math.*` (§1.5) |
| The sim has no clock | `no-restricted-globals` on `Date`, `performance` (§1.5) |
| Simulation is bit-exact | 500 golden vectors in CI and on device (§3.6) |
| Desyncs are visible | `outcome_hash` compare plus the `desyncs` table (§3.6) |
| Triangle / material / draw budgets | headless `test/budget.spec.ts` in CI (§2.8) |
| Frame budget on real hardware | `?stats=1` in the production bundle (§2.8) |
| No type errors reach production | `npm run build` runs `tsc --noEmit` on Vercel (§1.3) |
| Clients cannot write RP | column-level `GRANT`, not RLS (§4.5) |
| Clients cannot forge turns | no INSERT policy on `turns`; one `SECURITY DEFINER` RPC (§4.6) |
| Double-submit is safe | `primary key (duel_id, turn_index)` plus `for update` (§4.4, §4.6) |
| Names cannot break the layout | `CHECK` regex in the database (§6.3) |
| The game runs with the backend down | preview deploy with the env var unset, gated at M2 (§7) |
| A turn cannot be out of order or out of ammo | `turns_guard` BEFORE INSERT trigger, behind the RPC (§4.6) |
| Loadout cannot change mid-duel | class, stance, machine and slot frozen on the `duels` row (§4.4) |
| The daily seed cannot be moved by a device clock | `cbw_today()` in Postgres, `daily_seed` column default (§4.4) |
| Determinism is provable on a borrowed phone | `/#determinism` route in the production bundle, 40 goldens (§3.6) |
| The backend is awake on judging day | daily Vercel Cron, and the game plays without it anyway (§4.8, §8.4) |

---

## 11. Answers to `UX.md` §10, and the schema changes Smith's §16 rulings force

Allison's five questions, answered decisively. One of them (Q2) catches a mistake in §3.6 and I am changing the design. Smith's `GAME-DESIGN.md` §16 and §16b rulings land here too, because three of them move a TypeScript interface or a column. **Where this section contradicts §3.1, §3.6 or §4.4, this section wins.**

### 11.1 Q1: two `<input type="range">` written to at 60fps during a drag

**It does not fight the render loop, provided the DOM is written once per frame and never from the pointer handler.** The DOM aim UI is the right call and it is what makes WCAG 2.5.7 pass by construction; keep it exactly as `UX.md` §3.6.1 has it.

The failure mode if you write naively: `pointermove` fires up to ~120Hz on a Pixel 6a, so a handler that assigns `input.value` runs roughly twice per frame, and each assignment invalidates the native slider thumb's style. Two inputs, two writes, two invalidations per event. That is not fatal but it is free to avoid.

The shape:

```ts
// src/ui/input/aim-gesture.ts
let pending: { angleDd: number; powerPm: number } | null = null;

function onPointerMove(e: PointerEvent): void {
  const pts = e.getCoalescedEvents?.() ?? [e];
  pending = aimFromAnchor(pts[pts.length - 1]!);   // read the LAST point, do not integrate
}                                                   // no DOM, no render, no store write

// Called from the SINGLE rAF in core/clock.ts. Not a second loop.
function flushAim(): void {
  if (!pending) return;
  setAimCssVars(pending);                           // one custom-prop write -> transform only
  if (angleEl.valueAsNumber !== pending.angleDd / 10) angleEl.value = String(pending.angleDd / 10);
  if (powerEl.valueAsNumber !== pending.powerPm / 10) powerEl.value = String(pending.powerPm / 10);
  pending = null;
}
```

Four points that make it correct rather than merely fast:

1. **Truth during a drag is the plain object, not the DOM.** The range inputs are a mirror that happens to also be the keyboard and AT surface. One direction of data flow, so the pointer path and the keyboard path cannot loop into each other.
2. **Programmatic `.value =` does not dispatch `input`.** That is the behaviour we want: the `input` listener exists only for the keyboard and AT path. Do not "fix" this by dispatching a synthetic event.
3. **Do not put `aria-live` on the angle or power values.** `UX.md` §3.6.1 correctly leaves the two ranges out of the live regions. A live mirror updating 60 times a second makes VoiceOver unusable, and adding one "for consistency" is the natural mistake. The `<output>` elements update on commit and on keyboard step, never during a pointer drag.
4. **The chips and the gauge arc update through one CSS custom property** on one container (`--aim-angle`, `--aim-power`), driving `transform` and nothing else. No width, no top, no left. Per-frame layout is what actually costs frames, not the two `value` writes.

**No `pointer-events` juggling is needed.** `UX.md` §3.7.2 puts the drag origin band and the HUD in different zones, so the gesture layer and the range inputs never overlap. The ranges keep their own hit area, which is also the single-pointer alternative that WCAG 2.5.7 requires, so removing it would break the very thing the DOM decision buys. The visually-replaced inputs stay focusable and get their focus ring through `.chip:has(:focus-visible)` on the chip that renders them.

Measured expectation: about 0.05ms per frame. Lives in `src/ui/input/aim-gesture.ts`, flushed from the one rAF in `src/core/clock.ts`.

### 11.2 Q2: is the call stored with the turn?

**Yes. Allison is right and §3.6 was wrong. `turns.call` is added.**

My §3.6 rule was "store nothing derivable". The call *is* derivable from the inputs, so by that rule it should not be stored. The rule was too broad, and the counter-example is exactly this: the call is not a physics result, it is a **balance** result. `Close.` is ±2 units, ±3 for Arabica (`GAME-DESIGN.md:51`), ±3 against a Green bot (`GAME-DESIGN.md:57`), and Smith's §16b ruling 4 widens it again for the scripted first duel. Every one of those is a ⚖️ knob that will move during playtest. The moment one moves, every stored duel silently re-derives a different word, and an async duel that a judge left open across a balance patch prints a different call than the one they read yesterday.

**The corrected rule, which is the one to hold: derive anything that follows from physics, store anything that follows from a balance constant. Physics does not move; balance constants do.** `damage` was already stored for this reason and I had not noticed it was the same principle.

Cost: two bits. Schema amendment to §4.4:

```sql
-- 0 = close, 1 = short, 2 = long. Smith's §16b ruling 1: `Wide.` is retired, the
-- three calls are Close. / Short. / Long.
call smallint not null check (call between 0 and 2),
```

On replay the client still derives the call and compares it to the stored one. A mismatch prints the **stored** word (it is what the player actually saw) and increments a `rules_drift` counter rather than a `desync`, because it is not a determinism failure, it is a deliberate balance change showing its work. Two counters, two different meanings, and conflating them would make the determinism telemetry useless.

**On the formula.** `sign(impact.x - opponent.x)` is right for Short vs Long, with `Close.` taking priority when `|impact.x - opponent.x| <= closeRadius`. The sign is unambiguous only because of `UX.md` deviation 4, ratified in `GAME-DESIGN.md` §16b: you are always on the left. So in canonical stage space the opponent is always at greater x, and `impact.x < opponent.x` is unambiguously short. That is the second thing the always-left ruling buys, after the stable Spotter corner.

### 11.3 Q3: the impact list, and the fold's stability

**(a) Confirmed, with a correction that makes the concern stronger, not weaker.** The impact list is not in localStorage. It is also not stored as a list at all: it is a fold over the `turns` rows, and those live in Postgres. So the list is server-side by construction, and it is strictly better than a stored list because a stored list can disagree with the turns it came from, whereas a generator cannot disagree with itself. localStorage holds exactly two things: the Supabase session (`supabase-js` owns it) and the state of a purely local bot duel, which is never replayed on a second device.

**(b) The fold is not merely order-independent, it is order-fixed, and that is stronger.** `turn_index` is a total order enforced in two places: the composite primary key `(duel_id, turn_index)` and the `turns_guard` trigger's `new.turn_index = d.next_turn_index` check (§4.6). There is no partial order, no concurrent branch, no merge. `replayDuel` sorts by `turn_index` and folds. Two clients cannot see different orders because no other order can exist in the table.

**The `Swap sides` setting cannot reach the fold, and here is the mechanism that guarantees it.** Canonical stage space is fixed: `sides[0]` is the challenger at the fixed left x, `sides[1]` is the opponent at the fixed right x, for both players, forever. `Impact.x` is always canonical. The fog mask is computed in canonical space. **Always-left presentation is a view transform and appears nowhere in `src/sim`.** The lint rule in §1.5 already makes this structural: `src/sim` cannot import from `render`, `ui` or the settings store, so there is no path by which a display preference could enter the fold even by accident.

Two implementation notes on the mirror, because the obvious version is wrong:

- **Do not mirror by scaling x by -1.** A negative scale inverts triangle winding, so backface culling flips and the entire stage renders inside-out. Instead, place the orthographic camera on the opposite side of the duel line and rotate 180° in yaw. Identical picture, no winding change, no material changes, no `side: DoubleSide` workaround that would double the fill cost.
- The Spotter window, the cups and the call chip flip by swapping a CSS class on the HUD root, not by transforming it. Transforming a HUD container mirrors the glyphs.

Test for Sonny: `replayDuel(setup, turns)` returns a byte-identical `DuelState` regardless of which side the caller identifies as and regardless of every view setting. One assertion, and it is the one that proves this whole answer.

### 11.4 Q4: where the pointer contract lives

A new module tree, `src/ui/input/`, owns all of it. It is in `ui` and not `render` because it produces a `TurnInput`, which is a game input, not a camera concern.

| Contract item | Owner | Note |
|---|---|---|
| `setPointerCapture` on arming | `src/ui/input/aim-gesture.ts` | Captured on `pointerdown` inside the origin band, released in the single exit path below |
| `pointercancel` is a cancel, never a fire | `aim-gesture.ts` | **One exit path: `endGesture(committed: boolean)`.** `pointerup` calls it with `true`, `pointercancel` and `lostpointercapture` call it with `false`. Allison is right that this is the most likely accidental-fire bug in the build, and it is caused by having two exits, not by the events. Also handle `lostpointercapture`: iOS can revoke capture without sending `pointercancel` |
| `100dvh`, `overscroll-behavior: none`, `touch-action: none`, `overflow: hidden`, `-webkit-touch-callout: none` | `src/ui/base.css` on `html, body` | **Global, not per-screen.** Per-screen means one screen forgets. This also satisfies the `100dvh` and `touch-action` items already ranked in §8.3 |
| `visualViewport` resize cancels an armed aim | `src/ui/input/viewport-guard.ts` | One publisher of a `viewportChanged` event on `core/store`; two subscribers, `aim-gesture` (cancel) and `render/cameras` (refit). One publisher means the cancel and the refit can never disagree about whether a resize happened |
| `orientationchange` cancels the aim, preserves committed values | `viewport-guard.ts` + the range inputs | The values survive because they live in the DOM, which is Allison's point and a real benefit of the DOM decision |
| No blanket `preventDefault` | `aim-gesture.ts` | `preventDefault` only inside the origin band and the HUD, per `UX.md` §3.7.4 |

**The 88px dead zone is a layout constant, not computed from `env()`.** Allison's reasoning stands and there is a second, mechanical reason: the origin-band test happens in JS on `pointerdown` (`e.clientY < originBandBottom`), and reading `env(safe-area-inset-bottom)` from JS means a `getComputedStyle` on a probe element, which is a forced synchronous layout at the worst possible moment in the frame. So:

```ts
// src/ui/input/constants.ts
export const AIM_DEAD_ZONE_PX = 88;   // 34 inset + 54 buffer, UX.md §3.7.3
```

and CSS separately does `padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px))` for the visual clearance. One number, two consumers, and JS never reads `env()`.

One addition: use `pointermove` plus `getCoalescedEvents()`, not `pointerrawupdate`. `pointerrawupdate` is Chromium-only and fires more often for latency we do not need on a turn-based aim.

### 11.5 Q5: the 400ms Pour lockout and the 250ms autofocus guard

**Input layer, both, and never the view layer.**

A view-layer implementation means `disabled` or `pointer-events: none`. `disabled` on the autofocused `One more go.` button destroys the focus Allison placed there deliberately and swallows the AT announcement; `pointer-events: none` is routed around by a keyboard Enter. Neither closes the hole.

```ts
// src/ui/input/gate.ts  -- one place decides whether an input counts
export interface InputGate {
  accept(e?: Event): boolean;
  lockFor(ms: number): void;
}
```

- Every commit path (`fire`, `one-more-go`, ammo select, challenge confirm) goes through `gate.accept()`. The control stays enabled, stays focused, stays announced; the commit is swallowed.
- Pour stamp frame calls `gate.lockFor(400)`. A keyboard Enter inside that window is swallowed too, which is correct: it is the same accidental double-commit through a different device.
- Screen mount on the result card calls `gate.lockFor(250)` as focus moves to `One more go.`.
- **The timer alone is not enough for the autofocus case.** The specific failure is a player still holding the pointer down from the KO tap whose `pointerup` lands on a button that did not exist when the gesture began, and on iOS that can synthesise a `click`. So `accept(e)` also rejects any event whose `e.timeStamp` predates the screen's mount time. Ship both checks; the timestamp check is the robust one and the timer is the belt.
- Timestamps come from `performance.now()`, not `Date.now()`, so a system clock change cannot unlock a gate.
- **No `setTimeout` to re-enable.** The gate is a timestamp comparison evaluated at `accept()` time, so a backgrounded tab cannot return with a stale pending timer that fires into a different screen. Gates are cleared on screen dispose.

### 11.6 Schema and interface changes forced by `GAME-DESIGN.md` §16 and §16b

Three of Smith's rulings move code. Two are simplifications and one is a determinism bug that the ruling introduces, which I am catching here.

**1. `chargeMs` is gone (§16 ruling 3).** Charge is discrete. `TurnInput` loses a field and gains a flag:

```ts
export interface TurnInput {
  readonly turnIndex: number;
  readonly angleDeciDeg: number;   // 0..1800
  readonly powerPerMille: number;  // 0..1000
  readonly ammo: Ammo;
  readonly doubleShot: boolean;    // espresso per-turn toggle. Replaces chargeMs.
}
```

```sql
-- amends §4.4
double_shot boolean not null default false,   -- was: charge_ms smallint
```

This is strictly better for determinism: a millisecond timing value taken from a pointer hold is device-dependent, quantisation-sensitive and impossible to reproduce on a keyboard. A boolean has none of those problems. The French press misfire needs no input at all: it is `power_pm >= 850` plus a 1-in-6 roll from `turnRng(duelSeed, turnIndex)`, so it is already a pure function of stored data. The HUD gauge needle stays as presentation, per the ruling.

**2. Class editable between duels (§16b ruling 3): already safe.** `challenger_class` and `opponent_class` were frozen on the duel row in §4.4 for exactly this reason. Editing between duels is a plain `players` update through the existing column grant. No change needed, which is the point of having frozen it.

**3. Sudden death at "5 days since duel creation" (§16 ruling 4) is a determinism hazard as written, and needs one column.** Round 8 is fine: it is a function of `turn_index`. Wall-clock elapsed time is not, because the client evaluating it is asking a clock, and two clients replaying the same duel at different moments would compute different sudden-death states and therefore different HP. The sim has no clock and the lint rule bans `Date` from `src/sim` precisely so this cannot be written by accident.

The fix is one column and one line in the RPC:

```sql
-- amends §4.4: null until triggered; then the turn index at which sudden death began.
sudden_death_from smallint,
```

```sql
-- amends §4.6, inside play_turn, before the turn is inserted:
if d.sudden_death_from is null
   and (p_turn >= 16 or d.created_at < now() - interval '5 days') then
  d.sudden_death_from := p_turn;      -- server observes the clock, once, and freezes it
end if;
```

The server observes the wall clock exactly once, writes an integer, and from then on the sim reads an integer like everything else. Both triggers from the ruling are preserved (round 8 each is turn index 16), the 7 day abandonment sweep in §4.8 is unaffected, and `replayDuel` stays a pure function of stored data. `DuelSetup` gains `readonly suddenDeathFrom: number | null`.

**4. Balance knobs must live in the sim's allowed operations (§16 ruling, accepted).** Confirmed and worth restating for whoever tunes them: no `pow` curves, no `exp` falloff. A ⚖️ curve is a lookup table or a polynomial in `+ - *`. The lint rule in §1.5 will reject the alternative at commit time rather than at playtest time.

**5. Always-left layout (§16b, `UX.md` deviation 4): confirmed as a view transform only**, per §11.3 above. It is the ruling that makes the call's sign unambiguous, so it is load-bearing for §11.2 as well as for the HUD.

### 11.7 Net effect on the durable record

The turn row is now eight integers and a boolean, and it is still the only durable game data in the system:

```sql
duel_id, turn_index, player_id,
angle_dd, power_pm, ammo, double_shot,   -- the input
call, damage, outcome_hash,              -- the balance result and the determinism witness
created_at
```

`call` and `damage` are stored because balance moves. Everything else about a duel, including the fog, the HP, the impact markers, the Spotter crop and the stage silhouette, is still derived by folding `replayDuel` over these rows. That distinction between physics and balance is the whole rule, and it is now written down rather than implied.

---

*v0.3, 2026-09-05. Emmett, architecture seat. v0.3 adds §11: answers to Allison's five questions in `UX.md` §10, and the schema changes forced by Smith's `GAME-DESIGN.md` §16 and §16b rulings. Two design changes in it: `turns.call` is now stored (Allison was right, §3.6's derive-everything rule was too broad), and `duels.sudden_death_from` is added because the 5-day sudden-death trigger would otherwise put a wall clock inside a deterministic replay. §11 supersedes §3.1, §3.6 and §4.4 where they disagree. v0.2 folds in Sonny's `QA.md` constraints: all seven accepted (§0.1), with `players.id` as the auth uid rather than a separate `auth_uid` column, `whose_turn` adopted as the column name so both docs describe one object, and two gaps he found closed (`bean_class` frozen on the duel row, ammo-rack budget enforced server-side). Written against `BRIEF.md` §5 §6 §9, `GAME-DESIGN.md` §2 §2b §9 §10 §12, `ART-DIRECTION.md` §2 §7 §8 §11 §13. Three deliberate challenges to other seats' docs, each with the mechanism: the fog mask is derived and not stored (§3.6), the face atlas drops to 512² (§8.5), and the degrade ladder puts DPR before shadows (§2.7). Owes Lola: sign-off on world-map beans having no individual faces (§2.3). Owes Smith and Allison: the ten open questions in §10.*
