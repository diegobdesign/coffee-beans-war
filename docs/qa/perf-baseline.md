# Perf baseline (QA.md §7 "Baseline discipline")

Numbers per milestone. A change that stays inside PASS but moves a metric >20% the wrong way gets flagged.

## M0 (2026-09-05, slices 1 to 7 merged)

Measured with `?stats=1` on the dev machine (Chromium via Playwright, 390×844, DPR 1). Counters cover both render passes (main + Spotter).

| Metric | Value | Gate | Status |
|---|---|---|---|
| Duel draw calls (per frame, both passes) | 24 (production, mid-duel with markers and trails) | ≤ 30 | PASS |
| Visible triangles (both passes) | 44,100 | ≤ 60k | PASS |
| Frame time p50 / p95 / p99 | 8.3 / 9.3 / 9.4 ms (dev machine) | ≤ 16.7 ms p50 on a Pixel 6a | not yet measured on the reference device |
| Programs / geometries / textures | 6 / 15 / 3 | | |
| Production cold start to `#turn` visible | 655 ms (private context, cache cleared) | ≤ 3 s (PF-15 proxy) | PASS |
| Full duel, keyboard path, to receipt | 65 s, 12 shots, zero console errors | cold-start gate proxy | PASS |
| First playable JS (minified, not gzipped) | ~540 KB | ≤ 1.5 MB gzipped | PASS |
| Static budget test (all 9 stance pairs) | ≤ 24 draws, ≤ 60k tris | CI gate | PASS |

**Open on device:** PF-01 needs a real Pixel 6a class phone and an iPhone. That is playtest round 1 (Diego + Smith + one). Report the overlay's four lines from each phone into this file.
