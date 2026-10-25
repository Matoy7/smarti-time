import { AlertIcon, BellIcon, ChevronIcon, DocumentCheckIcon, InfoIcon } from '@/components/icons'
import { Button } from '@/components/ui'
import { ApprovalBadge } from '@/components/team/ApprovalBadge'
import { ABSENCE_ICON, ABSENCE_LABEL } from '@/components/absence/absenceTypes'
import { formatDate, formatDuration, timeOf, type DayRow } from '@/lib/myReports'
import { formatMonth, type ApprovalStatus } from '@/lib/teamReports'
import type { Absence, AbsenceType } from '@/lib/absences'
import './my-reports.css'

/** "19.10.2026 – 20.10.2026", or one date for a one-day absence. */
export const absenceDates = (a: Pick<Absence, 'from' | 'to'>) => (a.from === a.to ? formatDate(a.from) : `${formatDate(a.from)} – ${formatDate(a.to)}`)

/** Month / year switcher: older month on the right (RTL start), newer on the left. */
export function MonthNav({ month, previous, next }: { month: string; previous?: () => void; next?: () => void }) {
  return (
    <div className="mr-month" role="group" aria-label="בחירת חודש">
      <button type="button" className="mr-month-btn" onClick={previous} disabled={!previous} aria-label="החודש הקודם">
        <ChevronIcon className="icon-flip" size={18} />
      </button>
      <span className="mr-month-label" aria-live="polite">
        {formatMonth(month)}
      </span>
      <button type="button" className="mr-month-btn" onClick={next} disabled={!next} aria-label="החודש הבא">
        <ChevronIcon size={18} />
      </button>
    </div>
  )
}

/** Summary figure: tinted card with a label, the value and an optional line under it. */
export function SummaryCard({ tone, label, value, sub }: { tone: 'green' | 'warm'; label: string; value: string; sub?: string }) {
  return (
    <div className={`mr-stat mr-stat-${tone}`}>
      <div className="mr-stat-copy">
        <span className="mr-stat-label text-label">{label}</span>
        <strong className="mr-stat-value" dir="ltr">
          {value}
        </strong>
        {sub && <span className="mr-stat-sub text-caption">{sub}</span>}
      </div>
    </div>
  )
}

type Submission = {
  /** The month can be sent for approval now (not yet submitted, or rejected) */
  canSubmit?: boolean
  onSubmit?: () => void
  sending?: boolean
  /** What must be fixed before sending (shown after a send attempt) */
  problems?: string[]
  sendError?: boolean
}

/** The month's attendance report approval: one status for the whole month, and "שלח לאישור" when it's due. */
export function MonthlyApproval({
  month,
  status,
  layout,
  remindedOn,
  canSubmit,
  onSubmit,
  sending,
  problems = [],
  sendError,
}: { month: string; status: ApprovalStatus | null; layout: 'row' | 'stack'; remindedOn?: string } & Submission) {
  return (
    <section className={`mr-approval mr-approval-${layout}`} aria-labelledby="mr-approval-title">
      <span className="mr-approval-icon" aria-hidden="true">
        <DocumentCheckIcon size={24} />
      </span>
      <div className="mr-approval-copy">
        <h2 id="mr-approval-title" className="mr-approval-title">
          אישור דוח נוכחות חודשי
        </h2>
        <span className="text-caption text-secondary">{formatMonth(month)}</span>
      </div>
      <span className="mr-approval-status" aria-live="polite">
        {status ? <ApprovalBadge status={status} /> : <ApprovalBadge status="missing" />}
      </span>
      {canSubmit && (
        <Button className="mr-approval-submit" icon={<DocumentCheckIcon size={18} />} onClick={onSubmit} loading={sending}>
          {sending ? 'שולח…' : status === 'rejected' ? 'שליחה מחדש לאישור' : 'שלח לאישור'}
        </Button>
      )}
      {(problems.length > 0 || sendError) && (
        <div className="mr-approval-problems sheet-alert text-label" role="alert">
          <AlertIcon size={18} />
          {sendError ? (
            <span>לא הצלחנו לשלוח את הדוח. לא נשלח דבר — נסו שוב.</span>
          ) : (
            <div>
              <strong>לא ניתן לשלוח את הדוח עדיין:</strong>
              <ul>
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {!status && remindedOn && (
        <p className="mr-approval-reminder text-caption" role="status">
          <BellIcon size={16} />
          <span>המנהל/ת שלח/ה תזכורת להגיש את דוח הנוכחות לחודש זה ({formatDate(remindedOn)}).</span>
        </p>
      )}
      <p className="mr-approval-note text-caption text-secondary">
        <InfoIcon size={16} />
        <span>האישור מתייחס לדיווח החודשי כולו, ולא לכל יום בנפרד.</span>
      </p>
    </section>
  )
}

/** Absence type: orange icon + label. */
export function AbsenceTypeLabel({ type, tile = false }: { type: AbsenceType; tile?: boolean }) {
  const Icon = ABSENCE_ICON[type]
  return (
    <span className={`mr-absence-type ${tile ? 'mr-absence-type-tile' : ''}`.trim()}>
      <span className="mr-absence-icon" aria-hidden="true">
        <Icon size={tile ? 22 : 20} />
      </span>
      {!tile && <span>{ABSENCE_LABEL[type]}</span>}
    </span>
  )
}

/** Notes cell of a day: the absence type, a hand-entered time, or a dash. */
export function dayNote(row: DayRow): string {
  if (row.absence) return ABSENCE_LABEL[row.absence.type]
  if (row.sessions.some((s) => s.manualStart || s.manualEnd)) return 'הוזן ידנית'
  return '–'
}

/** Clock-in / clock-out / total for a row ("–" when there is none). */
export function dayTimes(row: DayRow) {
  const first = row.sessions[0]
  const last = row.sessions[row.sessions.length - 1]
  return {
    in: first ? timeOf(first.start) : '–',
    out: last?.end ? timeOf(last.end) : '–',
    total: row.sessions.length ? formatDuration(row.workedMs) : '–',
  }
}

/** What an expanded day shows: each session (and how it was entered), and the absence with its own status. */
export function DayDetails({ row }: { row: DayRow }) {
  return (
    <div className="mr-day-details">
      {row.absence && (
        <div className="mr-detail-absence">
          <AbsenceTypeLabel type={row.absence.type} />
          <span className="text-label text-secondary">{absenceDates(row.absence)}</span>
          <ApprovalBadge status={row.absence.status} />
          {row.absence.note && <span className="mr-detail-note text-label">{row.absence.note}</span>}
        </div>
      )}
      {row.sessions.length > 0 && (
        <ul className="mr-sessions">
          {row.sessions.map((s, i) => (
            <li key={s.start}>
              <span className="text-label text-secondary">{row.sessions.length > 1 ? `כניסה ${i + 1}` : 'נוכחות'}</span>
              <span dir="ltr" className="mr-session-times">
                {timeOf(s.start)} – {s.end ? timeOf(s.end) : '…'}
              </span>
              {s.end && <span className="text-label text-secondary">({formatDuration(new Date(s.end).getTime() - new Date(s.start).getTime())} שעות)</span>}
              {(s.manualStart || s.manualEnd) && (
                <span className="mr-manual text-caption">{s.manualStart && s.manualEnd ? 'כניסה ויציאה הוזנו ידנית' : s.manualStart ? 'כניסה הוזנה ידנית' : 'יציאה הוזנה ידנית'}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
