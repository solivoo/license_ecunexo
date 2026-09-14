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
    label: 'Facturación',
    description: 'Documentos de venta.',
    defaultLimits: { max_invoices_per_month: 500 },
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
    description: 'Ventas web, sincronización de pedidos y pagos.',
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
    code: 'billing.remision_guides',
    label: 'Guías de Remisión Electrónicas SRI (Tipo 06) & Logística',
    description: 'Emisión, firma digital XAdES-BES, Clave de Acceso SRI de 49 dígitos y seguimiento en carretera de Guías de Remisión para el transporte legal de mercaderías.',
    defaultLimits: {
      max_monthly_remision_guides: 250,
      max_active_carriers: 20,
    },
    category: 'Logística / Facturación',
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
  'billing.remision_guides': ['identity', 'facturacion'],
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
  },
  {
    code: 'catalog',
    label: 'Catálogo',
    description: 'Productos y variantes.',
  },
  {
    code: 'warehousing',
    label: 'Bodegas',
    description: 'Ubicaciones y almacenes.',
  },
  {
    code: 'inventory',
    label: 'Inventario',
    description: 'Stock y movimientos.',
  },
  {
    code: 'facturacion',
    label: 'Facturación',
    description: 'Documentos de venta.',
  },
  {
    code: 'contabilidad',
    label: 'Contabilidad NIIF, Pre-declaración SRI & Balances SCVS',
    description: 'Plan general de cuentas oficial SCVS Ecuador, libro diario con validación estricta de partida doble, contabilización automática de compras/liquidaciones, pre-declaración mensual SRI F104/F103 con conciliación SAS y estados financieros consolidados (Balance General y P&G).',
    category: 'Contabilidad',
  },
  {
    code: 'training',
    label: 'Capacitación',
    description: 'Sesiones de formación y onboarding.',
  },
  {
    code: 'support',
    label: 'Soporte técnico',
    description: 'Asistencia técnica y resolución de incidencias.',
  },
  {
    code: 'repairs',
    label: 'Taller y Reparaciones B2B',
    description: 'Lotes de reacondicionamiento, tarifas por daño, fotos en custodia S3 y actas con QR.',
    category: 'Operaciones',
  },
  {
    code: 'customers',
    label: 'Clientes y Directorio Comercial',
    description: 'Directorio de clientes, clasificación B2B/B2C y límites de cartera.',
    category: 'Comercial',
  },
  {
    code: 'ecommerce',
    label: 'E-commerce',
    description: 'Tienda en línea, catálogo web y gestión de órdenes B2C/B2B.',
    category: 'Comercial',
  },
  {
    code: 'purchases',
    label: 'Compras',
    description: 'Recepción, auditoría preventiva y registro de comprobantes electrónicos XML del SRI y facturas físicas, homologación con kárdex/bodegas y control de categorías ATS.',
    category: 'Operaciones',
  },
  {
    code: 'billing.remision_guides',
    label: 'Guías de Remisión Electrónicas SRI (Tipo 06) & Logística',
    description: 'Emisión, firma digital XAdES-BES, Clave de Acceso SRI de 49 dígitos y seguimiento en carretera de Guías de Remisión para el transporte legal de mercaderías.',
    category: 'Logística / Facturación',
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
}

export function limitKeyLabel(key: string): string {
  const direct = LIMIT_KEY_LABELS[key]
  if (direct) {
    return direct
  }
  // Fallback: quitar prefijo max_ y reemplazar _ por espacio
  return key.replace(/^max_/, '').replace(/_/g, ' ')
}
