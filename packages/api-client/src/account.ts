import { ApiError } from './errors.js'
import type { HttpResult, RequestOptions } from './http.js'
import { query } from './http.js'
import type { AuthUser, LoginResult } from './types.js'

/**
 * Cuenta del jugador (entrega 5b): registro en modo token (atomo/auth),
 * perfil (atomo/user), cambio de contraseña, recuperacion por correo y el
 * lookup por correo exacto para invitar desde cualquier cuenta.
 */

export interface RegisterInput {
  name: string
  email: string
  password: string
  passwordConfirmation: string
}

/**
 * Con verificacion de correo apagada (`ATOMO_REQUIRE_EMAIL_VERIFICATION=false`)
 * el registro devuelve el token y se entra directo; con ella encendida no hay
 * token hasta verificar y el login responde 403 mientras tanto.
 */
export type RegisterResult = ({ kind: 'token' } & LoginResult) | { kind: 'verify'; message: string }

export interface AccountApi {
  register(input: RegisterInput, deviceName: string): Promise<RegisterResult>
  /** Cambia el nombre visible (`PATCH /api/v1/profile`). */
  updateProfile(input: { name: string }): Promise<AuthUser>
  /** `PATCH /api/v1/profile/password`; 422 si la actual no coincide. */
  changePassword(currentPassword: string, password: string, passwordConfirmation: string): Promise<void>
  /** Pide el correo de recuperacion; la API responde igual exista o no la cuenta. Devuelve el mensaje. */
  forgotPassword(email: string): Promise<string>
  /** Cuenta con ese correo exacto (`GET /api/v1/users/lookup`); null si no existe. Cualquier cuenta puede usarlo. */
  lookupUser(email: string): Promise<AuthUser | null>
}

type Request = <T = unknown>(path: string, init?: RequestOptions) => Promise<HttpResult<T>>

interface RawUser {
  id: number | string
  name: string
  email: string
}

export function accountApi(request: Request): AccountApi {
  return {
    async register(input, deviceName) {
      const { data } = await request<{ message?: string; token?: string; expires_at?: string | null; email_verified?: boolean; user?: RawUser }>('/api/auth/register', {
        method: 'POST',
        anonymous: true,
        body: { name: input.name.trim(), email: input.email.trim(), password: input.password, password_confirmation: input.passwordConfirmation, device_name: deviceName },
      })
      if (data.token && data.user) {
        return { kind: 'token', token: data.token, expiresAt: data.expires_at ?? null, user: userFrom(data.user) }
      }
      return { kind: 'verify', message: data.message ?? 'Cuenta creada. Verifica tu correo para continuar.' }
    },

    async updateProfile(input) {
      const { data } = await request<{ data: { id: string; attributes: { name: string; email: string } } }>('/api/v1/profile', { method: 'PATCH', body: { name: input.name.trim() } })
      return { id: String(data.data.id), name: data.data.attributes.name, email: data.data.attributes.email }
    },

    async changePassword(currentPassword, password, passwordConfirmation) {
      await request('/api/v1/profile/password', { method: 'PATCH', body: { current_password: currentPassword, password, password_confirmation: passwordConfirmation } })
    },

    async forgotPassword(email) {
      const { data } = await request<{ message?: string }>('/api/auth/forgot-password', { method: 'POST', anonymous: true, body: { email: email.trim() } })
      return data?.message ?? 'Si el correo tiene cuenta, recibirá un enlace para cambiar la contraseña.'
    },

    async lookupUser(email) {
      try {
        const { data } = await request<{ data: RawUser }>(`/api/v1/users/lookup${query({ email: email.trim() })}`)
        return userFrom(data.data)
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 404) return null
        throw caught
      }
    },
  }
}

function userFrom(raw: RawUser): AuthUser {
  return { id: String(raw.id), name: raw.name, email: raw.email }
}
