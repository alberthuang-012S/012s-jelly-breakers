import type { JellyColor, JellyUnit } from './types'
import { buildCampaignLevels, makeLanes } from './campaign'
import advancedLevels from './advancedLevels.json'
import type { ArtFamily } from './artwork'

export const COLORS: JellyColor[] = ['yellow', 'pink', 'aqua', 'green', 'purple']
export const COLOR_NAMES: Record<JellyColor, string> = { yellow: '檸檬', pink: '蜜桃', aqua: '海藍', green: '青蘋果', purple: '葡萄' }
export const HEX: Record<JellyColor, string> = { yellow: '#ffc947', pink: '#ff82ac', aqua: '#55d7e0', green: '#93d772', purple: '#b29aee' }
export type Tile = JellyColor | null
export type ShellGroup = { id: string; pearls: number[]; cells: number[] }
export type Difficulty = 'easy' | 'normal' | 'hard'
export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']
export const DIFFICULTY_NAMES: Record<Difficulty, string> = { easy: '簡單', normal: '普通', hard: '困難' }
export type TideLevel = { id: number; name: string; subtitle: string; icon: string; size: number; tiles: Tile[]; ice: number[]; shells: ShellGroup[]; lanes: JellyUnit[][]; par: number; difficulty?: Difficulty; poolSize?: number; solution?: string[]; family?: ArtFamily; brand?: '012S' | '2050'; puzzle?: 'dual-entry' | 'ice-gate' | 'split-pearls' }
export type Swimmer = JellyUnit & { age: number }
export type Shot = { id: string; color: JellyColor; from: [number, number]; target: number; sourceId: string; tick: number; cracked: boolean }
export type TideState = { tiles: Tile[]; ice: number[]; shells: ShellGroup[]; openedShells: string[]; lanes: JellyUnit[][]; pool: JellyUnit[]; poolSize: number; swimmers: Swimmer[]; tick: number; shots: Shot[]; effects: Shot[]; combo: number; bestCombo: number; lastHitTick: number; clearedColors: JellyColor[]; phase: 'playing' | 'won' | 'lost'; launched: number }
export const CAPACITY = 3
export const POOL_SIZE = 5
export const TICK_MS = 75

const charColor: Record<string, JellyColor> = { Y: 'yellow', P: 'pink', A: 'aqua', G: 'green', U: 'purple' }
function level(id: number, name: string, subtitle: string, icon: string, rows: string[], order: JellyColor[], shells: ShellGroup[] = []): TideLevel {
  if (rows.some(row => row.length !== rows.length || /[^YPAGUypagu.]/.test(row))) throw new Error(`Invalid stage ${id}`)
  const characters = rows.join('').split('')
  const tiles = characters.map(c => charColor[c.toUpperCase()] ?? null)
  const ice = characters.map(c => /[ypagu]/.test(c) ? 1 : 0)
  const lanes: JellyUnit[][] = [[], [], []]
  let index = 0
  for (const color of order) {
    let count = tiles.reduce((sum, tile, i) => sum + (tile === color ? 1 + ice[i] : 0), 0)
    while (count > 0) {
      // The opening journey has fewer swimmers to juggle. Later chapters
      // gradually return to smaller units and more dock decisions.
      const energy = Math.min(count, id === 1 ? 8 : 16)
      lanes[index % 3].push({ id: `${id}-${index++}`, color, energy })
      count -= energy
    }
  }
  // Later stages put an inner-layer color in front of part of the outer ammo.
  // Players can keep another lane moving or spend a dock to uncover it.
  if (id >= 3 && lanes[1].length > 1) [lanes[1][0], lanes[1][1]] = [lanes[1][1], lanes[1][0]]
  if (id >= 5 && lanes[2].length > 1) [lanes[2][0], lanes[2][1]] = [lanes[2][1], lanes[2][0]]
  for (const shell of shells) {
    if (!shell.pearls.length || !shell.cells.length || [...shell.pearls, ...shell.cells].some(i => !tiles[i]) || shell.pearls.some(i => shells.some(g => g.cells.includes(i)))) throw new Error(`Invalid shell in stage ${id}`)
  }
  return { id, name, subtitle, icon, size: rows.length, tiles, ice, shells, lanes, par: lanes.flat().length + Math.ceil(rows.length / 2) }
}

