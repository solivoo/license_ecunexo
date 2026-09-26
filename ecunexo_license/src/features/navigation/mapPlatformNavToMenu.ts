import type { MenuConfig, MenuItem, MenuSubItem } from 'glubox'
import type { PlatformNavItem } from '@/config/platformNav'

/**
 * Estado de bloqueo para el Sidebar: candado + tooltip, con label limpio.
 * El motivo ya no se concatena al texto del ítem.
 */
function lockProps(
  item: PlatformNavItem,
): Pick<MenuItem, 'disabled' | 'locked' | 'disabledReason'> {
  if (!item.disabled) {
    return {}
  }
  return {
    disabled: true,
    locked: true,
    disabledReason: 'Próximamente',
  }
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
    label: item.label,
    path: resolvePath(item),
    children,
    ...lockProps(item),
  }
}

function toMenuItem(item: PlatformNavItem): MenuItem {
  const children = item.children?.length ? item.children.map(toMenuSubItem) : undefined

  return {
    id: item.id,
    label: item.label,
    icon: item.icon,
    path: children ? undefined : resolvePath(item),
    position: 'top',
    children,
    ...lockProps(item),
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
