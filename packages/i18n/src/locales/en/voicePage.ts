import type { Messages } from '../../types.js'
import type { voicePage as es } from '../es/voicePage.js'

export const voicePage: Messages<typeof es> = {
  voz: 'Voice',
  vozDeLaNarracion: 'Narration voice',
  idiomaDeLectura: 'Reading language',
  vozPorDefecto: 'Default voice',
  seEligeDeOido: 'Choose it by ear: the browser does not say whether a voice is low or high. On iPhone, Settings, Accessibility, Spoken Content, Voices lets you download more voices.',
  velocidad: 'Speed',
  tonoDelNarrador: 'Narrator pitch',
  masBajoSuenaMas: 'Lower sounds deeper. The party’s characters speak with the normal pitch and each NPC has their own, always the same.',
  leerLoNuevoEn: 'Read what is new aloud when the GM narrates',
  escucharUnaPrueba: 'Play a sample',
  parar: 'Stop',
  seGuardaEnEste: 'It is saved in this browser.',
}
