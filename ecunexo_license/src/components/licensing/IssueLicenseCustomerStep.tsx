import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EcuAlertDialog } from '@/components/ui/EcuAlertDialog'
import {
  deactivateLicensingCustomer,
  listLicensingCustomers,
  type LicensingCustomerListItem,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import { customerDeletePrompt } from '@/pages/customers/customerDeleteMessage'
import { CustomersGrid } from '@/pages/customers/CustomersGrid'

export type IssueLicenseCustomerStepProps = {
  readonly reloadToken: number
  readonly error?: string
  readonly onIssueLicense: (customer: LicensingCustomerListItem) => void
}

export function IssueLicenseCustomerStep({
  reloadToken,
  error,
  onIssueLicense,
}: IssueLicenseCustomerStepProps) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<LicensingCustomerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<LicensingCustomerListItem | null>(null)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listLicensingCustomers()
      setLoadError(null)
      setRows(data.filter((row) => row.status === 'Active'))
    } catch (err) {
      setLoadError(readApiError(err, 'No se pudo cargar el catálogo de clientes.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, reloadToken])

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    setActionBusyId(confirmDelete.id)
    setConfirmDelete(null)
    try {
      await deactivateLicensingCustomer(confirmDelete.id)
      await load()
    } catch (err: unknown) {
      setDeleteError(readApiError(err, 'No se pudo eliminar el cliente.'))
    } finally {
      setActionBusyId(null)
    }
  }, [confirmDelete, load])

  const deletePrompt = confirmDelete ? customerDeletePrompt(confirmDelete) : null

  return (
    <>
      {error ? <p className="customer-picker-field__error" role="alert">{error}</p> : null}
      {loadError ? <p className="customer-picker-field__error" role="alert">{loadError}</p> : null}

      <CustomersGrid
        rows={rows}
        loading={loading}
        actionBusyId={actionBusyId}
        onEdit={(id) => navigate(`/app/clientes/${id}/editar`)}
        onDelete={setConfirmDelete}
        onIssueLicense={onIssueLicense}
        searchPlaceholder="Buscar por razón social, RUC o correo…"
        initialPageSize={10}
        maxHeight={420}
      />

      <EcuAlertDialog
        open={deletePrompt !== null}
        title={deletePrompt?.title ?? 'Eliminar cliente'}
        message={deletePrompt?.message ?? ''}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void handleDelete()}
        confirmLabel={deletePrompt?.confirmLabel ?? 'Sí, eliminar'}
      />
      <EcuAlertDialog
        open={deleteError !== null}
        title="No se pudo eliminar"
        message={deleteError ?? 'Error inesperado.'}
        onClose={() => setDeleteError(null)}
      />
    </>
  )
}
