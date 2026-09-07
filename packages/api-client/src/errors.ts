/**
 * Errores tipados del cliente. La app decide por `status`: 401 vuelve al
 * login, 403 avisa que no es miembro, 409 refresca el estado (el turno cambio
 * por debajo), 422 muestra el mensaje de validacion. `NetworkError` es que no
 * hubo respuesta (red caida, servidor apagado, URL mal escrita).
 */

export type ValidationErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly errors: ValidationErrors | null
  readonly body: unknown

  constructor(status: number, message: string, options: { errors?: ValidationErrors | null; body?: unknown } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = options.errors ?? null
    this.body = options.body
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  get isConflict(): boolean {
    return this.status === 409
  }

  get isValidation(): boolean {
    return this.status === 422
  }
}

export class NetworkError extends ApiError {
  constructor(message: string, cause?: unknown) {
    super(0, message)
    this.name = 'NetworkError'
    this.cause = cause
  }
}

interface ErrorShape {
  error?: unknown
  message?: unknown
  errors?: unknown
}

/**
 * Saca un mensaje legible del cuerpo de error, venga como venga: `{error}`
 * de los comandos de juego, `{message, errors}` de la validacion de Laravel
 * (cuyo `message` a veces es la clave `validation.required`, inutil para
 * el usuario) o `{errors: [{title, detail}]}` de JSON:API.
 */
export function describeError(status: number, body: unknown): { message: string; errors: ValidationErrors | null } {
  const shape = (body && typeof body === 'object' ? body : {}) as ErrorShape

  if (Array.isArray(shape.errors)) {
    const first = shape.errors[0] as { detail?: unknown; title?: unknown } | undefined
    const detail = typeof first?.detail === 'string' && first.detail ? first.detail : typeof first?.title === 'string' ? first.title : null
    return { message: detail ?? defaultMessage(status), errors: null }
  }

  const errors = isValidationErrors(shape.errors) ? shape.errors : null
  if (typeof shape.error === 'string' && shape.error) return { message: shape.error, errors }

  const message = typeof shape.message === 'string' ? shape.message : ''
  if (message && !message.startsWith('validation.')) return { message, errors }

  const firstError = errors ? Object.values(errors).flat().find((m) => m && !m.startsWith('validation.')) : undefined
  if (firstError) return { message: firstError, errors }
  if (errors) {
    const field = Object.keys(errors)[0]
    return { message: field ? `Revisa el campo ${field}.` : defaultMessage(status), errors }
  }
  return { message: defaultMessage(status), errors }
}

function isValidationErrors(value: unknown): value is ValidationErrors {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.values(value as object).every((v) => Array.isArray(v))
}

export function defaultMessage(status: number): string {
  switch (status) {
    case 401:
      return 'La sesion caduco. Vuelve a entrar.'
    case 403:
      return 'No tienes permiso para esto.'
    case 404:
      return 'No existe.'
    case 409:
      return 'El estado cambio por debajo. Vuelve a intentar.'
    case 422:
      return 'Datos invalidos.'
    case 429:
      return 'Demasiadas peticiones. Espera un momento.'
    default:
      return status >= 500 ? `Error del servidor (${status}).` : `Error ${status}.`
  }
}
