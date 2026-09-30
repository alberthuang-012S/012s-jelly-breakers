import { useEffect, useRef, useState } from 'react'
import { CAPACITY, COLOR_NAMES, HEX, POOL_SIZE, TICK_MS, TIDE_LEVELS, canHit, createTide, hintMove, isLocked, isShellClosed, launch, orbitPoint, stepTide } from './game/tide'
import type { TideState } from './game/tide'
import type { JellyColor, JellyUnit } from './game/types'
import { CHAPTER_NAMES } from './game/campaign'
import { TideEffects } from './components/TideEffects'
import { TIDE_SAVE_KEY, nextStageIndex, readTideProgress, rememberIce, rememberShell, stageTutorial } from './storage/tideProgress'
import { Challenges, ShellIntro } from './components/Challenges'
import { readRecords, recordWin, saveRecords } from './storage/tideRecords'
import type { RunStats } from './storage/tideRecords'

const art = import.meta.glob('../reference/jellyfish-3d/jelly-normal-{yellow,pink,aqua,green,purple}.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const imageFor = (color: JellyColor) => art[`../reference/jellyfish-3d/jelly-normal-${color}.webp`]
function Jelly({ jelly, small = false }: { jelly: JellyUnit; small?: boolean }) {
  return <span className={`jelly-art ${small ? 'small' : ''}`}><img src={imageFor(jelly.color)} alt="" draggable={false} /><b style={{ background: HEX[jelly.color] }}>{jelly.energy}</b></span>
}
function MiniArt({ tiles, size }: { tiles: (JellyColor | null)[]; size: number }) {
  return <span className="mini-art" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>{tiles.map((c, i) => <i key={i} style={{ background: c ? HEX[c] : 'transparent' }} />)}</span>
}

function ChapterNavigator({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  return <nav className="chapter-nav" aria-label="海洋章節">{CHAPTER_NAMES.map((name, index) =>
    <button key={name} type="button" className={selected === index ? 'selected' : ''} onClick={() => onSelect(index)} aria-current={selected === index ? 'page' : undefined}>
      <small>{String(index * 10 + 1).padStart(2, '0')}–{String((index + 1) * 10).padStart(2, '0')}</small>{name}
    </button>,
  )}</nav>
}

export default function App() {
  const [completed, setCompleted] = useState(readTideProgress)
  const [levelIndex, setLevelIndex] = useState(() => nextStageIndex(readTideProgress()))
  const [selectedChapter, setSelectedChapter] = useState(() => Math.floor(nextStageIndex(readTideProgress()) / 10))
  const level = TIDE_LEVELS[levelIndex]
  const chapterLevels = TIDE_LEVELS.slice(selectedChapter * 10, selectedChapter * 10 + 10)
  const [game, setGame] = useState<TideState>(() => createTide(TIDE_LEVELS[nextStageIndex(readTideProgress())]))
  const [overlay, setOverlay] = useState<'help' | 'map' | 'ice' | 'shell' | 'settings' | 'records' | null>(() => {
    const tutorial = stageTutorial(nextStageIndex(readTideProgress()));
    if (tutorial) return tutorial;
    try { return localStorage.getItem('jellyOrbitWelcomeV1') ? null : 'help' } catch { return 'help' }
  })
  const [records, setRecords] = useState(readRecords)
  const [run, setRun] = useState<RunStats>({ launches: 0, hints: 0, undos: 0 })
  const [challengeUnlocked, setChallengeUnlocked] = useState(() => completed.includes(level.id))
  const [muted, setMuted] = useState(true)
  const [fast, setFast] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [notice, setNotice] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [history, setHistory] = useState<TideState[]>([])
  const audio = useRef<AudioContext | null>(null)
  const lastSound = useRef(-1)
  useEffect(() => {
    if (!overlay && game.phase === 'playing') return
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
    const previous = document.activeElement as HTMLElement | null
    dialog?.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && overlay) closeOverlay()
      if (event.key !== 'Tab' || !dialog) return
      const buttons = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]')]
      const first = buttons[0], last = buttons.at(-1)
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus() }
  }, [overlay, game.phase])
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  useEffect(() => {
    if (overlay || paused || hidden || game.phase !== 'playing' || !game.swimmers.length) return
    const timer = window.setInterval(() => setGame(s => stepTide(s, level.size)), fast ? TICK_MS / 2 : TICK_MS)
    return () => window.clearInterval(timer)
  }, [overlay, paused, hidden, game.phase, game.swimmers.length, fast, level.size])
  useEffect(() => {
    if (!notice && !hint) return
    const timer = window.setTimeout(() => { setNotice(''); setHint(null) }, 4000)
    return () => clearTimeout(timer)
  }, [notice, hint])
  useEffect(() => {
    if (game.phase !== 'won') return
    setRecords(previous => recordWin(previous, level.id, run, game.bestCombo, level.par, challengeUnlocked))
    setCompleted(previous => {
      const next = [...new Set([...previous, level.id])].sort((a, b) => a - b)
      try { localStorage.setItem(TIDE_SAVE_KEY, JSON.stringify(next)) } catch { /* Play remains available without storage. */ }
      return next
    })
  }, [game.phase, level.id])
  useEffect(() => saveRecords(records), [records])
  useEffect(() => {
    if (muted || !game.shots.length || lastSound.current === game.tick || !audio.current) return
    lastSound.current = game.tick
    const ctx = audio.current
    const oscillator = ctx.createOscillator(), gain = ctx.createGain()
    oscillator.type = game.shots.some(shot => shot.cracked) ? 'triangle' : 'sine'
    const notes = [0, 2, 4, 7, 9, 12, 14, 16]
    const frequency = 440 * 2 ** (notes[Math.min(game.combo - 1, notes.length - 1)] / 12)
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.2, ctx.currentTime + .07)
    gain.gain.setValueAtTime(.035, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .12)
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + .13)
  }, [game.tick, game.shots, muted])
  useEffect(() => () => { void audio.current?.close() }, [])

  function start(index: number) {
    setLevelIndex(index); setGame(createTide(TIDE_LEVELS[index])); setHistory([]); setHint(null); setNotice(''); setOverlay(null); setPaused(false); lastSound.current = -1
    setSelectedChapter(Math.floor(index / 10))
    setOverlay(stageTutorial(index))
    setRun({ launches: 0, hints: 0, undos: 0 })
    setChallengeUnlocked(completed.includes(TIDE_LEVELS[index].id))
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function closeOverlay() {
    if (overlay === 'help') { try { localStorage.setItem('jellyOrbitWelcomeV1', 'seen') } catch { /* The game works without storage. */ } }
    if (overlay === 'ice') rememberIce()
    if (overlay === 'shell') rememberShell()
    setOverlay(null)
  }
  function send(source: 'lane' | 'pool', index: number) {
    if (paused || overlay) return
    const next = launch(game, source, index)
    if (next === game) {
      setNotice(game.swimmers.length >= CAPACITY ? '軌道上有 3 隻水母，等夥伴返航就能出發。' : '返航位置已預留滿，先派等待區的水母。')
      return
    }
    setHistory(h => [...h.slice(-19), game]); setGame(next); setHint(null); setNotice('')
    setRun(r => ({ ...r, launches: r.launches + 1 }))
  }
  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    setRun(r => ({ ...r, undos: r.undos + 1 }))
    setGame(previous); setHistory(h => h.slice(0, -1)); setHint(null); setNotice('已回到上一次派遣前。'); lastSound.current = -1
  }
  function showHint() {
    setRun(r => ({ ...r, hints: r.hints + 1 }))
    const next = hintMove(game, level.size)
    if (!next || game.swimmers.length >= CAPACITY) { setNotice('先讓軌道上的夥伴前進，再看看露出的顏色。'); return }
    setHint(`${next.source}-${next.index}`)
    setNotice(next.source === 'pool' ? '這隻水母有目標了！派牠出發，釋放等待位置。' : canHit(game, game.lanes[next.index][0].color, level.size) ? '這個顏色露出來了，試試發光的水母。' : '先讓這位夥伴去小棧等待，露出後排水母。')
  }
  async function toggleSound() {
    if (muted) {
      try { audio.current ??= new AudioContext(); await audio.current.resume(); setMuted(false) } catch { setNotice('這個瀏覽器暫時無法播放音效。') }
    } else setMuted(true)
  }
  const left = game.tiles.filter(Boolean).length
  const iceLeft = game.ice.reduce((sum, n) => sum + n, 0)
  const progress = Math.round((1 - left / level.tiles.filter(Boolean).length) * 100)
  const canPlay = !paused && !overlay && game.phase === 'playing'

  return <div className="ocean-app">
    <div inert={Boolean(overlay) || game.phase !== 'playing'}>
    <header className="site-header">
      <a className="wordmark" href="#" onClick={e => { e.preventDefault(); setSelectedChapter(Math.floor(levelIndex / 10)); setOverlay('map') }} aria-label="Jelly Orbit 關卡圖鑑"><span className="brand-symbol" aria-hidden="true">✳</span> jelly<span>orbit</span></a>
      <div className="header-actions"><button className="nav-button" onClick={() => { setSelectedChapter(Math.floor(levelIndex / 10)); setOverlay('map') }}><span aria-hidden="true">▦</span> 關卡圖鑑</button><button className="circle-button" onClick={() => setOverlay('help')} aria-label="遊戲說明">?</button></div>
    </header>
    <main className="main-layout">
      <section className="game-shell" aria-label="Jelly Orbit 遊戲">
        <div className="level-bar"><span className="level-number" aria-hidden="true">{String(level.id).padStart(2, '0')}</span><div><span className="eyebrow">第 {String(level.id).padStart(2, '0')} 關</span><h2>{level.name}</h2></div><button className="circle-button" onClick={() => setPaused(p => !p)} aria-label={paused ? '繼續遊戲' : '暫停遊戲'}>{paused ? '▶' : 'Ⅱ'}</button></div>
        <div className="progress-row"><span>海洋修復 <b>{progress}%</b></span>{iceLeft > 0 && <span className="ice-counter">❄ {iceLeft} 層冰</span>}</div><div className="progress-track" role="progressbar" aria-label="海洋修復進度" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div>
        <div className={`playfield ${paused || overlay || hidden ? 'is-paused' : ''} ${level.id >= 11 ? 'pearl-field' : level.id >= 6 ? 'frost-field' : ''}`}>

          <svg className="orbit-svg" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="orbit-flag-fabric" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe1a7" /><stop offset=".55" stopColor="#f4b98a" /><stop offset="1" stopColor="#e89885" /></linearGradient></defs><rect className="track-shadow" x="14" y="14" width="72" height="72" rx="9" /><rect className="track-base" x="14" y="14" width="72" height="72" rx="9" /><rect className="track-dashes" x="14" y="14" width="72" height="72" rx="9" /><path d="M49 14h3l-1.5-1.5M86 49v3l1.5-1.5M51 86h-3l1.5 1.5M14 51v-3l-1.5 1.5" className="track-arrows" /><g className="track-flag"><ellipse className="track-flag-shadow" cx="23" cy="15" rx="2.8" ry="1" /><path className="track-flag-pole" d="M23 3.3v11.3" /><circle className="track-flag-finial" cx="23" cy="3.1" r="1.15" /><path className="track-flag-cloth" d="M23 4.7c2.8-1.1 5.3.5 8.3-.8l-1.1 2.8 1.3 2.5c-3.2-1-5.7.8-8.5-.3Z" /><path className="track-flag-fold" d="M23.5 5.3c2.6-.7 4.7.5 7-.3M23.5 8.3c2.8.8 5-.7 7.1-.2" /><path className="track-flag-sparkle" d="m27 5.2.35 1 .95.35-.95.35-.35 1-.35-1-.95-.35.95-.35Z" /><circle className="track-flag-base" cx="23" cy="14" r="1.85" /><circle className="track-flag-base-inner" cx="23" cy="14" r=".65" /></g></svg>
          <div className="pixel-board" style={{ gridTemplateColumns: `repeat(${level.size}, 1fr)` }} role="img" aria-label={`色塊圖案，剩下 ${left} 格`}>
            {game.tiles.map((color, index) => <span key={index} className={`pixel ${color ? 'alive' : ''} ${game.ice[index] ? 'frozen' : ''} ${isLocked(game, index) ? 'shell-locked' : ''} ${game.shots.some(s => s.target === index && !s.cracked) ? 'just-popped' : ''}`} style={{ '--tile': color ? HEX[color] : 'transparent' } as React.CSSProperties}>{color && <i />}{color && game.shells.filter(g => g.pearls.includes(index)).map(g => <span className="pearl-mark" key={g.id} aria-hidden="true">{g.id}</span>)}{color && isLocked(game, index) && <span className="shell-mark" aria-hidden="true">{game.shells.find(g => g.cells.includes(index) && isShellClosed(game, g))?.id}</span>}{game.ice[index] > 0 && <span className="ice-mark" aria-hidden="true">❄</span>}</span>)}
          </div>
          <TideEffects key={level.id} game={game} size={level.size} fast={fast} />
          {game.swimmers.map(jelly => { const [x, y] = orbitPoint(jelly.age, level.size); return <div className={`swimmer ${game.effects.some(shot => shot.sourceId === jelly.id && game.tick - shot.tick < 2) ? 'firing' : ''}`} key={jelly.id} style={{ left: `${x}%`, top: `${y}%`, transitionDuration: `${fast ? TICK_MS / 2 : TICK_MS}ms` }}><Jelly jelly={jelly} small /></div> })}
          <div className="orbit-status"><span className={game.swimmers.length ? 'live-indicator' : ''} />{game.swimmers.length ? `${game.swimmers.length} / 3 位夥伴航行中` : run.launches === 0 && level.id === 1 ? '點選前排水母，消除相同顏色' : '海流已就緒'}</div>
          {paused && <div className="pause-cover"><span>海流暫停了</span><button className="primary" onClick={() => setPaused(false)}>繼續漂流 ▶</button></div>}
        </div>
        {game.shells.length > 0 && <div className="shell-tracker" aria-label="貝殼解鎖進度">{game.shells.map(group => <span className={isShellClosed(game, group) ? '' : 'opened'} key={group.id}><b>{group.id}</b>{isShellClosed(game, group) ? `珍珠 ${group.pearls.filter(i => !game.tiles[i]).length}/${group.pearls.length}` : '貝殼已開 ✓'}</span>)}</div>}
        <div className={`dock ${game.pool.length + game.swimmers.length >= 4 ? 'dock-warning' : ''}`}><div className="section-label"><h3>返航小棧</h3><b>{game.pool.length}<span> / 5</span></b></div><div className="dock-slots">{Array.from({ length: POOL_SIZE }, (_, i) => { const jelly = game.pool[i]; return jelly ? <button key={jelly.id} className={`dock-slot occupied ${hint === `pool-${i}` ? 'hinted' : ''}`} onClick={() => send('pool', i)} disabled={!canPlay} aria-label={`派遣等待區${COLOR_NAMES[jelly.color]}水母，${jelly.energy}發泡泡`}><Jelly jelly={jelly} small />{canHit(game, jelly.color, level.size) && <span className="ready-dot" />}</button> : <div className={`dock-slot ${i < game.pool.length + game.swimmers.length ? 'reserved' : ''}`} key={`empty-${i}`}><span>{i < game.pool.length + game.swimmers.length ? '↩' : '·'}</span></div> })}</div></div>
        <div className="queue-section"><div className="section-label"><h3>準備出發</h3></div><div className="lanes">{game.lanes.map((lane, index) => <div className="lane" key={index}>{lane.length ? <><div className="lane-back">{lane.slice(1, 3).reverse().map(j => <span key={j.id} className="queued-jelly"><Jelly jelly={j} small /></span>)}</div><button className={`launch-button ${hint === `lane-${index}` ? 'hinted' : ''}`} onClick={() => send('lane', index)} disabled={!canPlay} style={{ '--jelly-color': HEX[lane[0].color] } as React.CSSProperties} aria-label={`派遣第${index + 1}列${COLOR_NAMES[lane[0].color]}水母，${lane[0].energy}發泡泡`}><Jelly jelly={lane[0]} /><span>{COLOR_NAMES[lane[0].color]} <i>↑</i></span></button><small aria-label={`後排還有 ${lane.length - 1} 位夥伴`}>後排 {lane.length - 1}</small></> : <div className="lane-empty">✓<small>全員出發</small></div>}</div>)}</div></div>
        <div className="game-tools"><button onClick={undo} disabled={!history.length || !canPlay}><span aria-hidden="true">↶</span>撤回</button><button onClick={showHint} disabled={!canPlay}><span aria-hidden="true">☼</span>提示</button><button onClick={() => setOverlay('settings')} aria-haspopup="dialog"><span aria-hidden="true">···</span>更多</button></div>

        <div className={`status-message ${notice ? 'has-notice' : ''}`} role="status">{notice || (game.pool.length + game.swimmers.length >= 4 ? '位置快滿了，優先派出返航的夥伴。' : '')}</div>
      </section>
    </main><footer className="site-footer"><span>慢慢來，跟著海流就好。</span></footer>
    </div>
    {overlay && <div className="modal-backdrop" onClick={closeOverlay}><section className="modal" role="dialog" aria-modal="true" aria-label={overlay === 'settings' ? '更多選項' : overlay === 'records' ? '航海紀錄' : overlay === 'shell' ? '貝殼鎖教學' : overlay === 'ice' ? '冰封色塊教學' : overlay === 'help' ? '遊戲說明' : '關卡地圖'} onClick={e => e.stopPropagation()}><button autoFocus className="modal-close circle-button" onClick={closeOverlay} aria-label="關閉">×</button><h2>{overlay === 'settings' ? '照自己的步調' : overlay === 'records' ? '這一趟的足跡' : overlay === 'shell' ? '新發現：珍珠與貝殼鎖' : overlay === 'ice' ? '新發現：冰封色塊' : overlay === 'help' ? '一起，繞個圈。' : '我的海洋圖鑑'}</h2>{overlay === 'settings' ? <div className="settings-list">
      <button onClick={() => void toggleSound()} aria-pressed={!muted}><span>海洋音效</span><b>{muted ? '關閉' : '開啟'}</b></button>
      <button onClick={() => setFast(f => !f)} aria-pressed={fast}><span>漂流速度</span><b>{fast ? '2×' : '1×'}</b></button>
      <button onClick={() => setOverlay('records')}><span>航海紀錄與挑戰</span><b>→</b></button>
      <button onClick={() => start(levelIndex)}><span>重新開始這一關</span><b>↻</b></button>
    </div> : overlay === 'records' ? <div className="record-content"><p>剩餘 {left} 格色塊 · 已派遣 {run.launches} 次</p><p>提示 {run.hints} 次 · 撤回 {run.undos} 次</p><Challenges record={records[level.id]} par={level.par} unlocked={challengeUnlocked} /><p>撤回不扣回派遣次數；挑戰不影響通關。</p></div> : overlay === 'shell' ? <ShellIntro /> : overlay === 'ice' ? <div className="ice-intro"><p>透明冰殼裡，藏著熟悉的顏色。</p><div className="ice-demo"><div><span className="demo-cube frozen">❄</span><b>冰封</b></div><i>→</i><div><span className="demo-cube" /><b>第 1 發：破冰</b></div><i>→</i><div><span className="demo-pop">✦</span><b>第 2 發：消除</b></div></div><p>兩發都必須是<strong>同色泡泡</strong>。<br />冰破了，色塊仍會擋住後方目標。</p><span className="ice-tip">先打開入口，再讓內層顏色出發。</span></div> : overlay === 'help' ? <><p className="welcome-copy">讓心情，順著海流慢慢放晴。</p><img className="help-jelly" src={imageFor('aqua')} alt="海藍色水母" /><ol className="help-steps"><li><b>點最前排，出發！</b><span>最多 3 隻水母同時環繞，數字是剩餘泡泡。</span></li><li><b>同色命中，層層打開。</b><span>水母向內射出同色泡泡，從外向內解開圖案。新機關會在旅途中逐步介紹。</span></li><li><b>返航了，再試一次。</b><span>剩餘泡泡會回到 5 格小棧。↩ 是航行夥伴預留的位置；有綠點表示目前有同色目標。</span></li><li><b>留點空間給下一步。</b><span>小棧塞滿且沒有任何水母能消除，就需要撤回或重玩。隨時可以暫停，沒有時間限制。</span></li></ol></> : <div className="map-list"><p className="collection-summary">已收藏 {completed.length} / {TIDE_LEVELS.length} 段海洋旅程</p><ChapterNavigator selected={selectedChapter} onSelect={setSelectedChapter} />{chapterLevels.map((l) => { const i = l.id - 1; return <button key={l.id} className={levelIndex === i ? 'current-stage' : ''} aria-current={levelIndex === i ? 'step' : undefined} disabled={i > 0 && !completed.includes(i)} onClick={() => start(i)}><MiniArt tiles={l.tiles} size={l.size} /><span><small>第 {String(l.id).padStart(2, '0')} 關</small><b>{l.name}</b>{records[l.id] && <small>最佳 {records[l.id].bestLaunches} 次 · {records[l.id].noHint ? '獨立探索 ✓' : '挑戰可重玩'}</small>}</span><em>{completed.includes(l.id) ? '已收藏 ✓' : levelIndex === i ? '探索中' : i === 0 || completed.includes(i) ? '→' : '未解鎖'}</em></button> })}</div>}<button className="primary" onClick={closeOverlay}>{overlay === 'shell' ? '出發，尋找珍珠 →' : overlay === 'ice' ? '出發，試試破冰 →' : overlay === 'help' ? '知道了，開始漂流 →' : '回到海流'}</button></section></div>}
    {game.phase !== 'playing' && !overlay && <div className="modal-backdrop"><section className="modal result-modal" role="dialog" aria-modal="true" aria-label={game.phase === 'won' ? '關卡完成' : '等待區已滿'}><span className="eyebrow">{game.phase === 'won' ? 'A LITTLE TREASURE, JUST FOR YOU' : 'LET’S FIND ANOTHER WAY'}</span>{game.phase === 'won' ? <div className="treasure-art"><MiniArt tiles={level.tiles} size={level.size} /><span>✦</span></div> : <img className="help-jelly" src={imageFor('purple')} alt="等待出發的水母" />}<h2>{game.phase === 'won' ? '把美好，收進海裡。' : '海流有點塞住了。'}</h2><p>{game.phase === 'won' ? `「${level.name}」已加入圖鑑。你完成了 ${completed.length} / ${TIDE_LEVELS.length} 段旅程！` : '等待區已滿，外層也沒有能命中的顏色。換個出發順序，再試試看。'}</p><div className="result-stats"><span><b>{game.bestCombo}</b>最高連擊</span><span><b>{run.launches}</b>次派遣</span></div><>{game.phase === 'won' && <Challenges record={records[level.id]} par={level.par} unlocked={true} />}{game.phase === 'won' && !challengeUnlocked && <p className="challenge-unlocked">選用挑戰已解鎖，下次重玩可以試試！</p>}</><button autoFocus className="primary" onClick={() => game.phase === 'won' ? (levelIndex < TIDE_LEVELS.length - 1 ? start(levelIndex + 1) : setOverlay('map')) : undo()}>{game.phase === 'won' ? (levelIndex < TIDE_LEVELS.length - 1 ? '下一片海，出發 →' : '欣賞我的海洋圖鑑 →') : '撤回上一次派遣 ↶'}</button><button className="text-button" onClick={() => start(levelIndex)}>再玩一次</button></section></div>}
  </div>
}
