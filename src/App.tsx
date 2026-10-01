import { useEffect, useRef, useState } from 'react'
import { ALL_LEVELS, CAPACITY, COLOR_NAMES, DIFFICULTIES, DIFFICULTY_NAMES, HEX, TICK_MS, canHit, createTide, isShellClosed, launch, levelsFor, orbitPoint, stageNumber, stepTide } from './game/tide'
import type { Difficulty, TideState } from './game/tide'
import type { JellyColor, JellyUnit } from './game/types'
import { CHAPTER_NAMES } from './game/campaign'
import { TideEffects } from './components/TideEffects'
import { TideBoard, displayOrbit } from './components/TideBoard'
import type { BoardFocus } from './components/TideBoard'
import { TIDE_SAVE_KEY, isStageUnlocked, nextStageIndex, readDifficulty, readTideProgress, rememberDifficulty, rememberIce, rememberShell, stageTutorial } from './storage/tideProgress'
import { Challenges, ShellIntro } from './components/Challenges'
import { readRecords, recordWin, saveRecords } from './storage/tideRecords'
import type { RunStats } from './storage/tideRecords'

const art = import.meta.glob('../reference/jellyfish-3d/jelly-normal-{yellow,pink,aqua,green,purple}.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const imageFor = (color: JellyColor) => art[`../reference/jellyfish-3d/jelly-normal-${color}.webp`]
function Jelly({ jelly, small = false }: { jelly: JellyUnit; small?: boolean }) {
  return <span className={`jelly-art ${small ? 'small' : ''}`}><img src={imageFor(jelly.color)} alt="" draggable={false} /><b style={{ background: HEX[jelly.color] }}>{jelly.energy}</b></span>
}
function ReturnDock({ game, size, canPlay, onLaunch }: { game: TideState; size: number; canPlay: boolean; onLaunch: (index: number) => void }) {
  const activeIds = [...game.pool, ...game.swimmers].map(j => j.id)
  const signature = `${game.poolSize}:${[...activeIds].sort().join(',')}`
  const [layout, setLayout] = useState<{ signature: string; ids: (string | null)[] }>({ signature: '', ids: [] })
  let slots = layout.ids
  if (layout.signature !== signature) {
    // Keep each partner's berth through launch and return, even when pool order changes.
    slots = Array.from({ length: game.poolSize }, (_, i) => activeIds.includes(layout.ids[i] ?? '') ? layout.ids[i] : null)
    for (const id of activeIds) if (!slots.includes(id)) slots[slots.indexOf(null)] = id
    setLayout({ signature, ids: slots })
  }
  const available = game.poolSize - activeIds.length
  return <section className={`dock ${available === 0 ? 'dock-full' : ''}`} aria-label="返航小棧">
    <div className="section-label"><h3>返航小棧</h3><strong className="dock-available">可用 <b>{available}</b> 格</strong></div>
    <p className="dock-capacity" aria-live="polite">返航中 {game.swimmers.length} · 已停泊 {game.pool.length}</p>
    <div className="dock-slots" style={{ gridTemplateColumns: `repeat(${game.poolSize}, minmax(0, 1fr))` }}>{slots.map((id, slot) => {
      const poolIndex = game.pool.findIndex(j => j.id === id)
      const jelly = game.pool[poolIndex]
      const returning = game.swimmers.find(j => j.id === id)
      if (jelly) {
        const ready = canHit(game, jelly.color, size)
        return <button key={slot} data-jelly-id={jelly.id} className={`dock-slot occupied ${ready ? 'dock-ready' : 'dock-waiting'}`} onClick={() => onLaunch(poolIndex)} disabled={!canPlay || game.swimmers.length >= CAPACITY} aria-label={`派遣等待區${COLOR_NAMES[jelly.color]}水母，${jelly.energy}發泡泡${ready ? '，有同色目標' : '，暫無目標'}`}><Jelly jelly={jelly} small /><span className="dock-slot-label">{ready ? '派遣 ↑' : '暫無目標'}</span></button>
      }
      return returning ? <div key={slot} data-jelly-id={returning.id} className="dock-slot reserved" aria-label={`${COLOR_NAMES[returning.color]}水母返航預留格`}><Jelly jelly={returning} small /><span className="dock-slot-label">↩ 返航中</span></div> : <div key={slot} className="dock-slot empty" aria-label={`第 ${slot + 1} 格空泊位`}><span className="dock-berth" aria-hidden="true" /><span className="dock-slot-label">空泊位</span></div>
    })}</div>
    {available === 0 && game.phase === 'playing' && <p className="dock-full-message sr-only" role="status">{game.pool.length ? '小棧已滿，可再次派遣停泊水母。' : '泊位已預留，等夥伴返航。'}</p>}
  </section>
}
function MiniArt({ tiles, size }: { tiles: (JellyColor | null)[]; size: number }) {
  return <span className="mini-art" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>{tiles.map((c, i) => <i key={i} style={{ background: c ? HEX[c] : 'transparent' }} />)}</span>
}

function ChapterNavigator({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  return <label className="chapter-picker">海洋章節<select value={selected} onChange={e => onSelect(Number(e.target.value))}>{CHAPTER_NAMES.map((name, index) =>
    <option key={name} value={index}>{String(index * 10 + 1).padStart(2, '0')}–{(index + 1) * 10} · {name}</option>,
  )}</select></label>
}

export default function App() {
  const [completed, setCompleted] = useState(readTideProgress)
  const [levelIndex, setLevelIndex] = useState(() => nextStageIndex(readTideProgress(), readDifficulty()))
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(readDifficulty)
  const [selectedChapter, setSelectedChapter] = useState(() => Math.floor(nextStageIndex(readTideProgress(), readDifficulty()) % 100 / 10))
  const level = ALL_LEVELS[levelIndex]
  const difficulty = level.difficulty ?? 'easy'
  const difficultyLevels = levelsFor(selectedDifficulty)
  const chapterLevels = difficultyLevels.slice(selectedChapter * 10, selectedChapter * 10 + 10)
  const difficultyCompleted = completed.filter(id => levelsFor(difficulty).some(l => l.id === id)).length
  const mapCompleted = difficultyLevels.filter(l => completed.includes(l.id)).length
  const number = stageNumber(level)
  const [game, setGame] = useState<TideState>(() => createTide(ALL_LEVELS[nextStageIndex(readTideProgress(), readDifficulty())]))
  const [overlay, setOverlay] = useState<'help' | 'map' | 'ice' | 'shell' | 'settings' | 'records' | 'queues' | null>(() => {
    const tutorial = stageTutorial(nextStageIndex(readTideProgress(), readDifficulty()));
    if (tutorial) return tutorial;
    try { return localStorage.getItem('jellyOrbitWelcomeV1') ? null : 'help' } catch { return 'help' }
  })
  const [records, setRecords] = useState(readRecords)
  const [run, setRun] = useState<RunStats>({ launches: 0, undos: 0 })
  const [challengeUnlocked, setChallengeUnlocked] = useState(() => completed.includes(level.id))
  const [muted, setMuted] = useState(true)
  const [fast, setFast] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [notice, setNotice] = useState('')
  const [boardFocus, setBoardFocus] = useState<BoardFocus>('all')
  const [previewLane, setPreviewLane] = useState(0)
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
      const buttons = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), select, a[href], [tabindex="0"]')]
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
    if (!notice) return
    const timer = window.setTimeout(() => { setNotice('') }, 4000)
    return () => clearTimeout(timer)
  }, [notice])
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
    setBoardFocus('all')
    const nextDifficulty = ALL_LEVELS[index].difficulty ?? 'easy'
    setLevelIndex(index); setGame(createTide(ALL_LEVELS[index])); setHistory([]); setNotice(''); setOverlay(null); setPaused(false); lastSound.current = -1
    setSelectedDifficulty(nextDifficulty); rememberDifficulty(nextDifficulty)
    setSelectedChapter(Math.floor(index % 100 / 10))
    setOverlay(stageTutorial(index))
    setRun({ launches: 0, undos: 0 })
    setChallengeUnlocked(completed.includes(ALL_LEVELS[index].id))
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function openMap() {
    setSelectedDifficulty(difficulty); setSelectedChapter(Math.floor((number - 1) / 10)); setOverlay('map')
  }
  function browseDifficulty(next: Difficulty) {
    setSelectedDifficulty(next)
    setSelectedChapter(Math.floor(nextStageIndex(completed, next) % 100 / 10))
  }
  function closeOverlay() {
    if (overlay === 'help') { try { localStorage.setItem('jellyOrbitWelcomeV1', 'seen') } catch { /* The game works without storage. */ } }
    if (overlay === 'ice') rememberIce()
    if (overlay === 'shell') {
      rememberShell()
      if (level.ice.some(Boolean) && stageTutorial(levelIndex) === 'ice') { setOverlay('ice'); return }
    }
    setOverlay(null)
  }
  function send(source: 'lane' | 'pool', index: number) {
    if (paused || overlay) return
    const next = launch(game, source, index)
    if (next === game) {
      setNotice(game.swimmers.length >= CAPACITY ? '軌道上有 3 隻水母，等夥伴返航就能出發。' : '返航位置已預留滿，先派等待區的水母。')
      return
    }
    setHistory(h => [...h.slice(-19), game]); setGame(next); setNotice('')
    setRun(r => ({ ...r, launches: r.launches + 1 }))
  }
  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    setRun(r => ({ ...r, undos: r.undos + 1 }))
    setGame(previous); setHistory(h => h.slice(0, -1)); setNotice('已回到上一次派遣前。'); lastSound.current = -1
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
  const resumeIndex = nextStageIndex(completed, selectedDifficulty)
  function continueJourney() {
    if (resumeIndex === levelIndex && game.phase === 'playing') closeOverlay()
    else start(resumeIndex)
  }

  return <div className="ocean-app">
    <div className="game-screen" inert={Boolean(overlay) || game.phase !== 'playing'}>
    <header className="site-header">
      <a className="wordmark" href="#" onClick={e => { e.preventDefault(); openMap() }} aria-label="Jelly Breakers 水母破陣 關卡圖鑑"><span className="brand-symbol" aria-hidden="true">✳</span><span className="brand-name"><strong>Jelly Breakers</strong><small>水母破陣</small></span></a>
      <div className="level-bar"><span className="level-number" aria-hidden="true">{String(number).padStart(2, '0')}</span><div><span className="eyebrow">{DIFFICULTY_NAMES[difficulty]} · 第 {String(number).padStart(2, '0')} 關</span><h2 title={level.name}>{level.name}</h2></div></div>
      <div className="header-actions"><button className="nav-button" onClick={() => { openMap() }} aria-label="關卡圖鑑"><span aria-hidden="true">▦</span><span className="nav-label">關卡圖鑑</span></button><button className="circle-button" onClick={() => setPaused(p => !p)} aria-label={paused ? '繼續遊戲' : '暫停遊戲'}>{paused ? '▶' : 'Ⅱ'}</button><button className="circle-button" onClick={() => setOverlay('help')} aria-label="遊戲說明">?</button></div>
    </header>
    <main className="main-layout">
      <section className="game-shell" aria-label="Jelly Breakers 水母破陣 遊戲">
        <div className="progress-summary"><div className="progress-row"><span>海洋修復 <b>{progress}%</b></span><span>剩餘 {left} 格</span></div><div className="progress-track" role="progressbar" aria-label="海洋修復進度" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div></div>
        <div className="game-workspace">
        <div className="board-panel">
        <div className="mechanic-bar" aria-label="棋盤機關">
          {level.ice.some(Boolean) && <button className="ice-counter" aria-label={`高亮冰封色塊，剩餘 ${iceLeft} 層冰`} aria-pressed={boardFocus === 'ice'} onClick={() => setBoardFocus(f => f === 'ice' ? 'all' : 'ice')}>❄ {iceLeft}</button>}
          {game.shells.length > 0 && <div className="shell-tracker" aria-label="貝殼解鎖進度">{game.shells.map(group => <button className={isShellClosed(game, group) ? '' : 'opened'} key={group.id} aria-label={`貝殼 ${group.id}，${isShellClosed(game, group) ? `珍珠 ${group.pearls.filter(i => !game.tiles[i]).length}/${group.pearls.length}` : '已開啟'}`} aria-pressed={boardFocus === `shell-${group.id}`} onClick={() => setBoardFocus(f => f === `shell-${group.id}` ? 'all' : `shell-${group.id}`)}><b>{group.id}</b><span>{isShellClosed(game, group) ? `${group.pearls.filter(i => !game.tiles[i]).length}/${group.pearls.length}` : '✓'}</span></button>)}</div>}
          {!level.ice.some(Boolean) && !game.shells.length && <span className="mechanic-note">同色泡泡，從外向內開路。</span>}
          <button className="focus-reset" style={{ visibility: boardFocus === 'all' ? 'hidden' : 'visible' }} onClick={() => setBoardFocus('all')} aria-label="顯示全部色塊">全部</button>
        </div>
        <div className="board-viewport"><div className={`playfield ${paused || overlay || hidden ? 'is-paused' : ''} ${level.shells.length ? 'pearl-field' : level.ice.some(Boolean) ? 'frost-field' : ''}`}>

          <svg className="orbit-svg" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="orbit-flag-fabric" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe1a7" /><stop offset=".55" stopColor="#f4b98a" /><stop offset="1" stopColor="#e89885" /></linearGradient></defs><rect className="track-shadow" x="14" y="14" width="72" height="72" rx="9" /><rect className="track-base" x="14" y="14" width="72" height="72" rx="9" /><rect className="track-dashes" x="14" y="14" width="72" height="72" rx="9" /><path d="M49 14h3l-1.5-1.5M86 49v3l1.5-1.5M51 86h-3l1.5 1.5M14 51v-3l-1.5 1.5" className="track-arrows" /><g className="track-flag"><ellipse className="track-flag-shadow" cx="23" cy="15" rx="2.8" ry="1" /><path className="track-flag-pole" d="M23 3.3v11.3" /><circle className="track-flag-finial" cx="23" cy="3.1" r="1.15" /><path className="track-flag-cloth" d="M23 4.7c2.8-1.1 5.3.5 8.3-.8l-1.1 2.8 1.3 2.5c-3.2-1-5.7.8-8.5-.3Z" /><path className="track-flag-fold" d="M23.5 5.3c2.6-.7 4.7.5 7-.3M23.5 8.3c2.8.8 5-.7 7.1-.2" /><path className="track-flag-sparkle" d="m27 5.2.35 1 .95.35-.95.35-.35 1-.35-1-.95-.35.95-.35Z" /><circle className="track-flag-base" cx="23" cy="14" r="1.85" /><circle className="track-flag-base-inner" cx="23" cy="14" r=".65" /></g></svg>
          <TideBoard game={game} size={level.size} focus={boardFocus} />
          <TideEffects key={level.id} game={game} size={level.size} fast={fast} />
          {game.swimmers.map(jelly => { const [orbitX, orbitY] = orbitPoint(jelly.age, level.size); const x = displayOrbit(orbitX), y = displayOrbit(orbitY); return <div className={`swimmer ${game.effects.some(shot => shot.sourceId === jelly.id && game.tick - shot.tick < 2) ? 'firing' : ''}`} key={jelly.id} style={{ left: `${x}%`, top: `${y}%`, transitionDuration: `${fast ? TICK_MS / 2 : TICK_MS}ms` }}><Jelly jelly={jelly} small /></div> })}
          {paused && <div className="pause-cover"><span>海流暫停了</span><button className="primary" onClick={() => setPaused(false)}>繼續漂流 ▶</button></div>}
        </div></div>
        <div className={`orbit-status status-message ${notice ? 'has-notice' : ''}`} role="status" title={notice || undefined}><span className={game.swimmers.length ? 'live-indicator' : ''} /><span>{notice || (game.swimmers.length ? `${game.swimmers.length} / 3 位夥伴航行中` : run.launches === 0 && level.id === 1 ? '點選前排水母，消除相同顏色' : '海流已就緒')}</span></div>
        </div>
        <div className="controls-panel" aria-label="水母派遣操作">
        <ReturnDock key={level.id} game={game} size={level.size} canPlay={canPlay} onLaunch={index => send('pool', index)} />
        <div className="queue-section"><div className="section-label"><h3>準備出發</h3><small>點水母派遣</small></div><div className="lanes">{game.lanes.map((lane, index) => <div className="lane" key={index}>{lane.length ? <><button className="launch-button" onClick={() => send('lane', index)} disabled={!canPlay} style={{ '--jelly-color': HEX[lane[0].color] } as React.CSSProperties} aria-label={`派遣第${index + 1}列${COLOR_NAMES[lane[0].color]}水母，${lane[0].energy}發泡泡`}><Jelly jelly={lane[0]} /><span>{COLOR_NAMES[lane[0].color]} <i>↑</i></span></button><div className="lane-sequence" aria-label={`第 ${index + 1} 列接續顏色：${lane.slice(1, 5).map(j => COLOR_NAMES[j.color]).join('、') || '無'}`}>{lane.slice(1, 5).map(j => <span key={j.id} title={`${COLOR_NAMES[j.color]}，${j.energy} 發泡泡`} style={{ background: HEX[j.color] }} />)}{lane.length > 5 && <small>+{lane.length - 5}</small>}</div></> : <div className="lane-empty">✓<small>全員出發</small></div>}</div>)}</div></div>
        <div className="game-tools"><button onClick={undo} disabled={!history.length || !canPlay}><span aria-hidden="true">↶</span>撤回</button><button className="queue-preview-button" onClick={() => { setPreviewLane(0); setOverlay('queues') }} aria-label="查看完整出發隊伍" aria-haspopup="dialog"><span aria-hidden="true">≡</span>隊伍</button><button onClick={() => setOverlay('settings')} aria-haspopup="dialog"><span aria-hidden="true">···</span>更多</button></div>
        </div></div>
      </section>
    </main>
    </div>
    {overlay && <div className="modal-backdrop" onClick={closeOverlay}><section className="modal" role="dialog" aria-modal="true" aria-label={overlay === 'queues' ? '完整出發隊伍' : overlay === 'settings' ? '更多選項' : overlay === 'records' ? '航海紀錄' : overlay === 'shell' ? '貝殼鎖教學' : overlay === 'ice' ? '冰封色塊教學' : overlay === 'help' ? '遊戲說明' : '關卡地圖'} onClick={e => e.stopPropagation()}><button autoFocus className="modal-close circle-button" onClick={closeOverlay} aria-label="關閉">×</button><h2>{overlay === 'queues' ? '完整出發隊伍' : overlay === 'settings' ? '照自己的步調' : overlay === 'records' ? '這一趟的足跡' : overlay === 'shell' ? '新發現：珍珠與貝殼鎖' : overlay === 'ice' ? '新發現：冰封色塊' : overlay === 'help' ? '一起，繞個圈。' : '我的海洋圖鑑'}</h2>{overlay === 'queues' ? <div className="queue-preview"><p>遊戲已暫停。由上到下依序出發，只有隊首可以派遣。</p><nav aria-label="選擇隊伍">{game.lanes.map((_, index) => <button key={index} aria-pressed={previewLane === index} onClick={() => setPreviewLane(index)}>第 {index + 1} 列</button>)}</nav><ol>{game.lanes[previewLane].map((j, index) => <li key={j.id}><span className="queue-position">{index === 0 ? '隊首' : index + 1}</span><span className="queue-color" style={{ background: HEX[j.color] }} /><b>{COLOR_NAMES[j.color]}</b><span>{j.energy} 發泡泡</span></li>)}</ol>{!game.lanes[previewLane].length && <p>這列已全部出發。</p>}</div> : overlay === 'settings' ? <div className="settings-list">
      <button onClick={() => void toggleSound()} aria-pressed={!muted}><span>海洋音效</span><b>{muted ? '關閉' : '開啟'}</b></button>
      <button onClick={() => setFast(f => !f)} aria-pressed={fast}><span>漂流速度</span><b>{fast ? '2×' : '1×'}</b></button>
      <button onClick={() => setOverlay('records')}><span>航海紀錄與挑戰</span><b>→</b></button>
      <button onClick={() => start(levelIndex)}><span>重新開始這一關</span><b>↻</b></button>
    </div> : overlay === 'records' ? <div className="record-content"><p>剩餘 {left} 格色塊 · 已派遣 {run.launches} 次</p><p>撤回 {run.undos} 次</p><Challenges record={records[level.id]} par={level.par} unlocked={challengeUnlocked} /><p>撤回不扣回派遣次數；挑戰不影響通關。</p></div> : overlay === 'shell' ? <ShellIntro /> : overlay === 'ice' ? <div className="ice-intro"><p>透明冰殼裡，藏著熟悉的顏色。</p><div className="ice-demo"><div><span className="demo-cube frozen">❄</span><b>冰封</b></div><i>→</i><div><span className="demo-cube" /><b>第 1 發：破冰</b></div><i>→</i><div><span className="demo-pop">✦</span><b>第 2 發：消除</b></div></div><p>兩發都必須是<strong>同色泡泡</strong>。<br />冰破了，色塊仍會擋住後方目標。</p><span className="ice-tip">先打開入口，再讓內層顏色出發。</span></div> : overlay === 'help' ? <><div className="stage-help"><b>{level.name}</b><p>{level.subtitle}</p><p>圓珠是鑰匙，扇形是貝殼；藍角標代表冰封。點上方機關可高亮，點「全部」恢復。</p></div><img className="help-jelly" src={imageFor('aqua')} alt="海藍色水母" /><ol className="help-steps"><li><b>點最前排，出發！</b><span>最多 3 隻水母同時環繞，數字是剩餘泡泡。</span></li><li><b>同色命中，層層打開。</b><span>水母向內射出同色泡泡，從外向內解開圖案。新機關會在旅途中逐步介紹。</span></li><li><b>返航了，再試一次。</b><span>剩餘泡泡會回到小棧：簡單、普通 5 格，困難 4 格。半透明水母是返航預留的位置；綠框表示目前有同色目標。</span></li><li><b>留點空間給下一步。</b><span>小棧塞滿且沒有任何水母能消除，就需要撤回或重玩。隨時可以暫停，沒有時間限制。</span></li></ol></> : <div className="map-list"><p className="collection-summary">{DIFFICULTY_NAMES[selectedDifficulty]}已收藏 {mapCompleted} / 100 · 全部 {completed.length} / 300</p><nav className="difficulty-nav" aria-label="關卡難度">{DIFFICULTIES.map(d => <button key={d} type="button" aria-pressed={selectedDifficulty === d} className={selectedDifficulty === d ? 'selected' : ''} onClick={() => browseDifficulty(d)}><b>{DIFFICULTY_NAMES[d]}</b><small>{levelsFor(d).filter(l => completed.includes(l.id)).length} / 100</small></button>)}</nav><p className="difficulty-description">{selectedDifficulty === 'easy' ? '輕鬆觀察，慢慢打開海洋圖案。五格小棧，容錯較高。' : selectedDifficulty === 'normal' ? '安排出發順序，保留返航空位。五格小棧。' : '提前規劃解鎖順序。四格小棧，派遣失誤更容易卡住。'} 無時間限制，可撤回或重玩。</p><button className="continue-journey" onClick={continueJourney}>繼續冒險 · 第 {String(stageNumber(ALL_LEVELS[resumeIndex])).padStart(2, '0')} 關 →</button><ChapterNavigator selected={selectedChapter} onSelect={setSelectedChapter} />{chapterLevels.map((l) => { const i = ALL_LEVELS.findIndex(candidate => candidate.id === l.id); return <button key={l.id} className={`stage-map-entry ${levelIndex === i ? 'current-stage' : ''}`} aria-current={levelIndex === i ? 'step' : undefined} disabled={!isStageUnlocked(l.id, completed)} onClick={() => start(i)}><MiniArt tiles={l.tiles} size={l.size} /><span><small>第 {String(stageNumber(l)).padStart(2, '0')} 關</small><b>{l.name}</b>{records[l.id] && <small>最佳 {records[l.id].bestLaunches} 次 · {records[l.id].noUndo ? '零撤回 ✓' : '挑戰可重玩'}</small>}</span><em>{completed.includes(l.id) ? '已收藏 ✓' : levelIndex === i ? '探索中' : isStageUnlocked(l.id, completed) ? '→' : '未解鎖'}</em></button> })}</div>}<button className="primary" onClick={closeOverlay}>{overlay === 'shell' ? '出發，尋找珍珠 →' : overlay === 'ice' ? '出發，試試破冰 →' : overlay === 'help' ? '知道了，開始漂流 →' : '回到海流'}</button></section></div>}
    {game.phase !== 'playing' && !overlay && <div className="modal-backdrop"><section className="modal result-modal" role="dialog" aria-modal="true" aria-label={game.phase === 'won' ? '關卡完成' : '等待區已滿'}><span className="eyebrow">{game.phase === 'won' ? 'A LITTLE TREASURE, JUST FOR YOU' : 'LET’S FIND ANOTHER WAY'}</span>{game.phase === 'won' ? <div className="treasure-art"><MiniArt tiles={level.tiles} size={level.size} /><span>✦</span></div> : <img className="help-jelly" src={imageFor('purple')} alt="等待出發的水母" />}<h2>{game.phase === 'won' ? '把美好，收進海裡。' : '海流有點塞住了。'}</h2><p>{game.phase === 'won' ? `「${level.name}」已加入圖鑑。你完成了${DIFFICULTY_NAMES[difficulty]} ${difficultyCompleted} / 100 段旅程！` : '等待區已滿，外層也沒有能命中的顏色。換個出發順序，再試試看。'}</p><div className="result-stats"><span><b>{game.bestCombo}</b>最高連擊</span><span><b>{run.launches}</b>次派遣</span></div><>{game.phase === 'won' && <Challenges record={records[level.id]} par={level.par} unlocked={true} />}{game.phase === 'won' && !challengeUnlocked && <p className="challenge-unlocked">選用挑戰已解鎖，下次重玩可以試試！</p>}</><button autoFocus className="primary" onClick={() => game.phase === 'won' ? (number < 100 ? start(levelIndex + 1) : setOverlay('map')) : undo()}>{game.phase === 'won' ? (number < 100 ? '下一片海，出發 →' : '選擇下一段旅程 →') : '撤回上一次派遣 ↶'}</button><button className="text-button" onClick={() => start(levelIndex)}>再玩一次</button></section></div>}
  </div>
}
