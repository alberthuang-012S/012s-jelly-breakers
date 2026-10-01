import { describe, expect, it } from 'vitest'
import { makeArtwork } from './artwork'
import { DIFFICULTIES, levelsFor, stageNumber } from './tide'

// Ignore color, ice, shells, rotations and reflections when comparing silhouettes.
function silhouette(mask: boolean[], size: number): string {
  const variants: string[] = []
  for (const mirror of [false, true]) for (let turns = 0; turns < 4; turns++) {
    const rotated = Array<number>(mask.length).fill(0)
    mask.forEach((alive, index) => {
      let row = Math.floor(index / size), col = index % size
      if (mirror) col = size - 1 - col
      for (let t = 0; t < turns; t++) [row, col] = [col, size - 1 - row]
      rotated[row * size + col] = Number(alive)
    })
    variants.push(rotated.join(''))
  }
  return variants.sort()[0]
}

describe('recognizable and varied ocean artwork', () => {
  it('has one hundred distinct silhouettes, even after ignoring color and orientation', () => {
    const art = Array.from({ length: 100 }, (_, i) => makeArtwork(i + 1, 12))
    expect(new Set(art.map(a => silhouette(a.mask, 12))).size).toBe(100)
    for (const pattern of art) {
      expect(pattern.mask.filter(Boolean).length).toBeGreaterThan(20)
      expect(pattern.mask.filter(Boolean).length).toBeLessThan(120)
    }
  })
  it('mixes silhouettes in every chapter and limits branding to stages 50 and 100', () => {
    for (let chapter = 0; chapter < 10; chapter++) {
      const families = Array.from({ length: 10 }, (_, slot) => makeArtwork(chapter * 10 + slot + 1, 12).family)
      expect(families).toEqual(['creature', 'creature', 'creature', 'object', 'object', 'asymmetric', 'asymmetric', 'negative', 'negative', chapter === 4 || chapter === 9 ? 'brand' : 'object'])
    }
    for (const difficulty of DIFFICULTIES) {
      const brands = levelsFor(difficulty).filter(level => level.brand)
      expect(brands.map(level => [stageNumber(level), level.brand])).toEqual([[50, '012S'], [100, '2050']])
    }
  })
  it('keeps every letter upright, separated, color-distinct and hollow zeros intact', () => {
    const letters: Record<string, string[]> = {
      '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
      '2': ['111', '001', '111', '100', '111'], '5': ['111', '100', '111', '001', '111'],
      S: ['011', '100', '111', '001', '110'],
    }
    for (const difficulty of DIFFICULTIES) for (const level of levelsFor(difficulty).filter(l => l.brand)) {
      const art = makeArtwork(stageNumber(level), level.size)
      const left = Math.floor((level.size - 7) / 2), top = Math.floor((level.size - 11) / 2)
      const colors = new Set()
      for (let glyph = 0; glyph < 4; glyph++) {
        const x = left + glyph % 2 * 4, y = top + Math.floor(glyph / 2) * 6
        const expected = letters[level.brand![glyph]]
        const colorCells = level.tiles.filter((_, i) => art.glyphs![i] === glyph)
        expect(new Set(colorCells).size).toBe(1)
        colors.add(colorCells[0])
        for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
          expect(Boolean(level.tiles[(y + r) * level.size + x + c])).toBe(expected[r][c] === '1')
        }
      }
      expect(colors.size).toBe(4)
      expect(level.tiles.filter((_, i) => !art.mask[i]).every(tile => tile === null)).toBe(true)
    }
  })
})
