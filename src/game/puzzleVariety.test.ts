import { expect, it } from 'vitest'
import { COLORS, canHit, createTide, levelsFor, stageNumber } from './tide'

it('introduces three planning variations gradually while keeping brand and rest stages calmer', () => {
  for (const difficulty of ['normal', 'hard'] as const) {
    const levels = levelsFor(difficulty)
    expect(levels.slice(0, difficulty === 'hard' ? 10 : 20).every(l => !l.puzzle)).toBe(true)
    for (const puzzle of ['dual-entry', 'ice-gate', 'split-pearls']) {
      expect(levels.filter(l => l.puzzle === puzzle).length).toBeGreaterThanOrEqual(10)
    }
    for (const level of levels) {
      if ([4, 8, 10].includes((stageNumber(level) - 1) % 10 + 1)) expect(level.puzzle).toBeUndefined()
      if (level.puzzle === 'dual-entry') {
        const state = createTide(level)
        expect(COLORS.filter(color => canHit(state, color, level.size))).toHaveLength(2)
        expect(COLORS.some(color => level.tiles.includes(color) && !canHit(state, color, level.size))).toBe(true)
      }
      if (level.puzzle === 'ice-gate') {
        expect(level.ice.some(Boolean)).toBe(true)
        for (const shell of level.shells) expect(shell.pearls.every(index => level.ice[index] === 1)).toBe(true)
      }
      if (level.puzzle === 'split-pearls' && level.shells.length) {
        expect(level.shells[0].pearls).toHaveLength(3)
        expect(new Set(level.shells[0].pearls).size).toBe(3)
      }
    }
  }
})
