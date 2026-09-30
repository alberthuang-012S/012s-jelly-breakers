import type { StageRecord } from '../storage/tideRecords'

export function Challenges({ record, par, unlocked }: { record?: StageRecord; par: number; unlocked: boolean }) {
  return <div className="challenge-panel">
    <div className="challenge-heading"><b>航海紀錄</b><span>{record ? `最佳 ${record.bestLaunches} 次派遣 · ${record.bestCombo} 連擊` : '完成這一趟，留下你的第一筆紀錄'}</span></div>
    {unlocked ? <div className="challenge-badges"><span className={record?.efficient ? 'earned' : ''}>{record?.efficient ? '✓' : '◇'} 精準航行：≤ {par} 次派遣</span><span className={record?.noUndo ? 'earned' : ''}>{record?.noUndo ? '✓' : '◇'} 獨立航行：不用撤回</span></div> : <p>首次通關後開放選用挑戰，不影響關卡解鎖。</p>}
  </div>
}

export function ShellIntro() {
  return <div className="ice-intro shell-intro"><p>找到有編號的珍珠，打開同號貝殼。</p><div className="ice-demo"><div><span className="demo-pearl">1</span><b>消除所有同號珍珠</b></div><i>→</i><div><span className="demo-shell">1</span><b>貝殼自動打開</b></div></div><p>珍珠也要用<strong>同色泡泡</strong>消除。<br />貝殼關著時會阻擋射擊，但不消耗泡泡。<br />冰封珍珠要先破冰，消除後才算收集成功。</p><span className="ice-tip">貝殼打開後，裡面的色塊仍要正常消除。</span></div>
}
