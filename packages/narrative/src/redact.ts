const REDACTED = '[credencial redactada]'

/** Patrones de claves de API conocidos, por si una credencial distinta se cuela en un mensaje del SDK. */
const KEY_PATTERNS = [/sk-ant-[A-Za-z0-9_-]{8,}/g, /sk-(?:proj-)?[A-Za-z0-9_-]{16,}/g]

/**
 * Quita la credencial (y cualquier cosa con forma de clave) de un texto.
 * Se aplica a todo mensaje de error que sale del proveedor: docs/11 D6 exige
 * que la clave no aparezca en logs ni en respuestas.
 */
export function redact(text: string, credential?: string): string {
  let out = text
  // Las claves reales tienen decenas de caracteres; un marcador como `ollama` no es secreto y se deja legible.
  if (credential && credential.length >= 12) {
    out = out.split(credential).join(REDACTED)
  }
  for (const pattern of KEY_PATTERNS) {
    out = out.replace(pattern, REDACTED)
  }
  return out
}

/** Error del proveedor con el mensaje ya redactado y sin causa encadenada (la causa podria traer cabeceras). */
export class DMProviderError extends Error {
  constructor(message: string, credential?: string) {
    super(redact(message, credential))
    this.name = 'DMProviderError'
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
