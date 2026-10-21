import { t } from '@rpg-ngn/i18n'

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmation: string
  adult: boolean
}

export type RegisterBlocker = 'name' | 'email' | 'password' | 'tooShort' | 'confirmation' | 'mismatch' | 'adult'

/**
 * Lo primero que impide crear la cuenta, o null si ya se puede. Un boton
 * apagado sin motivo deja a la gente adivinando: un tester no pasaba del
 * registro porque las contraseñas no coincidian y no sabia cual era el error
 * (20-10). Web y app ponen este texto junto al boton.
 */
export function registerBlocker(form: RegisterForm): RegisterBlocker | null {
  if (!form.name.trim()) return 'name'
  if (!form.email.trim()) return 'email'
  if (!form.password) return 'password'
  if (form.password.length < 8) return 'tooShort'
  if (!form.confirmation) return 'confirmation'
  if (form.password !== form.confirmation) return 'mismatch'
  if (!form.adult) return 'adult'
  return null
}

export function registerBlockerText(blocker: RegisterBlocker): string {
  return t(`auth.blocker.${blocker}`)
}
