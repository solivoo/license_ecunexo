import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export interface QuickActionCardProps {
  to: string
  icon: ReactNode
  title: string
  description: string
  badge?: ReactNode
  className?: string
}

export function QuickActionCard({
  to,
  icon,
  title,
  description,
  badge,
  className = '',
}: QuickActionCardProps) {
  return (
    <Link to={to} className={`ecu-action-card ${className}`.trim()}>
      <div className="ecu-action-card__icon-box" aria-hidden>
        {typeof icon === 'string' ? (
          <span className="material-symbols-outlined">{icon}</span>
        ) : (
          icon
        )}
      </div>
      <div className="ecu-action-card__content">
        <div className="ecu-action-card__title-row">
          <span className="ecu-action-card__title">{title}</span>
          {badge}
          <ArrowRight className="ecu-action-card__chevron" size={18} aria-hidden />
        </div>
        <span className="ecu-action-card__desc">{description}</span>
      </div>
    </Link>
  )
}
