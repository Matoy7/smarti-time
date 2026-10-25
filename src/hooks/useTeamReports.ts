import { useCallback, useMemo, useState } from 'react'
import { APPROVAL_LABEL, REQUEST_TYPE_LABEL, formatMonth, monthKey, shortMonth, typeLabel, type ApprovalStatus, type Employee, type RequestType, type TeamReport } from '@/lib/teamReports'
import { decide as recordDecision, reportsFor, useDecisions } from '@/lib/approvals'
import { useAbsences } from '@/lib/absences'
import { useMonthlySubmissions } from '@/lib/monthlySubmissions'
import { missingReports } from '@/lib/submissions'
import { reminderFor, sendReminders, useReminders, type Reminder } from '@/lib/reminders'
import { downloadFile, toCsv } from '@/lib/exportCsv'

/**
 * Views of the month. ממתינים לאישור + טופלו partition the month's submitted requests (every request
 * is in exactly one); טרם הוגש lists employees who still owe the month's attendance report.
 */
export type TeamTab = 'pending' | 'processed' | 'missing'

/** Tab order (right to left in RTL); the first is the default. Shared by desktop and mobile. */
export const TEAM_TABS: { id: TeamTab; label: string }[] = [
  { id: 'pending', label: 'ממתינים לאישור' },
  { id: 'processed', label: 'טופלו' }, // approved and rejected
  { id: 'missing', label: 'טרם הוגש' },
]

/** Status filter values: the approval statuses plus "not submitted". */
export type StatusFilter = 'all' | ApprovalStatus | 'missing'
export const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'כל הסטטוסים' },
  { value: 'pending', label: APPROVAL_LABEL.pending },
  { value: 'approved', label: APPROVAL_LABEL.approved },
  { value: 'rejected', label: APPROVAL_LABEL.rejected },
  { value: 'missing', label: 'טרם הוגש' },
]

/** Request type filter options (multi-select), in the order managers think of them. */
export const TYPE_OPTIONS: { value: RequestType; label: string }[] = (['attendance', 'vacation', 'sick', 'reserve', 'other'] as RequestType[]).map((value) => ({
  value,
  label: REQUEST_TYPE_LABEL[value],
}))

/** Empty-state line when a tab has nothing this month (no filters applied). */
export const EMPTY_TAB_MESSAGE: Record<TeamTab, string> = {
  pending: 'אין בקשות שממתינות לאישור בחודש זה.',
  processed: 'עדיין לא טופלו בקשות בחודש זה.',
  missing: 'כל העובדים הגישו את דוח הנוכחות לחודש זה.',
}
export const ALL_DEPARTMENTS = 'all'

/** An employee who hasn't submitted the month's attendance report, with the latest reminder sent. */
export type MissingRow = Employee & { month: string; reminder?: Reminder }

const inTab = (tab: Exclude<TeamTab, 'missing'>, status: ApprovalStatus) => (tab === 'pending' ? status === 'pending' : status !== 'pending')
const normalize = (s: string) => s.trim().toLocaleLowerCase('he')

/**
 * דיווחי עובדים — state and actions shared by the desktop table and the mobile list:
 * filters (month, department, status, request types, search) that work together and drive every
 * tab and count; selection and manager approve / reject; reminders for missing reports.
 * Approval decisions live in the shared store (lib/approvals.ts), so the nav badges stay in sync.
 */
