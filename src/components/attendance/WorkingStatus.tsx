import type { ReactNode } from 'react'
import { formatHoursMinutes, toTimeOfDay } from '@/lib/time'
import { TimeDisplay } from '@/components/ui'
import { ClockIcon, LoginIcon } from '@/components/icons'
import './attendance-states.css'

type Props = { firstIn: Date; now: Date; workedMs: number; titleId: string }

type Stat = { label: string; icon: ReactNode; value: string; dateTime: string }

/** Two figures side by side in one tinted panel (start time + a second figure). */
export function WorkStats({ stats, className = '' }: { stats: [Stat, Stat]; className?: string }) {
  return (
    <dl className={`work-stats ${className}`.trim()}>
      {stats.map((s) => (
        <div key={s.label} className="work-stat">
          <dt className="work-stat-label text-label">
            {s.icon}
            {s.label}
          </dt>
          <dd className="text-value-lg">
            <time dateTime={s.dateTime}>{s.value}</time>
          </dd>
        </div>
      ))}
    </dl>
  )
}

export const startStat = (firstIn: Date): Stat => ({
  label: 'שעת התחלה',
  icon: <LoginIcon size={16} />,
  value: toTimeOfDay(firstIn),
  dateTime: firstIn.toISOString(),
})

export const durationOf = (workedMs: number) => ({ value: formatHoursMinutes(workedMs), dateTime: `PT${Math.floor(workedMs / 60000)}M` })

/** "Working" state (desktop): start and current time in a tinted panel, then the live work timer as the focal number. */
export function WorkingStatus({ firstIn, now, workedMs, titleId }: Props) {
  const elapsed = durationOf(workedMs)
  return (
    <div className="working-status">
      <WorkStats stats={[startStat(firstIn), { label: 'שעה נוכחית', icon: <ClockIcon size={16} />, value: toTimeOfDay(now), dateTime: toTimeOfDay(now) }]} />

      <h2 id={titleId} className="elapsed-title text-body text-secondary">
        זמן עבודה עד כה
      </h2>
      <TimeDisplay className="elapsed" value={elapsed.value} dateTime={elapsed.dateTime} />
    </div>
  )
}
