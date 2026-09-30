import { t } from '@rpg-ngn/i18n'
/**
 * Si la mesa ilustra sus escenas (`settings.images` de la API, E10a).
 * Encendido si nadie eligio: es lo que distingue la mesa, y el anfitrion lo
 * apaga si prefiere solo texto. La API decide ademas si el mundo se puede
 * ilustrar (procedencia) y cuantas van por sesion.
 */
export function sceneImagesOn(settings: Record<string, unknown> | null | undefined): boolean {
  return settings?.['images'] !== false
}

export function withSceneImages(settings: Record<string, unknown> | null | undefined, on: boolean): Record<string, unknown> {
  return { ...(settings ?? {}), images: on }
}

/**
 * El tope sale de la API (`imagesPerSession` de la mesa); antes estaba escrito
 * aqui como 6 y la config ya decia 12 (VAM 26-09, D2). Sin el dato, no se
 * inventa un numero.
 */
export function sceneImagesHint(on: boolean, perSession?: number | null): string {
  if (!on) return t('table.images.textOnly')
  const tope = perSession && perSession > 0 ? t('table.images.upTo', { count: perSession }) : ''
  return t('table.images.on', { cap: tope })
}
