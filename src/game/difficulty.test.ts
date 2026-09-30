import { describe, expect, it } from 'vitest'
import { ALL_LEVELS, COLORS, DIFFICULTIES, TIDE_LEVELS, canHit, createTide, launch, levelsFor, stageNumber, stepTide } from './tide'
import type { TideState } from './tide'

function settle(state: TideState, size: number) {
  for (let t = 0; state.swimmers.length && state.phase === 'playing' && t < size * 8 + 16; t++) state = stepTide(state, size)
  return state
}
describe('three independent hundred-stage journeys', () => {
  it('keeps the original easy catalogue and gives every journey independent IDs', () => {
    expect(ALL_LEVELS).toHaveLength(300)
    expect(levelsFor('easy')).toEqual(TIDE_LEVELS)
    expect(ALL_LEVELS.map(l => l.id)).toEqual(Array.from({ length: 300 }, (_, i) => i + 1))
    for (const difficulty of DIFFICULTIES) {
      const levels = levelsFor(difficulty)
      expect(levels).toHaveLength(100)
      expect(levels.map(stageNumber)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1))
      expect(new Set(levels.map(l => l.name)).size).toBe(100)
    }
    expect(new Set(ALL_LEVELS.map(l => JSON.stringify([l.tiles, l.ice, l.shells]))).size).toBe(300)
  })
  for (const level of ALL_LEVELS.slice(100)) {
    it(`${level.difficulty} ${stageNumber(level)} has balanced ammo, acyclic locks and a winning route`, () => {
      const units = level.lanes.flat()
      expect(new Set(units.map(j => j.id)).size).toBe(units.length)
      expect(level.tiles.length).toBe(level.size ** 2)
      expect(level.ice.length).toBe(level.tiles.length)
      for (const color of COLORS) {
        const required = level.tiles.reduce((sum, c, i) => sum + (c === color ? 1 + level.ice[i] : 0), 0)
        expect(units.filter(j => j.color === color).reduce((sum, j) => sum + j.energy, 0)).toBe(required)
      }
      for (const group of level.shells) {
        expect(group.pearls.length).toBeGreaterThan(0)
        expect(group.cells.length).toBeGreaterThan(0)
        expect([...group.pearls, ...group.cells].every(i => level.tiles[i] !== null)).toBe(true)
        expect(group.pearls.every(i => !group.cells.includes(i))).toBe(true)
      }
      let state = createTide(level)
      for (const id of level.solution!) {
        const pool = state.pool.findIndex(j => j.id === id)
        const lane = state.lanes.findIndex(l => l[0]?.id === id)
        expect(pool >= 0 || lane >= 0, `unit ${id} accessible`).toBe(true)
        const next = launch(state, pool >= 0 ? 'pool' : 'lane', pool >= 0 ? pool : lane)
        expect(next).not.toBe(state)
        state = settle(next, level.size)
        expect(state.pool.length + state.swimmers.length).toBeLessThanOrEqual(state.poolSize)
      }
      expect(state.phase).toBe('won')
      expect(state.launched).toBeLessThanOrEqual(level.par)
      expect([...state.pool, ...state.lanes.flat(), ...state.swimmers]).toHaveLength(0)
    })
    it(`${level.difficulty} ${stageNumber(level)} can fail from filling docks with blocked colors`, () => {
      let state = createTide(level)
      const original = structuredClone(state)
      for (let i = 0; i < state.poolSize; i++) {
        const lane = state.lanes.findIndex(l => l[0] && !canHit(state, l[0].color, level.size))
        expect(lane).toBeGreaterThanOrEqual(0)
        const previous = state
        state = launch(state, 'lane', lane)
        // In-flight passengers never trigger a premature failure.
        expect(stepTide(state, level.size).phase).toBe('playing')
        state = settle(state, level.size)
        expect(state.phase).toBe(i === state.poolSize - 1 ? 'lost' : 'playing')
        if (state.phase === 'lost') {
          expect(previous.phase).toBe('playing') // Undo can restore this launch snapshot.
          expect(previous.pool.length).toBe(state.poolSize - 1)
        }
      }
      expect(state.tiles).toEqual(original.tiles)
      expect(state.pool).toHaveLength(state.poolSize)
    })
  }
  it('enforces hard-mode reservations while allowing a full dock to relaunch', () => {
    const state = createTide(levelsFor('hard')[0])
    expect(state.poolSize).toBe(4)
    state.pool = Array.from({ length: 3 }, (_, i) => ({ id: `p${i}`, color: 'purple', energy: 1 }))
    const next = launch(state, 'lane', 0)
    expect(next.swimmers).toHaveLength(1)
    expect(launch(next, 'lane', 1)).toBe(next)
    expect(launch(next, 'pool', 0).swimmers).toHaveLength(2)
    state.pool.push({ id: 'p3', color: 'purple', energy: 1 })
    expect(launch(state, 'pool', 0).pool).toHaveLength(3)
  })
  it('introduces hard-mode mechanics in stages while keeping four return slots', () => {
    const hard = levelsFor('hard')
    for (const level of hard.slice(0, 3)) {
      expect(level.poolSize).toBe(4)
      expect(level.size).toBe(10)
      expect(level.ice.some(Boolean)).toBe(false)
      expect(level.shells).toHaveLength(0)
      expect(new Set(level.tiles.filter(Boolean)).size).toBeLessThanOrEqual(4)
    }
    for (const level of hard.slice(3, 6)) {
      expect(level.ice.some(Boolean)).toBe(true)
      expect(level.shells).toHaveLength(0)
    }
    for (const level of hard.slice(6, 10)) expect(level.shells).toHaveLength(1)
    expect(hard[10].size).toBe(14)
    expect(hard[10].shells).toHaveLength(2)
  })
})
