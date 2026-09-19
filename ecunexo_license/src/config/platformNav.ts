/** Rutas del panel platform — jerarquía alineada con vistas en `router/routes.tsx`. */
export type PlatformNavItem = {
  id: string
  label: string
  /** Clave de icono Lucide (ver `config/sidebarIcons.tsx`). */
  icon?: string
  path?: string
  /** Roles que pueden ver el ítem (vacío = todos los autenticados). */
  roles?: string[]
  disabled?: boolean
  badge?: string
  children?: PlatformNavItem[]
}

export const platformNavItems: PlatformNavItem[] = [
  {
    id: 'inicio',
    label: 'Inicio',
    icon: 'home',
    path: '/app/inicio',
  },
  {
    id: 'licencias',
    label: 'Licencias',
    icon: 'key',
    children: [
      {
        id: 'licencias-nueva',
        label: 'Emitir licencia',
        icon: 'circle-plus',
        path: '/app/licencias/nueva',
      },
      {
        id: 'licencias-historial',
        label: 'Historial',
        icon: 'file-text',
        path: '/app/licencias/historial',
      },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: 'building-2',
    children: [
      {
        id: 'clientes-lista',
        label: 'Directorio',
        icon: 'users',
        path: '/app/clientes',
      },
      {
        id: 'clientes-nuevo',
        label: 'Agregar cliente',
        icon: 'circle-plus',
        path: '/app/clientes/nuevo',
      },
    ],
  },
  {
    id: 'catalogo',
    label: 'Catálogo comercial',
    icon: 'layers',
    children: [
      {
        id: 'catalogo-planes',
        label: 'Planes y módulos',
        icon: 'settings',
        path: '/app/planes',
      },
      {
        id: 'catalogo-plan-nuevo',
        label: 'Crear plan',
        icon: 'circle-plus',
        path: '/app/planes/nuevo',
      },
    ],
  },
  {
    id: 'capacitacion',
    label: 'Capacitación',
    icon: 'graduation-cap',
    children: [
      {
        id: 'capacitacion-lista',
        label: 'Sesiones',
        icon: 'calendar',
        path: '/app/capacitaciones',
      },
      {
        id: 'capacitacion-nueva',
        label: 'Agendar',
        icon: 'circle-plus',
        path: '/app/capacitaciones/nueva',
      },
      {
        id: 'soporte',
        label: 'Soporte',
        icon: 'life-buoy',
        path: '/app/soporte',
        disabled: true,
        badge: 'próx.',
      },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: 'shield',
    roles: ['Admin', 'SuperAdmin'],
    children: [
      {
        id: 'operadores',
        label: 'Operadores',
        icon: 'user-cog',
        path: '/app/operadores',
      },
      {
        id: 'servidor-correo',
        label: 'Servidor de Correo',
        icon: 'mail',
        path: '/app/configuracion/correo',
      },
    ],
  },
]

function filterNavItem(item: PlatformNavItem, role: string | null): PlatformNavItem | null {
  if (item.roles?.length) {
    if (!role || !item.roles.includes(role)) {
      return null
    }
  }

  if (item.children?.length) {
    const children = item.children
      .map((child) => filterNavItem(child, role))
      .filter((child): child is PlatformNavItem => child !== null)

    if (children.length === 0) {
      return null
    }

    return { ...item, children }
  }

  return item
}

export function filterNavByRole(role: string | null): PlatformNavItem[] {
  return platformNavItems
    .map((item) => filterNavItem(item, role))
    .filter((item): item is PlatformNavItem => item !== null)
}
