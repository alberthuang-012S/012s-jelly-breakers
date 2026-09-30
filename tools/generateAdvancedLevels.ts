// Run: node tools/generateAdvancedLevels.mjs
// Authoring only: the browser loads the verified catalogue, never runs this simulation.
import { writeFileSync } from 'node:fs'
import { COLORS, canHit, createTide, launch, stepTide } from '../src/game/tide'
import type { Difficulty, TideLevel, TideState } from '../src/game/tide'
import type { JellyUnit } from '../src/game/types'

const motifs = ['珊瑚圓環', '菱晶之海', '海藍方舟', '星形潮灣', '花瓣祕境', '雙翼海礁', '珍珠穹頂', '月光海扇', '深海羅盤', '海光王冠']
function settle(state: TideState, size: number): TideState {
  for (let t = 0; state.swimmers.length && state.phase === 'playing' && t < size * 8 + 16; t++) state = stepTide(state, size)
  return state
}
function makeBoard(difficulty: Difficulty, number: number): TideLevel {
  const hard = difficulty === 'hard', chapter = Math.floor((number - 1) / 10), position = (number - 1) % 10
  // Chapter finales combine mechanics; positions 4 and 8 provide breathing room.
  const calm = position === 3 || position === 7
  const size = hard ? number <= 3 ? 10 : number <= 10 ? 12 : 14 : 12, id = (hard ? 200 : 100) + number
  const palette = COLORS.map((_, i) => COLORS[(i + chapter + position) % 5])
  const tiles: TideLevel['tiles'] = [], ice: number[] = [], depths: number[] = []
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const x = (col - (size - 1) / 2) / (size / 2) + (position % 3 - 1) * .035,
      y = (row - (size - 1) / 2) / (size / 2) + (Math.floor(position / 3) - 1) * .025
    const angle = Math.atan2(y, x), circle = Math.hypot(x, y)
    const metrics = [circle, (Math.abs(x) + Math.abs(y)) / 1.2, Math.max(Math.abs(x) * 1.08, Math.abs(y) * .92),
      circle / (1 + .13 * Math.cos(5 * angle)), circle / (1 + .12 * Math.cos(4 * angle)),
      Math.hypot(x * .85, y * 1.15), Math.hypot(x * 1.12, y * .86),
      Math.max(Math.abs(x), Math.abs(y)) + .15 * Math.abs(x * y),
      circle / (1 + .1 * Math.cos(8 * angle)), circle / (1 + .12 * Math.sin(3 * angle))]
    const radius = metrics[chapter] / (.89 + position * .012)
    const depth = radius > 1 ? -1 : radius > .84 ? 0 : radius > .66 ? 1 : radius > .46 ? 2 : radius > .23 ? 3 : 4
    depths.push(depth)
    // Later chapters weave different colors into the middle bands, changing entrances.
    const weave = chapter >= 2 && depth === 2 && (row + col + position) % (hard ? 3 : 5) === 0
    tiles.push(depth < 0 ? null : palette[hard && number <= 3 && depth === 4 ? 3 : weave ? 3 : depth])
    const iceEnabled = hard ? number >= 4 : chapter >= 2
    const iceSpacing = hard && number <= 10 ? 9 : calm ? 9 : hard ? 4 : 7
    ice.push(depth >= 0 && iceEnabled && (row * 3 + col + number) % iceSpacing === 0 ? 1 : 0)
  }
  const groupCount = hard ? number <= 6 ? 0 : number <= 10 ? 1 : (calm ? 2 : chapter >= 4 ? 3 : 2) : chapter < 2 ? 0 : chapter < 6 || calm ? 1 : 2
  const shells: TideLevel['shells'] = []
  for (let group = 0; group < groupCount; group++) {
    const keys = depths.flatMap((depth, index) => depth === group + 1 ? [index] : [])
    const cells = depths.flatMap((depth, index) => depth === group + 2 ? [index] : [])
    // Keys in a later group may be inside an earlier shell: dependencies always go inward.
    const first = (number * 3 + group * 7) % keys.length
    const pearls = [...new Set([keys[first], keys[(first + Math.floor(keys.length / 2)) % keys.length]])]
    shells.push({ id: String(group + 1), pearls, cells })
  }
  return { id, difficulty, poolSize: hard ? 4 : 5, name: `${motifs[chapter]}・${position + 1}`,
    subtitle: hard ? '先想好解鎖順序，替返航夥伴保留空位。' : '觀察三條隊伍，留空位給還沒露出的顏色。',
    icon: hard ? '✧' : '◈', size, tiles, ice, shells, lanes: [[], [], []], par: 0 }
}
function author(level: TideLevel): TideLevel {
  const number = (level.id - 1) % 100 + 1, chapter = Math.floor((number - 1) / 10)
  const hard = level.difficulty === 'hard', calm = [3, 7].includes((number - 1) % 10)
  const cap = hard ? (calm ? 10 : chapter < 4 ? 8 : 6) : (calm ? 12 : chapter < 4 ? 12 : chapter < 7 ? 10 : 8)
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
  const forcedCount = hard && number > 3 && !calm ? 2 : 1
  if (hidden.length < level.poolSize!) throw new Error(`Insufficient planning choices ${level.id}`)
  // One lane offers initially blocked inner colors. Overfilling it is a real losing route.
  // The other two carry the reference order; selected inner units need temporary docks.
  const pendingCount = level.poolSize! - forcedCount
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
