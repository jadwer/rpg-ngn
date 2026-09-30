import type { Messages } from '../../types.js'
import type { personaPanel as es } from '../es/personaPanel.js'

export const personaPanel: Messages<typeof es> = {
  guardar: 'Save',
  tuPersonaje: 'Your character',
  tuPersonajeNombre: 'Your character: {{name}}',
  ocultar: 'hide',
  mostrar: 'show',
  elPackPoneElArquetipo: 'The pack sets the archetype; who they are is up to you. Only you and the GM see it, and the GM uses it to play the world for you. Answer whatever you want of this:',
}
