import type { MenuConfig } from 'glubox'

function findLabel(items: MenuConfig['items'], pathname: string): string | null {
  for (const item of items) {
    if (item.path === pathname) {
      return item.label
    }

    if (item.children?.length) {
      const childLabel = findLabel(item.children, pathname)
      if (childLabel) {
        return childLabel
      }
    }
  }

  return null
}

function staticTitle(pathname: string): string | null {
  if (/^\/app\/licencias\/[^/]+\/modulos$/.test(pathname)) return 'Módulos de la licencia'
  if (pathname === '/app/clientes/nuevo') return 'Agregar cliente'
  if (/^\/app\/clientes\/[^/]+\/editar$/.test(pathname)) return 'Editar cliente'
  if (pathname === '/app/planes/nuevo') return 'Crear plan'
  if (/^\/app\/planes\/[^/]+$/.test(pathname)) return 'Detalle del plan'
  if (pathname === '/app/capacitaciones/nueva') return 'Agendar capacitación'
  if (pathname === '/app/configuracion/correo') return 'Servidor de correo'
  return null
}

export function getPageTitle(
  pathname: string,
  menu: MenuConfig,
  fallback = 'Panel de licencias',
): string {
  return findLabel(menu.items, pathname) ?? staticTitle(pathname) ?? fallback
}
