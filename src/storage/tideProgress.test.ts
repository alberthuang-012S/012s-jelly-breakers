import { expect, it } from 'vitest'
import { isStageUnlocked, nextStageIndex, parseTideProgress } from './tideProgress'

it('preserves the existing five completions and starts at stage six', () => {
  const completed = parseTideProgress('[1,2,3,4,5]')
  expect(completed).toEqual([1, 2, 3, 4, 5])
  expect(nextStageIndex(completed)).toBe(5)
})
it('keeps difficulty unlocks and resume positions independent, retaining old easy progress', () => {
  const old = Array.from({ length: 100 }, (_, i) => i + 1)
  expect(nextStageIndex(old, 'easy')).toBe(99)
  expect(nextStageIndex(old, 'normal')).toBe(100)
  expect(nextStageIndex(old, 'hard')).toBe(200)
  expect(isStageUnlocked(101, [])).toBe(true)
  expect(isStageUnlocked(201, [])).toBe(true)
  expect(isStageUnlocked(102, old)).toBe(false)
  expect(isStageUnlocked(202, [...old, 101])).toBe(false)
  expect(isStageUnlocked(102, [...old, 101])).toBe(true)
  expect(nextStageIndex([101, 102], 'normal')).toBe(102)
  expect(nextStageIndex([201], 'hard')).toBe(201)
  expect(parseTideProgress('[1,100,101,200,201,300,301,-1]')).toEqual([1, 100, 101, 200, 201, 300])
})
it('keeps new completions, filters invalid values, and finds the first gap', () => {
  const completed = parseTideProgress('[10,1,1,2,4,6,"3",0,16,null]')
  expect(completed).toEqual([1, 2, 4, 6, 10, 16])
  expect(nextStageIndex(completed)).toBe(2)
  expect(nextStageIndex([1,2,3,4,5,6,7,8,9,10])).toBe(10)
  expect(nextStageIndex(Array.from({ length: 15 }, (_, i) => i + 1))).toBe(15)
  expect(nextStageIndex(Array.from({ length: 100 }, (_, i) => i + 1))).toBe(99)
  expect(parseTideProgress('broken')).toEqual([])
})
