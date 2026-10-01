import { expect, it } from 'vitest'
import { parseRecords, recordWin } from './tideRecords'

it('keeps independent personal bests and never erases earned challenges', () => {
  const first = recordWin({}, 11, { launches: 12, undos: 0 }, 8, 15)
  expect(first[11]).toEqual({ bestLaunches: 12, bestCombo: 8, noUndo: true, efficient: true })
  const replay = recordWin(first, 11, { launches: 14, undos: 0 }, 12, 15)
  expect(replay[11]).toEqual({ bestLaunches: 12, bestCombo: 12, noUndo: true, efficient: true })
  expect(recordWin(replay, 11, { launches: 20, undos: 4 }, 2, 15)[11]).toEqual(replay[11])
})
it('does not award no-undo or launch challenges when their conditions fail', () => {
  expect(recordWin({}, 1, { launches: 20, undos: 1 }, 6, 10)[1]).toMatchObject({ noUndo: false, efficient: false })
})
it('evaluates each challenge independently on the first clear, including the exact launch target', () => {
  expect(recordWin({}, 1, { launches: 10, undos: 1 }, 6, 10)[1]).toMatchObject({ noUndo: false, efficient: true })
  expect(recordWin({}, 1, { launches: 11, undos: 0 }, 6, 10)[1]).toMatchObject({ noUndo: true, efficient: false })
})
it('round-trips valid records and handles corrupt storage', () => {
  const records = recordWin({}, 15, { launches: 9, undos: 0 }, 14, 12)
  expect(parseRecords(JSON.stringify(records))).toEqual(records)
  expect(parseRecords('{broken')).toEqual({})
  expect(parseRecords('{"1":{"bestLaunches":-1,"bestCombo":5},"2":{"bestLaunches":5,"bestCombo":6,"noHint":"yes"}}')).toEqual({ 2: { bestLaunches: 5, bestCombo: 6, noUndo: false, efficient: false } })
})
it('preserves historic scores and no-hint badges without inventing a no-undo badge', () => {
  const old = parseRecords('{"11":{"bestLaunches":12,"bestCombo":8,"noHint":true,"efficient":true}}')
  expect(old[11]).toEqual({ bestLaunches: 12, bestCombo: 8, noHint: true, noUndo: false, efficient: true })
  const undone = recordWin(old, 11, { launches: 15, undos: 1 }, 6, 15)
  expect(undone[11]).toEqual(old[11])
  const clean = recordWin(undone, 11, { launches: 15, undos: 0 }, 6, 15)
  expect(clean[11].noUndo).toBe(true)
  expect(clean[11].noHint).toBe(true)
})
