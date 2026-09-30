import type { Messages } from '../../types.js'
import type { common as es } from '../es/common.js'

export const common: Messages<typeof es> = {
  appName: 'Ad Astra Mentis',
  loading: 'Loading…',
  save: 'Save',
  cancel: 'Cancel',
  close: 'Close',
  back: 'Back',
  retry: 'Try again',
  language: 'Language',
  browser: 'Browser',
  pushNotEnabled: 'The server does not have notifications turned on yet.',
  languages: { es: 'Español', en: 'English' },
  capituloWord: 'chapter',
  capitulosWord: 'chapters',
}
