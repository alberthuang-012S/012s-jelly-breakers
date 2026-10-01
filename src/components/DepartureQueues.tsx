import { Fragment } from 'react'
import { COLOR_NAMES, HEX } from '../game/tide'
import type { JellyUnit } from '../game/types'

type QueueProps = { lanes: JellyUnit[][]; canPlay: boolean; imageFor: (color: JellyUnit['color']) => string; onLaunch: (index: number) => void }

export function DepartureQueues({ lanes, canPlay, imageFor, onLaunch }: QueueProps) {
  return <section className="queue-section" aria-label="出發隊伍"><div className="section-label"><h3>準備出發</h3><small>點隊首派遣</small></div><div className="lanes">{lanes.map((lane, index) => <div className="lane" key={index}>
    <div className="lane-label">第 <b>{index + 1}</b> 列</div>
    {lane.length ? <>
      <button className="launch-button" onClick={() => onLaunch(index)} disabled={!canPlay} style={{ '--jelly-color': HEX[lane[0].color] } as React.CSSProperties} aria-label={`派遣第${index + 1}列${COLOR_NAMES[lane[0].color]}水母，${lane[0].energy}發泡泡`}>
        <span className="queue-head-label">隊首 · 派遣</span>
        <span className="jelly-art"><img src={imageFor(lane[0].color)} alt="" draggable={false} /><b style={{ background: HEX[lane[0].color] }}>{lane[0].energy}</b></span><span>{COLOR_NAMES[lane[0].color]}<i aria-hidden="true">↑</i></span>
      </button>
      <div className="desktop-upcoming" aria-label={`第 ${index + 1} 列接續水母`}>{[0, 1].map(offset => {
        const j = lane[offset + 1]
        return <div className={`upcoming-jelly ${j ? '' : 'upcoming-empty'}`} key={offset}>{j ? <><span className="upcoming-position">{offset + 1}<span className="sr-only">隻後出發</span></span><span className="jelly-art small"><img src={imageFor(j.color)} alt="" draggable={false} /><b style={{ background: HEX[j.color] }}>{j.energy}</b></span><span className="upcoming-name">{COLOR_NAMES[j.color]}<small>{j.energy} 發</small></span></> : <span>—</span>}</div>
      })}<small className="upcoming-remaining">{lane.length > 3 ? `還有 ${lane.length - 3} 隻` : '隊伍到這裡'}</small></div>
      <div className="lane-sequence" aria-label={`第 ${index + 1} 列接續顏色，由左到右：${lane.slice(1, 4).map(j => COLOR_NAMES[j.color]).join('、') || '無'}${lane.length > 4 ? `，還有 ${lane.length - 4} 隻` : ''}`}><div className="sequence-colors"><b>接續</b>{lane.length > 1 ? lane.slice(1, 4).map((j, next) => <Fragment key={j.id}>{next > 0 && <i aria-hidden="true">→</i>}<span className="sequence-dot" title={`${COLOR_NAMES[j.color]}，${j.energy} 發泡泡`} style={{ background: HEX[j.color] }} /></Fragment>) : <small>無</small>}</div><small>{lane.length > 4 ? `還有 ${lane.length - 4} 隻` : ' '}</small></div>
    </> : <div className="lane-empty">✓<small>全員出發</small></div>}
  </div>)}</div></section>
}
