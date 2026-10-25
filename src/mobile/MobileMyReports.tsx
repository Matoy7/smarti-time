import { useState } from 'react'
import { useMyReports } from '@/hooks/useMyReports'
import { navigate } from '@/lib/router'
import { ChevronDownIcon, ChevronIcon, PlusIcon } from '@/components/icons'
import { ApprovalBadge } from '@/components/team/ApprovalBadge'
import { ABSENCE_LABEL } from '@/components/absence/absenceTypes'
import { AbsenceTypeLabel, DayDetails, MonthNav, MonthlyApproval, SummaryCard, absenceDates, dayNote, dayTimes } from '@/components/myReports/parts'
import { formatDate, formatDuration, weekdayLetter } from '@/lib/myReports'
import { MobileShell } from './MobileShell'
import './my-reports-mobile.css'

/** Days shown before "הצג את כל הימים". */
const FIRST_DAYS = 7

/** הדיווחים שלי — mobile: stacked summary, a compact daily list and absence cards. Same data as desktop. */
export function MobileMyReports() {
  const m = useMyReports()
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const rows = all ? m.rows : m.rows.slice(0, FIRST_DAYS)

  return (
    <MobileShell>
      <div className="m-mr">
        <h1 className="sr-only" data-page-title tabIndex={-1}>
          הדיווחים שלי
        </h1>

        <MonthNav
          month={m.month}
          previous={m.previous && (() => (m.previous!(), setAll(false), setOpen(null)))}
          next={m.next && (() => (m.next!(), setAll(false), setOpen(null)))}
        />

        <div className="m-mr-stats">
          <SummaryCard tone="warm" label="תקן שעות" value={formatDuration(m.targetMs)} sub={`${m.daysWorked} מתוך ${m.workdays} ימי עבודה`} />
          <SummaryCard tone="green" label="שעות עבודה בפועל" value={formatDuration(m.workedMs)} sub={`מתוך ${formatDuration(m.targetMs)} שעות תקן`} />
        </div>

        <MonthlyApproval
          month={m.month}
          status={m.approval}
          layout="stack"
          remindedOn={m.remindedOn}
          canSubmit={m.canSubmit}
          onSubmit={m.submit}
          sending={m.sending}
          problems={m.problems}
          sendError={m.sendError}
        />

        <section className="m-mr-section" aria-labelledby="m-mr-days">
          <h2 id="m-mr-days" className="mr-section-title">
            דיווחים יומיים
          </h2>
          <div className="mr-card">
            {m.rows.length > 0 ? (
              <>
                <div className="m-mr-head text-caption text-tertiary" aria-hidden="true">
                  <span>תאריך</span>
                  <span>כניסה</span>
                  <span>יציאה</span>
                  <span>סה״כ</span>
                  <span />
                </div>
                <ul className="m-mr-days">
                  {rows.map((row) => {
                    const t = dayTimes(row)
                    const expanded = open === row.key
                    const summary = row.absence
                      ? `${ABSENCE_LABEL[row.absence.type]}${row.sessions.length ? `, כניסה ${t.in}, יציאה ${t.out}` : ''}`
                      : `כניסה ${t.in}, יציאה ${t.out}, סה״כ ${t.total} שעות${dayNote(row) !== '–' ? `, ${dayNote(row)}` : ''}`
                    const cells = (
                      <>
                        <span className="m-mr-date">
                          {weekdayLetter(row.date)} {formatDate(row.key, true)}
                        </span>
                        <span dir="ltr">{t.in}</span>
                        <span dir="ltr">{t.out}</span>
                        <span dir="ltr">{row.absence && !row.sessions.length ? <span className="m-mr-absence-tag">{ABSENCE_LABEL[row.absence.type]}</span> : t.total}</span>
                      </>
                    )
                    return (
                      <li key={row.key} className={row.absence ? 'm-mr-absence' : undefined}>
                        {row.expandable ? (
                          <button
                            type="button"
                            className="m-mr-day"
                            aria-expanded={expanded}
                            aria-controls={`m-mr-${row.key}`}
                            aria-label={`${weekdayLetter(row.date)} ${formatDate(row.key)}: ${summary}`}
                            onClick={() => setOpen(expanded ? null : row.key)}
                          >
                            {cells}
                            <ChevronIcon className="m-mr-chevron" size={16} />
                          </button>
                        ) : (
                          <div className="m-mr-day" role="group" aria-label={`${weekdayLetter(row.date)} ${formatDate(row.key)}: ${summary}`}>
                            {cells}
                            <span />
                          </div>
                        )}
                        {row.expandable && expanded && (
                          <div id={`m-mr-${row.key}`} className="m-mr-details">
                            <DayDetails row={row} />
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {m.rows.length > FIRST_DAYS && (
                  <button type="button" className="m-mr-all" aria-expanded={all} onClick={() => setAll(!all)}>
                    {all ? 'הצג פחות ימים' : 'הצג את כל הימים'}
                    <ChevronDownIcon size={16} className={all ? 'm-mr-flip' : undefined} />
                  </button>
                )}
              </>
            ) : (
              <p className="mr-empty">אין דיווחי נוכחות בחודש זה.</p>
            )}
          </div>
        </section>

        <section className="m-mr-section" aria-labelledby="m-mr-absences">
          <div className="mr-section-head">
            <h2 id="m-mr-absences" className="mr-section-title">
              דיווחי היעדרות
            </h2>
            <button type="button" className="mr-new-absence mr-new-absence-link" onClick={() => navigate('absences')}>
              <PlusIcon size={16} />
              דיווח היעדרות חדש
            </button>
          </div>
          {m.absences.length > 0 ? (
            <ul className="m-mr-absences">
              {m.absences.map((a) => (
                <li key={a.id} className="mr-card m-mr-absence-card">
                  <AbsenceTypeLabel type={a.type} tile />
                  <div className="m-mr-absence-copy">
                    <strong>{ABSENCE_LABEL[a.type]}</strong>
                    <span className="text-caption text-secondary">{absenceDates(a)}</span>
                    {a.note && <span className="text-caption m-mr-absence-note">{a.note}</span>}
                  </div>
                  <ApprovalBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mr-card mr-empty">אין דיווחי היעדרות בחודש זה.</p>
          )}
        </section>
      </div>
    </MobileShell>
  )
}
