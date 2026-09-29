import { expect, it } from 'vitest'
import { parseRecords, recordWin } from './tideRecords'

it('keeps independent personal bests and never erases earned challenges', () => {
  const first = recordWin({}, 11, { launches: 12, hints: 0, undos: 0 }, 8, 15, false)
  expect(first[11]).toEqual({ bestLaunches: 12, bestCombo: 8, noHint: false, efficient: false })
  const replay = recordWin(first, 11, { launches: 14, hints: 0, undos: 2 }, 12, 15, true)
  expect(replay[11]).toEqual({ bestLaunches: 12, bestCombo: 12, noHint: true, efficient: true })
  expect(recordWin(replay, 11, { launches: 20, hints: 3, undos: 4 }, 2, 15, true)[11]).toEqual(replay[11])
})
it('does not award no-hint or launch challenges when their conditions fail', () => {
  expect(recordWin({}, 1, { launches: 20, hints: 1, undos: 0 }, 6, 10, true)[1]).toMatchObject({ noHint: false, efficient: false })
})
it('round-trips valid records and handles corrupt storage', () => {
  const records = recordWin({}, 15, { launches: 9, hints: 0, undos: 0 }, 14, 12, true)
  expect(parseRecords(JSON.stringify(records))).toEqual(records)
  expect(parseRecords('{broken')).toEqual({})
  expect(parseRecords('{"1":{"bestLaunches":-1,"bestCombo":5},"2":{"bestLaunches":5,"bestCombo":6,"noHint":"yes"}}')).toEqual({ 2: { bestLaunches: 5, bestCombo: 6, noHint: false, efficient: false } })
})