const ORIGINAL_LEVELS = [
  level(1, '初見珊瑚', '點一隻水母，讓色彩流動起來。', '✿', [
    '..YYYY..', '.YYPPYY.', 'YYPPPPYY', 'YPPAAPPY', 'YPPAAPPY', 'YYPPPPYY', '.YYPPYY.', '..YYYY..',
  ], ['yellow', 'pink', 'aqua']),
  level(2, '蜜桃海灣', '先打開外層，替夥伴找到出路。', '♥', [
    '.YY..YY.', 'YPPYYPPY', 'YPPPPPPY', 'YPGGGGPY', '.YPGGPY.', '..YPPY..', '...YY...', '........',
  ], ['yellow', 'pink', 'green']),
  level(3, '星星漂流', '三條隊伍，藏著下一步的答案。', '✦', [
    '....YY....', '...YPPY...', 'YYYYPPYYYY', 'YPPAAAAPPY', '.YPAAAAPY.', '..YPAAPY..', '.YPPGGPPY.', '.YPGYYGPY.', 'YPPY..YPPY', 'YYY....YYY',
  ], ['yellow', 'pink', 'aqua', 'green']),
  level(4, '珍珠祕境', '留一個空位，讓海流繼續前進。', '◈', [
    '..YYYYYY..', '.YPPPPPPY.', 'YPAAAAAAPY', 'YPAGGGGAPY', 'YPAGUUGAPY', 'YPAGUUGAPY', 'YPAGGGGAPY', 'YPAAAAAAPY', '.YPPPPPPY.', '..YYYYYY..',
  ], ['yellow', 'pink', 'aqua', 'green', 'purple']),
  level(5, '彩虹水母', '把整片海的顏色，都收進圖鑑。', '♧', [
    '...YYYYYY...', '..YPPPPPPY..', '.YPAAAAAAPY.', 'YPAGGGGGGAPY', 'YPAGUUUUGAPY', 'YPAGUUUUGAPY', 'YPAGGGGGGAPY', '.YPPPPPPPPY.', '..YYYYYYYY..', '..P.A..A.P..', '..P.A..A.P..', '..P......P..',
  ], ['yellow', 'pink', 'aqua', 'green', 'purple']),
  level(6, '初雪海灣', '❄ 同色泡泡先破冰，再命中一次才會消除。', '❄', [
    '..YyyY..', '.YPPPPY.', 'YPPaaPPY', 'YPAAAAPY', 'YPAAAAPY', 'YPPaaPPY', '.YPPPPY.', '..YyyY..',
  ], ['yellow', 'pink', 'aqua']),
  level(7, '冰晶之門', '先打開冰封入口，再派內層顏色的夥伴。', '◇', [
    '..YYyyYY..', '.YPPPPPPY.', 'YPAAAAAAPY', 'YPAGGGGAPY', 'yPaGUUGaPy', 'yPaGUUGaPy', 'YPAGGGGAPY', 'YPAAAAAAPY', '.YPPPPPPY.', '..YYyyYY..',
  ], ['yellow', 'pink', 'aqua', 'green', 'purple']),
  level(8, '暖流小憩', '放慢一點，讓小泡泡完成最後一擊。', '♥', [
    '.YY..YY.', 'YPPYYPPY', 'YPpPPpPY', 'YPGGGGPY', '.YPGGPY.', '..YPPY..', '...YY...', '........',
  ], ['yellow', 'pink', 'green']),
  level(9, '雙生冰礁', '兩座冰礁共享小棧，留空位給返航夥伴。', '◈', [
    '.Yyy..yyY.', 'YPPPYYPPPY', 'YPaPYYPaPY', 'YPGPYYPGPY', '.YpY..YpY.', '.YpY..YpY.', 'YPUPYYPUPY', 'YPAPYYPAPY', 'YPPPYYPPPY', '.YYY..YYY.',
  ], ['yellow', 'pink', 'aqua', 'green', 'purple']),
  level(10, '極光水晶', '破冰、返航、再出發。把整片極光帶回家。', '✧', [
    '....YyyY....', '...YPPPPY...', '..YPAAAAPY..', '.YPAggggAPY.', 'YPAGUUUUGAPY', 'yPaGUuuUGaPy', 'yPaGUuuUGaPy', 'YPAGUUUUGAPY', '.YPAggggAPY.', '..YPAAAAPY..', '...YPPPPY...', '....YyyY....',
  ], ['yellow', 'pink', 'aqua', 'green', 'purple']),
  level(11, '珍珠來信', '先消除標記 1 的珍珠，打開同號貝殼。', '◉', [
    '..YYYY..', '.YPPPPY.', 'YPP..PPY', 'YPAAAA.Y', 'YPAAAA.Y', 'YPP..PPY', '.YPPPPY.', '..YYYY..',
  ], ['yellow', 'pink', 'aqua'], [{ id: '1', pearls: [2, 5], cells: [27, 28, 35, 36] }]),
  level(12, '側灣捷徑', '從右側缺口切入，先找到藏在蜜桃色塊上的珍珠。', '⌁', [
    '..YYYYYY..', '.YPPPPPPY.', 'YPAAAAAAPY', 'YPAGGGGAPY', 'YPAUUUUA..', 'YPAUUUUA..', 'YPAGGGGAPY', 'YPAAAAAAPY', '.YPPPPPPY.', '..YYYYYY..',
  ], ['yellow', 'pink', 'aqua', 'green', 'purple'], [{ id: '1', pearls: [17, 87], cells: [44, 45, 54, 55] }]),
  level(13, '午後拾貝', '小小休息站：少派幾次，也能把珍珠帶回家。', '◡', [
    '........', '..YYYY..', '.YPPPPY.', 'YPAAAAPY', 'YPAAAAPY', '.YPPPPY.', '..YYYY..', '........',
  ], ['yellow', 'pink', 'aqua'], [{ id: '1', pearls: [10], cells: [27, 28, 35, 36] }]),
  level(14, '雙鎖潮汐', '兩組珍珠各開一扇門，觀察 1 與 2 的標記。', '◈', [
    '.YYY..YYY.', 'YPPPYYPPPY', 'YPAPYYPAPY', 'YPAPYYPAPY', '.YPY..YPY.', '.YPY..YPY.', 'YPGPYYPUPY', 'YPGPYYPUPY', 'YPPPYYPPPY', '.YYY..YYY.',
  ], ['yellow', 'pink', 'aqua', 'green', 'purple'], [{ id: '1', pearls: [1, 12], cells: [22, 32, 62, 72] }, { id: '2', pearls: [8, 17], cells: [27, 37, 67, 77] }]),
  level(15, '冰海寶藏', '冰裡的珍珠要兩次命中，貝殼打開後仍要留意冰層。', '✧', [
    '....YyyY....', '...YPPPPY...', '..YPAAAAPY..', '.YPAggggAPY.', 'YPAGUUUUGAPY', 'yPaGUuuUGaPy', 'yPaGUuuUGaPy', 'YPAGUUUUGAPY', '.YPAggggAPY.', '..YPAAAAPY..', '...YPPPPY...', '....YyyY....',
  ], ['yellow', 'pink', 'aqua', 'green', 'purple'], [{ id: '1', pearls: [5, 6], cells: [64, 65, 66, 67, 76, 77, 78, 79] }]),
]

