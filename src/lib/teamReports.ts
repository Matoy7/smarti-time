import { USER } from './profile'
import { submitsInApp } from './monthlySubmissions'

/**
 * Employee attendance reports and their manager approval status.
 *
 * DEMO DATA — there is no backend yet (like USER in profile.ts). A real implementation replaces
 * `loadTeamReports` with an API call; everything above it (hook, screens) only uses these types.
 */
export type ApprovalStatus = 'approved' | 'pending' | 'rejected'

/**
 * What the employee asked the manager to approve: the monthly attendance report, or an absence
 * (vacation, sick leave, reserve duty, other — see lib/absences.ts).
 */
export type RequestType = 'attendance' | 'vacation' | 'sick' | 'reserve' | 'other'

export type Employee = {
  id: string
  name: string
  role: string
  department: string
  /** Photo under /public; employees without one get initials */
  photo?: string
  /** First day of employment (YYYY-MM-DD); months before it don't apply to the employee */
  startDate?: string
  /** Not required to submit a monthly attendance report (e.g. a global-hours contract) */
  reportExempt?: boolean
}

export type TeamReport = Employee & {
  /** Report month, YYYY-MM: the month the request is listed under */
  month: string
  /** The month the request is about, when it differs from `month` (an absence submitted ahead) */
  refMonth?: string
  /** Set on submitted absences, whose `id` is the request's own id */
  employeeId?: string
  absence?: { from: string; to: string; note: string }
  status: ApprovalStatus
  requestType: RequestType
}

export const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  approved: 'אושר',
  pending: 'ממתין לאישור',
  rejected: 'נדחה',
}

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  attendance: 'אישור נוכחות',
  vacation: 'אישור חופשה',
  sick: 'אישור מחלה',
  reserve: 'אישור מילואים',
  other: 'היעדרות אחרת',
}

const EMPLOYEES: Employee[] = [
  { id: 'e01', name: 'מיכל לוי', role: 'מנהלת מוצר', department: 'מוצר', photo: 'assets/e53c0.png' },
  { id: 'e02', name: 'אדם ישראלי', role: 'מפתח תוכנה', department: 'פיתוח' },
  { id: 'e03', name: 'נועה כהן', role: 'מעצבת UI/UX', department: 'עיצוב' },
  { id: 'e04', name: 'רועי לוי', role: 'מפתח תוכנה', department: 'פיתוח' },
  { id: 'e05', name: 'תמר אברהם', role: 'מנהלת פרויקטים', department: 'ניהול' },
  { id: 'e06', name: 'יוסי מזרחי', role: 'QA', department: 'בדיקות' },
  { id: 'e07', name: 'שיר דגן', role: 'מפתחת תוכנה', department: 'פיתוח' },
  { id: 'e08', name: 'דניאל כהן', role: 'מנהל צוות', department: 'פיתוח' },
  { id: 'e09', name: 'אורית שמעוני', role: 'רכזת משאבי אנוש', department: 'משאבי אנוש' },
  { id: 'e10', name: 'עומר בן דוד', role: 'מפתח Backend', department: 'פיתוח' },
  { id: 'e11', name: 'ליאת גולן', role: 'מנהלת שיווק', department: 'שיווק' },
  { id: 'e12', name: 'איתי פרץ', role: 'מפתח Frontend', department: 'פיתוח' },
  { id: 'e13', name: 'הילה אזולאי', role: 'מעצבת גרפית', department: 'עיצוב' },
  { id: 'e14', name: 'גיא רוזן', role: 'מהנדס DevOps', department: 'פיתוח' },
  { id: 'e15', name: 'מאיה ברק', role: 'בודקת תוכנה', department: 'בדיקות' },
  { id: 'e16', name: 'אלון חדד', role: 'מנהל תפעול', department: 'תפעול' },
  { id: 'e17', name: 'רותם קפלן', role: 'אנליסטית נתונים', department: 'מוצר' },
  { id: 'e18', name: 'נדב שרון', role: 'מפתח תוכנה', department: 'פיתוח' },
  { id: 'e19', name: 'יעל מור', role: 'מנהלת מוצר', department: 'מוצר' },
  { id: 'e20', name: 'עידו נחום', role: 'מפתח Mobile', department: 'פיתוח' },
  { id: 'e21', name: 'שני וקנין', role: 'רכזת גיוס', department: 'משאבי אנוש' },
  { id: 'e22', name: 'אביב טל', role: 'מעצב מוצר', department: 'עיצוב' },
  { id: 'e23', name: 'קרן אוחיון', role: 'מנהלת חשבונות', department: 'כספים' },
  { id: 'e24', name: 'בן אלמוג', role: 'תומך טכני', department: 'תפעול' },
  { id: 'e25', name: 'דנה פישר', role: 'מנהלת קהילה', department: 'שיווק' },
  { id: 'e26', name: 'אריאל זילבר', role: 'ארכיטקט תוכנה', department: 'פיתוח', reportExempt: true },
  { id: 'e27', name: 'טל ביטון', role: 'בודק אוטומציה', department: 'בדיקות', startDate: '2026-10-11' },
  { id: 'e28', name: 'מורן אשכנזי', role: 'מנהלת משרד', department: 'תפעול', startDate: '2026-08-16' },
]

