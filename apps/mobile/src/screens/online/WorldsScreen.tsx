import { ApiError, packPortraitUrl, type ApiClient, type PackOption, type PackSheets } from '@rpg-ngn/api-client'
import { packOriginText, packStatusText } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Button } from '../../components/Button'
import { Portrait } from '../../components/Portrait'
import { webOriginOf } from '../../online/server-url'
import { Backdrop } from '../../components/Backdrop'
import { PageHeader } from '../../components/PageHeader'
import { theme } from '../../theme'

interface Props {
  client: ApiClient
  onBack: () => void
  onUnauthorized: () => void
}

/**
 * Mis mundos en el telefono (entrega 8, docs/15), con lo mismo que la web
 * menos la subida: el .rpgpack se sube desde la web, que es donde se arma
 * el archivo. Aqui se ven los tuyos con su estado, se piden publicar o se
 * retiran, se mira y se añade lo del catalogo, y administracion revisa.
 */
export function WorldsScreen({ client, onBack, onUnauthorized }: Props) {
  const [mine, setMine] = useState<{ packs: PackOption[]; freeLimit: number; used: number } | null>(null)
  const [catalog, setCatalog] = useState<PackOption[] | null>(null)
  const [review, setReview] = useState<PackOption[] | null>(null)
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // El rechazo lleva motivo: se escribe aqui mismo, en la tarjeta.
  const [rejecting, setRejecting] = useState<{ packId: number; note: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fail = useCallback(
    (caught: unknown) => {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      else setError(caught instanceof Error ? caught.message : String(caught))
    },
    [onUnauthorized],
  )

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([client.listMyPacks(), client.listCatalog()])
      setMine(m)
      setCatalog(c)
      setReview(await client.reviewQueue().catch(() => null))
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

  const toggle = (key: string) => setPreviewing((cur) => (cur === key ? null : key))

  return (
    <View style={styles.screen}>
      <PageHeader back="Explorar" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} tintColor={theme.colors.accentBright} />}>
        <Backdrop />
        <View style={styles.list}>
        <Text style={styles.pageTitle}>Mis mundos</Text>
        <Text style={styles.subtitle}>Los que subes, los que revisas y los de la comunidad que añadiste</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {review ? (
          <>
            <Text style={styles.label}>Revisión del catálogo</Text>
            {review.length === 0 ? <Text style={styles.hint}>Nada en la cola.</Text> : null}
            {review.map((p) => (
              <View key={`r${p.packId}`} style={styles.card}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.hint}>{`${packOriginText({ origin: 'catalog', author: p.author ?? null })} · procedencia ${String(p.provenance?.['class'] ?? '?')} · ${String(p.provenance?.['license'] ?? '?')}`}</Text>
                {previewing === `review:${p.id}` ? <Preview client={client} pack={p} /> : null}
                {rejecting && rejecting.packId === p.packId ? (
                  <>
                    <TextInput value={rejecting.note} onChangeText={(note) => setRejecting({ packId: p.packId!, note })} placeholder="Motivo del rechazo (lo lee el autor)" placeholderTextColor={theme.colors.inkFaint} multiline style={styles.input} />
                    <View style={styles.row}>
                      <Button
                        label="Enviar rechazo"
                        small
                        primary
                        busy={busy}
                        disabled={rejecting.note.trim().length === 0}
                        onPress={() => {
                          const note = rejecting.note.trim()
                          setRejecting(null)
                          void act(() => client.reviewPack(p.packId!, 'reject', note))
                        }}
                      />
                      <Button label="Cancelar" small onPress={() => setRejecting(null)} />
                    </View>
                  </>
                ) : null}
                <View style={styles.row}>
                  <Button label={previewing === `review:${p.id}` ? 'Ocultar' : 'Ver personajes'} small onPress={() => toggle(`review:${p.id}`)} />
                  <Button label="Publicar" small primary busy={busy} onPress={() => void act(() => client.reviewPack(p.packId!, 'approve'))} />
                  <Button label="Rechazar" small busy={busy} onPress={() => setRejecting({ packId: p.packId!, note: '' })} />
                </View>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.label}>Tus mundos</Text>
        <Text style={styles.hint}>
          {mine ? `${mine.used} de ${mine.freeLimit} mundos propios. ` : ''}
          Para subir uno nuevo (un .rpgpack), entra a la web.
        </Text>
        <Button label="Subir un mundo en la web" small onPress={() => void Linking.openURL(`${webOriginOf(client.baseUrl)}/mundos`)} />
        {mine?.packs.map((p) => (
          <View key={`m${p.packId}`} style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.name, { flex: 1 }]}>{p.name}</Text>
              <Text style={styles.chip}>{packStatusText(p.status)}</Text>
            </View>
            <Text style={styles.hint}>{`${p.characters} personajes, ${p.sessions} sesiones.`}</Text>
            {p.status === 'rejected' && p.reviewNote ? <Text style={styles.error}>{`No se publicó: ${p.reviewNote}`}</Text> : null}
            {previewing === `mine:${p.id}` ? <Preview client={client} pack={p} /> : null}
            <View style={styles.row}>
              <Button label={previewing === `mine:${p.id}` ? 'Ocultar' : 'Ver personajes'} small onPress={() => toggle(`mine:${p.id}`)} />
              {p.status === 'private' || p.status === 'rejected' ? <Button label="Pedir publicación" small busy={busy} onPress={() => void act(() => client.publishPack(p.packId!))} /> : null}
              {p.status === 'pending' || p.status === 'published' ? <Button label={p.status === 'published' ? 'Retirar del catálogo' : 'Cancelar revisión'} small busy={busy} onPress={() => void act(() => client.unpublishPack(p.packId!))} /> : null}
            </View>
          </View>
        ))}

        <Text style={styles.label}>Catálogo</Text>
        <Text style={styles.hint}>Mundos que otros publicaron y pasaron revisión. Añadirlos no copia nada: al crear una mesa los ves como opción.</Text>
        {catalog?.length === 0 ? (
          <Text style={styles.hint}>
            Todavía no hay mundos de la comunidad. Los oficiales están en{' '}
            <Text style={styles.linkInline} onPress={onBack}>
              Explorar
            </Text>
            .
          </Text>
        ) : null}
        {catalog?.map((p) => (
          <View key={`c${p.packId}`} style={styles.card}>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.hint}>{`${packOriginText({ origin: 'catalog', author: p.author ?? null })} · ${p.characters} personajes`}</Text>
            {p.tagline ? <Text style={styles.tagline}>{p.tagline}</Text> : null}
            {previewing === `catalog:${p.id}` ? <Preview client={client} pack={p} /> : null}
            <View style={styles.row}>
              <Button label={previewing === `catalog:${p.id}` ? 'Ocultar' : 'Ver personajes'} small onPress={() => toggle(`catalog:${p.id}`)} />
              {p.mine ? null : p.activated ? (
                <Button label="Quitar de mis mundos" small busy={busy} onPress={() => void act(() => client.deactivatePack(p.packId!))} />
              ) : (
                <Button label="Añadir a mis mundos" small primary busy={busy} onPress={() => void act(() => client.activatePack(p.packId!))} />
              )}
            </View>
          </View>
        ))}
        </View>
      </ScrollView>
    </View>
  )
}

