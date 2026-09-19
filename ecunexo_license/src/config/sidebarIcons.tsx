import type { ReactElement } from 'react'
import {
  Building2,
  Calendar,
  CirclePlus,
  FileText,
  GraduationCap,
  Home,
  Key,
  Layers,
  LifeBuoy,
  Mail,
  RefreshCw,
  Settings,
  Shield,
  UserCog,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  key: Key,
  plus: CirclePlus,
  'circle-plus': CirclePlus,
  'file-text': FileText,
  'refresh-cw': RefreshCw,
  users: Users,
  'building-2': Building2,
  layers: Layers,
  settings: Settings,
  shield: Shield,
  'user-cog': UserCog,
  'graduation-cap': GraduationCap,
  calendar: Calendar,
  'life-buoy': LifeBuoy,
  mail: Mail,
}

export function renderSidebarIcon(name: string, className?: string): ReactElement | null {
  const Icon = iconMap[name]
  return Icon ? <Icon className={className} aria-hidden /> : null
}
