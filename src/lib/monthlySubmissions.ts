import { useSyncExternalStore } from 'react'

/**
 * Monthly attendance reports submitted for manager approval from הדיווחים שלי ("שלח לאישור").
 *
 * The signed-in user's monthly report from APP_SUBMISSION_FROM on is submitted through the app;
 * earlier months keep their demo history (lib/teamReports.ts). Saved in this browser's
 * localStorage with write verification (no backend yet — the same data layer as attendance,
 * absences and decisions), and listed for the manager in דיווחי עובדים (lib/approvals.ts) as a
 * pending "אישור נוכחות" request.
 */
export const APP_SUBMISSION_FROM = '2026-10'

export type MonthlySubmission = { id: string; employeeId: string; month: string; submittedAt: string }

const STORAGE_KEY = 'smartime.monthly-reports.v1'

function read(): MonthlySubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

let cache: MonthlySubmission[] | null = null
const listeners = new Set<() => void>()

export function getSubmissions(): MonthlySubmission[] {
  if (!cache) cache = read()
  return cache
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return
    cache = read()
    onChange()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function useMonthlySubmissions(): MonthlySubmission[] {
  return useSyncExternalStore(subscribe, getSubmissions)
}

/** Whether a month's report for this employee goes through the app (instead of the demo history). */
export const submitsInApp = (employeeId: string, month: string, selfId: string) => employeeId === selfId && month >= APP_SUBMISSION_FROM

/** The latest submission of an employee's report for a month (a rejected report can be sent again). */
export function latestSubmission(list: MonthlySubmission[], employeeId: string, month: string): MonthlySubmission | undefined {
  // Same timestamp: the one saved later (later in the list) wins.
  return list.reduce<MonthlySubmission | undefined>(
    (latest, s) => (s.employeeId === employeeId && s.month === month && (!latest || s.submittedAt >= latest.submittedAt) ? s : latest),
    undefined,
  )
}

export class SubmissionError extends Error {}

/** Saves a submission and reads it back; rejects (saving nothing) when storage fails. */
export async function saveSubmission(employeeId: string, month: string): Promise<MonthlySubmission> {
  const now = new Date()
  const list = read()
  // Unique per send (a resubmission never inherits the previous one's decision), even within the same millisecond.
  const sent = list.filter((s) => s.employeeId === employeeId && s.month === month).length
  const submission: MonthlySubmission = { id: `report-${employeeId}-${month}-${now.getTime().toString(36)}-${sent + 1}`, employeeId, month, submittedAt: now.toISOString() }
  const next = [...list, submission]
  try {
    const raw = JSON.stringify(next)
    localStorage.setItem(STORAGE_KEY, raw)
    if (localStorage.getItem(STORAGE_KEY) !== raw) throw new Error('not saved')
  } catch {
    throw new SubmissionError('storage')
  }
  cache = next
  listeners.forEach((l) => l())
  return submission
}
