import type { Messages } from '../../types.js'
import type { ttsBar as es } from '../es/ttsBar.js'

export const ttsBar: Messages<typeof es> = {
  esteNavegadorNoTiene: 'This browser has no voice. The table is played by reading.',
  leer: 'Read',
  pausa: 'Pause',
  seguir: 'Continue',
  siguiente: 'Next',
  parar: 'Stop',
  voz: 'Voice',
  velocidad: 'Speed',
  leerLoNuevo: 'Read what is new',
  jugamosLeyendo: 'We play by reading',
  avisarSiNadieNarra: 'Warn if nobody reads aloud',
  ajustes: 'Settings',
  vozDelNavegadorEn: 'Browser voice in the reading language',
  velocidadDeLectura: 'Reading speed',
  quitarElAvisoDe: 'Turn off the nobody-reads-aloud warning',
  volverAAvisarSi: 'Warn again if nobody reads aloud',
  vozPorDefectoIdioma: 'Default voice, language, speed and pitch',
}