const OPENING_REMAP: Record<number, Partial<Record<JellyColor, JellyColor>>> = {
  4: { green: 'aqua', purple: 'aqua' },
  5: { purple: 'green' },
  7: { purple: 'green' },
  9: { purple: 'green' },
  10: { green: 'aqua', purple: 'pink' },
  12: { green: 'aqua', purple: 'pink' },
  14: { green: 'aqua', purple: 'pink' },
  15: { green: 'aqua', purple: 'pink' },
}

function easeOpeningLevel(original: TideLevel): TideLevel {
  const remap = OPENING_REMAP[original.id]
  if (!remap && original.id !== 14 && original.id !== 15) return original
  const tiles = original.tiles.map(color => color ? remap?.[color] ?? color : null)
  const ice = original.id === 15 ? original.ice.map(() => 0) : [...original.ice]
  const shells = original.id === 14 ? original.shells.slice(0, 1) : original.shells
  const lanes = makeLanes(original.id, tiles, ice, 16)
  return {
    ...original, tiles, ice, shells, lanes,
    name: original.id === 14 ? '潮汐之門' : original.id === 15 ? '珍珠寶藏' : original.name,
    subtitle: original.id === 14 ? '找到一組珍珠，讓海流繼續前進。' : original.id === 15 ? '打開貝殼，收下這份小小的禮物。' : original.subtitle,
    par: lanes.flat().length + Math.ceil(original.size / 2) + 2,
  }
}

