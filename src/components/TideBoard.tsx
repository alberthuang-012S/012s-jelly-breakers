import type { CSSProperties } from 'react'
import { COLOR_NAMES, HEX, isShellClosed } from '../game/tide'
import type { TideState } from '../game/tide'

export type BoardFocus = 'all' | 'ice' | `shell-${string}`
export const BOARD_INSET = 14
export const BOARD_SPAN = 72
// Expand only the rendered orbit; the simulation keeps its existing coordinates.
export const displayOrbit = (position: number) => 50 + (position - 50) * 7 / 6
export function TideBoard({ game, size, focus = 'all' }: { game: TideState; size: number; focus?: BoardFocus }) {
  const selected = focus.startsWith('shell-') ? game.shells.find(g => `shell-${g.id}` === focus) : undefined
  return <div className="pixel-board" style={{ left: `${BOARD_INSET}%`, top: `${BOARD_INSET}%`, width: `${BOARD_SPAN}%`, height: `${BOARD_SPAN}%`, gridTemplateColumns: `repeat(${size}, 1fr)` }} role="img" aria-label={`${size} × ${size} 色塊圖案，剩下 ${game.tiles.filter(Boolean).length} 格`}>
    {game.tiles.map((color, index) => {
      const pearl = game.shells.find(g => g.pearls.includes(index))
      const shell = game.shells.find(g => g.cells.includes(index) && isShellClosed(game, g))
      const emphasized = focus === 'all' || (focus === 'ice' ? game.ice[index] > 0 : selected?.pearls.includes(index) || selected?.cells.includes(index))
      const label = `${Math.floor(index / size) + 1} 列 ${index % size + 1} 行${color ? `，${COLOR_NAMES[color]}` : '，已清空'}${game.ice[index] ? '，冰封' : ''}${pearl ? `，珍珠 ${pearl.id}` : ''}${shell ? `，貝殼 ${shell.id}` : ''}`
      return <span key={index} title={label} className={`pixel ${color ? 'alive' : ''} ${game.ice[index] ? 'frozen' : ''} ${shell ? 'shell-locked' : ''} ${!emphasized ? 'tile-dimmed' : ''} ${game.shots.some(s => s.target === index && !s.cracked) ? 'just-popped' : ''}`} style={{ '--tile': color ? HEX[color] : 'transparent' } as CSSProperties}>
        {color && <i />}
        {color && pearl ? <span className="pearl-mark" aria-hidden="true">{pearl.id}</span> : color && shell ? <span className="shell-mark" aria-hidden="true">{shell.id}</span> : game.ice[index] > 0 ? <span className="ice-mark" aria-hidden="true">❄</span> : null}
        {color && game.ice[index] > 0 && (pearl || shell) && <span className="ice-corner" aria-hidden="true" />}
      </span>
    })}
  </div>
}
