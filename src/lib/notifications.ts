import { useMemo } from 'react'
import type { NavId } from './navigation'
import { reportsFor, useDecisions } from './approvals'
import { employeeOf, monthKey, recentMonths } from './teamReports'
import { useAbsences } from './absences'
import { useMonthlySubmissions } from './monthlySubmissions'
import { reminderFor, useReminders } from './reminders'
import { missingReports } from './submissions'
import { hasPermission } from './permissions'
import { USER } from './profile'

export type NavBadge = { count: number; label: string }

/**
 * What needs the user's attention, per navigation destination (shown as an orange circle on the
 * sidebar, the mobile menu and the bottom bar). Derived from app state, so it updates live:
 * - דיווחי עובדים: this month's reports waiting for the manager's approval
 * - הדיווחים שלי: the user's own reports (last 6 months) that were rejected and need correcting,
 *   and manager reminders to submit a monthly report the user still hasn't submitted
 */
export function useNavBadges(user = USER): Partial<Record<NavId, NavBadge>> {
  const decisions = useDecisions()
  const absences = useAbsences()
  const submissions = useMonthlySubmissions()
  const reminders = useReminders()
  return useMemo(() => {
    const badges: Partial<Record<NavId, NavBadge>> = {}
    const months = recentMonths()

    const rejected = months.flatMap((m) => reportsFor(m, decisions, absences, submissions)).filter((r) => employeeOf(r) === user.employeeId && r.status === 'rejected').length
    const reminded = months.filter(
      (m) => reminderFor(reminders, m, user.employeeId) && missingReports(m, reportsFor(m, decisions, absences, submissions)).some((e) => e.id === user.employeeId),
    ).length
    const notes = [
      rejected && (rejected === 1 ? 'דיווח אחד דורש תיקון' : `${rejected} דיווחים דורשים תיקון`),
      reminded && (reminded === 1 ? 'תזכורת להגשת דוח נוכחות' : `${reminded} תזכורות להגשת דוח נוכחות`),
    ].filter(Boolean)
    if (notes.length) badges['my-reports'] = { count: rejected + reminded, label: notes.join(', ') }

    if (hasPermission(user, 'org.attendance.manage')) {
      const pending = reportsFor(monthKey(new Date()), decisions, absences, submissions).filter((r) => r.status === 'pending').length
      if (pending) badges['team-reports'] = { count: pending, label: pending === 1 ? 'בקשה אחת ממתינה לאישור' : `${pending} בקשות ממתינות לאישור` }
    }
    return badges
  }, [decisions, absences, submissions, reminders, user])
}
