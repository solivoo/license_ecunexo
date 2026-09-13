import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  const iconNode = icon ?? <Inbox size={28} strokeWidth={1.75} aria-hidden />

  return (
    <div className={`ecu-empty-state ${className}`.trim()}>
      <div className="ecu-empty-state__icon-box" aria-hidden>
        {typeof iconNode === 'string' ? (
          <span className="material-symbols-outlined">{iconNode}</span>
        ) : (
          iconNode
        )}
      </div>
      <h3 className="ecu-empty-state__title">{title}</h3>
      {description && <div className="ecu-empty-state__desc">{description}</div>}
      {action && <div className="ecu-empty-state__action">{action}</div>}
    </div>
  )
}