/** October 2026 matches the approved mockup for the first eight rows. */
const FIXED: Record<string, Record<string, ApprovalStatus>> = {
  /** The signed-in demo user's September report was rejected: drives the הדיווחים שלי notification. */
  '2026-09': { e01: 'rejected' },
  '2026-10': { e01: 'approved', e02: 'rejected', e03: 'pending', e04: 'approved', e05: 'approved', e06: 'pending', e07: 'approved', e08: 'approved' },
}

/** Request types for the October 2026 pending rows in the mockup. */
const FIXED_TYPE: Record<string, Record<string, RequestType>> = {
  '2026-10': { e03: 'vacation', e06: 'sick' },
}

/** Stable pseudo-random 0–99 per employee and month, so demo data doesn't shuffle between renders. */
function roll(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return (h >>> 0) % 100
}

function demoStatus(employeeId: string, month: string, isCurrent: boolean): ApprovalStatus {
  const fixed = FIXED[month]?.[employeeId]
  if (fixed) return fixed
  const r = roll(`${employeeId}:${month}`)
  // The current month still has open approvals; past months are mostly settled.
  if (isCurrent) return r < 62 ? 'approved' : r < 95 ? 'pending' : 'rejected'
  return r < 92 ? 'approved' : r < 96 ? 'pending' : 'rejected'
}

function demoRequestType(employeeId: string, month: string): RequestType {
  // The signed-in user's row is her monthly attendance report (shown in הדיווחים שלי).
  if (employeeId === USER.employeeId) return 'attendance'
  const fixed = FIXED_TYPE[month]?.[employeeId]
  if (fixed) return fixed
  // Most requests are the monthly attendance report; the rest are vacation / sick leave approvals.
  // An employee exempt from the monthly report never submits one.
  const r = roll(`${employeeId}:${month}:type`)
  const exempt = EMPLOYEES.find((e) => e.id === employeeId)?.reportExempt
  return r < 55 && !exempt ? 'attendance' : r < 82 ? 'vacation' : 'sick'
}

/** "2026-10" → "10-26" (MM-YY), the month a request refers to. */
export const shortMonth = (month: string) => `${month.slice(5, 7)}-${month.slice(2, 4)}`

/** סוג column: what is being approved and for which month, e.g. "אישור נוכחות 10-26". Same in every view. */
export const typeLabel = (r: TeamReport) => `${REQUEST_TYPE_LABEL[r.requestType]} ${shortMonth(r.refMonth ?? r.month)}`

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const monthFormat = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' })
/** "2026-10" → "אוקטובר 2026" */
export const formatMonth = (key: string) => monthFormat.format(new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1))

/** The selectable report months: the current month and the five before it, newest first. */
export function recentMonths(now = new Date(), count = 6): string[] {
  return Array.from({ length: count }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))
}

/** Last day of a month, YYYY-MM-DD. */
const monthEnd = (month: string) => {
  const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)
  return `${month}-${String(d.getDate()).padStart(2, '0')}`
}

/** Employed during the month (on any day of it). */
export const isEmployedIn = (e: Employee, month: string) => !e.startDate || e.startDate <= monthEnd(month)

/** Must submit a monthly attendance report for the month: employed then and not exempt. */
export const requiresMonthlyReport = (e: Employee, month: string) => isEmployedIn(e, month) && !e.reportExempt

/** The employees a month applies to. */
export const employeesIn = (month: string) => EMPLOYEES.filter((e) => isEmployedIn(e, month))

export function loadTeamReports(month: string, now = new Date()): TeamReport[] {
  const isCurrent = month === monthKey(now)
  // The signed-in user's report from APP_SUBMISSION_FROM on is a real submission (lib/approvals.ts).
  return employeesIn(month).filter((e) => !submitsInApp(e.id, month, USER.employeeId)).map((e) => ({ ...e, month, status: demoStatus(e.id, month, isCurrent), requestType: demoRequestType(e.id, month) }))
}

/** The employee a request belongs to (demo rows use the employee id as the request id). */
export const employeeOf = (r: TeamReport) => r.employeeId ?? r.id

/** An employee's details, for requests submitted in the app (absences). */
export const findEmployee = (id: string) => EMPLOYEES.find((e) => e.id === id)

/** Departments in the data, alphabetical (Hebrew collation). */
export const DEPARTMENTS = [...new Set(EMPLOYEES.map((e) => e.department))].sort((a, b) => a.localeCompare(b, 'he'))

/** Up to two initials, e.g. "מיכל לוי" → "מל". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
}
