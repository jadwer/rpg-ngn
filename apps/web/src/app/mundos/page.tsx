'use client'

import { ApiError, type ApiClient, type PackIssue, type PackOption } from '@rpg-ngn/api-client'
import { packOriginText, packStatusText } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RequireSession } from '../../components/RequireSession'
import { UserBar } from '../../components/UserBar'
import type { StoredUser } from '../../lib/storage'

const SPEC = 'https://github.com/jadwer/rpg-ngn/blob/dev/docs/05-content-pack-spec.md'

export default function WorldsPage() {
  return <RequireSession>{({ client, user, unauthorized, logout }) => <Worlds client={client} user={user} unauthorized={unauthorized} logout={logout} />}</RequireSession>
}

/**
 * Mis mundos (entrega 8, docs/15): subir un .rpgpack, ver los propios con su
 * estado, pedir publicarlos, retirarlos, y añadir de el catalogo lo que otros
 * publicaron. Privado al instante; publico tras revision.
 */
function Worlds({ client, user, unauthorized, logout }: { client: ApiClient; user: StoredUser; unauthorized: (notice?: string) => void; logout: () => void }) {
  const [mine, setMine] = useState<{ packs: PackOption[]; freeLimit: number; used: number } | null>(null)
  const [catalog, setCatalog] = useState<PackOption[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [terms, setTerms] = useState(false)
  const [uploadNotice, setUploadNotice] = useState<{ ok: boolean; text: string; issues: PackIssue[] } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const fail = useCallback(
    (caught: unknown) => {
      if (caught instanceof ApiError && caught.isUnauthorized) unauthorized()
      else setError(caught instanceof Error ? caught.message : String(caught))
    },
    [unauthorized],
  )

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([client.listMyPacks(), client.listCatalog()])
      setMine(m)
      setCatalog(c)
      setError(null)
    } catch (caught) {
      fail(caught)
    }
  }, [client, fail])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await load()
    } catch (caught) {
      fail(caught)
    } finally {
      setBusy(false)
    }
  }

  const upload = async () => {
    if (!file || !terms) return
    setBusy(true)
    setUploadNotice(null)
    try {
      const pack = await client.uploadPack(file, file.name)
      setUploadNotice({ ok: true, text: `${pack.name} ya es tuyo: puedes crear una mesa con él.`, issues: [] })
      setFile(null)
      setTerms(false)
      if (fileInput.current) fileInput.current.value = ''
      await load()
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) unauthorized()
      else {
        const body = caught instanceof ApiError ? (caught.body as { issues?: PackIssue[] } | null) : null
        setUploadNotice({ ok: false, text: caught instanceof Error ? caught.message : String(caught), issues: body?.issues ?? [] })
      }
    } finally {
      setBusy(false)
    }
  }

  const remaining = mine ? Math.max(0, mine.freeLimit - mine.used) : null

  return (
    <main className="page narrow mundos">
      <UserBar title="Mis mundos" user={user} onLogout={logout} />

      <section className="card stack">
        <div className="label" style={{ marginTop: 0 }}>
          Subir un mundo
        </div>
        <p className="hint">
          Un mundo es un <b>.rpgpack</b>: un zip con la estructura de la{' '}
          <a href={SPEC} target="_blank" rel="noreferrer">
            especificación pública
          </a>{' '}
          (personajes, lugares, secretos, sesiones, retratos y mapas). Se revisa al momento y queda listo para tus mesas. Las imágenes se convierten a WebP; nada de SVG.
        </p>
        <label className="field">
          <span>Archivo</span>
          <input ref={fileInput} className="input" type="file" name="pack" accept=".rpgpack,.zip,application/zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={busy} />
        </label>
        <label className="check">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} disabled={busy} />
          Declaro que tengo derecho a subir este contenido (es mío o su licencia lo permite) y respondo de ello.
        </label>
        <div className="row">
          <button type="button" className="btn primary" disabled={busy || !file || !terms || remaining === 0} onClick={() => void upload()}>
            {busy ? <span className="spinner" aria-hidden /> : null}
            Subir
          </button>
          {mine ? (
            <span className="hint">
              {mine.used} de {mine.freeLimit} mundos propios{remaining === 0 ? ': para subir otro, retira uno o sube una versión nueva de los que tienes.' : '.'}
            </span>
          ) : null}
        </div>
        {uploadNotice ? (
          <div className={uploadNotice.ok ? 'ok' : 'error'}>
            {uploadNotice.text}
            {uploadNotice.issues.length > 0 ? (
              <ul className="issues">
                {uploadNotice.issues.map((i, n) => (
                  <li key={n}>
                    <code>{i.path}</code>: {i.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {error ? <div className="error">{error}</div> : null}

      <section className="stack" style={{ marginTop: 20 }}>
        <div className="label">Mis mundos</div>
        {mine === null ? <p className="hint">Cargando...</p> : mine.packs.length === 0 ? <p className="hint">Todavía no has subido ninguno.</p> : null}
        {mine?.packs.map((p) => (
          <article key={p.packId} className="card mundo-propio">
            <div className="top">
              <div>
                <h3>{p.name}</h3>
                <span className="hint">
                  {p.slug} · versión {p.version} · {p.system}
                </span>
              </div>
              <span className={`chip st-${p.status ?? 'private'}`}>{packStatusText(p.status)}</span>
            </div>
            {p.tagline ? <p className="tagline">{p.tagline}</p> : null}
            <p className="hint">
              {p.characters} personajes, {p.sessions} sesiones. {p.tables ? `${p.tables} ${p.tables === 1 ? 'mesa lo juega' : 'mesas lo juegan'}.` : 'Ninguna mesa todavía.'}
            </p>
            {p.status === 'rejected' && p.reviewNote ? <div className="error">No se publicó: {p.reviewNote}</div> : null}
            {p.status === 'pending' ? <p className="hint">En la cola de revisión: cuando pase, aparece en el catálogo con tu nombre.</p> : null}
            <div className="row">
              {p.status === 'private' || p.status === 'rejected' ? (
                <button type="button" className="btn small" disabled={busy} onClick={() => void act(() => client.publishPack(p.packId!))}>
                  Pedir publicación
                </button>
              ) : null}
              {p.status === 'pending' || p.status === 'published' ? (
                <button type="button" className="btn small" disabled={busy} onClick={() => void act(() => client.unpublishPack(p.packId!))}>
                  {p.status === 'published' ? 'Retirar del catálogo' : 'Cancelar la revisión'}
                </button>
              ) : null}
              <button
                type="button"
                className="btn ghost small"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(p.tables ? 'Hay mesas jugando este mundo: se retira de tu lista y esas mesas siguen. ¿Retirar?' : '¿Borrar este mundo? No se puede deshacer.')) void act(() => client.deletePack(p.packId!))
                }}
              >
                {p.tables ? 'Retirar' : 'Borrar'}
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="stack" style={{ marginTop: 20 }}>
        <div className="label">Catálogo</div>
        <p className="hint">Mundos que otros publicaron y pasaron revisión. Añadirlos a tus mundos no copia nada: al crear una mesa los ves como opción.</p>
        {catalog === null ? <p className="hint">Cargando...</p> : catalog.length === 0 ? <p className="hint">Todavía no hay mundos publicados. El tuyo puede ser el primero.</p> : null}
        {catalog?.map((p) => (
          <article key={p.packId} className="card mundo-propio">
            <div className="top">
              <div>
                <h3>{p.name}</h3>
                <span className="hint">
                  {packOriginText({ origin: 'catalog', author: p.author ?? null })} · versión {p.version} · {p.system}
                </span>
              </div>
              {p.mine ? <span className="chip">tuyo</span> : p.activated ? <span className="chip done">en tus mundos</span> : null}
            </div>
            {p.tagline ? <p className="tagline">{p.tagline}</p> : null}
            <p className="hint">
              {p.characters} personajes, {p.sessions} sesiones.
            </p>
            {!p.mine ? (
              <div className="row">
                {p.activated ? (
                  <button type="button" className="btn ghost small" disabled={busy} onClick={() => void act(() => client.deactivatePack(p.packId!))}>
                    Quitar de mis mundos
                  </button>
                ) : (
                  <button type="button" className="btn primary small" disabled={busy} onClick={() => void act(() => client.activatePack(p.packId!))}>
                    Añadir a mis mundos
                  </button>
                )}
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  )
}
