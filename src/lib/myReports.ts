/**
 * הדיווחים שלי — a month of the signed-in user's attendance, computed from the records:
 * daily rows (punches / manual entries), absence days, monthly totals and target.
 *
 * Sources:
 * - Attendance: days recorded in this browser (useAttendanceDay: current day + archive).
 *   DEMO DATA — there is no backend yet, so earlier working days of the demo user come from
 *   `demoAttendance` below (deterministic, like the team reports); a day recorded in the app
 *   always replaces the demo day.
 * - Absences: the user's absence reports (lib/absences.ts), each with its own approval status.
 */
import type { Session } from '@/hooks/useAttendanceDay'
import { workedMs } from '@/hooks/useAttendanceDay'
import { dayKey, type Absence } from './absences'
import type { ApprovalStatus } from './teamReports'

/** Standard working day used for the monthly target. */
export const DAILY_TARGET_MS = 8 * 60 * 60 * 1000

/** Israeli work week: Sunday–Thursday. */
export const isWorkday = (d: Date) => d.getDay() <= 4

const WEEKDAY = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
export const weekdayLetter = (d: Date) => WEEKDAY[d.getDay()]

const pad = (n: number) => String(n).padStart(2, '0')
/** 30600000 → "8:30"; 635400000 → "176:30" */
export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60000))
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`
}
export const timeOf = (iso: string) => {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** "2026-10-23" → "23.10.2026" / short "23.10" */
export const formatDate = (key: string, short = false) => (short ? `${key.slice(8, 10)}.${key.slice(5, 7)}` : `${key.slice(8, 10)}.${key.slice(5, 7)}.${key.slice(0, 4)}`)

const parseKey = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)))

/** Every date of a month (YYYY-MM). */
export function monthDates(month: string): Date[] {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7)) - 1
  const out: Date[] = []
  for (let d = new Date(y, m, 1); d.getMonth() === m; d = new Date(y, m, d.getDate() + 1)) out.push(d)
  return out
}

// ---- demo attendance (stands in for the server's history) ----
function roll(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return (h >>> 0) % 100
}

const at = (key: string, minutes: number) => {
  const d = parseKey(key)
  d.setMinutes(minutes)
  return d.toISOString()
}

/** Demo sessions for a past working day: in 08:00–08:39, out 16:00–17:09; now and then a mid-day break. */
export function demoAttendance(employeeId: string, key: string): Session[] {
  const r = roll(`${employeeId}:${key}`)
  const start = 8 * 60 + (r % 40)
  const end = 16 * 60 + ((r * 7) % 70)
  if (r < 10) {
    // Left for an errand and came back: two sessions.
    return [
      { start: at(key, start), end: at(key, 12 * 60 + 30) },
      { start: at(key, 13 * 60 + 15), end: at(key, end) },
    ]
  }
  return [{ start: at(key, start), end: at(key, end) }]
}

// ---- month model ----
export type DayRow = {
  key: string // YYYY-MM-DD
  date: Date
  sessions: Session[]
  workedMs: number
  /** An absence (pending or approved) covering this day */
  absence: (Absence & { status: ApprovalStatus }) | null
  /** Has something to show when expanded (several sessions, hand-entered times or an absence) */
  expandable: boolean
}

export type MonthModel = {
  rows: DayRow[] // newest first
  workedMs: number
  targetMs: number
  daysWorked: number
  workdays: number
  /** The user's absences that touch the month, newest first, each with its own status */
  absences: (Absence & { status: ApprovalStatus })[]
}

type Input = {
  month: string
  employeeId: string
  /** Recorded days (readAttendanceHistory) */
  recorded: Record<string, Session[]>
  absences: Absence[]
  statusOf: (a: Absence) => ApprovalStatus
  now: Date
}

export function buildMonth({ month, employeeId, recorded, absences, statusOf, now }: Input): MonthModel {
  const today = dayKey(now)
  const mine = absences
    .filter((a) => a.employeeId === employeeId && a.from.slice(0, 7) <= month && a.to.slice(0, 7) >= month)
    .map((a) => ({ ...a, status: statusOf(a) }))
    .sort((a, b) => (a.from === b.from ? b.submittedAt.localeCompare(a.submittedAt) : b.from.localeCompare(a.from)))
  // A rejected absence no longer marks its days.
  const absenceOn = (key: string) => mine.find((a) => a.status !== 'rejected' && a.from <= key && key <= a.to) ?? null

  const dates = monthDates(month)
  const workdays = dates.filter(isWorkday)
  const rows: DayRow[] = []
  for (const date of dates) {
    const key = dayKey(date)
    const absence = isWorkday(date) || recorded[key] ? absenceOn(key) : null
    // Recorded in the app wins; otherwise past working days without an absence use the demo history.
    const sessions = recorded[key] ?? (key < today && isWorkday(date) && !absence ? demoAttendance(employeeId, key) : [])
    if (!sessions.length && !absence) continue
    if (!sessions.length && absence && !isWorkday(date)) continue
    rows.push({
      key,
      date,
      sessions,
      workedMs: workedMs(sessions, now),
      absence,
      expandable: Boolean(absence) || sessions.length > 1 || sessions.some((s) => s.manualStart || s.manualEnd),
    })
  }
  rows.reverse()

  const approvedAbsenceDays = workdays.filter((d) => {
    const a = absenceOn(dayKey(d))
    return a?.status === 'approved'
  }).length

  return {
    rows,
    workedMs: rows.reduce((sum, r) => sum + r.workedMs, 0),
    targetMs: (workdays.length - approvedAbsenceDays) * DAILY_TARGET_MS,
    daysWorked: rows.filter((r) => r.sessions.length > 0).length,
    workdays: workdays.length,
    absences: mine,
  }
}

/**
 * What blocks sending a month's report for approval: a day with a clock-in but no clock-out, and
 * working days already past (before today) with neither attendance nor an absence report (pending
 * or approved). Each problem is a Hebrew sentence saying what to fix.
 */
export function submissionProblems(model: MonthModel, month: string, now: Date): string[] {
  const today = dayKey(now)
  const problems: string[] = []
  const open = model.rows.filter((r) => r.sessions.some((s) => s.end === null))
  for (const r of open)
    problems.push(
      r.key === today
        ? `נרשמה כניסה היום (${formatDate(r.key, true)}) בלי יציאה — יש לדווח יציאה לפני השליחה.`
        : `חסרה שעת יציאה ב-${formatDate(r.key, true)} — יש להשלים אותה בהכנסה ידנית של שעה.`,
    )
  const covered = new Set(model.rows.filter((r) => r.sessions.length || r.absence).map((r) => r.key))
  const missing = monthDates(month)
    .filter((d) => isWorkday(d) && dayKey(d) < today && !covered.has(dayKey(d)))
    .map((d) => formatDate(dayKey(d), true))
  if (missing.length) problems.push(`חסר דיווח נוכחות או היעדרות ל${missing.length === 1 ? 'יום' : 'ימים'}: ${missing.join(', ')}.`)
  return problems
}