/** Los personajes y sesiones de un mundo, para verlo antes de añadirlo. */
function Preview({ client, pack }: { client: ApiClient; pack: PackOption }) {
  const [sheets, setSheets] = useState<PackSheets | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    void client.listPackSheets(pack.id, pack.version).then(
      (s) => {
        if (alive) setSheets(s)
      },
      () => {
        if (alive) setFailed(true)
      },
    )
    return () => {
      alive = false
    }
  }, [client, pack.id, pack.version])

  if (failed) return <Text style={styles.hint}>No se pudo leer este mundo.</Text>
  if (!sheets) return <Text style={styles.hint}>Cargando...</Text>
  return (
    <View style={styles.preview}>
      {sheets.characters.map((c) => {
        const path = packPortraitUrl(pack.id, c.portrait)
        return (
          <View key={c.id} style={styles.pc}>
            <Portrait path={null} uri={path ? `${client.baseUrl}${path}` : null} name={c.name} size={56} />
            <Text style={styles.pcName} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={styles.pcRole} numberOfLines={2}>{`${c.race} · ${c.class}`}</Text>
          </View>
        )
      })}
      {sheets.sessions.length > 0 ? <Text style={[styles.hint, { width: '100%' }]}>{`Sesiones: ${sheets.sessions.map((s) => s.title).join(' · ')}`}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingBottom: 48 },
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, gap: 12 },
  pageTitle: { fontFamily: theme.fonts.display, fontSize: 34, color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8 },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 17, color: theme.colors.ink, marginTop: -6, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6 },
  linkInline: { color: theme.colors.nebula, textDecorationLine: 'underline' },
  label: { marginTop: 10, fontFamily: theme.fonts.uiMedium, fontSize: 12, letterSpacing: 0.2, color: theme.colors.inkDim },
  hint: { fontFamily: theme.fonts.ui, fontSize: 14, lineHeight: 19, color: theme.colors.inkDim },
  error: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.danger },
  card: { gap: 8, padding: 14, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.borderSoft, backgroundColor: 'rgba(17, 22, 34, 0.9)' },
  name: { fontFamily: theme.fonts.serifSemiBold, fontSize: 16, color: theme.colors.ink },
  tagline: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.ink },
  chip: { fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.accentBright, borderWidth: 1, borderColor: theme.colors.accentBright, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  input: { fontFamily: theme.fonts.ui, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 8, padding: 10, minHeight: 60 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  preview: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pc: { width: 96, alignItems: 'center', gap: 4 },
  pcName: { fontFamily: theme.fonts.uiSemiBold, fontSize: 12, color: theme.colors.ink },
  pcRole: { fontFamily: theme.fonts.ui, fontSize: 11, color: theme.colors.inkDim, textAlign: 'center' },
})
