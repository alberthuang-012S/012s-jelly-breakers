// Run: node tools/generateAdvancedLevels.mjs
// Authoring only: the browser loads the verified catalogue, never runs this simulation.
import { writeFileSync } from 'node:fs'
import { COLORS, canHit, createTide, launch, stepTide } from '../src/game/tide'
import type { Difficulty, TideLevel, TideState } from '../src/game/tide'
import type { JellyUnit } from '../src/game/types'
import { artworkDepths, colorArtwork, makeArtwork } from '../src/game/artwork'
import { artworkShells } from '../src/game/campaign'

function settle(state: TideState, size: number): TideState {
  for (let t = 0; state.swimmers.length && state.phase === 'playing' && t < size * 8 + 16; t++) state = stepTide(state, size)
  return state
}
function makeBoard(difficulty: Difficulty, number: number): TideLevel {
  const hard = difficulty === 'hard', chapter = Math.floor((number - 1) / 10), position = (number - 1) % 10
  // Brand finales are collectible pauses; positions 4 and 8 also ease pressure.
  const calm = position === 3 || position === 7 || position === 9
  const size = hard ? number <= 3 ? 10 : number <= 10 ? 12 : 14 : 12, id = (hard ? 200 : 100) + number
  const palette = COLORS.map((_, i) => COLORS[(i + chapter + position) % 5])
  const art = makeArtwork(number, size), depths = artworkDepths(art.mask, size)
  const tiles = colorArtwork(art, depths, hard && number <= 3 ? palette.slice(0, 4) : palette, size)
  const iceEnabled = hard ? number >= 4 : chapter >= 2
  const iceSpacing = hard && number <= 10 ? 9 : calm ? 9 : hard ? 4 : 7
  const ice = depths.map((d, i) => d >= 0 && iceEnabled && (Math.floor(i / size) * 3 + i % size + number) % iceSpacing === 0 ? 1 : 0)
  const groupCount = hard ? number <= 6 ? 0 : number <= 10 ? 1 : (calm ? 2 : chapter >= 4 ? 3 : 2) : chapter < 2 ? 0 : chapter < 6 || calm ? 1 : 2
  const shells = artworkShells(art, depths, groupCount)
  const puzzleEnabled = !calm && (hard ? number >= 11 : number >= 21)
  const puzzle: TideLevel['puzzle'] = !puzzleEnabled ? undefined : position % 3 === 0 ? 'dual-entry' : position % 3 === 1 ? 'ice-gate' : 'split-pearls'
  if (puzzle === 'dual-entry') {
    // Two exposed fronts protect different parts of the silhouette. Inner
    // colors remain hidden until the player opens one of those approaches.
    for (let i = 0; i < tiles.length; i++) if (tiles[i]) {
      tiles[i] = depths[i] === 0 ? palette[i % size < size / 2 ? 0 : 1]
        : palette[2 + (depths[i] + Math.floor(i / size / 3)) % 3]
    }
  }
  if (puzzle === 'ice-gate') {
    // Concentrate ice at visible entrances and pearl keys instead of scattering
    // every frozen tile uniformly. The ordinary two-hit ice rule stays intact.
    for (let i = 0; i < tiles.length; i++) if (depths[i] === 0 && (Math.floor(i / size) + i % size) % 3 === 0) ice[i] = 1
    for (const shell of shells) for (const key of shell.pearls) ice[key] = 1
  }
  if (puzzle === 'split-pearls') for (const [group, shell] of shells.entries()) {
    const keys = depths.flatMap((d, i) => d === group ? [i] : [])
    shell.pearls = [...new Set([keys[0], keys[Math.floor(keys.length / 2)], keys[keys.length - 1]])]
  }
  return { id, difficulty, poolSize: hard ? 4 : 5, name: art.name, family: art.family, brand: art.brand,
    subtitle: art.brand ? `${art.brand} 海洋紀念：解開字元，把未來收進圖鑑。`
      : puzzle === 'dual-entry' ? '兩側入口有不同顏色，先選一條路替內層開道。'
      : puzzle === 'ice-gate' ? '入口與珍珠被冰封了，先破冰再打開航道。'
      : puzzle === 'split-pearls' ? '珍珠分散在不同位置，收齊同號鑰匙才會開門。'
      : hard ? '從輪廓與缺口規劃解鎖順序，替返航夥伴保留空位。' : '觀察圖案的留白與三條隊伍，替下一個顏色開路。',
    icon: art.brand ? '✦' : hard ? '✧' : '◈', puzzle, size, tiles, ice, shells, lanes: [[], [], []], par: 0 }
}
function author(level: TideLevel): TideLevel {
  const number = (level.id - 1) % 100 + 1, chapter = Math.floor((number - 1) / 10)
  const hard = level.difficulty === 'hard', calm = [3, 7, 9].includes((number - 1) % 10)
  const cap = hard ? (calm ? 10 : number <= 10 ? 8 : chapter < 5 ? 6 : 4)
    : calm ? 12 : level.puzzle === 'dual-entry' ? 6 : chapter < 4 ? 12 : chapter < 7 ? 10 : 8
  let state = createTide(level)
  const units: JellyUnit[] = []
  // Find a constructive route using the actual firing/ice/shell simulation.
  // Each unit receives exactly the ammo consumed on its reference lap.
  for (let move = 0; state.tiles.some(Boolean) && move < 400; move++) {
    const choices = COLORS.filter(color => canHit(state, color, level.size))
    if (!choices.length) throw new Error(`Locked board ${level.id}`)
    const color = choices[(number + move) % choices.length]
    const unit = { id: `${level.id}-${move}`, color, energy: cap }
    state = settle({ ...state, swimmers: [{ ...unit, age: 0 }], phase: 'playing' }, level.size)
    const left = [...state.pool, ...state.swimmers].find(j => j.id === unit.id)?.energy ?? 0
    units.push({ ...unit, energy: cap - left })
    state = { ...state, pool: [] }
  }
  if (state.phase !== 'won') throw new Error(`Unfinished board ${level.id}`)
  const initial = createTide(level)
  const hidden = units.filter(j => !canHit(initial, j.color, level.size))
  // Open lettering and thin silhouettes are deliberately calmer stages. Dense
  // creatures retain the blocked-head/docking puzzle without thickening the art.
  const forcedCount = Math.min(hidden.length, hard && number > 3 && !calm ? 2 : 1)
  // One lane offers initially blocked inner colors. Overfilling it is a real losing route.
  // The other two carry the reference order; selected inner units need temporary docks.
  const pendingCount = Math.min(Math.max(0, hidden.length - forcedCount), level.poolSize! - forcedCount)
  const pending = hidden.slice(0, pendingCount)
  // Unlike the optional risky lane, these inner units block required outer ammo.
  // A winning player must temporarily dock them to uncover that queue.
  const forced = hidden.slice(pendingCount, pendingCount + forcedCount)
  const pendingIds = new Set([...pending, ...forced].map(j => j.id))
  const rest = units.filter(j => !pendingIds.has(j.id))
  const lanes = [pending, [...forced, ...rest.filter((_, i) => i % 2 === 0)], rest.filter((_, i) => i % 2 === 1)]
  const preload = calm ? 1 : hard ? (chapter < 4 ? 2 : 3) : chapter < 5 ? 1 : 2
  const solution = [...forced.map(j => j.id), ...pending.slice(0, Math.max(0, preload - forcedCount)).map(j => j.id), ...units.map(j => j.id)]
  const result = { ...level, lanes, solution, par: solution.length + (hard ? 2 : 4) }
  state = createTide(result)
  for (const id of solution) {
    const poolIndex = state.pool.findIndex(j => j.id === id)
    const laneIndex = state.lanes.findIndex(l => l[0]?.id === id)
    if (poolIndex < 0 && laneIndex < 0) throw new Error(`Inaccessible unit ${id}`)
    const next = launch(state, poolIndex >= 0 ? 'pool' : 'lane', poolIndex >= 0 ? poolIndex : laneIndex)
    if (next === state) throw new Error(`No dock for ${id}`)
    state = settle(next, level.size)
  }
  if (state.phase !== 'won') throw new Error(`Invalid route ${level.id}`)
  return result
}
const levels = (['normal', 'hard'] as Difficulty[]).flatMap(difficulty =>
  Array.from({ length: 100 }, (_, i) => author(makeBoard(difficulty, i + 1))))
if (new Set(levels.map(l => JSON.stringify([l.tiles, l.ice, l.shells]))).size !== 200) throw new Error('Repeated artwork')
writeFileSync('src/game/advancedLevels.json', JSON.stringify(levels) + '\n')
console.log(`Generated ${levels.length} distinct stages with verified routes.`)
