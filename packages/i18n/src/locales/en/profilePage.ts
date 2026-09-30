import type { Messages } from '../../types.js'
import type { profilePage as es } from '../es/profilePage.js'

export const profilePage: Messages<typeof es> = {
  miCuenta: 'My account',
  cuenta: 'Account',
  nombre: 'Name',
  correo: 'Email',
  conElEntrasA: 'You use it to join the table. If you change it, the new one starts unverified.',
  contrasena: 'Password',
  contrasenaActual: 'Current password',
  nuevaContrasena: 'New password',
  repiteLaNueva: 'Repeat the new one',
  lasContrasenasNoCoinciden: 'The passwords do not match.',
  alMenos8Caracteres: 'At least 8 characters.',
}
