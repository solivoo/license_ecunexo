import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Popup, Select, TextBox, useToast } from 'glubox'
import { getAssignableOperatorRoles } from '@/constants/operatorRoles'
import type { CreateOperatorInput } from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'

export type CreateOperatorDialogProps = {
  readonly open: boolean
  readonly busy: boolean
  readonly managerRole: string | null
  readonly onClose: () => void
  readonly onCreate: (body: CreateOperatorInput) => Promise<void>
}

export function CreateOperatorDialog({
  open,
  busy,
  managerRole,
  onClose,
  onCreate,
}: CreateOperatorDialogProps) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('1')

  const roleOptions = useMemo(() => getAssignableOperatorRoles(managerRole), [managerRole])
  const selectOptions = useMemo(
    () => roleOptions.map((item) => ({ label: item.text, value: item.value })),
    [roleOptions]
  )

  const reset = useCallback(() => {
    setEmail('')
    setName('')
    setPassword('')
    setRole('1')
  }, [])

  const handleClose = useCallback(() => {
    if (busy) return
    reset()
    onClose()
  }, [busy, onClose, reset])

  useEffect(() => {
    if (!open) return
    setEmail('')
    setName('')
    setPassword('')
    const allowed = getAssignableOperatorRoles(managerRole)
    setRole(allowed[0]?.value ?? '1')
  }, [open, managerRole])

  const handleSubmit = useCallback(async () => {
    if (busy) return

    const trimmedEmail = email.trim()
    const trimmedName = name.trim()

    if (!trimmedEmail || !trimmedName) {
      toast.show({
        title: 'Campos requeridos',
        message: 'Indica correo y nombre completo.',
        variant: 'warning',
      })
      return
    }
    if (password.length < 8) {
      toast.show({
        title: 'Contraseña débil',
        message: 'La contraseña inicial debe tener al menos 8 caracteres.',
        variant: 'warning',
      })
      return
    }
    if (!roleOptions.some((o) => o.value === role)) {
      toast.show({
        title: 'Rol inválido',
        message: 'Selecciona un rol válido.',
        variant: 'warning',
      })
      return
    }

    try {
      await onCreate({
        email: trimmedEmail,
        name: trimmedName,
        password,
        role: Number(role),
      })
      handleClose()
    } catch (err) {
      const msg = readApiError(err, 'No se pudo crear el operador.')
      toast.show({
        title: 'Error al crear',
        message: msg,
        variant: 'error',
      })
    }
  }, [busy, email, handleClose, name, onCreate, password, role, roleOptions, toast])

  return (
    <Popup
      open={open}
      onClose={handleClose}
      title="Nuevo operador"
      width="min(92vw, 28rem)"
      
      actions={[
        { id: 'cancel', label: 'Cancelar', variant: 'ghost', disabled: busy, onClick: handleClose },
        {
          id: 'create',
          label: busy ? 'Creando…' : 'Crear',
          variant: 'primary',
          loading: busy,
          onClick: () => void handleSubmit(),
        },
      ]}
    >
      <form
        className="ecu-dialog-form ecu-dialog-form--glu"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
        noValidate
      >
        <TextBox
          id="op-email"
          name="email"
          label="Correo"
          labelPosition="outlined"
          variant="outline"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="operador@empresa.com"
          required
          disabled={busy}
          fullWidth
          size="md"
          
        />
        <TextBox
          id="op-name"
          name="name"
          label="Nombre completo"
          labelPosition="outlined"
          variant="outline"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="Nombre y apellidos"
          required
          disabled={busy}
          fullWidth
          size="md"
          
        />
        <TextBox
          id="op-password"
          name="password"
          label="Contraseña inicial"
          labelPosition="outlined"
          variant="outline"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          helperText="Se entrega al operador para su primer acceso."
          required
          disabled={busy}
          fullWidth
          
        />
        <Select
          id="op-role"
          label="Rol"
          labelPosition="outlined"
          variant="outline"
          options={selectOptions}
          value={role}
          onChange={setRole}
          disabled={busy}
          fullWidth
          size="md"
          
        />
      </form>
    </Popup>
  )
}
