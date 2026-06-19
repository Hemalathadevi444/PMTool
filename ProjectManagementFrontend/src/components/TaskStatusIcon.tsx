import type { TaskStatus } from '../api/types'

const SIZE = 16
const CX = 8
const CY = 8
const R = 6

function pieWedge(startDeg: number, sweepDeg: number, fill: string) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const x1 = CX + R * Math.sin(toRad(startDeg))
  const y1 = CY - R * Math.cos(toRad(startDeg))
  const x2 = CX + R * Math.sin(toRad(startDeg + sweepDeg))
  const y2 = CY - R * Math.cos(toRad(startDeg + sweepDeg))
  const largeArc = sweepDeg > 180 ? 1 : 0

  return (
    <path
      d={`M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`}
      fill={fill}
    />
  )
}

export function TaskStatusIcon({ status }: { status: TaskStatus }) {
  if (status === 'done') {
    return (
      <svg
        className="h-4 w-4 shrink-0"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
      >
        <circle cx={CX} cy={CY} r={R} fill="#22c55e" />
      </svg>
    )
  }

  if (status === 'in_progress') {
    return (
      <svg
        className="h-4 w-4 shrink-0"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
      >
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#7c3aed" strokeWidth="1.5" />
        {pieWedge(0, 90, '#7c3aed')}
      </svg>
    )
  }

  if (status === 'in_review') {
    return (
      <svg
        className="h-4 w-4 shrink-0"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
      >
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#7c3aed" strokeWidth="1.5" />
        {pieWedge(0, 270, '#7c3aed')}
      </svg>
    )
  }

  return (
    <svg
      className="h-4 w-4 shrink-0 theme-text-muted"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
    >
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2.5 2.5"
      />
    </svg>
  )
}
