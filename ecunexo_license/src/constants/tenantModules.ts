/** Códigos alineados con EcuNexo.Core.Tenancy.TenantModuleCodes */

export type TenantModuleOption = {
  code: string
  label: string
  description: string
  category?: string
}

/** Módulo con límites configurables (sin tiers — valores directos). */
export type TenantModuleWithLimits = TenantModuleOption & {
  /** Límites por defecto que se precargan en los inputs. -1 = ilimitado. */
  defaultLimits: Record<string, number>
  /** Si es true, muestra inputs de fecha Desde/Hasta al emitir licencia. */
  annual?: boolean
}

/** Módulos que tienen límites transaccionales editables. */
export const MODULES_WITH_LIMITS: TenantModuleWithLimits[] = [
  {
    code: 'inventory',
    label: 'Inventario',
    description: 'Stock y movimientos.',
    defaultLimits: { max_sku_count: 5000 },
  },
  {
    code: 'warehousing',
    label: 'Bodegas',
    description: 'Ubicaciones y almacenes.',
    defaultLimits: { max_warehouse_count: 5 },
  },
  {
    code: 'facturacion',
    label: 'Facturación Electrónica SRI',
    description: 'Comprobantes electrónicos SRI: Facturas (01), Notas de Crédito (04) y Guías de Remisión (06).',
    defaultLimits: {
      max_invoices_per_month: 500,
      max_monthly_credit_notes: 100,
      max_monthly_remision_guides: 250,
      max_active_carriers: 20,
    },
    category: 'Fiscal / Facturación SRI',
  },
  {
    code: 'identity',
    label: 'Identidad y acceso',
    description: 'Usuarios, roles y permisos.',
    defaultLimits: { max_users: 25 },
  },
  {
    code: 'repairs',
    label: 'Taller y Reparaciones B2B',
    description: 'Gestión de lotes y equipos en reacondicionamiento.',
    defaultLimits: {
      max_active_batches: 50,
      max_equipments_per_batch: 500,
    },
    category: 'Operaciones',
  },
  {
    code: 'customers',
    label: 'Clientes y Directorio Comercial',
    description: 'Gestión comercial de clientes B2B/B2C.',
    defaultLimits: {
      max_customers: 1000,
    },
    category: 'Comercial',
  },
  {
    code: 'ecommerce',
    label: 'E-commerce',
    description: 'Ventas web, vitrina pública de catálogo, sincronización de pedidos y pagos.',
    defaultLimits: {
      max_orders_per_month: 1000,
    },
    category: 'Comercial',
  },
  {
    code: 'purchases',
    label: 'Compras',
    description: 'Recepción, auditoría preventiva y registro de comprobantes electrónicos XML del SRI y facturas físicas, homologación con kárdex/bodegas y control de categorías ATS.',
    defaultLimits: {
      monthly_purchases_processed: 250,
      max_monthly_purchases: 250,
      max_suppliers: 100,
      max_monthly_withholdings: 250,
    },
    category: 'Operaciones',
  },
  {
    code: 'contabilidad',
    label: 'Contabilidad NIIF, Pre-declaración SRI & Balances SCVS',
    description: 'Plan general de cuentas oficial SCVS Ecuador, libro diario con validación estricta de partida doble, contabilización automática de compras/liquidaciones, pre-declaración mensual SRI F104/F103 con conciliación SAS y estados financieros consolidados (Balance General y P&G).',
    defaultLimits: {
      max_monthly_journal_entries: 500,
      max_accounts_in_chart: 250,
      max_chart_accounts: 250,
      allow_financial_statements_export: 1,
      enable_custom_subaccounts: 1,
    },
    category: 'Contabilidad',
  },
  {
    code: 'catalog',
    label: 'Catálogo',
    description: 'Productos, servicios, producto matriz, variantes multidimensionales (tallas/colores) y plantillas jerárquicas.',
    defaultLimits: {
      max_active_variants: 1000,
      max_product_templates: 50,
    },
    category: 'Comercial',
  },
  {
    code: 'training',
    label: 'Capacitación',
    description: 'Sesiones de formación al equipo.',
    defaultLimits: { max_training_sessions_per_year: 6, max_training_hours_per_year: 12 },
    annual: true,
  },
  {
    code: 'support',
    label: 'Soporte técnico',
    description: 'Horas de asistencia.',
    defaultLimits: { max_support_hours_per_year: 20 },
    annual: true,
  },
]

export function getModuleDefaultLimits(moduleCode: string): Record<string, number> | undefined {
  return MODULES_WITH_LIMITS.find((m) => m.code === moduleCode)?.defaultLimits
}

