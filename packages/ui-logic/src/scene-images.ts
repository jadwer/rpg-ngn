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

export function sceneImagesHint(on: boolean): string {
  return on
    ? 'El director ilustra la apertura, los cambios de lugar y los momentos clave (hasta 6 por sesión). Solo en mundos originales o con licencia.'
    : 'La mesa juega solo con texto.'
}
