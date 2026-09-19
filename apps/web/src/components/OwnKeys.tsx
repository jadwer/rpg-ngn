'use client'

import { ApiError, type ApiClient, type OwnKey } from '@rpg-ngn/api-client'
import { keyConsole, ownKeyLabel, ownKeyProblem, ownKeyStatus, removeOwnKeyWarning } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'

/**
 * Clave propia del usuario (BYOK). Quien trae su clave paga sus tokens al
 * proveedor, asi que sus mesas dejan de gastar cupo.
 *
 * La credencial se manda una vez y no vuelve: del servidor solo llegan las
 * ultimas cuatro letras. El campo se vacia en cuanto se guarda, para que no
 * quede la clave a la vista de quien pase por detras.
 */
export function OwnKeys({ client, unauthorized }: { client: ApiClient; unauthorized: (notice?: string) => void }) {
  const [keys, setKeys] = useState<OwnKey[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [credential, setCredential] = useState('')
  const [model, setModel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setKeys(await client.listOwnKeys())
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return unauthorized()
      setError('No se pudieron cargar tus claves.')
    } finally {
      setLoading(false)
    }
  }, [client, unauthorized])

  useEffect(() => {
    void load()
  }, [load])

  function open(preset: string) {
    setEditing(preset)
    setCredential('')
    setModel('')
    setError(null)
    setNotice(null)
  }

  async function save(preset: string) {
    const problema = ownKeyProblem(credential)
    if (problema) return setError(problema)

    setBusy(true)
    setError(null)
    try {
      const { keys: actualizadas, message } = await client.saveOwnKey(preset, credential.trim(), model.trim() || null)
      setKeys(actualizadas)
      setNotice(message)
      // La clave no se queda en pantalla ni en el estado de React.
      setCredential('')
      setModel('')
      setEditing(null)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return unauthorized()
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la clave.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(key: OwnKey) {
    if (!window.confirm(removeOwnKeyWarning(key))) return
    setBusy(true)
    setError(null)
    try {
      const { keys: actualizadas, message } = await client.deleteOwnKey(key.preset)
      setKeys(actualizadas)
      setNotice(message)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return unauthorized()
      setError('No se pudo borrar la clave.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card stack" style={{ marginTop: 16 }}>
      <div className="label" style={{ marginTop: 0 }}>
        Tu propia clave de IA
      </div>
      <p className="hint">
        Si pones tu clave, tus mesas narran con ella y no gastan del cupo gratuito: le pagas los tokens directamente al proveedor. La clave se guarda cifrada y no vuelve a
        mostrarse.
      </p>

      {loading ? <p className="hint">Cargando…</p> : null}

      {keys.map((key) => (
        <div key={key.preset} className="stack" style={{ borderTop: '1px solid var(--line, #3a2f24)', paddingTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong>{ownKeyLabel(key)}</strong>
            {key.configured ? (
              <button type="button" className="btn" onClick={() => void remove(key)} disabled={busy}>
                Quitar
              </button>
            ) : null}
          </div>
          <p className="hint" style={{ margin: 0 }}>
            {ownKeyStatus(key)}
          </p>

          {editing === key.preset ? (
            <div className="stack">
              <label className="field">
                <span>Clave</span>
                <input
                  className="input"
                  type="password"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder={keyConsole(key.preset) ? `La sacas en ${keyConsole(key.preset)}` : 'Tu clave'}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className="field">
                <span>Modelo (opcional)</span>
                <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="El del proveedor por defecto" autoComplete="off" spellCheck={false} />
              </label>
              <div className="row">
                <button type="button" className="btn primary" onClick={() => void save(key.preset)} disabled={busy}>
                  {busy ? 'Comprobando…' : 'Guardar y comprobar'}
                </button>
                <button type="button" className="btn" onClick={() => setEditing(null)} disabled={busy}>
                  Cancelar
                </button>
              </div>
              <p className="hint" style={{ margin: 0 }}>
                Antes de guardarla se prueba contra el proveedor, así no te enteras de que estaba mal a media partida.
              </p>
            </div>
          ) : (
            <div className="row">
              <button type="button" className="btn" onClick={() => open(key.preset)} disabled={busy}>
                {key.configured ? 'Cambiar clave' : 'Poner mi clave'}
              </button>
            </div>
          )}
        </div>
      ))}

      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="hint">{notice}</p> : null}
    </section>
  )
}
