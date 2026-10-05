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
/** Lineas por subtitulo: en vertical sobra lugar bajo la ilustracion. */
export const SUBTITLE_LINES: Record<PresentationFormat, number> = { vertical: 3, horizontal: 2 }

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
    // Lo que el jugador escribio como accion ("Le pregunto de frente que
    // quiere") no va en el video: ahi la historia la cuenta el GM, que ya
    // narra esa accion (Gabino, 05-10).
    if (block.type === 'dialogue' && block.declared) continue
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

/** Parte en lineas de hasta `maxChars`, sin cortar palabras. */
function wrap(text: string, maxChars: number): string[] {
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
  return lines
}

/** Palabras con las que un subtitulo no debe terminar ("en la penumbra el"). */
const WEAK_ENDS = new Set(['el', 'la', 'los', 'las', 'lo', 'un', 'una', 'unos', 'unas', 'de', 'del', 'a', 'al', 'en', 'y', 'e', 'o', 'u', 'que', 'con', 'por', 'para', 'sin', 'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'se', 'le', 'les', 'me', 'te', 'nos', 'the', 'a', 'an', 'of', 'to', 'in', 'on', 'and', 'or', 'with', 'for', 'your', 'his', 'her', 'its', 'their', 'at', 'by', 'from', 'as'])
/** Palabras ante las que conviene cortar: empiezan otra parte de la frase. */
const GOOD_STARTS = new Set(['y', 'e', 'que', 'cuando', 'mientras', 'pero', 'porque', 'donde', 'como', 'hasta', 'aunque', 'sin', 'con', 'para', 'antes', 'despues', 'después', 'and', 'but', 'when', 'while', 'where', 'as', 'until', 'because', 'that', 'which', 'with', 'before', 'after'])

const bare = (word: string) => word.toLowerCase().replace(/[^\p{L}]/gu, '')

/**
 * Una oracion larga sin comas en trozos parejos: se corta cerca de donde
 * toca, antes de una conjuncion si la hay a mano, y nunca despues de un
 * articulo o una preposicion.
 */
function splitBalanced(text: string, maxChars: number, maxLines: number): string[][] {
  const words = text.split(/\s+/).filter(Boolean)
  const parts = Math.ceil(wrap(text, maxChars).length / maxLines)
  if (parts <= 1 || words.length < 2) return [wrap(text, maxChars)]
  const out: string[][] = []
  let from = 0
  for (let k = 1; k < parts; k++) {
    const remaining = words.slice(from).join(' ').length
    const target = remaining / (parts - k + 1)
    let best = from + 1
    let bestCost = Number.POSITIVE_INFINITY
    let length = 0
    for (let i = from + 1; i < words.length; i++) {
      length += words[i - 1]!.length + 1
      const chunk = words.slice(from, i).join(' ')
      if (wrap(chunk, maxChars).length > maxLines) break
      let cost = Math.abs(length - target)
      if (WEAK_ENDS.has(bare(words[i - 1]!))) cost += 1000
      if (GOOD_STARTS.has(bare(words[i]!))) cost -= maxChars * 0.4
      if (cost < bestCost) {
        bestCost = cost
        best = i
      }
    }
    out.push(wrap(words.slice(from, best).join(' '), maxChars))
    from = best
  }
  const rest = words.slice(from).join(' ')
  const lines = wrap(rest, maxChars)
  if (lines.length <= maxLines) out.push(lines)
  else for (let i = 0; i < lines.length; i += maxLines) out.push(lines.slice(i, i + maxLines))
  return out
}

/** Junta trozos en subtitulos de hasta `maxLines` lineas; uno que no cabe se reparte parejo. */
function pack(pieces: readonly string[], maxChars: number, maxLines: number): string[][] {
  const out: string[][] = []
  let current = ''
  const flush = () => {
    if (current) out.push(wrap(current, maxChars))
    current = ''
  }
  for (const piece of pieces) {
    const joined = current ? `${current} ${piece}` : piece
    if (wrap(joined, maxChars).length <= maxLines) {
      current = joined
      continue
    }
    flush()
    if (wrap(piece, maxChars).length <= maxLines) current = piece
    else out.push(...splitBalanced(piece, maxChars, maxLines))
  }
  flush()
  return out
}

/**
 * Los subtitulos de un bloque (Gabino, 02-10: "mas natural que se corte en
 * cada punto, o por lo menos en una coma"). Cada oracion empieza subtitulo
 * nuevo; una oracion que no cabe se parte por comas, punto y coma o dos
 * puntos, y un trozo que sigue sin caber se reparte parejo antes de una
 * conjuncion y nunca despues de un articulo.
 */
export function captionsFor(text: string, maxChars: number, maxLines = 2): Caption[] {
  const sentences = text.split(/(?<=[.!?…])["»”)]?\s+/).map((x) => x.trim()).filter(Boolean)
  const groups: string[][] = []
  for (const sentence of sentences) {
    if (wrap(sentence, maxChars).length <= maxLines) {
      groups.push(wrap(sentence, maxChars))
      continue
    }
    groups.push(...pack(sentence.split(/(?<=[,;:])\s+/).filter(Boolean), maxChars, maxLines))
  }
  const total = Math.max(1, text.length)
  const captions: Caption[] = []
  let at = 0
  for (const lines of groups) {
    captions.push({ lines, start: at / total })
    at += lines.join(' ').length + 1
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
