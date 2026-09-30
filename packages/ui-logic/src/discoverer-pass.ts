import { t } from '@rpg-ngn/i18n'
import type { DiscovererPass, PassAchievement, PassReward } from '@rpg-ngn/api-client'

/**
 * El pase de descubridor dicho en palabras (docs de monetizacion, seccion 6).
 * Web y app lo pintan igual desde aqui.
 */

/** Galerias de la coleccion, en el orden en que se muestran. */
// Getters: el nombre de cada galeria en el idioma vigente (i18n).
export const COLLECTION_GALLERIES: ReadonlyArray<{ code: string; label: string }> = (['marcos', 'titulos', 'dados', 'tarjetas', 'beneficios'] as const).map((code) => ({
  code,
  get label() {
    return t(`worlds.galleries.${code}`)
  },
}))

export function galleryLabel(code: string): string {
  return COLLECTION_GALLERIES.find((g) => g.code === code)?.label ?? code
}

/** "12 capítulos", "1 capítulo". */
export function chaptersLabel(n: number): string {
  return n === 1 ? t('worlds.chapterOne') : t('worlds.chapterMany', { count: n })
}

/** La racha, con el aviso de lo que se pierde si no juega hoy. */
export function streakText(pass: Pick<DiscovererPass, 'streak' | 'playedToday'>): string {
  if (pass.streak === 0) return t('worlds.pass.noStreak')
  const dias = pass.streak === 1 ? t('worlds.pass.oneDay') : t('worlds.pass.days', { count: pass.streak })
  return pass.playedToday ? t('worlds.pass.streakKeep', { days: dias }) : t('worlds.pass.streakRisk', { days: dias })
}

/** "Te faltan 6 capítulos para Marco de plata." */
export function nextRewardText(pass: Pick<DiscovererPass, 'next'>): string {
  if (!pass.next) return t('worlds.pass.allDone')
  return t(pass.next.missing === 1 ? 'worlds.pass.nextOne' : 'worlds.pass.nextMany', { chapters: chaptersLabel(pass.next.missing), label: pass.next.label })
}

/** Cuanto del camino lleva (0 a 1), contra el umbral mas alto con premio anunciado. */
export function pathProgress(pass: Pick<DiscovererPass, 'chapters' | 'blocks'>): number {
  const top = Math.max(0, ...pass.blocks.flatMap((b) => b.rewards.filter((r) => r.kind !== 'soon').map((r) => r.threshold)))
  if (top === 0) return 0
  return Math.min(1, pass.chapters / top)
}

/** Lo que dice la tarjeta de un premio bajo su nombre. */
export function rewardStatus(reward: PassReward, chapters: number): string {
  if (reward.earned) return reward.kind === 'world' ? t('worlds.pass.yoursWorld') : t('worlds.pass.earned')
  if (reward.kind === 'soon') return t('worlds.pass.soon')
  // El umbral ya va arriba en la tarjeta: aqui, lo que falta.
  const falta = Math.max(0, reward.threshold - chapters)
  return falta === 0 ? t('worlds.pass.readyNext') : t(falta === 1 ? 'worlds.pass.missingOne' : 'worlds.pass.missingMany', { chapters: chaptersLabel(falta) })
}

/** "3 de 5" o "Logrado". */
export function achievementProgress(a: PassAchievement): string {
  return a.done ? t('worlds.pass.achieved') : t('worlds.pass.progress', { progress: a.progress, goal: a.goal })
}

/** Dias que quedan de temporada, redondeando hacia arriba. */
export function seasonDaysLeft(endsAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now.getTime()) / 86_400_000))
}
