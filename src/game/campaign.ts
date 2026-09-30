import type { JellyColor, JellyUnit } from './types'
import type { ShellGroup, TideLevel, Tile } from './tide'

export const CHAPTER_NAMES = [
  '珊瑚與初雪', '珍珠微光', '海草小徑', '水母花園', '月光淺灣',
  '星砂潮汐', '藍洞探險', '極光航線', '深海寶盒', '百道海光',
] as const

const STAGE_NAMES = [
  ['晨光珊瑚', '蜜桃海風', '小星星', '珍珠祕境', '彩虹水母', '初雪海灣', '冰晶之門', '暖流小憩', '雙生冰礁', '極光水晶'],
  ['珍珠來信', '側灣捷徑', '午後拾貝', '雙鎖潮汐', '冰海寶藏', '柔軟海浪', '彎彎月牙', '泡泡郵差', '淺灘花環', '晚安海星'],
  ['海草搖籃', '粉色小島', '藍色信箋', '彎月海灣', '珊瑚果實', '飛舞緞帶', '小魚午睡', '海風鈴鐺', '潮間花朵', '靜靜港口'],
  ['水母花冠', '星光花圃', '橘色珊瑚', '雙葉之間', '心形水波', '珍珠花苞', '彩色花瓣', '冰晶露珠', '海底庭院', '月下花園'],
  ['月光漂流', '銀色波紋', '海藍窗邊', '彎彎小路', '夜色泡泡', '星星入口', '月牙貝殼', '靜謐潮聲', '藍色許願', '滿月之海'],
  ['星砂信號', '雙星海峽', '沙灘筆記', '浪花迷宮', '珍珠星圖', '冰晶星河', '小小銀河', '潮汐雙門', '閃亮航道', '星砂寶島'],
  ['藍洞入口', '幽藍漣漪', '珊瑚洞穴', '海草之門', '雙層海灣', '珍珠洞窟', '冰藍石橋', '秘密海流', '深藍迴旋', '洞口曙光'],
  ['極光信件', '紫色晚霞', '冰晶光帶', '星光小棧', '彩虹前奏', '北方海風', '雙色極光', '水母星座', '月色返航', '極光之夜'],
  ['深海小盒', '珍珠鑰匙', '沉睡寶石', '海藍密語', '雙鎖禮物', '冰晶寶箱', '星砂地圖', '珊瑚王冠', '寶物返航', '閃耀秘境'],
  ['第一道光', '溫柔潮聲', '回憶珊瑚', '百色星願', '珍珠之歌', '冰海晨曦', '閃亮水母', '最後航道', '海洋花火', '百道海光'],
] as const

// A chapter alternates familiar shapes, one new variation and a calmer finish.
// The first twenty stages use larger jelly units and smaller source patterns.
const SOURCE_BY_CHAPTER = [
  [],
  [11, 13, 1, 2, 8, 1, 2, 8, 11, 13],
  [1, 2, 3, 8, 11, 13, 6, 2, 12, 4],
  [3, 8, 6, 11, 13, 7, 2, 12, 4, 5],
  [2, 3, 8, 12, 11, 6, 4, 13, 9, 5],
  [3, 7, 11, 12, 8, 9, 4, 14, 6, 10],
  [2, 9, 12, 7, 13, 14, 4, 11, 10, 5],
  [3, 10, 6, 13, 9, 11, 8, 14, 7, 12],
  [4, 11, 7, 12, 14, 10, 5, 15, 9, 13],
  [1, 8, 3, 11, 6, 14, 9, 12, 15, 10],
] as const

function moveIndex(index: number, size: number, turns: number, mirror: boolean): number {
  let row = Math.floor(index / size), col = index % size
  if (mirror) col = size - 1 - col
  for (let turn = 0; turn < turns; turn++) [row, col] = [col, size - 1 - row]
  return row * size + col
}

function recolor(color: Tile, shift: number): Tile {
  if (!color) return null
  const palette: JellyColor[] = ['yellow', 'pink', 'aqua', 'green', 'purple']
  return palette[(palette.indexOf(color) + shift) % palette.length]
}

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

function variant(id: number, source: TideLevel): TideLevel {
  const chapter = Math.floor((id - 1) / 10)
  const position = (id - 1) % 10
  const turns = (id + chapter) % 4
  const mirror = id % 3 === 0
  const shift = (chapter + position) % 5
  const tiles: Tile[] = Array(source.tiles.length).fill(null)
  const ice = Array<number>(source.ice.length).fill(0)
  source.tiles.forEach((tile, index) => {
    const moved = moveIndex(index, source.size, turns, mirror)
    tiles[moved] = recolor(tile, shift)
    ice[moved] = chapter < 2 ? 0 : source.ice[index]
  })
  const shells: ShellGroup[] = source.shells.map(group => ({
    id: group.id,
    pearls: group.pearls.map(index => moveIndex(index, source.size, turns, mirror)),
    cells: group.cells.map(index => moveIndex(index, source.size, turns, mirror)),
  }))
  const cap = chapter < 2 ? 18 : chapter < 4 ? 14 : chapter < 7 ? 12 : 10
  const lanes = makeLanes(id, tiles, ice, cap)
  const subtitle = shells.length
    ? '找到珍珠，讓貝殼慢慢打開。'
    : ice.some(Boolean) ? '先用同色泡泡破冰，再繼續前進。' : '順著海流，慢慢找出下一個顏色。'
  return {
    id, name: STAGE_NAMES[chapter][position], subtitle, icon: source.icon,
    size: source.size, tiles, ice, shells, lanes,
    // A relaxed replay target; the catalogue test verifies a route below it.
    par: lanes.flat().length + source.size * 2,
  }
}

function signature(level: TideLevel): string {
  return JSON.stringify([level.tiles, level.ice, level.shells])
}

export function buildCampaignLevels(original: TideLevel[], opening: TideLevel[]): TideLevel[] {
  const seen = new Set(opening.map(signature))
  return Array.from({ length: 85 }, (_, offset) => {
    const id = offset + 16
    const chapter = Math.floor((id - 1) / 10)
    const position = (id - 1) % 10
    const sourceId = SOURCE_BY_CHAPTER[chapter][position]
    let level = variant(id, original[sourceId - 1])
    if (seen.has(signature(level))) {
      // A small outer bubble makes a repeated symmetric pattern its own art.
      // It remains immediately reachable and receives matching ammo.
      const border = level.tiles.map((tile, index) => ({ tile, index })).filter(({ tile, index }) =>
        tile === null && (Math.floor(index / level.size) === 0 || Math.floor(index / level.size) === level.size - 1 || index % level.size === 0 || index % level.size === level.size - 1),
      )
      for (const { index } of border) {
        const tiles = [...level.tiles]
        tiles[index] = level.tiles.find((color): color is JellyColor => color !== null) ?? 'yellow'
        const lanes = makeLanes(id, tiles, level.ice, chapter < 2 ? 18 : chapter < 4 ? 14 : chapter < 7 ? 12 : 10)
        const candidate = { ...level, tiles, lanes, par: lanes.flat().length + level.size * 2 }
        if (!seen.has(signature(candidate))) { level = candidate; break }
      }
    }
    if (seen.has(signature(level))) throw new Error(`Duplicate stage art: ${id}`)
    seen.add(signature(level))
    return level
  })
}
