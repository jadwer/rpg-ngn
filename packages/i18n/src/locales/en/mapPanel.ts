import type { Messages } from '../../types.js'
import type { mapPanel as es } from '../es/mapPanel.js'

export const mapPanel: Messages<typeof es> = {
  abrir: 'open',
  cerrar: 'Close',
  esc: 'Esc',
  mapaDeLaPartida: 'Game map',
  mapasDelPack: 'Pack maps',
  acercar: 'Zoom in',
  alejar: 'Zoom out',
  ruedaOPellizco: 'Scroll or pinch to zoom, drag to move; double click returns to the full map.',
  deCaminoOFuera: 'On the way or off scene: {{names}}.',
}
