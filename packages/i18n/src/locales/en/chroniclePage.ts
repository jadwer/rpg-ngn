import type { Messages } from '../../types.js'
import type { chroniclePage as es } from '../es/chroniclePage.js'

export const chroniclePage: Messages<typeof es> = {
  estaHistoriaNoSe: 'This story is not shared',
  elEnlaceNoExiste: 'The link does not exist, someone at the table withdrew it, or not everyone has accepted yet.',
  conocerAdAstraMentis: 'Discover Ad Astra Mentis',
  cargandoLaHistoria: 'Loading the story...',
  estaMesaTodaviaNo: 'This table has not played any turn yet.',
  unaHistoriaJugadaEn: 'A story played in Ad Astra Mentis, where you decide what happens: your light novel or your roleplaying campaign, with a game master who never gets tired.',
  jugarLaTuya: 'Play yours',
  sesionCodigo: 'Session {{code}}',
  laJugaron: 'Played by {{names}}.',
  tira: '{{actor}} rolls {{die}}: {{result}}.',
  escuchar: 'Listen to the story',
  escucharDesdeAqui: 'Listen from here',
  pausar: 'Pause',
  seguir: 'Resume',
  detener: 'Stop',
  narrando: 'Narrating {{n}} of {{total}}',
  vozNarrador: "With the narrator's voice",
}
