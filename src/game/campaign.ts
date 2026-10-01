import type { JellyColor, JellyUnit } from './types'
import type { ShellGroup, TideLevel, Tile } from './tide'
import { artworkDepths, colorArtwork, makeArtwork } from './artwork'
import type { Artwork } from './artwork'

export const CHAPTER_NAMES = [
  '珊瑚與初雪', '珍珠微光', '海草小徑', '水母花園', '月光淺灣',
  '星砂潮汐', '藍洞探險', '極光航線', '深海寶盒', '2050 未來之海',
] as const

export function makeLanes(id: number, tiles: Tile[], ice: number[], cap: number): JellyUnit[][] {
  const lanes: JellyUnit[][] = [[], [], []]
  const colors: JellyColor[] = ['yellow', 'pink', 'aqua', 'green', 'purple']
  let unitIndex = 0
  for (const color of colors) {
    let count = tiles.reduce((sum, tile, index) => sum + (tile === color ? 1 + ice[index] : 0), 0)
    while (count > 0) {
      const energy = Math.min(cap, count)
      lanes[unitIndex % 3].push({ id: `${id}-${unitIndex}`, color, energy })
      unitIndex++
      count -= energy
    }
  }
  return lanes
}

export function artworkShells(art: Artwork, depths: number[], desired: number): ShellGroup[] {
  if (desired === 0) return []
  if (art.brand && art.glyphs) {
    // A zero supplies reachable keys; opening it releases the last character.
    const keys = depths.flatMap((d, i) => d === 0 && art.glyphs![i] === (art.brand === '012S' ? 0 : 1) ? [i] : [])
    const cells = art.glyphs.flatMap((glyph, i) => glyph === 3 ? [i] : [])
    return [{ id: '1', pearls: [keys[0], keys[keys.length - 1]], cells }]
  }
  return Array.from({ length: Math.min(desired, Math.max(...depths)) }, (_, group) => {
    const keys = depths.flatMap((d, i) => d === group ? [i] : [])
    const cells = depths.flatMap((d, i) => d === group + 1 ? [i] : [])
    return { id: String(group + 1), pearls: [keys[0], keys[keys.length - 1]], cells }
  })
}

export function buildCampaignLevels(): TideLevel[] {
  return Array.from({ length: 85 }, (_, offset) => {
    const id = offset + 16, chapter = Math.floor((id - 1) / 10)
    const size = 12, art = makeArtwork(id, size), depths = artworkDepths(art.mask, size)
    const colors: JellyColor[] = ['yellow', 'pink', 'aqua', 'green', 'purple']
    const palette = chapter < 2 ? colors.slice(0, 4) : colors
    const tiles = colorArtwork(art, depths, palette, size)
    const ice = depths.map((d, i) => d >= 0 && chapter >= 2 && (i + id * 3) % 11 === 0 ? 1 : 0)
    const shells = artworkShells(art, depths, id % 3 === 0 || art.brand ? 1 : 0)
    const lanes = makeLanes(id, tiles, ice, chapter < 2 ? 18 : chapter < 4 ? 14 : chapter < 7 ? 12 : 10)
    return {
      id, name: art.name, family: art.family, brand: art.brand,
      subtitle: art.brand ? `${art.brand} 海洋紀念：打開字元，把品牌收進圖鑑。`
        : shells.length ? '找到珍珠，沿著不同輪廓打開貝殼。'
        : ice.some(Boolean) ? '沿著圖案的缺口，先破冰再開路。' : '觀察輪廓與留白，找出下一條海洋航線。',
      icon: art.brand ? '✦' : art.family === 'creature' ? '♡' : art.family === 'negative' ? '☾' : '⌁',
      size, tiles, ice, shells, lanes, par: lanes.flat().length + size * 2,
    }
  })
}