const OPENING_LEVELS = ORIGINAL_LEVELS.map(easeOpeningLevel)
export const TIDE_LEVELS = [...OPENING_LEVELS, ...buildCampaignLevels()]
export const ALL_LEVELS: TideLevel[] = [...TIDE_LEVELS, ...advancedLevels as TideLevel[]]
export function levelsFor(difficulty: Difficulty): TideLevel[] {
  return ALL_LEVELS.filter(level => (level.difficulty ?? 'easy') === difficulty)
}
export function stageNumber(level: TideLevel): number { return (level.id - 1) % 100 + 1 }

export function createTide(level: TideLevel): TideState {
  return { tiles: [...level.tiles], ice: [...level.ice], shells: level.shells.map(g => ({ ...g, pearls: [...g.pearls], cells: [...g.cells] })), openedShells: [], lanes: level.lanes.map(l => l.map(j => ({ ...j }))), pool: [], poolSize: level.poolSize ?? POOL_SIZE, swimmers: [], tick: 0, shots: [], effects: [], combo: 0, bestCombo: 0, lastHitTick: -100, clearedColors: [], phase: 'playing', launched: 0 }
}
export function isShellClosed(state: Pick<TideState, 'tiles'>, group: ShellGroup): boolean {
  return group.pearls.some(i => state.tiles[i] !== null)
}
export function isLocked(state: Pick<TideState, 'tiles' | 'shells'>, index: number): boolean {
  return state.shells.some(group => group.cells.includes(index) && isShellClosed(state, group))
}
export function orbitPoint(age: number, size: number): [number, number] {
  const progress = Math.max(0, Math.min(age / (size * 8), .99999)) * 4
  const side = Math.floor(progress), p = progress % 1
  const angle = Math.max(0, (p - .75) / .25) * Math.PI / 2
  const x = p < .75 ? 23 + p / .75 * 54 : 77 + 9 * Math.sin(angle)
  const y = p < .75 ? 14 : 23 - 9 * Math.cos(angle)
  return side === 0 ? [x, y] : side === 1 ? [100 - y, x] : side === 2 ? [100 - x, 100 - y] : [y, 100 - x]
}
// The first solid cube on an inward ray blocks every cube behind it.
export function rayTarget(tiles: Tile[], size: number, side: number, line: number): number | null {
  for (let depth = 0; depth < size; depth++) {
    const index = side === 0 ? depth * size + line : side === 1 ? line * size + size - 1 - depth : side === 2 ? (size - 1 - depth) * size + size - 1 - line : (size - 1 - line) * size + depth
    if (tiles[index]) return index
  }
  return null
}
export function canHit(state: TideState, color: JellyColor, size: number): boolean {
  for (let side = 0; side < 4; side++) for (let line = 0; line < size; line++) {
    const target = rayTarget(state.tiles, size, side, line)
    if (target !== null && state.tiles[target] === color && !isLocked(state, target)) return true
  }
  return false
}
export function launch(state: TideState, source: 'lane' | 'pool', index: number): TideState {
  if (state.phase !== 'playing' || state.swimmers.length >= CAPACITY) return state
  const jelly = source === 'lane' ? state.lanes[index]?.[0] : state.pool[index]
  if (!jelly) return state
  // Reserve a dock for every swimmer. This avoids ambiguous overflow while
  // other swimmers are still shooting, and always lets pool jellies relaunch.
  if (source === 'lane' && state.pool.length + state.swimmers.length >= state.poolSize) return state
  return {
    ...state,
    lanes: state.lanes.map((l, i) => source === 'lane' && i === index ? l.slice(1) : l),
    pool: source === 'pool' ? state.pool.filter((_, i) => i !== index) : state.pool,
    swimmers: [...state.swimmers, { ...jelly, age: Math.min(0, ...state.swimmers.map(j => j.age - 5)) }], launched: state.launched + 1,
  }
}
export function stepTide(state: TideState, size: number): TideState {
  if (state.phase !== 'playing') return state
  const next: TideState = { ...state, tiles: [...state.tiles], ice: [...state.ice], pool: [...state.pool], swimmers: [], tick: state.tick + 1, shots: [], effects: state.effects.filter(shot => state.tick - shot.tick < 7), clearedColors: [], openedShells: [] }
  for (const original of state.swimmers) {
    const jelly = { ...original }
    if (jelly.age < 0) { next.swimmers.push({ ...jelly, age: jelly.age + 1 }); continue }
    const ray = Math.floor(jelly.age / 2)
    const target = rayTarget(next.tiles, size, Math.floor(ray / size), ray % size)
    if (target !== null && next.tiles[target] === jelly.color && !isLocked(next, target)) {
      const cracked = next.ice[target] > 0
      if (cracked) next.ice[target]--
      else next.tiles[target] = null
      jelly.energy--
      next.shots.push({ id: `${state.tick}-${jelly.id}`, color: jelly.color, from: orbitPoint(jelly.age, size), target, sourceId: jelly.id, tick: next.tick, cracked })
      next.combo = next.tick - next.lastHitTick <= 12 ? next.combo + 1 : 1
      next.lastHitTick = next.tick
      next.bestCombo = Math.max(next.bestCombo, next.combo)
      if (!cracked && !next.tiles.includes(jelly.color)) next.clearedColors.push(jelly.color)
    }
    jelly.age++
    if (jelly.energy <= 0) continue
    if (jelly.age >= size * 8) next.pool.push({ id: jelly.id, color: jelly.color, energy: jelly.energy })
    else next.swimmers.push(jelly)
  }
  next.effects.push(...next.shots)
  next.openedShells = state.shells.filter(group => isShellClosed(state, group) && !isShellClosed(next, group)).map(group => group.id)
  if (next.tick - next.lastHitTick > 12) next.combo = 0
  if (next.tiles.every(t => t === null)) next.phase = 'won'
  else if (!next.swimmers.length) {
    const usefulPool = next.pool.some(j => canHit(next, j.color, size))
    const canOpenQueue = next.pool.length < next.poolSize && next.lanes.some(l => l.length)
    if (!usefulPool && !canOpenQueue) next.phase = 'lost'
  }
  return next
}

// A local ordering strategy used by catalogue validation, not a player feature.
export function routeCandidate(state: TideState, size: number): { source: 'lane' | 'pool'; index: number } | null {
  const pool = state.pool.findIndex(j => canHit(state, j.color, size))
  if (pool >= 0) return { source: 'pool', index: pool }
  const lane = state.lanes.findIndex(l => l[0] && canHit(state, l[0].color, size))
  if (lane >= 0 && state.pool.length + state.swimmers.length < state.poolSize) return { source: 'lane', index: lane }
  if (!state.swimmers.length && state.pool.length < state.poolSize) {
    const blockedLane = state.lanes.findIndex(l => l.length > 0)
    if (blockedLane >= 0) return { source: 'lane', index: blockedLane }
  }
  return null
}
