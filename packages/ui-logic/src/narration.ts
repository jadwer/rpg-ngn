/**
 * Particion de prosa en bloques legibles por TTS. Android limita la longitud
 * por llamada (docs/09) y leer por bloques da pausas naturales, asi que un
 * recap se parte por parrafos y, dentro de cada parrafo, por oraciones
 * agrupadas hasta `maxChars`.
 */

export interface SplitOptions {
  /** Longitud maxima aproximada de cada bloque; una oracion mas larga queda entera. */
  maxChars?: number
}

const DEFAULT_MAX_CHARS = 320
const TERMINATORS = new Set(['.', '!', '?', '…'])
const CLOSERS = new Set(['"', '»', ')', "'", '”'])
const OPENERS = /[A-ZÁÉÍÓÚÑÜ¿¡"«“(0-9]/

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0)
}

/** Oraciones de un parrafo. Corta tras `.`, `!`, `?` o `…` seguidos de espacio y mayuscula, cifra o apertura. */
export function splitSentences(paragraph: string): string[] {
  const text = paragraph.replace(/\s+/g, ' ').trim()
  const sentences: string[] = []
  let start = 0
  let i = 0
  while (i < text.length) {
    const ch = text[i] as string
    if (TERMINATORS.has(ch)) {
      let end = i + 1
      while (end < text.length && (TERMINATORS.has(text[end] as string) || CLOSERS.has(text[end] as string))) end += 1
      let next = end
      while (next < text.length && text[next] === ' ') next += 1
      const boundary = next > end && (next >= text.length || OPENERS.test(text[next] as string))
      if (boundary || next >= text.length) {
        sentences.push(text.slice(start, end).trim())
        start = next
      }
      i = end
      continue
    }
    i += 1
  }
  if (start < text.length) {
    const tail = text.slice(start).trim()
    if (tail) sentences.push(tail)
  }
  return sentences.filter((s) => s.length > 0)
}

/** Agrupa oraciones consecutivas sin pasar de `maxChars`; devuelve un bloque por grupo. */
export function splitNarration(text: string, options: SplitOptions = {}): string[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS
  const chunks: string[] = []
  for (const paragraph of splitParagraphs(text)) {
    let current = ''
    for (const sentence of splitSentences(paragraph)) {
      if (current === '') {
        current = sentence
      } else if (current.length + 1 + sentence.length <= maxChars) {
        current = `${current} ${sentence}`
      } else {
        chunks.push(current)
        current = sentence
      }
    }
    if (current !== '') chunks.push(current)
  }
  return chunks
}
