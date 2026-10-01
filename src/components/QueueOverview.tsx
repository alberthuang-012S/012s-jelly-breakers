import { COLOR_NAMES, HEX } from '../game/tide'
import type { JellyUnit } from '../game/types'

export function QueueOverview({ lanes, imageFor }: { lanes: JellyUnit[][]; imageFor: (color: JellyUnit['color']) => string }) {
  return <div className="queue-preview">
    <p className="queue-overview-help">遊戲已暫停。各列由上到下依序出發，回到遊戲後可派遣隊首。</p>
    <div className="queue-overview-scroll" role="region" aria-label="三列完整隊伍，可上下捲動" tabIndex={0}>
      <div className="queue-overview-headings">{lanes.map((lane, index) => <div key={index}>
        <h3 id={`queue-overview-heading-${index}`}>第 {index + 1} 列</h3><p>剩餘 {lane.length} 隻</p>
      </div>)}</div>
      <div className="queue-overview-columns">
        {lanes.map((lane, index) => <section className="queue-overview-lane" key={index} aria-labelledby={`queue-overview-heading-${index}`}>
          {lane.length ? <ol>{lane.map((jelly, position) => <li className={`queue-unit ${position === 0 ? 'queue-unit-head' : ''}`} key={jelly.id}>
            <span className="queue-position">{position === 0 ? '隊首' : <><span className="sr-only">第 </span>{position + 1}<span className="sr-only"> 隻</span></>}</span>
            <span className="jelly-art"><img src={imageFor(jelly.color)} alt="" draggable={false} /><b style={{ background: HEX[jelly.color] }}>{jelly.energy}</b></span>
            <b className="queue-unit-name">{COLOR_NAMES[jelly.color]}</b><span className="queue-unit-energy">{jelly.energy}<span className="queue-energy-long"> 發泡泡</span><span className="queue-energy-short" aria-hidden="true"> 發</span></span>
          </li>)}</ol> : <div className="queue-overview-empty"><span aria-hidden="true">✓</span><b>全員出發</b></div>}
        </section>)}
      </div>
    </div>
  </div>
}
