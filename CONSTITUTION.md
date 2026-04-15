# Constitution

Version: 1.0.0

## Purpose

A browser-based reimagining of the classic Lode Runner game featuring modern hi-res graphics, smooth character animation, and sound effects. The target audience is both nostalgic fans of the original and new players discovering the genre. The game is single-player and desktop-focused. Non-goals: no multiplayer, no level editor, no mobile-optimized layout.

## Principles

1. **Gameplay fidelity first** — match the original Lode Runner mechanics before adding visual polish
2. **Smooth over flashy** — consistent 60fps animation and responsive controls matter more than particle effects
3. **Simple level data** — levels are plain data (JSON/grid arrays), not code, so they're easy to author and validate
4. **No external runtime dependencies** — the game runs as a static site with no server, no login, no analytics
5. **Progressive enhancement** — core gameplay works without sound; audio enhances but isn't required
6. **Readable game logic** — game state updates should be clear and debuggable, favor explicit state machines over clever abstractions
7. **Asset-light start** — placeholder graphics and sounds are acceptable early; the architecture must make swapping assets trivial

## Stack

- language: typescript
- package_manager: pnpm
- install: pnpm install
- test: pnpm vitest run
- lint: pnpm eslint . --max-warnings 0
- typecheck: pnpm tsc --noEmit
- build: pnpm vite build

## Boundaries

1. **Will NOT** add any server-side code or backend services
2. **Will NOT** add multiplayer or networked gameplay features
3. **Will NOT** add a level editor or user-generated content system
4. **Will NOT** add mobile touch controls or responsive mobile layouts
5. **Will NOT** add third-party analytics, tracking, or advertising scripts
6. **Will NOT** add new runtime npm dependencies without an explicit amendment to this constitution
7. **Will NOT** use WebGL or Three.js — rendering is 2D Canvas API only
8. **Will NOT** require a user account, login, or any form of authentication

## Quality Standards

1. `pnpm tsc --noEmit` passes with zero errors (strict mode enabled)
2. `pnpm eslint . --max-warnings 0` passes with zero warnings
3. `pnpm vitest run` passes — all unit tests green
4. `pnpm vite build` completes with zero errors and produces a working static bundle
5. Game loads in under 3 seconds on a standard broadband connection
6. Gameplay maintains 60fps on a mid-range laptop (no dropped frames during normal play)
7. All interactive elements are keyboard-accessible — no mouse required for gameplay

## Roadmap

1. Player can move left, right, climb ladders, and traverse hand-over-hand on bars
2. Player can dig holes in brick to trap enemies and collect gold
3. Enemies patrol levels with basic AI, fall into holes, and respawn
4. Gold collection triggers level completion when all gold is gathered and player reaches the top
5. Multiple levels with increasing difficulty, loaded from a level data format
6. Hi-res sprite-based graphics with smooth frame-by-frame animation for all characters
7. Sound effects for digging, collecting gold, enemy trapping, level completion, and death
8. Background music track during gameplay
9. Start screen, level select, and game-over/win screens
10. Score tracking and display during gameplay
11. Keyboard controls with responsive input handling
12. Brick regeneration timer — dug holes refill after a delay
