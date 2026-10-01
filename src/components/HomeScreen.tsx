import { COLORS, COLOR_NAMES, DIFFICULTIES, DIFFICULTY_NAMES, levelsFor, stageNumber } from '../game/tide'
import type { Difficulty, TideLevel } from '../game/tide'
import type { JellyColor } from '../game/types'

type HomeProps = {
  completed: number[]
  selected: Difficulty
  resume: TideLevel
  hasAttempt: boolean
  imageFor: (color: JellyColor) => string
  onDifficulty: (difficulty: Difficulty) => void
  onContinue: () => void
  onMap: () => void
  onHelp: () => void
  onSettings: () => void
}

const descriptions: Record<Difficulty, string> = {
  easy: '慢慢觀察，輕鬆開路', normal: '安排順序，保留空位', hard: '提前規劃，挑戰機關',
}

export function HomeScreen({ completed, selected, resume, hasAttempt, imageFor, onDifficulty, onContinue, onMap, onHelp, onSettings }: HomeProps) {
  const returning = completed.length > 0 || hasAttempt
  return <main className="home-screen" aria-label="水母破陣首頁">
    <header className="home-header"><span className="home-brand"><span aria-hidden="true">✳</span> Jelly Breakers</span><span className="home-collection">已收藏 {completed.length} / 300</span></header>
    <div className="home-content">
      <section className="home-hero">
        <p className="home-kicker">一起，讓海洋找回色彩。</p>
        <h1 tabIndex={-1}>水母破陣</h1>
        <p className="home-intro">派遣水母，消除同色方塊。<br />繞一圈，解開一片海洋圖案。</p>
        <div className="home-scene" aria-hidden="true"><div className="home-ripple" /><img className="home-jelly side peach" src={imageFor('pink')} alt="" /><img className="home-jelly lead" src={imageFor('aqua')} alt="" /><img className="home-jelly side mango" src={imageFor('yellow')} alt="" /><span className="home-sparkle one">✦</span><span className="home-sparkle two">✧</span></div>
      </section>
      <section className="home-journey" aria-label="選擇冒險">
        <div className="home-resume"><span>{hasAttempt ? '海流停在這裡，等你回來' : returning ? '下一片海，準備出發' : '你的第一片海，從這裡開始'}</span><h2>{resume.name}</h2><p>{DIFFICULTY_NAMES[selected]} · 第 {String(stageNumber(resume)).padStart(2, '0')} 關</p></div>
        <button className="home-play primary" onClick={onContinue}>{returning ? '繼續冒險' : '開始冒險'}<span aria-hidden="true">→</span></button>
        <div className="home-difficulty-label">選擇你的步調<span>各有 100 關</span></div>
        <nav className="home-difficulties" aria-label="選擇難度">{DIFFICULTIES.map(d => {
          const count = levelsFor(d).filter(l => completed.includes(l.id)).length
          return <button key={d} aria-pressed={selected === d} onClick={() => onDifficulty(d)}><b>{DIFFICULTY_NAMES[d]}</b><span className="home-difficulty-copy">{descriptions[d]}</span><small><span className="home-dock-size">{d === 'hard' ? 4 : 5} 格小棧 · </span>{count}/100</small><span className="home-difficulty-progress" aria-hidden="true"><i style={{ width: `${count}%` }} /></span></button>
        })}</nav>
        <nav className="home-links" aria-label="首頁工具"><button onClick={onMap}><span aria-hidden="true">▦</span>海洋圖鑑</button><button onClick={onHelp}><span aria-hidden="true">?</span>玩法說明</button><button onClick={onSettings}><span aria-hidden="true">⚙</span>設定</button></nav>
        <div className="home-friends" aria-label="水母夥伴">{COLORS.map(c => <span key={c}><img src={imageFor(c)} alt="" /><small>{COLOR_NAMES[c]}</small></span>)}</div>
      </section>
    </div>
    <p className="home-footer">沒有時間限制，照自己的步調漂流。</p>
  </main>
}