export function useTeamReports() {
  const [month, setMonthState] = useState(() => monthKey(new Date()))
  const [department, setDepartmentState] = useState(ALL_DEPARTMENTS)
  const [query, setQueryState] = useState('')
  const [status, setStatusState] = useState<StatusFilter>('all')
  const [types, setTypesState] = useState<ReadonlySet<RequestType>>(() => new Set())
  const [tab, setTabState] = useState<TeamTab>(TEAM_TABS[0].id)
  const decisions = useDecisions()
  const absences = useAbsences()
  const submissions = useMonthlySubmissions()
  const reminders = useReminders()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [announcement, setAnnouncement] = useState('')

  const reports = useMemo<TeamReport[]>(() => reportsFor(month, decisions, absences, submissions), [month, decisions, absences, submissions])
  const missingAll = useMemo(() => missingReports(month, reports), [month, reports])

  // Filters shared by every view: department and search (month via `reports`).
  const matchesPerson = useCallback(
    (e: Employee) => {
      const q = normalize(query)
      return (department === ALL_DEPARTMENTS || e.department === department) && (!q || [e.name, e.role, e.department].some((f) => normalize(f).includes(q)))
    },
    [department, query],
  )
  const typeOk = useCallback((t: RequestType) => types.size === 0 || types.has(t), [types])

  /** Submitted requests under every filter; the tab splits them. */
  const matching = useMemo(
    () => reports.filter((r) => matchesPerson(r) && typeOk(r.requestType) && (status === 'all' || status === r.status)),
    [reports, matchesPerson, typeOk, status],
  )

  /** Missing monthly reports under the filters (they are attendance reports with status "טרם הוגש"). */
  const missing = useMemo<MissingRow[]>(
    () =>
      (status === 'all' || status === 'missing') && typeOk('attendance')
        ? missingAll.filter(matchesPerson).map((e) => ({ ...e, month, reminder: reminderFor(reminders, month, e.id) }))
        : [],
    [missingAll, matchesPerson, typeOk, status, month, reminders],
  )

  const filtered = useMemo(() => (tab === 'missing' ? [] : matching.filter((r) => inTab(tab, r.status))), [matching, tab])

  /** Rows each tab shows under the current filters: the (N) on the tabs. */
  const tabCounts = useMemo<Record<TeamTab, number>>(
    () => ({
      pending: matching.filter((r) => inTab('pending', r.status)).length,
      processed: matching.filter((r) => inTab('processed', r.status)).length,
      missing: missing.length,
    }),
    [matching, missing],
  )

  const pendingCount = useMemo(() => reports.filter((r) => r.status === 'pending').length, [reports])
  const filtersActive = department !== ALL_DEPARTMENTS || query.trim() !== '' || status !== 'all' || types.size > 0

  // Any filter change starts a fresh result set: selection no longer refers to what's shown.
  const resetView = () => setSelected(new Set())
  const setMonth = (v: string) => (setMonthState(v), resetView())
  const setDepartment = (v: string) => (setDepartmentState(v), resetView())
  const setQuery = (v: string) => (setQueryState(v), resetView())
  const setStatus = (v: StatusFilter) => (setStatusState(v), resetView())
  const setTypes = (v: ReadonlySet<RequestType>) => (setTypesState(new Set(v)), resetView())
  const setTab = (v: TeamTab) => (setTabState(v), resetView())
  const clearFilters = () => {
    setDepartmentState(ALL_DEPARTMENTS)
    setQueryState('')
    setStatusState('all')
    setTypesState(new Set())
    resetView()
  }

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /** Select / clear a group of rows (e.g. the visible page). */
  const setMany = useCallback((ids: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
      return next
    })
  }, [])

  const decide = useCallback(
    (ids: string[], decision: Exclude<ApprovalStatus, 'pending'>) => {
      if (!ids.length) return
      recordDecision(month, ids, decision)
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      const verb = decision === 'approved' ? 'אושר' : 'נדחה'
      const one = reports.find((r) => r.id === ids[0])
      setAnnouncement(ids.length === 1 && one ? `הדיווח של ${one.name} ${verb}` : `${ids.length} דיווחים — ${APPROVAL_LABEL[decision]}`)
    },
    [month, reports],
  )

  /**
   * Reminds employees to submit the month's report (in-app notification, lib/reminders.ts).
   * Resolves true only when saved; on failure nothing is marked as sent.
   */
  const remind = useCallback(
    async (ids: string[]): Promise<boolean> => {
      // The screen's reminder banner reports the result (and is announced); nothing here.
      try {
        await sendReminders(month, ids)
        return true
      } catch {
        return false
      }
    },
    [month],
  )

  const shownCount = tab === 'missing' ? missing.length : filtered.length

  /** Downloads what the screen shows (view and all filters — every page) as a CSV file. */
  const exportCsv = () => {
    if (!shownCount) return
    const header = ['שם עובד', 'תפקיד', 'מחלקה', 'סוג', 'סטטוס', 'חודש']
    const rows =
      tab === 'missing'
        ? missing.map((e) => [e.name, e.role, e.department, `${REQUEST_TYPE_LABEL.attendance} ${shortMonth(month)}`, 'טרם הוגש', formatMonth(month)])
        : filtered.map((r) => [r.name, r.role, r.department, typeLabel(r), APPROVAL_LABEL[r.status], formatMonth(r.month)])
    const view = TEAM_TABS.find((x) => x.id === tab)!.label
    const scope = department === ALL_DEPARTMENTS ? '' : ` - ${department}`
    downloadFile(`דיווחי עובדים - ${view}${scope} - ${formatMonth(month)}.csv`, toCsv([header, ...rows]))
    setAnnouncement(`הקובץ יוצא: ${rows.length} עובדים`)
  }

  return {
    exportCsv,
    month,
    setMonth,
    department,
    setDepartment,
    query,
    setQuery,
    status,
    setStatus,
    types,
    setTypes,
    filtersActive,
    clearFilters,
    tab,
    setTab,
    reports,
    filtered,
    missing,
    shownCount,
    total: reports.length,
    pendingCount,
    tabCounts,
    selected,
    toggle,
    setMany,
    clearSelection: () => setSelected(new Set()),
    approve: (ids: string[]) => decide(ids, 'approved'),
    reject: (ids: string[]) => decide(ids, 'rejected'),
    remind,
    announcement,
  }
}
