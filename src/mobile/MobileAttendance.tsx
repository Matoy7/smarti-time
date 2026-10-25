import { formatLongDate, toTimeOfDay } from '@/lib/time'
import { useAttendanceFlow } from '@/hooks/useAttendanceFlow'
import { Button, PunchButton, TimeDisplay } from '@/components/ui'
import { ClockIcon, KeyboardIcon, LoginIcon, LogoutIcon } from '@/components/icons'
import { WorkingStatus } from '@/components/attendance/WorkingStatus'
import { DaySummary } from '@/components/attendance/DaySummary'
import { LocationRow } from '@/components/attendance/LocationRow'
import { AttendanceFeedback } from '@/components/attendance/AttendanceFeedback'
import { ManualEntry } from '@/components/attendance/ManualEntry'
import { MobileShell } from './MobileShell'

const TITLE_ID = 'm-state-title'

/** Attendance — mobile. States: before clock-in → working → day summary (shared with desktop). */
export function MobileAttendance() {
  const flow = useAttendanceFlow()
  const { now, status, firstIn, lastOut, workedMs, clockIn, clockOut, backToAttendance, pending, feedback, dismissFeedback, announcement } = flow
  const manual = { checkManualTime: flow.checkManualTime, manualDates: flow.manualDates, manualEntry: flow.manualEntry }
  const time = toTimeOfDay(now)

  return (
    <MobileShell fit>
      {/* No card: the attendance content sits directly on the page background. */}
      <section className="m-punch-card" aria-labelledby="m-attendance-title">
        <header className="m-card-header">
          {/* Page name stays available to screen readers; it is not shown visually. */}
          <h1 id="m-attendance-title" className="sr-only" data-page-title tabIndex={-1}>
            דיווח נוכחות
          </h1>
          <p className="text-body text-secondary">{formatLongDate(now)}</p>
        </header>

        <div className={`m-state m-state-${status} state-enter`} key={status}>
          <AttendanceFeedback feedback={feedback} onDismiss={dismissFeedback} />

          {status === 'idle' && (
            <>
              <TimeDisplay className="m-clock" value={time} dateTime={time} />
              <div className="m-punch-actions">
                <PunchButton onClick={clockIn} loading={pending === 'in'} icon={<LoginIcon size={52} strokeWidth={1.5} />}>
                  {pending === 'in' ? 'מדווח…' : 'דווח כניסה'}
                </PunchButton>
                <ManualEntry action="in" variant="drawer" className="m-manual-entry" icon={<KeyboardIcon />} disabled={pending !== null} {...manual} />
              </div>
            </>
          )}

          {status === 'working' && firstIn && (
            <>
              <WorkingStatus firstIn={firstIn} now={now} workedMs={workedMs} titleId={TITLE_ID} />
              <div className="m-punch-actions">
                <PunchButton onClick={clockOut} loading={pending === 'out'} icon={<LogoutIcon size={52} strokeWidth={1.5} />}>
                  {pending === 'out' ? 'מדווח…' : 'דווח יציאה'}
                </PunchButton>
                <ManualEntry action="out" variant="drawer" className="m-manual-entry" icon={<KeyboardIcon />} disabled={pending !== null} {...manual} />
              </div>
            </>
          )}

          {status === 'summary' && firstIn && lastOut && (
            <>
              <DaySummary firstIn={firstIn} lastOut={lastOut} workedMs={workedMs} titleId={TITLE_ID} />
              <Button className="m-state-action" size="lg" block onClick={backToAttendance} icon={<ClockIcon strokeWidth={1.8} />}>
                חזרה למסך נוכחות
              </Button>
            </>
          )}
        </div>

        {/* The day summary does not show the location (mobile). */}
        {status !== 'summary' && <LocationRow variant="tile" />}
      </section>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </MobileShell>
  )
}
