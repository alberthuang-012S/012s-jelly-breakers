import type { JellyColor } from './types'
import type { Tile } from './tide'

export type ArtFamily = 'creature' | 'object' | 'asymmetric' | 'negative' | 'brand'
export type Artwork = { name: string; family: ArtFamily; mask: boolean[]; glyphs?: number[]; brand?: '012S' | '2050' }

const CREATURES = ['turtle', 'ray', 'whale', 'crab', 'octopus', 'seahorse', 'fish', 'dolphin', 'squid', 'jelly'] as const
const OBJECTS = ['ship', 'anchor', 'submarine', 'rocket', 'satellite', 'city', 'treasure'] as const
const ASYMMETRIC = ['reef', 'kelp', 'wave', 'ribbon', 'comet', 'key', 'eel'] as const
const NEGATIVE = ['crescent', 'ring', 'window', 'arch', 'stars', 'islands', 'shell'] as const
const FINALES = ['lighthouse', 'balloon', 'compass', 'clock', 'flower', 'bridge', 'crown', 'lantern'] as const
type Motif = typeof CREATURES[number] | typeof OBJECTS[number] | typeof ASYMMETRIC[number] | typeof NEGATIVE[number] | typeof FINALES[number]
const NAMES: Record<Motif, string> = {
  turtle: '海龜', ray: '魟魚', whale: '鯨魚', crab: '螃蟹', octopus: '章魚', seahorse: '海馬',
  fish: '熱帶魚', dolphin: '海豚', squid: '烏賊', jelly: '水母', ship: '帆船', anchor: '船錨',
  submarine: '潛水艇', rocket: '太空船', satellite: '衛星', city: '未來城市', treasure: '寶箱',
  reef: '珊瑚枝', kelp: '海草', wave: '浪花', ribbon: '海風緞帶', comet: '彗星', key: '珍珠鑰匙',
  eel: '海鰻', crescent: '月牙', ring: '環形星球', window: '海藍窗景', arch: '海底拱門',
  stars: '星群', islands: '群島', shell: '扇貝',
  lighthouse: '海岸燈塔', balloon: '熱氣球', compass: '航海羅盤', clock: '潮汐時鐘',
  flower: '海洋花冠', bridge: '海灣石橋', crown: '珊瑚王冠', lantern: '星光燈籠',
}
const MOODS = ['晨光', '潮汐', '星夜']
const GLYPHS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '5': ['111', '100', '111', '001', '111'],
  S: ['011', '100', '111', '001', '110'],
}

