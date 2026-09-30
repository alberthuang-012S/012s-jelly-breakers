// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import { TICK_MS, createTide, launch, levelsFor, stepTide } from './game/tide'
import { TIDE_SAVE_KEY, readTideProgress } from './storage/tideProgress'
import { readRecords } from './storage/tideRecords'

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  localStorage.clear()
  for (const key of ['jellyOrbitWelcomeV1', 'jellyOrbitIceIntroV1', 'jellyOrbitShellIntroV1']) localStorage.setItem(key, 'seen')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  host = document.createElement('div'); document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(() => root.unmount())
  host.remove(); vi.useRealTimers(); vi.restoreAllMocks()
})
async function click(selector: string) {
  const button = host.querySelector<HTMLButtonElement>(selector)
  expect(button, selector).not.toBeNull()
  expect(button!.disabled).toBe(false)
  await act(() => button!.click())
}
it('switches difficulty with separate unlocks and resets the game to the correct dock size', async () => {
  localStorage.setItem(TIDE_SAVE_KEY, '[1,2,3]')
  await act(() => root.render(createElement(App)))
  expect(host.querySelector('.level-bar')!.textContent).toContain('簡單 · 第 04 關')
  await click('.nav-button')
  await click('.difficulty-nav button:nth-child(2)')
  expect(host.querySelector('.collection-summary')!.textContent).toContain('普通已收藏 0 / 100')
  const stages = host.querySelectorAll<HTMLButtonElement>('.stage-map-entry')
  expect(stages).toHaveLength(10)
  expect(stages[0].disabled).toBe(false)
  expect(stages[1].disabled).toBe(true)
  await click('.stage-map-entry')
  expect(host.querySelector('.level-bar')!.textContent).toContain('普通 · 第 01 關')
  expect(host.querySelectorAll('.dock-slot')).toHaveLength(5)
  await click('.nav-button')
  await click('.difficulty-nav button:nth-child(3)')
  await click('.stage-map-entry')
  expect(host.querySelector('.level-bar')!.textContent).toContain('困難 · 第 01 關')
  expect(host.querySelectorAll('.dock-slot')).toHaveLength(4)
  expect(localStorage.getItem('jellyOrbitDifficultyV1')).toBe('hard')
  expect(readTideProgress()).toEqual([1, 2, 3])
  await act(() => root.unmount())
  root = createRoot(host)
  await act(() => root.render(createElement(App)))
  expect(host.querySelector('.level-bar')!.textContent).toContain('困難 · 第 01 關')
})
it('records a normal win under its own ID and continues within that difficulty', async () => {
  localStorage.setItem(TIDE_SAVE_KEY, '[1]')
  localStorage.setItem('jellyOrbitDifficultyV1', 'normal')
  await act(() => root.render(createElement(App)))
  const level = levelsFor('normal')[0]
  let model = createTide(level)
  for (const id of level.solution!) {
    const pool = model.pool.findIndex(j => j.id === id)
    const lane = model.lanes.findIndex(l => l[0]?.id === id)
    await click(pool >= 0 ? `.dock-slot.occupied:nth-child(${pool + 1})` : `.lane:nth-child(${lane + 1}) .launch-button`)
    model = launch(model, pool >= 0 ? 'pool' : 'lane', pool >= 0 ? pool : lane)
    while (model.swimmers.length && model.phase === 'playing') model = stepTide(model, level.size)
    await act(() => vi.advanceTimersByTime((level.size * 8 + 16) * TICK_MS))
  }
  expect(host.querySelector('.result-modal')).not.toBeNull()
  expect(readTideProgress()).toEqual([1, 101])
  expect(readRecords()[101].bestLaunches).toBe(level.solution!.length)
  expect(readRecords()[1]).toBeUndefined()
  await click('.result-modal .primary')
  expect(host.querySelector('.level-bar')!.textContent).toContain('普通 · 第 02 關')
  expect(host.querySelectorAll('.dock-slot.occupied')).toHaveLength(0)
})
it('shows reserved return slots and pauses while inspecting the board or the full queue', async () => {
  localStorage.setItem('jellyOrbitDifficultyV1', 'hard')
  await act(() => root.render(createElement(App)))
  await click('.lane:nth-child(1) .launch-button')
  expect(host.querySelector('.dock-capacity')!.textContent).toBe('停泊 0 · 返航預留 1 · 可用 3')
  await click('.board-tools button')
  expect(host.querySelector('.enlarged-board')).not.toBeNull()
  const before = host.querySelector('.dock-capacity')!.textContent
  await act(() => vi.advanceTimersByTime(20000))
  expect(host.querySelector('.dock-capacity')!.textContent).toBe(before)
  await click('.modal-close')
  await click('.queue-preview-button')
  expect(host.querySelectorAll('.queue-preview li')).toHaveLength(levelsFor('hard')[0].lanes[0].length - 1)
  expect(host.querySelector('.queue-preview li')!.textContent).toContain('隊首')
  expect(host.querySelector('.queue-preview li')!.textContent).toContain('發泡泡')
  await click('.modal-close')
  await act(() => vi.advanceTimersByTime(20000))
  expect(host.querySelector('.dock-capacity')!.textContent).toBe('停泊 1 · 返航預留 0 · 可用 3')
})
it('continues the current attempt from a compact chapter picker without resetting it', async () => {
  await act(() => root.render(createElement(App)))
  await click('.launch-button')
  await click('.nav-button')
  expect(host.querySelector('select')!.options).toHaveLength(10)
  expect(host.querySelector('.continue-journey')!.textContent).toContain('第 01 關')
  await click('.continue-journey')
  expect(host.querySelector('[role="dialog"]')).toBeNull()
  expect(host.querySelector('.dock-capacity')!.textContent).toContain('返航預留 1')
})
it('removes hints from controls and shows no-undo challenges without automatic legacy awards', async () => {
  localStorage.setItem(TIDE_SAVE_KEY, '[1]')
  localStorage.setItem('jellyOrbitRecordsV1', '{"1":{"bestLaunches":10,"bestCombo":6,"noHint":true,"efficient":true}}')
  await act(() => root.render(createElement(App)))
  expect(host.querySelectorAll('.game-tools button')).toHaveLength(2)
  expect(host.querySelector('.game-tools')!.textContent).not.toContain('提示')
  await click('.nav-button')
  await click('.stage-map-entry')
  await click('.game-tools button:last-child')
  const recordButton = [...host.querySelectorAll<HTMLButtonElement>('.settings-list button')].find(b => b.textContent!.includes('航海紀錄與挑戰'))!
  await act(() => recordButton.click())
  expect(host.querySelector('.record-content')!.textContent).not.toContain('提示')
  expect(host.querySelector('.challenge-badges')!.textContent).toContain('不用撤回')
  expect(host.querySelector('.challenge-badges span:last-child')!.classList.contains('earned')).toBe(false)
})
