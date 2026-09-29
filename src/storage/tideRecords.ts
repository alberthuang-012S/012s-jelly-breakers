export type RunStats = { launches: number; hints: number; undos: number }
export type StageRecord = { bestLaunches: number; bestCombo: number; noHint: boolean; efficient: boolean }
export type TideRecords = Record<number, StageRecord>
const KEY = 'jellyOrbitRecordsV1'
export function parseRecords(raw: string | null): TideRecords {
  try {
    const value = JSON.parse(raw ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const result: TideRecords = {}
    for (const [key, item] of Object.entries(value)) {
      if (!/^\d+$/.test(key) || Number(key) < 1 || !item || typeof item !== 'object') continue
      const record = item as StageRecord
      if (!Number.isSafeInteger(record.bestLaunches) || record.bestLaunches < 1 || !Number.isSafeInteger(record.bestCombo) || record.bestCombo < 0) continue
      result[Number(key)] = { bestLaunches: record.bestLaunches, bestCombo: record.bestCombo, noHint: record.noHint === true, efficient: record.efficient === true }
    }
    return result
  } catch { return {} }
}
export function readRecords(): TideRecords {
  try { return parseRecords(localStorage.getItem(KEY)) } catch { return {} }
}
export function saveRecords(records: TideRecords): void {
  try { localStorage.setItem(KEY, JSON.stringify(records)) } catch { /* Keep the current session playable. */ }
}
export function recordWin(records: TideRecords, stageId: number, run: RunStats, combo: number, par: number, challengeUnlocked: boolean): TideRecords {
  if (!Number.isSafeInteger(run.launches) || run.launches < 1) return records
  const old = records[stageId]
  return { ...records, [stageId]: {
    bestLaunches: Math.min(old?.bestLaunches ?? Infinity, run.launches),
    bestCombo: Math.max(old?.bestCombo ?? 0, combo),
    noHint: Boolean(old?.noHint || (challengeUnlocked && run.hints === 0)),
    efficient: Boolean(old?.efficient || (challengeUnlocked && run.launches <= par)),
  } }
}
