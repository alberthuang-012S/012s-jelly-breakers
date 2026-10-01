// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { readRecords, saveRecords } from './tideRecords'

afterEach(() => localStorage.clear())
it('keeps tutorial bests and historical data while giving redesigned boards independent bests', () => {
  const record = { bestLaunches: 12, bestCombo: 8, noUndo: true, efficient: true }
  const legacy = JSON.stringify({ 1: record, 15: record, 16: record, 101: record })
  localStorage.setItem('jellyOrbitRecordsV1', legacy)
  localStorage.setItem('jellyOrbitTideV2', '[1,15,16,101]')
  expect(readRecords()).toEqual({ 1: record, 15: record })
  saveRecords({ ...readRecords(), 16: { ...record, bestLaunches: 20 } })
  expect(readRecords()[16].bestLaunches).toBe(20)
  expect(localStorage.getItem('jellyOrbitRecordsV1')).toBe(legacy)
  expect(localStorage.getItem('jellyOrbitTideV2')).toBe('[1,15,16,101]')
})
