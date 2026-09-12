'use client'

import { ApiError, type ApiClient } from '@rpg-ngn/api-client'
import { useState, type FormEvent } from 'react'
import { RequireSession } from '../../components/RequireSession'
import { UserBar } from '../../components/UserBar'
import { useSession } from '../../lib/session'
import type { StoredUser } from '../../lib/storage'

export default function ProfilePage() {
  return <RequireSession>{({ client, user, unauthorized, logout }) => <Profile client={client} user={user} unauthorized={unauthorized} logout={logout} />}</RequireSession>
}

/** Perfil: ver y cambiar el nombre visible y la contraseña. El correo se muestra pero no se edita (cambiarlo exige verificarlo). */
function Profile({ client, user, unauthorized, logout }: { client: ApiClient; user: StoredUser; unauthorized: (notice?: string) => void; logout: () => void }) {
  const session = useSession()
  const [name, setName] = useState(user.name)
  const [nameBusy, setNameBusy] = useState(false)
  const [nameNotice, setNameNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passBusy, setPassBusy] = useState(false)
  const [passNotice, setPassNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const fail = (caught: unknown, set: (n: { ok: boolean; text: string }) => void) => {
    if (caught instanceof ApiError && caught.isUnauthorized) unauthorized()
    else set({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
  }

  const saveName = async (event: FormEvent) => {
    event.preventDefault()
    setNameBusy(true)
    setNameNotice(null)
    try {
      const updated = await client.updateProfile({ name })
      session.setUser({ id: updated.id, name: updated.name, email: updated.email })
      setNameNotice({ ok: true, text: 'Nombre guardado.' })
    } catch (caught) {
      fail(caught, setNameNotice)
    } finally {
      setNameBusy(false)
    }
  }

  const mismatch = confirmation.length > 0 && password !== confirmation
  const savePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (mismatch) return
    setPassBusy(true)
    setPassNotice(null)
    try {
      await client.changePassword(current, password, confirmation)
      setCurrent('')
      setPassword('')
      setConfirmation('')
      setPassNotice({ ok: true, text: 'Contraseña cambiada.' })
    } catch (caught) {
      fail(caught, setPassNotice)
    } finally {
      setPassBusy(false)
    }
  }

  return (
    <main className="page narrow">
      <UserBar title="Tu perfil" user={user} onLogout={logout} />

      <form className="card stack" onSubmit={(e) => void saveName(e)}>
        <div className="label" style={{ marginTop: 0 }}>
          Cuenta
        </div>
        <label className="field">
          <span>Nombre</span>
          <input className="input" name="nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} required />
        </label>
        <div className="field">
          <span>Correo</span>
          <div className="static">{user.email}</div>
        </div>
        {nameNotice ? <div className={nameNotice.ok ? 'ok' : 'error'}>{nameNotice.text}</div> : null}
        <div className="row">
          <button type="submit" className="btn primary" disabled={nameBusy || !name.trim() || name.trim() === user.name}>
            {nameBusy ? <span className="spinner" aria-hidden /> : null}
            Guardar nombre
          </button>
        </div>
      </form>

      <form className="card stack" style={{ marginTop: 16 }} onSubmit={(e) => void savePassword(e)}>
        <div className="label" style={{ marginTop: 0 }}>
          Contraseña
        </div>
        <label className="field">
          <span>Contraseña actual</span>
          <input className="input" type="password" name="actual" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </label>
        <label className="field">
          <span>Nueva contraseña</span>
          <input className="input" type="password" name="nueva" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
        </label>
        <label className="field">
          <span>Repite la nueva</span>
          <input className="input" type="password" name="nueva_confirmacion" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" minLength={8} required />
        </label>
        {mismatch ? <div className="error">Las contraseñas no coinciden.</div> : null}
        {passNotice ? <div className={passNotice.ok ? 'ok' : 'error'}>{passNotice.text}</div> : null}
        <div className="row">
          <button type="submit" className="btn primary" disabled={passBusy || !current || password.length < 8 || mismatch || !confirmation}>
            {passBusy ? <span className="spinner" aria-hidden /> : null}
            Cambiar contraseña
          </button>
          <span className="hint">Al menos 8 caracteres.</span>
        </div>
      </form>
    </main>
  )
}
