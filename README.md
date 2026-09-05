# Coffee Beans War

A persistent low-poly coffee valley where every player is a bean with a war machine. Tap any bean, fire your first shot, leave. They find it waiting when they next open the game. In a duel you never see the opponent: the Spotter shows how they stand, your impacts thin the steam, and the game answers `Close.` `Short.` `Long.` Results print as receipts. Winners roast darker.

Built for the AI Automators September 2026 game competition. Browser only, no login, plays fully offline against bots.

**Status:** M0 in progress (duel vs bot). Live build: see the deployment link on this repo.

## Play

- **Aim:** drag anywhere in the lower half of the screen. Direction is angle, length is power. Release to fire. Keyboard: arrows and space.
- **Read the steam.** It moves your shot.
- **They are in the steam.** The cup window top-right shows how they stand, not how far.

## Develop

```
npm ci
npm run dev
npm run typecheck && npm run lint && npm test
```

Design docs live in `docs/` (brief, game design, art direction, UX, architecture, QA). The design system is `docs/design-system.html`.

Made by Diego Bauer with Smith (AIwithDiego).
