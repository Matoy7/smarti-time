import { formatLongDate, greetingFor, toTimeOfDay } from '@/lib/time'
import { USER } from '@/lib/profile'
import { useAttendanceFlow } from '@/hooks/useAttendanceFlow'
import { Button, Card, CardBody, CardFooter, TimeDisplay } from '@/components/ui'
import { ClockIcon, LogoutIcon } from '@/components/icons'
import { WorkingStatus } from '@/components/attendance/WorkingStatus'
import { DaySummary } from '@/components/attendance/DaySummary'
import { LocationRow } from '@/components/attendance/LocationRow'
import { AttendanceFeedback } from '@/components/attendance/AttendanceFeedback'
import { ManualEntry } from '@/components/attendance/ManualEntry'
import './attendance.css'

const TITLE_ID = 'attendance-title'

/** Attendance (נוכחות) — desktop. States: before clock-in → working → day summary. */
export function AttendancePage() {
  const flow = useAttendanceFlow()
  const { now, status, firstIn, lastOut, workedMs, clockIn, clockOut, backToAttendance, pending, feedback, dismissFeedback, announcement } = flow
  const manual = { checkManualTime: flow.checkManualTime, manualDates: flow.manualDates, manualEntry: flow.manualEntry }
  const time = toTimeOfDay(now)
  const busy = pending !== null

  return (
    <div className="page attendance-page">
      <header className="page-header">
        <p className="text-body-lg text-secondary">{formatLongDate(now)}</p>
        <h1 className="text-title" data-page-title tabIndex={-1}>
          {greetingFor(now)}, {USER.firstName}
        </h1>
      </header>

      <Card className="punch-card" aria-labelledby={TITLE_ID}>
        <CardBody>
          <div className="state-enter" key={status}>
            {/* Result of the last action: above the attendance details, inside the card. */}
            <AttendanceFeedback feedback={feedback} onDismiss={dismissFeedback} />

            {status === 'idle' && (
              <>
                <h2 id={TITLE_ID} className="text-heading">
                  שעת כניסה
                </h2>
                <TimeDisplay className="punch-clock" value={time} dateTime={time} />
                <Button
                  className="punch-action"
                  size="lg"
                  onClick={clockIn}
                  loading={pending === 'in'}
                  icon={<ClockIcon strokeWidth={1.8} />}
                >
                  {pending === 'in' ? 'מדווח כניסה…' : 'דווח כניסה'}
                </Button>
                <ManualEntry action="in" variant="modal" className="manual-entry text-body" disabled={busy} {...manual} />
              </>
            )}

            {status === 'working' && firstIn && (
              <>
                <WorkingStatus firstIn={firstIn} now={now} workedMs={workedMs} titleId={TITLE_ID} />
                <Button
                  className="punch-action"
                  size="lg"
                  onClick={clockOut}
                  loading={pending === 'out'}
                  icon={<LogoutIcon strokeWidth={1.8} />}
                >
                  {pending === 'out' ? 'מדווח יציאה…' : 'דווח יציאה'}
                </Button>
                <ManualEntry action="out" variant="modal" className="manual-entry text-body" disabled={busy} {...manual} />
              </>
            )}

            {status === 'summary' && firstIn && lastOut && (
              <>
                <DaySummary firstIn={firstIn} lastOut={lastOut} workedMs={workedMs} titleId={TITLE_ID} />
                <Button className="punch-action" size="lg" onClick={backToAttendance} icon={<ClockIcon strokeWidth={1.8} />}>
                  חזרה למסך נוכחות
                </Button>
              </>
            )}
          </div>
        </CardBody>

        <CardFooter>
          <LocationRow variant="footer" />
        </CardFooter>
      </Card>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