/** Módulos que tienen período de vigencia anual (training, support). */
export const ANNUAL_MODULES = new Set(['training', 'support'])

/** Siempre incluido en licencias comerciales; no se elige en emisión. */
export const REQUIRED_LICENSE_MODULE_CODE = 'identity'

// ═══════════════════════════════════════════════════════════════
// Dependencias entre módulos (jerarquía)
// ═══════════════════════════════════════════════════════════════
// inventory → catalog + warehousing
// warehousing → catalog
// facturacion → catalog
// identity → (sin dependencias, siempre presente)

/** Mapa de módulo → módulos que requiere. Alineado con backend ModuleDependencyGraph. */
export const MODULE_DEPENDENCIES: Record<string, readonly string[]> = {
  inventory: ['catalog', 'warehousing'],
  warehousing: ['catalog'],
  facturacion: ['catalog'],
  repairs: ['identity'],
  customers: ['identity'],
  ecommerce: ['catalog', 'warehousing', 'inventory'],
  purchases: ['identity'],
  contabilidad: ['identity'],
}

/** Devuelve los módulos requeridos por el código dado. */
export function getRequiredModules(moduleCode: string): readonly string[] {
  return MODULE_DEPENDENCIES[moduleCode] ?? []
}

/** Devuelve todos los módulos que dependen de éste (directa o transitivamente). */
export function getDependants(moduleCode: string): string[] {
  const result: string[] = []
  for (const [dependent, required] of Object.entries(MODULE_DEPENDENCIES)) {
    if (required.includes(moduleCode)) {
      result.push(dependent)
      result.push(...getDependants(dependent))
    }
  }
  return [...new Set(result)]
}

/** Valida dependencias y retorna mensajes de error. Vacío = OK. */
export function validateModuleDependencies(codes: readonly string[]): string[] {
  const set = new Set(codes.map((c) => c.toLowerCase()))
  const errors: string[] = []

  for (const code of set) {
    const required = getRequiredModules(code)
    for (const req of required) {
      if (!set.has(req)) {
        const modLabel = TENANT_MODULE_OPTIONS.find((m) => m.code === code)?.label ?? code
        const reqLabel = TENANT_MODULE_OPTIONS.find((m) => m.code === req)?.label ?? req
        errors.push(`«${modLabel}» requiere «${reqLabel}». Actívalo primero.`)
      }
    }
  }

  return errors
}

/** Dado un conjunto de códigos, devuelve el conjunto completo incluyendo dependencias. */
export function resolveModulesWithDependencies(codes: readonly string[]): string[] {
  const set = new Set(codes.map((c) => c.toLowerCase()))
  let changed = true
  while (changed) {
    changed = false
    for (const code of [...set]) {
      const required = getRequiredModules(code)
      for (const req of required) {
        if (!set.has(req)) {
          set.add(req)
          changed = true
        }
      }
    }
  }
  return ensureIdentityModule([...set])
}

export const TENANT_MODULE_OPTIONS: TenantModuleOption[] = [
  {
    code: 'identity',
    label: 'Identidad y acceso',
    description: 'Usuarios, roles y permisos. Incluido en todas las licencias.',
    category: 'Plataforma',
  },
  {
    code: 'catalog',
    label: 'Catálogo',
    description: 'Productos, servicios, producto matriz, variantes multidimensionales (tallas y colores) y plantillas jerárquicas.',
    category: 'Comercial',
  },
  {
    code: 'warehousing',
    label: 'Bodegas',
    description: 'Ubicaciones físicas, sucursales y centros de distribución.',
    category: 'Operaciones',
  },
  {
    code: 'inventory',
    label: 'Inventario',
    description: 'Control de existencias, kárdex y movimientos de stock por bodega.',
    category: 'Operaciones',
  },
  {
    code: 'facturacion',
    label: 'Facturación Electrónica SRI',
    description: 'Comprobantes electrónicos SRI: Facturas (01), Notas de Crédito (04) y Guías de Remisión (06).',
    category: 'Fiscal / Facturación SRI',
  },
  {
    code: 'contabilidad',
    label: 'Contabilidad NIIF, Pre-declaración SRI & Balances SCVS',
    description: 'Plan de cuentas SCVS, libro diario, pre-declaración SRI y balances consolidados.',
    category: 'Contabilidad',
  },
  {
    code: 'purchases',
    label: 'Compras',
    description: 'Recepción, auditoría y homologación de compras electrónicas XML y retenciones.',
    category: 'Operaciones',
  },
  {
    code: 'customers',
    label: 'Clientes y Directorio Comercial',
    description: 'Directorio de clientes B2B/B2C, cupos de crédito y condiciones comerciales.',
    category: 'Comercial',
  },
  {
    code: 'ecommerce',
    label: 'E-commerce',
    description: 'Ventas web con vitrina pública de catálogo (precio y disponibilidad), pedidos y pagos.',
    category: 'Comercial',
  },
  {
    code: 'repairs',
    label: 'Taller y Reparaciones B2B',
    description: 'Gestión de lotes, actas de recepción y equipos en reacondicionamiento técnico.',
    category: 'Operaciones',
  },
  {
    code: 'training',
    label: 'Capacitación',
    description: 'Sesiones de formación y entrenamiento operativo para el equipo.',
    category: 'Servicios',
  },
  {
    code: 'support',
    label: 'Soporte técnico',
    description: 'Bolsa de horas de asistencia técnica y soporte prioritario.',
    category: 'Servicios',
  },
]

