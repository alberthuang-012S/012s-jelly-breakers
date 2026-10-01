export type RunStats = { launches: number; undos: number }
export type StageRecord = { bestLaunches: number; bestCombo: number; noUndo: boolean; efficient: boolean; noHint?: boolean }
export type TideRecords = Record<number, StageRecord>
const KEY = 'jellyOrbitRecordsV2'
export function parseRecords(raw: string | null): TideRecords {
  try {
    const value = JSON.parse(raw ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const result: TideRecords = {}
    for (const [key, item] of Object.entries(value)) {
      if (!/^\d+$/.test(key) || Number(key) < 1 || !item || typeof item !== 'object') continue
      const record = item as StageRecord
      if (!Number.isSafeInteger(record.bestLaunches) || record.bestLaunches < 1 || !Number.isSafeInteger(record.bestCombo) || record.bestCombo < 0) continue
      result[Number(key)] = {
        bestLaunches: record.bestLaunches, bestCombo: record.bestCombo,
        noUndo: record.noUndo === true, efficient: record.efficient === true,
        // Keep historic no-hint badges, but never reinterpret them as no-undo wins.
        ...(typeof record.noHint === 'boolean' ? { noHint: record.noHint } : {}),
      }
    }
    return result
  } catch { return {} }
}
export function readRecords(): TideRecords {
  try {
    // Original tutorial stages still have the same boards. Changed stages start
    // new bests; their historic records stay intact in the old storage key.
    const original = Object.fromEntries(Object.entries(parseRecords(localStorage.getItem('jellyOrbitRecordsV1'))).filter(([id]) => Number(id) <= 15))
    return { ...original, ...parseRecords(localStorage.getItem(KEY)) }
  } catch { return {} }
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
    noUndo: Boolean(old?.noUndo || (challengeUnlocked && run.undos === 0)),
    efficient: Boolean(old?.efficient || (challengeUnlocked && run.launches <= par)),
    ...(typeof old?.noHint === 'boolean' ? { noHint: old.noHint } : {}),
  } }
}
