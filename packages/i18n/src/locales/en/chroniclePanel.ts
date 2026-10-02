import type { Messages } from '../../types.js'
import type { chroniclePanel as es } from '../es/chroniclePanel.js'

export const chroniclePanel: Messages<typeof es> = {
  cargando: 'Loading...',
  sinLosNombresDe: 'Without the names of the people who played',
  pedirCompartirLaHistoria: 'Ask to share the story',
  aceptoQueSeComparta: 'I agree to share it',
  retirarElEnlace: 'Withdraw the link',
  enlaceALaHistoria: 'Link to the story',
  publicarEnComunidad: 'Also publish it in Community',
  publicarHint: 'Anyone will be able to read it in Community, without the link. Every member of the table has to accept.',
  seraPublicada: 'This story will be published in Community once everyone accepts.',
  publicada: 'Published in Community.',
}
