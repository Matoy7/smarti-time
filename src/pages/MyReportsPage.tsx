import { Fragment, useState } from 'react'
import { useMyReports } from '@/hooks/useMyReports'
import { navigate } from '@/lib/router'
import { CalendarIcon, ChevronDownIcon, PlusIcon } from '@/components/icons'
import { ApprovalBadge } from '@/components/team/ApprovalBadge'
import { AbsenceTypeLabel, DayDetails, MonthNav, MonthlyApproval, SummaryCard, absenceDates, dayNote, dayTimes } from '@/components/myReports/parts'
import { formatDate, formatDuration, weekdayLetter } from '@/lib/myReports'

/** הדיווחים שלי — desktop. A month of the user's attendance and absence reports. */
export function MyReportsPage() {
  const m = useMyReports()
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="page page-wide mr-page">
      <header className="page-header">
        <h1 className="text-title" data-page-title tabIndex={-1}>
          הדיווחים שלי
        </h1>
      </header>

      <div className="mr-toolbar">
        <MonthNav month={m.month} previous={m.previous} next={m.next} />
        <button type="button" className="mr-today" onClick={m.toCurrent} disabled={m.isCurrent} aria-label="מעבר לחודש הנוכחי" title="החודש הנוכחי">
          <CalendarIcon size={20} />
        </button>
      </div>

      <div className="mr-stats">
        <SummaryCard tone="warm" label="ימי עבודה" value={String(m.daysWorked)} sub={`מתוך ${m.workdays} ימי עבודה`} />
        <SummaryCard tone="warm" label="תקן שעות" value={formatDuration(m.targetMs)} />
        <SummaryCard tone="green" label="שעות עבודה בפועל" value={formatDuration(m.workedMs)} sub={`מתוך ${formatDuration(m.targetMs)} שעות תקן`} />
      </div>

      <MonthlyApproval
        month={m.month}
        status={m.approval}
        layout="row"
        remindedOn={m.remindedOn}
        canSubmit={m.canSubmit}
        onSubmit={m.submit}
        sending={m.sending}
        problems={m.problems}
        sendError={m.sendError}
      />

      <section className="mr-section" aria-labelledby="mr-days-title">
        <h2 id="mr-days-title" className="mr-section-title">
          דיווחים יומיים
        </h2>
        <div className="mr-card">
          <table className="mr-table">
            <thead>
              <tr>
                <th scope="col">תאריך</th>
                <th scope="col">יום</th>
                <th scope="col">כניסה</th>
                <th scope="col">יציאה</th>
                <th scope="col">סה״כ שעות</th>
                <th scope="col">הערות</th>
                <th scope="col" className="mr-col-toggle">
                  <span className="sr-only">פרטים</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {m.rows.map((row) => {
                const t = dayTimes(row)
                const expanded = open.has(row.key)
                return (
                  <Fragment key={row.key}>
                    <tr className={`${row.absence ? 'mr-row-absence' : ''} ${expanded ? 'mr-row-open' : ''}`.trim() || undefined}>
                      <th scope="row">{formatDate(row.key)}</th>
                      <td>{weekdayLetter(row.date)}</td>
                      <td dir="ltr">{t.in}</td>
                      <td dir="ltr">{t.out}</td>
                      <td dir="ltr">{t.total}</td>
                      <td className="mr-note">{dayNote(row)}</td>
                      <td className="mr-col-toggle">
                        {row.expandable && (
                          <button
                            type="button"
                            className="mr-toggle"
                            aria-expanded={expanded}
                            aria-controls={`mr-day-${row.key}`}
                            aria-label={`פרטי ${formatDate(row.key)}`}
                            onClick={() => toggle(row.key)}
                          >
                            <ChevronDownIcon size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {row.expandable && expanded && (
                      <tr className={`mr-details-row ${row.absence ? 'mr-row-absence' : ''}`.trim()} id={`mr-day-${row.key}`}>
                        <td colSpan={7}>
                          <DayDetails row={row} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {m.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="mr-empty">
                    אין דיווחי נוכחות בחודש זה.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mr-section" aria-labelledby="mr-absences-title">
        <div className="mr-section-head">
          <h2 id="mr-absences-title" className="mr-section-title">
            דיווחי היעדרות
          </h2>
          <button type="button" className="mr-new-absence" onClick={() => navigate('absences')}>
            <PlusIcon size={18} />
            דיווח היעדרות חדש
          </button>
        </div>
        <div className="mr-card">
          <table className="mr-table mr-absence-table">
            <thead>
              <tr>
                <th scope="col">תאריך</th>
                <th scope="col">סוג היעדרות</th>
                <th scope="col">סטטוס</th>
                <th scope="col">הערות</th>
              </tr>
            </thead>
            <tbody>
              {m.absences.map((a) => (
                <tr key={a.id}>
                  <th scope="row">{absenceDates(a)}</th>
                  <td>
                    <AbsenceTypeLabel type={a.type} />
                  </td>
                  <td>
                    <ApprovalBadge status={a.status} />
                  </td>
                  <td className="mr-note-text">{a.note || '–'}</td>
                </tr>
              ))}
              {m.absences.length === 0 && (
                <tr>
                  <td colSpan={4} className="mr-empty">
                    אין דיווחי היעדרות בחודש זה.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
