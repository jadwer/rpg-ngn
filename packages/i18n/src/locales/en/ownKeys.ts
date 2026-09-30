import type { Messages } from '../../types.js'
import type { ownKeys as es } from '../es/ownKeys.js'

export const ownKeys: Messages<typeof es> = {
  tuPropiaClaveDe: 'Your own AI key',
  siPonesTuClave: 'If you add your key, your tables narrate with it and spend none of the free quota: you pay the tokens straight to the provider. The key is stored encrypted and is never shown again.',
  cargando: 'Loading…',
  quitar: 'Remove',
  clave: 'Key',
  cancelar: 'Cancel',
  antesDeGuardarlaSe: 'Before saving it we test it against the provider, so you do not find out it was wrong in the middle of a game.',
  elDelProveedorPor: 'The provider’s default',
}
