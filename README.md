# Jelly Orbit · 水母的海洋小旅行

A one-hundred-stage, mobile-first ocean puzzle. Send jellyfish around a moving track, reveal matching colors, and collect ocean pixel art.

## Gameplay

- Tap the front jellyfish in any of three queues. Up to three travel together, with slightly staggered launches.
- A small flag marks the upper-left corner where each lap begins and ends.
- Each swimmer fires inward along its current side. The first solid cube blocks everything behind it; a matching hit spends one bubble.
- From stage 6, snowflake-marked cubes have an ice shell. The first matching bubble removes the shell but leaves the cube blocking the ray; the second removes the cube. Both hits consume ammo. Stage ammo includes the extra ice hits.
- Empty swimmers leave immediately. Those with bubbles remaining return after one lap to a five-slot waiting bay and can be launched again.
- Each traveling swimmer reserves one waiting slot, shown by a return arrow. A full bay still lets its own swimmers relaunch.
- Clear every cube to win. Loss is checked only after all swimmers settle, when no waiting swimmer can hit anything and no new queue can be opened.
- Undo restores the complete state before the last launch, including other swimmers in flight. Hints suggest locally useful colors; they do not guarantee optimal play.
- Pause, replay, 2× speed, optional sound, and help are included. Dialogs and hidden browser tabs pause simulation.
- Bubble flight, impact rings, ice fragments and swimmer recoil reinforce hits. Consecutive hits within 12 simulation ticks build a combo and rising note sequence; best combo and launch count appear at the end. Clearing a whole color triggers a brief celebration. Combos are cosmetic and never affect solvability.

The first twenty stages keep the palette to at most four colors and use larger jelly units, so players can learn the loop with fewer queue and waiting-slot decisions. Later chapters gradually use smaller units and more layered patterns.

Stages 6–10 form the Frost Sea chapter: ice introduction, frozen entrance, a lighter heart-shaped stage, twin reefs, and an aurora crystal finale. An illustrated one-time introduction explains the new mechanic. Existing five-stage saves automatically continue at stage 6.

Stages 11–15 introduce the Pearl Sea: numbered pearls open matching shell groups once every pearl is removed. Closed shells block rays without spending ammo. The opening version of these stages uses one shell group at a time; combined ice and shell puzzles appear later. Shell contents still require ordinary matching hits after opening.

Stages 16–100 form the rest of a ten-chapter journey. Deterministic pattern variants rotate, mirror and recolor the original art, with a curated source pattern and ammo size for each stage. Each chapter mixes familiar shapes, new variations and calmer stages. The collection and map show ten stages at a time, with chapter navigation.

After a first clear, optional replay challenges reward finishing within the displayed launch target or without hints. Every target has a verified winning route. Challenges never gate progression. Best launch count, best combo and earned badges are saved independently under `jellyOrbitRecordsV1`; existing completion saves remain unchanged. Undo restores the board but does not erase this attempt's actual launch or hint counts. A replay resets attempt counters. Old completed stages unlock challenges without inventing historic scores.

## Core Systems

- `src/game/tide.ts`: immutable deterministic simulation, inward rays, ice, shell locks, launch/dock rules, the original stage patterns and local hints. Lowercase color letters define iced cubes in the hand-authored maps.
- `src/game/campaign.ts`: chapter names and the curated stage variants for stages 16–100.
- `src/game/tide.test.ts`: capacity, ammo conservation, simultaneous hits, ice/shell blocking, deadlock timing, and verified sequential/interleaved winning routes for all one hundred stages.
- `src/storage/tideRecords.ts`: validated local records and idempotent personal-best/challenge merging.
- `src/components/TideEffects.tsx`: bounded visual effects and color-clear celebrations, with reduced-motion support.
- `src/storage/tideProgress.ts`: backwards-compatible stage completion storage and new-mechanic tutorial memory.
- `src/App.tsx`: interface, clock, undo snapshots, local completion storage and synthesized audio.
- `src/styles.css`: responsive ocean layout, hit feedback and reduced-motion support.
- Existing artwork from `reference/jellyfish-3d` is reused.

The previous turn-based engine, solver, levels and tests remain as reference. They are not used by the new app; the realtime rules are verified separately.

Completed stages are stored under `jellyOrbitTideV2`, without changing previous-version progress. Reloading restarts the current stage and keeps unlocks. Audio starts muted. Google Fonts is optional, with system-font fallback.

The hundred-stage catalogue passes automated route checks, but actual difficulty and pacing still need real-player playtesting. Accounts, monetization and daily challenges are outside this version.

## Development

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

The production Vite build uses `/012s-jelly-orbit/` as its GitHub Pages base when the GitHub Actions environment is detected. Local development uses `/`.

## Deployment

`.github/workflows/deploy.yml` runs tests, typecheck, build, and deploys `dist/` to GitHub Pages only after all checks pass.

Expected URL:

<https://alberthuang-012s.github.io/012s-jelly-orbit/>
