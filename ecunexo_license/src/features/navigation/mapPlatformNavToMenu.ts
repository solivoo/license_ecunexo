import type { MenuConfig, MenuItem, MenuSubItem } from 'glubox'
import type { PlatformNavItem } from '@/config/platformNav'

function formatLabel(item: PlatformNavItem): string {
  return item.badge ? `${item.label} · ${item.badge}` : item.label
}

function resolvePath(item: PlatformNavItem): string | undefined {
  if (item.disabled) {
    return undefined
  }
  return item.path
}

function toMenuSubItem(item: PlatformNavItem): MenuSubItem {
  const children = item.children?.length ? item.children.map(toMenuSubItem) : undefined

  return {
    id: item.id,
    label: formatLabel(item),
    path: resolvePath(item),
    children,
  }
}

function toMenuItem(item: PlatformNavItem): MenuItem {
  const children = item.children?.length ? item.children.map(toMenuSubItem) : undefined

  return {
    id: item.id,
    label: formatLabel(item),
    icon: item.icon,
    path: children ? undefined : resolvePath(item),
    position: 'top',
    children,
  }
}

export function platformNavToMenuConfig(items: PlatformNavItem[]): MenuConfig {
  return { items: items.map(toMenuItem) }
}

function collectMenuPaths(items: MenuConfig['items'], bucket: string[]): void {
  for (const item of items) {
    if (item.path) {
      bucket.push(item.path)
    }
    if (item.children?.length) {
      collectMenuPaths(item.children, bucket)
    }
  }
}

/**
 * Ruta de menú que corresponde al `pathname` actual.
 * Resuelve rutas con parámetros (p. ej. `/app/licencias/123/modulos`) al ítem base del menú
 * para que el módulo correcto quede expandido y resaltado en el sidebar.
 */
export function resolveMenuActivePath(pathname: string, menu: MenuConfig): string {
  const paths: string[] = []
  collectMenuPaths(menu.items, paths)

  let best: string | null = null
  for (const path of paths) {
    const matches = pathname === path || pathname.startsWith(`${path}/`)
    if (matches && (best === null || path.length > best.length)) {
      best = path
    }
  }

  return best ?? pathname
}
