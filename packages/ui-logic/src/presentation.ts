import type { Chronicle } from '@rpg-ngn/api-client'

/**
 * La presentacion de una cronica en la web (02-10, Gabino): el mismo aspecto
 * que el video de la sesion (vertical para redes, horizontal para YouTube),
 * pero reproducida en el navegador. No genera nada en el servidor; quien
 * quiera un video la graba (OBS, la grabadora del telefono).
 *
 * Aqui va lo puro: en que orden salen las diapositivas y como se parten los
 * subtitulos. La pagina solo reproduce.
 */
export type PresentationFormat = 'vertical' | 'horizontal'

export interface Slide {
  /** La ilustracion en pantalla: la ultima vista, o la primera de la historia si aun no habia. */
  image: string | null
  text: string
  /** Quien habla, en un dialogo. */
  speaker: string | null
  /** La voz del narrador ya generada, si la hay; si no, la del navegador. */
  audioUrl: string | null
}

/** Caracteres por linea de subtitulo, los mismos del video. */
export const SUBTITLE_CHARS: Record<PresentationFormat, number> = { vertical: 34, horizontal: 58 }

export function presentationFormat(value: string | null | undefined): PresentationFormat {
  return value === 'horizontal' ? 'horizontal' : 'vertical'
}

/** Sin marcas de formato: ni el narrador ni el subtitulo leen asteriscos. */
function clean(text: string): string {
  return text.replace(/[*_#]/g, '').trim()
}

export function buildSlides(chronicle: Chronicle, session?: string | null): Slide[] {
  const sessions = session ? chronicle.sessions.filter((s) => s.code === session) : chronicle.sessions
  const blocks = sessions.flatMap((s) => s.turns.flatMap((t) => t.blocks))
  let current: string | null = null
  for (const block of blocks) {
    if (block.type === 'image' && block.url) {
      current = block.url
      break
    }
  }
  const slides: Slide[] = []
  for (const block of blocks) {
    if (block.type === 'image') {
      if (block.url) current = block.url
      continue
    }
    if (block.type !== 'narration' && block.type !== 'dialogue') continue
    const text = clean(block.text)
    if (!text) continue
    slides.push({ image: current, text, speaker: block.type === 'dialogue' ? block.speaker || null : null, audioUrl: block.audioUrl ?? null })
  }
  return slides
}

/** Un subtitulo: hasta dos lineas y lo que pesa del texto, para repartir el tiempo. */
export interface Caption {
  lines: string[]
  /** Fraccion del bloque (0 a 1) en la que empieza. */
  start: number
}

export function captionsFor(text: string, maxChars: number): Caption[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && `${line} ${word}`.length > maxChars) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  const total = Math.max(1, text.length)
  const captions: Caption[] = []
  let at = 0
  for (let i = 0; i < lines.length; i += 2) {
    const pair = lines.slice(i, i + 2)
    captions.push({ lines: pair, start: at / total })
    at += pair.join(' ').length + 1
  }
  return captions
}

/** El subtitulo que toca en un punto del bloque (0 a 1). */
export function captionAt(captions: readonly Caption[], progress: number): number {
  let index = 0
  for (let i = 0; i < captions.length; i++) if (captions[i]!.start <= progress) index = i
  return index
}

/** Duracion estimada de un bloque narrado por el navegador, para el zoom de la ilustracion. */
export function estimateSeconds(text: string): number {
  return Math.max(3, text.length / 14)
}
