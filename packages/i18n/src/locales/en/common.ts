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
  languages: { es: 'Español', en: 'English' },
}
