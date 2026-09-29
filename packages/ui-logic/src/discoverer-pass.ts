import type { DiscovererPass, PassAchievement, PassReward } from '@rpg-ngn/api-client'

/**
 * El pase de descubridor dicho en palabras (docs de monetizacion, seccion 6).
 * Web y app lo pintan igual desde aqui.
 */

/** Galerias de la coleccion, en el orden en que se muestran. */
export const COLLECTION_GALLERIES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'marcos', label: 'Marcos de retrato' },
  { code: 'titulos', label: 'Títulos' },
  { code: 'dados', label: 'Dados' },
  { code: 'tarjetas', label: 'Tarjetas de personaje' },
  { code: 'beneficios', label: 'Beneficios' },
]

export function galleryLabel(code: string): string {
  return COLLECTION_GALLERIES.find((g) => g.code === code)?.label ?? code
}

/** "12 capítulos", "1 capítulo". */
export function chaptersLabel(n: number): string {
  return `${n} ${n === 1 ? 'capítulo' : 'capítulos'}`
}

/** La racha, con el aviso de lo que se pierde si no juega hoy. */
export function streakText(pass: Pick<DiscovererPass, 'streak' | 'playedToday'>): string {
  if (pass.streak === 0) return 'Juega hoy para empezar una racha: cada día seguido vale más.'
  const dias = pass.streak === 1 ? '1 día' : `${pass.streak} días seguidos`
  return pass.playedToday ? `Racha de ${dias}. Vuelve mañana para no perderla.` : `Racha de ${dias}. Juega hoy o la pierdes.`
}

/** "Te faltan 6 capítulos para Marco de plata." */
export function nextRewardText(pass: Pick<DiscovererPass, 'next'>): string {
  if (!pass.next) return 'Tienes todo el camino de la temporada.'
  return `Te ${pass.next.missing === 1 ? 'falta' : 'faltan'} ${chaptersLabel(pass.next.missing)} para ${pass.next.label}.`
}

/** Cuanto del camino lleva (0 a 1), contra el umbral mas alto con premio anunciado. */
export function pathProgress(pass: Pick<DiscovererPass, 'chapters' | 'blocks'>): number {
  const top = Math.max(0, ...pass.blocks.flatMap((b) => b.rewards.filter((r) => r.kind !== 'soon').map((r) => r.threshold)))
  if (top === 0) return 0
  return Math.min(1, pass.chapters / top)
}

/** Lo que dice la tarjeta de un premio bajo su nombre. */
export function rewardStatus(reward: PassReward, chapters: number): string {
  if (reward.earned) return reward.kind === 'world' ? 'Tuya' : 'Ganado'
  if (reward.kind === 'soon') return 'Por anunciar'
  // El umbral ya va arriba en la tarjeta: aqui, lo que falta.
  const falta = Math.max(0, reward.threshold - chapters)
  return falta === 0 ? 'Listo al jugar tu siguiente turno' : `${falta === 1 ? 'Falta' : 'Faltan'} ${chaptersLabel(falta)}`
}

/** "3 de 5" o "Logrado". */
export function achievementProgress(a: PassAchievement): string {
  return a.done ? 'Logrado' : `${a.progress} de ${a.goal}`
}

/** Dias que quedan de temporada, redondeando hacia arriba. */
export function seasonDaysLeft(endsAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now.getTime()) / 86_400_000))
}