export const OPTIONAL_LICENSE_MODULE_OPTIONS = TENANT_MODULE_OPTIONS.filter(
  (m) => m.code !== REQUIRED_LICENSE_MODULE_CODE
)

export function ensureIdentityModule(codes: readonly string[]): string[] {
  const normalized = codes
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0)
  if (normalized.includes(REQUIRED_LICENSE_MODULE_CODE)) {
    return normalized
  }
  return [REQUIRED_LICENSE_MODULE_CODE, ...normalized]
}

export function moduleLabels(codes: string[]): string {
  return codes
    .map((c) => TENANT_MODULE_OPTIONS.find((m) => m.code === c)?.label ?? c)
    .join(', ')
}

/** Etiquetas cortas para selectores compactos (una línea por módulo). */
const MODULE_SHORT_LABELS: Record<string, string> = {
  identity: 'Identidad',
  catalog: 'Catálogo',
  warehousing: 'Bodegas',
  inventory: 'Inventario',
  facturacion: 'Facturación SRI',
  contabilidad: 'Contabilidad',
  purchases: 'Compras',
  customers: 'Clientes',
  ecommerce: 'E-commerce',
  repairs: 'Taller',
  training: 'Capacitación',
  support: 'Soporte',
}

export function moduleShortLabel(moduleCode: string): string {
  const direct = MODULE_SHORT_LABELS[moduleCode]
  if (direct) {
    return direct
  }
  return TENANT_MODULE_OPTIONS.find((m) => m.code === moduleCode)?.label ?? moduleCode
}

/** Etiqueta en español para una clave de límite (ej. max_sku_count → «SKU»). */
const LIMIT_KEY_LABELS: Record<string, string> = {
  max_sku_count: 'SKU',
  max_variants_per_item: 'Variantes / ítem',
  max_categories: 'Categorías',
  max_warehouse_count: 'Bodegas',
  max_invoices_per_month: 'Facturas / mes',
  invoice_history_months: 'Historial (meses)',
  max_users: 'Usuarios',
  max_training_sessions_per_year: 'Sesiones / año',
  max_training_hours_per_year: 'Horas capacitación / año',
  max_support_hours_per_year: 'Horas soporte / año',
  max_active_batches: 'Lotes activos',
  max_equipments_per_batch: 'Equipos por lote',
  max_customers: 'Clientes máximos',
  max_orders_per_month: 'Órdenes por mes',
  monthly_purchases_processed: 'Compras procesadas / mes',
  max_monthly_purchases: 'Compras / mes',
  max_suppliers: 'Proveedores máximos',
  max_monthly_withholdings: 'Retenciones / mes',
  max_chart_accounts: 'Cuentas contables',
  max_accounts_in_chart: 'Cuentas contables',
  max_monthly_journal_entries: 'Asientos / mes',
  allow_financial_statements_export: 'Exportación de balances',
  enable_custom_subaccounts: 'Subcuentas personalizadas',
  allow_custom_subaccounts: 'Subcuentas personalizadas',
  max_monthly_remision_guides: 'Guías de remisión / mes',
  max_active_carriers: 'Transportistas activos',
  max_monthly_credit_notes: 'Notas de crédito / mes',
  max_active_variants: 'Variantes activas',
  max_variants: 'Variantes máximas',
  max_product_templates: 'Plantillas de producto',
}

export function limitKeyLabel(key: string): string {
  const direct = LIMIT_KEY_LABELS[key]
  if (direct) {
    return direct
  }
  // Fallback: quitar prefijo max_ y reemplazar _ por espacio
  return key.replace(/^max_/, '').replace(/_/g, ' ')
}
