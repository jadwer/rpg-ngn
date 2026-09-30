'use client'

import { t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type PackIssue, type PackOption } from '@rpg-ngn/api-client'
import { packOriginText, packStatusText } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PackPreview } from '../../components/PackPreview'
import { RequireSession } from '../../components/RequireSession'
import { AppShell } from '../../components/shell/AppShell'

const SPEC = 'https://github.com/jadwer/rpg-ngn/blob/dev/docs/05-content-pack-spec.md'

export default function WorldsPage() {
  return (
    <RequireSession>
      {({ client, user, unauthorized, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <Worlds client={client} unauthorized={unauthorized} />
        </AppShell>
      )}
    </RequireSession>
  )
}

/**
 * Mis mundos (entrega 8, docs/15): subir un .rpgpack, ver los propios con su
 * estado, pedir publicarlos, retirarlos, y añadir de el catalogo lo que otros
 * publicaron. Privado al instante; publico tras revision.
 */
function Worlds({ client, unauthorized }: { client: ApiClient; unauthorized: (notice?: string) => void }) {
  const [mine, setMine] = useState<{ packs: PackOption[]; freeLimit: number; used: number } | null>(null)
  const [catalog, setCatalog] = useState<PackOption[] | null>(null)
  // La cola de revision: null si la cuenta no es de administracion (403).
  const [review, setReview] = useState<PackOption[] | null>(null)
  // El mundo cuyo visor esta abierto (id del engine).
  const [previewing, setPreviewing] = useState<string | null>(null)
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
      setReview(await client.reviewQueue().catch(() => null))
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

  // Cada lista abre su propio visor: el mismo mundo puede estar en revision,
  // en los tuyos y en el catalogo a la vez.
  const previewToggle = (key: string) => (
    <button type="button" className="btn ghost small" onClick={() => setPreviewing((cur) => (cur === key ? null : key))}>
      {previewing === key ? t('play.hideCharacters') : t('play.showCharacters')}
    </button>
  )

  return (
    <div className="page en-shell narrow mundos">
      <h1 className="pagina-titulo">{t('myWorldsPage.misMundos')}</h1>

      <section className="card stack">
        <div className="label" style={{ marginTop: 0 }}>
          {t('myWorldsPage.subirUnMundo')}
        </div>
        <p className="hint">
          {t('myWorldsPage.unMundoEsUn')} <b>{t('myWorldsPage.rpgpack')}</b>: un zip con la estructura de la{' '}
          <a href={SPEC} target="_blank" rel="noreferrer">
            {t('myWorldsPage.especificacionPublica')}
          </a>{' '}
          (personajes, lugares, secretos, sesiones, retratos y mapas). Se revisa al momento y queda listo para tus mesas. Las imágenes se convierten a WebP; nada de SVG.
        </p>
        <label className="field">
          <span>{t('myWorldsPage.archivo')}</span>
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

      {review ? (
        <section className="stack" style={{ marginTop: 20 }}>
          <div className="label">{t('myWorldsPage.revisionDelCatalogo')}</div>
          <p className="hint">{t('myWorldsPage.seMiraEnEste')}</p>
          {review.length === 0 ? <p className="hint">{t('myWorldsPage.nadaEnLaCola')}</p> : null}
          {review.map((p) => (
            <article key={p.packId} className="card mundo-propio">
              <div className="top">
                <div>
                  <h3>{p.name}</h3>
                  <span className="hint">
                    {packOriginText({ origin: 'catalog', author: p.author ?? null })} · versión {p.version} · {p.system}
                  </span>
                </div>
              </div>
              <p className="hint">
                Procedencia: {String(p.provenance?.['class'] ?? '?')} · licencia {String(p.provenance?.['license'] ?? '?')}
              </p>
              {previewing === `review:${p.id}` ? <PackPreview client={client} packId={p.id} version={p.version} /> : null}
              <div className="row">
                {previewToggle(`review:${p.id}`)}
                <button type="button" className="btn primary small" disabled={busy} onClick={() => void act(() => client.reviewPack(p.packId!, 'approve'))}>
                  {t('myWorldsPage.publicar')}
                </button>
                <button
                  type="button"
                  className="btn ghost small danger"
                  disabled={busy}
                  onClick={() => {
                    const note = window.prompt('Motivo del rechazo (lo lee el autor):')
                    if (note && note.trim()) void act(() => client.reviewPack(p.packId!, 'reject', note.trim()))
                  }}
                >
                  {t('myWorldsPage.rechazar')}
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className="stack" style={{ marginTop: 20 }}>
        <div className="label">{t('myWorldsPage.misMundos')}</div>
        {mine === null ? <p className="hint">{t('myWorldsPage.cargando')}</p> : mine.packs.length === 0 ? <p className="hint">{t('myWorldsPage.todaviaNoHasSubido')}</p> : null}
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
              {t('play.packCounts', { characters: p.characters, sessions: p.sessions })} {p.tables ? t(p.tables === 1 ? 'play.tablesPlayOne' : 'play.tablesPlayMany', { count: p.tables }) : t('play.noTableYet')}
            </p>
            {p.status === 'rejected' && p.reviewNote ? <div className="error">No se publicó: {p.reviewNote}</div> : null}
            {p.status === 'pending' ? <p className="hint">{t('myWorldsPage.enLaColaDe')}</p> : null}
            {previewing === `mine:${p.id}` ? <PackPreview client={client} packId={p.id} version={p.version} /> : null}
            <div className="row">
              {previewToggle(`mine:${p.id}`)}
              {p.status === 'private' || p.status === 'rejected' ? (
                <button type="button" className="btn small" disabled={busy} onClick={() => void act(() => client.publishPack(p.packId!))}>
                  {t('myWorldsPage.pedirPublicacion')}
                </button>
              ) : null}
              {p.status === 'pending' || p.status === 'published' ? (
                <button type="button" className="btn small" disabled={busy} onClick={() => void act(() => client.unpublishPack(p.packId!))}>
                  {p.status === 'published' ? t('play.unpublish') : t('play.cancelReview')}
                </button>
              ) : null}
              <button
                type="button"
                className="btn ghost small"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(p.tables ? t('play.confirmRetire') : t('play.confirmDelete'))) void act(() => client.deletePack(p.packId!))
                }}
              >
                {p.tables ? t('play.retireShort') : t('play.delete')}
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="stack" style={{ marginTop: 20 }}>
        <div className="label">{t('myWorldsPage.catalogo')}</div>
        <p className="hint">{t('myWorldsPage.mundosQueOtrosPublicaron')}</p>
        {catalog === null ? <p className="hint">{t('myWorldsPage.cargando')}</p> : catalog.length === 0 ? <p className="hint">{t('myWorldsPage.todaviaNoHayMundos')}</p> : null}
        {catalog?.map((p) => (
          <article key={p.packId} className="card mundo-propio">
            <div className="top">
              <div>
                <h3>{p.name}</h3>
                <span className="hint">
                  {packOriginText({ origin: 'catalog', author: p.author ?? null })} · versión {p.version} · {p.system}
                </span>
              </div>
              {p.mine ? <span className="chip">{t('myWorldsPage.tuyo')}</span> : p.activated ? <span className="chip done">{t('myWorldsPage.enTusMundos')}</span> : null}
            </div>
            {p.tagline ? <p className="tagline">{p.tagline}</p> : null}
            <p className="hint">
              {t('play.packCounts', { characters: p.characters, sessions: p.sessions })}
            </p>
            {previewing === `catalog:${p.id}` ? <PackPreview client={client} packId={p.id} version={p.version} /> : null}
            {!p.mine ? (
              <div className="row">
                {previewToggle(`catalog:${p.id}`)}
                {p.activated ? (
                  <button type="button" className="btn ghost small" disabled={busy} onClick={() => void act(() => client.deactivatePack(p.packId!))}>
                    {t('myWorldsPage.quitarDeMisMundos')}
                  </button>
                ) : (
                  <button type="button" className="btn primary small" disabled={busy} onClick={() => void act(() => client.activatePack(p.packId!))}>
                    {t('myWorldsPage.anadirAMisMundos')}
                  </button>
                )}
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  )
}
