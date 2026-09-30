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
  const stages = host.querySelectorAll<HTMLButtonElement>('.map-list > button')
  expect(stages).toHaveLength(10)
  expect(stages[0].disabled).toBe(false)
  expect(stages[1].disabled).toBe(true)
  await click('.map-list > button')
  expect(host.querySelector('.level-bar')!.textContent).toContain('普通 · 第 01 關')
  expect(host.querySelectorAll('.dock-slot')).toHaveLength(5)
  await click('.nav-button')
  await click('.difficulty-nav button:nth-child(3)')
  await click('.map-list > button')
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