// Pixel-native artwork: anatomy, silhouettes and negative space change between
// variants. Lettering is stamped separately and is never rotated or mirrored.
export function makeArtwork(number: number, size: number): Artwork {
  const chapter = Math.floor((number - 1) / 10), slot = (number - 1) % 10
  const mask = Array<boolean>(size ** 2).fill(false)
  const glyphs = Array<number>(size ** 2).fill(-1)
  const paint = (test: (x: number, y: number) => boolean, fill = true) => {
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      // Shapes occupy the same design space at every supported board size.
      const x = c * 11 / (size - 1), y = r * 11 / (size - 1)
      if (test(x, y)) mask[r * size + c] = fill
    }
  }
  const rect = (x: number, y: number, w: number, h: number, fill = true) => paint((px, py) => px >= x - .35 && px <= x + w - .65 && py >= y - .35 && py <= y + h - .65, fill)
  const ellipse = (x: number, y: number, rx: number, ry: number, fill = true) => paint((px, py) => ((px - x) / rx) ** 2 + ((py - y) / ry) ** 2 <= 1.08, fill)
  const line = (x1: number, y1: number, x2: number, y2: number, width = 1) => paint((x, y) => {
    const dx = x2 - x1, dy = y2 - y1
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)))
    return Math.hypot(x - x1 - t * dx, y - y1 - t * dy) <= width / 2 + .15
  })
  const polygon = (points: [number, number][]) => paint((x, y) => {
    let inside = false
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i], [xj, yj] = points[j]
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
    }
    return inside
  })
  if (number === 50 || number === 100) {
    const brand = chapter % 2 === 0 ? '012S' : '2050'
    const left = Math.floor((size - 7) / 2), top = Math.floor((size - 11) / 2)
    for (let letter = 0; letter < 4; letter++) {
      GLYPHS[brand[letter]].forEach((row, r) => row.split('').forEach((pixel, c) => {
        if (pixel === '1') {
          const index = (top + Math.floor(letter / 2) * 6 + r) * size + left + (letter % 2) * 4 + c
          mask[index] = true
          glyphs[index] = letter
        }
      }))
    }
    // Chapter ornaments stay outside the 7 × 11 lettering rectangle.
    const accents = [
      [[0, 2], [11, 9]], [[0, 0], [0, 11], [11, 0], [11, 11]],
      [[0, 4], [0, 5], [11, 6], [11, 7]], [[0, 1], [0, 2], [11, 8], [11, 9]],
      [[0, 5], [11, 5], [0, 6], [11, 6]], [[0, 0], [0, 5], [11, 6], [11, 11]],
      [[0, 2], [0, 8], [11, 3], [11, 9]], [[0, 3], [0, 4], [0, 8], [11, 2], [11, 7], [11, 8]],
      [[0, 1], [0, 5], [0, 9], [11, 2], [11, 6], [11, 10]],
      [[0, 0], [0, 3], [0, 7], [0, 11], [11, 0], [11, 4], [11, 8], [11, 11]],
    ]
    for (const [x, y] of accents[chapter]) mask[Math.round(y * (size - 1) / 11) * size + Math.round(x * (size - 1) / 11)] = true
    return { name: `${brand}・${chapter === 9 ? '未來之海' : `海洋紀念 ${chapter + 1}`}`, family: 'brand', brand, mask, glyphs }
  }
  const family: ArtFamily = slot < 3 ? 'creature' : slot < 5 || slot === 9 ? 'object' : slot < 7 ? 'asymmetric' : 'negative'
  const bank = family === 'creature' ? CREATURES : family === 'object' ? OBJECTS : family === 'asymmetric' ? ASYMMETRIC : NEGATIVE
  const ordinal = chapter * (family === 'creature' ? 3 : 2) + (family === 'creature' ? slot : family === 'object' ? slot - 3 : family === 'asymmetric' ? slot - 5 : slot - 7)
  const finaleIndex = chapter < 4 ? chapter : chapter - 1
  const motif: Motif = slot === 9 ? FINALES[finaleIndex] : bank[ordinal % bank.length]
  const v = slot === 9 ? 0 : Math.floor(ordinal / bank.length)
  switch (motif) {
    case 'turtle':
      ellipse(5, 6, 3 + v * .25, 3); ellipse(5 + v, 1.5, 1.2, 1.3)
      line(2, 4, 0, 3 + v, 2); line(8, 4, 10, 2 + v, 2)
      line(3, 8, 1, 10, 2); line(7, 8, 9 + v, 10, 2); line(5, 8, 5, 11)
      break
    case 'ray':
      polygon([[5, 1], [11, 5 + v], [8, 8], [5, 7], [1, 8 - v], [0, 5]])
      line(5, 6, 6 + v, 11, 1.4); rect(4, 1, 2, 3)
      break
    case 'whale':
      ellipse(5, 6, 4, 2.5 + v * .25); polygon([[8, 5], [11, 3 - v], [10, 6], [11, 8], [8, 7]])
      line(4, 7, 3 - v, 10, 2); line(3, 3, 3, 1, 1); line(3, 1, 1, v, 1); line(3, 1, 5, v, 1)
      break
    case 'crab':
      ellipse(5.5, 6, 3.1, 2 + v * .3)
      line(3, 5, 1, 2 + v, 1.5); line(8, 5, 10, 2, 1.5)
      ellipse(1, 1.5 + v, 1.3, 1.2); ellipse(10, 1.5, 1.3, 1.2)
      rect(1, 0 + v, 1, 2, false); rect(10, 0, 1, 2, false)
      for (let i = 0; i < 3; i++) { line(3, 6 + i, 0, 6 + i + v / 2); line(8, 6 + i, 11, 7 + i) }
      break
    case 'octopus':
      ellipse(5.5, 3.5, 3 + v * .3, 3)
      for (let i = 0; i < 4; i++) { const x = 2 + i * 2; line(x, 5, x, 8 + (i + v) % 2, 1.6); line(x, 8 + (i + v) % 2, x + (i < 2 ? -1 : 1), 10, 1.3) }
      break
    case 'seahorse':
      ellipse(6, 2, 2.2, 1.8); rect(7, 2, 4, 1 + v / 2)
      ellipse(5, 5.5, 2, 3); line(4, 4, 2, 5 + v, 2); line(5, 8, 7, 10, 1.6)
      line(7, 10, 3, 10, 1.5); line(3, 10, 3, 8 - v / 2, 1.5); rect(5, 0, 1 + v, 2)
      break
    case 'fish':
      ellipse(6, 5.5, 3.5 - v * .25, 2.6 + v * .4)
      polygon([[3, 5], [0, 2 + v], [0, 9 - v], [3, 6]])
      polygon([[4, 4], [5 + v, 0], [8, 4]]); polygon([[5, 7], [6 - v, 10], [8, 7]])
      break
    case 'dolphin':
      polygon([[0, 5], [3, 2], [7, 2], [9, 4], [11, 5], [8, 6], [5, 5], [2, 6]])
      polygon([[4, 3], [5 + v, 0], [7, 3]]); polygon([[5, 5], [4, 9], [7, 6]])
      polygon([[1, 5], [0, 8 + v], [3, 7], [3, 5]]); line(9, 8 + v, 10, 10)
      break
    case 'squid':
      polygon([[5.5, 0], [9 - v / 2, 5], [8, 7], [3, 7], [2 + v / 2, 5]])
      for (let i = 0; i < 4; i++) line(3 + i * 1.7, 6, 2 + i * 2.3, 10 - (i + v) % 3, 1.3)
      break
    case 'jelly':
      ellipse(5.5, 4, 4 + v * .2, 3); rect(0, 5, 12, 7, false)
      rect(2, 5, 8, 1); for (let i = 0; i < 4; i++) line(2 + i * 2, 5, 2 + i * 2 + (i % 2 ? 1 : -1), 9 + (i + v) % 3, 1.4)
      break
    case 'ship':
      polygon([[0, 8], [11, 8], [8 - v, 11], [3, 11]]); line(5, 0, 5, 8)
      polygon([[4, 1], [0, 6 + v / 2], [4, 6 + v / 2]]); polygon([[6, 1 + v], [11, 7], [6, 7]])
      break
    case 'anchor':
      ellipse(5.5, 1.5, 1.7 + v * .3, 1.6); ellipse(5.5, 1.5, .55, .6, false)
      rect(5, 3, 2, 7); rect(2 - v / 2, 4, 8 + v, 1.5)
      line(5.5, 10, 1, 7, 2); line(5.5, 10, 10, 7 - v / 2, 2); rect(0, 5, 2, 3); rect(9, 5 - v, 2, 3)
      break
    case 'submarine':
      ellipse(5, 6, 4.5, 2.5 + v * .3); rect(4 + v, 2, 2, 3); rect(5 + v, 2, 3, 1)
      rect(10, 4, 1.5, 5); line(0, 8, 2, 10); ellipse(3, 6, .7, .7, false); ellipse(6, 6, .7, .7, false)
      break
    case 'rocket':
      polygon([[5.5, 0], [8, 4], [8, 8], [3, 8], [3, 4]])
      polygon([[3, 5], [0, 9 - v], [3, 8]]); polygon([[8, 5], [11, 9], [8, 8]])
      rect(4, 9, 1.5, 2 - v / 2); rect(6, 9, 1.5, 1 + v / 2); ellipse(5.5, 4, .75, .75, false)
      break
    case 'satellite':
      rect(4, 4, 4, 4); rect(0, 3 - v, 3, 5 + v); rect(9, 3 + v / 2, 3, 5 - v / 2)
      line(2, 6, 9, 6); line(6, 4, 8 + v, 1); ellipse(8 + v, 1, 1, .7); line(5, 7, 4 - v, 10)
      break
    case 'city':
      rect(0, 6 - v, 3, 6 + v); rect(4, 1, 3, 11); rect(8, 4 - v, 4, 8 + v)
      for (const [x, y] of [[1, 8], [5, 3], [5, 6], [9, 6], [10, 9]]) rect(x, y, 1, 1, false)
      rect(5, 0, 1, 2); break
    case 'treasure':
      rect(1, 5, 10, 6); ellipse(5.5, 4, 4.5, 2 + v * .35); rect(0, 0, 12, 2 - v / 2, false)
      rect(3 + v, 6, 1, 4, false); rect(5, 5, 2, 2, false); break
    case 'reef':
      line(5, 10, 5, 4, 2.5); line(5, 6, 2, 3 + v, 2); line(5, 7, 9, 4 - v, 2)
      line(2, 4, 1, 0 + v, 1.5); line(2, 4, 0, 4); line(8, 5, 8, 1); line(9, 4, 11, 2 + v)
      rect(3, 10, 5 + v, 2); break
    case 'kelp':
      line(4 + v, 11, 6, 0, 1.5)
      for (let i = 0; i < 3; i++) { ellipse(3 + (i % 2), 3 + i * 3, 2, 1.1); ellipse(8, 2 + i * 3 + v / 2, 2.1, 1.1) }
      break
    case 'wave':
      ellipse(6, 5, 5, 4); ellipse(7 + v / 2, 3, 3, 2.5, false)
      rect(0, 8, 12, 3 - v / 2); rect(0, 0, 3 - v / 2, 6, false); rect(9, 5, 3, 3, false)
      break
    case 'ribbon':
      line(0, 2, 8 + v, 2, 2); line(8 + v, 2, 3, 6, 2); line(3, 6, 10, 9 + v / 2, 2)
      polygon([[9, 8], [11, 11], [7, 10]]); break
    case 'comet':
      ellipse(8, 8, 2.8, 2.8); line(6, 6, 1, 1 + v, 2); line(8, 5, 4 - v, 0, 1.5)
      line(5, 8, 0, 5 - v, 1.5); break
    case 'key':
      ellipse(3, 3, 2.8, 2.8); ellipse(3, 3, 1, 1, false); line(5, 5, 10, 10, 2)
      line(8, 8, 10, 6 - v, 1.6); line(9, 10, 11, 8, 1.6); break
    case 'eel':
      ellipse(8, 2, 2.4, 1.6); line(8, 3, 3, 5, 2); line(3, 5, 6 + v, 8, 2)
      line(6 + v, 8, 1, 10, 1.5); line(1, 10, 0, 8 - v); break
    case 'crescent':
      ellipse(5, 5.5, 4.8, 5); ellipse(7 + v / 2, 4.5 - v / 2, 4, 4.3, false)
      ellipse(10, 9 - v, .7, .7); break
    case 'ring':
      ellipse(5.5, 5.5, 3.4 + v * .15, 3.4); ellipse(5.5, 5.5, 1.6, 1.6, false)
      line(0, 8 + v / 2, 11, 3 - v / 2, 1.5); ellipse(5.5, 5.5, .6, .6, false); break
    case 'window':
      rect(1, 1, 10, 10); rect(3, 3, 6, 6, false)
      rect(5 + v, 2, 1, 8); rect(2, 5 - v, 8, 1); break
    case 'arch':
      ellipse(5.5, 5, 4.7, 4.5); rect(1, 5, 10, 6); ellipse(5.5 + v / 2, 5.5, 2, 2.5, false)
      rect(4 + v / 2, 5, 4 - v / 2, 7, false); break
    case 'stars': {
      const star = (x: number, y: number, r: number) => { line(x - r, y, x + r, y, 1.5); line(x, y - r, x, y + r, 1.5); ellipse(x, y, r * .65, r * .65) }
      star(3, 3, 2.5); star(9, 7 - v, 2); star(3 + v, 10, 1); break
    }
    case 'islands':
      ellipse(3, 3, 2.8, 2.5 - v * .3); ellipse(9, 4 + v, 1.6, 2.2)
      ellipse(5 + v, 9, 3 - v * .3, 1.7); break
    case 'shell':
      polygon([[5.5, 11], [0, 5], [1, 2], [4, 0], [8, 0 + v / 2], [11, 3], [11, 6]])
      line(5.5, 10, 2 + v / 2, 3); line(5.5, 10, 8, 2)
      paint((x, y) => y > 2 && y < 8 && Math.abs(x - (5.5 + (y - 10) * .32)) < .4, false)
      break
    case 'lighthouse':
      polygon([[4, 3], [7, 3], [9, 11], [2, 11]]); rect(3, 1, 6, 3)
      polygon([[2, 1], [5.5, 0], [9, 1]]); line(0, 2, 1, 2); line(10, 2, 11, 2)
      rect(5, 8, 2, 3, false); break
    case 'balloon':
      ellipse(5.5, 3.5, 4.2, 3.5); polygon([[2, 5], [9, 5], [7, 8], [4, 8]])
      line(4, 7, 4, 9); line(7, 7, 7, 9); rect(4, 9, 4, 3); break
    case 'compass':
      ellipse(5.5, 5.5, 5, 5); ellipse(5.5, 5.5, 3.5, 3.5, false)
      polygon([[6, 1], [8, 6], [5, 10], [3, 5]]); break
    case 'clock':
      ellipse(5.5, 5.5, 5, 5); ellipse(5.5, 5.5, 3.3, 3.3, false)
      line(5, 5, 5, 2, 1.5); line(5, 5, 8, 7, 1.5); rect(5, 0, 2, 1); break
    case 'flower':
      for (const [x, y] of [[5.5, 2], [9, 4], [8, 8], [3, 8], [2, 4]]) ellipse(x, y, 2, 2)
      ellipse(5.5, 5.5, 2.4, 2.4); ellipse(5.5, 5.5, .65, .65, false); break
    case 'bridge':
      rect(0, 4, 12, 7); ellipse(5.5, 9, 2.8, 3, false); rect(3, 9, 6, 3, false)
      rect(0, 2, 2, 3); rect(4, 2, 2, 3); rect(8, 2, 2, 3); break
    case 'crown':
      polygon([[0, 2], [3, 5], [5.5, 0], [8, 5], [11, 2], [9, 10], [2, 10]])
      rect(3, 7, 1, 1, false); rect(5, 7, 1, 1, false); rect(7, 7, 1, 1, false); break
    case 'lantern':
      line(4, 1, 5.5, 0); line(5.5, 0, 7, 1); rect(3, 2, 6, 1)
      ellipse(5.5, 5.5, 3.5, 3.2); rect(3, 8, 6, 1); line(5, 9, 5, 11); line(7, 9, 7, 10)
      break
  }
  return { name: `${MOODS[v]}${NAMES[motif]}`, family, mask }
}

