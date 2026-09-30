import { ALL_LEVELS, DIFFICULTIES, levelsFor } from '../game/tide'
import type { Difficulty } from '../game/tide'

// Keep the existing key: a five-stage save automatically unlocks stage six.
export const TIDE_SAVE_KEY = 'jellyOrbitTideV2'
export function parseTideProgress(raw: string | null): number[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(value)
      ? [...new Set(value.filter((v): v is number => Number.isInteger(v) && v >= 1 && v <= ALL_LEVELS.length))].sort((a, b) => a - b)
      : []
  } catch { return [] }
}
export function readTideProgress(): number[] {
  try { return parseTideProgress(localStorage.getItem(TIDE_SAVE_KEY)) } catch { return [] }
}
export function nextStageIndex(completed: number[], difficulty: Difficulty = 'easy'): number {
  const levels = levelsFor(difficulty)
  const next = levels.find(level => !completed.includes(level.id)) ?? levels[levels.length - 1]
  return ALL_LEVELS.findIndex(level => level.id === next.id)
}
export function readDifficulty(): Difficulty {
  try {
    const value = localStorage.getItem('jellyOrbitDifficultyV1')
    return DIFFICULTIES.includes(value as Difficulty) ? value as Difficulty : 'easy'
  } catch { return 'easy' }
}
export function rememberDifficulty(difficulty: Difficulty): void {
  try { localStorage.setItem('jellyOrbitDifficultyV1', difficulty) } catch { /* Optional preference. */ }
}
export function isStageUnlocked(levelId: number, completed: number[]): boolean {
  return (levelId - 1) % 100 === 0 || completed.includes(levelId) || completed.includes(levelId - 1)
}
export function hasSeenIce(): boolean {
  try { return localStorage.getItem('jellyOrbitIceIntroV1') === 'seen' } catch { return false }
}
export function rememberIce(): void {
  try { localStorage.setItem('jellyOrbitIceIntroV1', 'seen') } catch { /* Optional tutorial memory. */ }
}
export function hasSeenShell(): boolean {
  try { return localStorage.getItem('jellyOrbitShellIntroV1') === 'seen' } catch { return false }
}
export function rememberShell(): void {
  try { localStorage.setItem('jellyOrbitShellIntroV1', 'seen') } catch { /* Optional tutorial memory. */ }
}
export function stageTutorial(index: number): 'shell' | 'ice' | null {
  const level = ALL_LEVELS[index]
  if (level.shells.length && !hasSeenShell()) return 'shell'
  if (level.ice.some(Boolean) && !hasSeenIce()) return 'ice'
  return null
}
