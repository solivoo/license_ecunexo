import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from 'glubox'
import { renderSidebarIcon } from '@/config/sidebarIcons'
import type { PlatformNavItem } from '@/config/platformNav'
import {
  platformNavToMenuConfig,
  resolveMenuActivePath,
} from '@/features/navigation/mapPlatformNavToMenu'
import { PlatformSidebarBrand } from '@/shell/PlatformSidebarBrand'

const SIDEBAR_WIDTH_EXPANDED = 260
const SIDEBAR_WIDTH_COLLAPSED = 72

export interface AppSidebarProps {
  readonly items: PlatformNavItem[]
  readonly collapsed: boolean
  readonly onCollapsedChange: (collapsed: boolean) => void
}

export function AppSidebar({ items, collapsed, onCollapsedChange }: AppSidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const menu = useMemo(() => platformNavToMenuConfig(items), [items])
  const activePath = useMemo(() => resolveMenuActivePath(pathname, menu), [pathname, menu])
  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED

  return (
    <Sidebar
      menu={menu}
      userPermissions={[]}
      brand={PlatformSidebarBrand}
      collapsed={collapsed}
      activePath={activePath}
      width={width}
      renderIcon={renderSidebarIcon}
      onCollapsedChange={onCollapsedChange}
      onNavigate={navigate}
      collapseOthersOnSelect
    />
  )
}