// Ray-depth follows the actual four-sided visibility rule, including holes and
// disconnected islands. It avoids applying a circular color gradient to every art.
export function artworkDepths(mask: boolean[], size: number): number[] {
  const remaining = [...mask], depths = Array<number>(mask.length).fill(-1)
  for (let depth = 0; remaining.some(Boolean); depth++) {
    const exposed = new Set<number>()
    for (let side = 0; side < 4; side++) for (let line = 0; line < size; line++) {
      for (let d = 0; d < size; d++) {
        const index = side === 0 ? d * size + line : side === 1 ? line * size + size - 1 - d : side === 2 ? (size - 1 - d) * size + size - 1 - line : (size - 1 - line) * size + d
        if (remaining[index]) { exposed.add(index); break }
      }
    }
    for (const index of exposed) { remaining[index] = false; depths[index] = depth }
  }
  return depths
}

export function colorArtwork(art: Artwork, depths: number[], palette: JellyColor[], size: number): Tile[] {
  return art.mask.map((alive, i) => !alive ? null : palette[art.glyphs && art.glyphs[i] >= 0
    ? art.glyphs[i]
    : art.brand ? 4 % palette.length
    : depths[i] === 0 ? 0 : 1 + ((depths[i] - 1 + Math.floor(i / size / 3)) % (palette.length - 1))])
}
