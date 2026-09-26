import { useState } from 'react'
import { useAppPreferences } from '@/features/settings/AppPreferencesProvider'

/**
 * Paginación controlada para DataGrid (gluBox): pageIndex 0-based + pageSize.
 * El tamaño por defecto y el techo salen de Preferencias → Listados.
 */
export function useGluDataGridPaging(initialPageSize?: number) {
  const { prefs, pageSizeOptions } = useAppPreferences()
  const maxRecords = prefs.maxRecords
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(() => {
    const requested = initialPageSize ?? maxRecords
    return requested > maxRecords ? maxRecords : requested
  })
  const [lastMaxRecords, setLastMaxRecords] = useState(maxRecords)

  // Ajuste en render cuando cambia el techo de Preferencias (sin efecto)
  if (lastMaxRecords !== maxRecords) {
    setLastMaxRecords(maxRecords)
    setPageSize((prev) => (prev > maxRecords ? maxRecords : prev))
    setPageIndex(0)
  }

  return {
    paging: { enabled: true as const, pageIndex, pageSize },
    pageSizeOptions,
    onPageChange: setPageIndex,
    onPageSizeChange: (size: number) => {
      setPageSize(size > maxRecords ? maxRecords : size)
      setPageIndex(0)
    },
  }
}
