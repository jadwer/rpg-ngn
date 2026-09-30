import type { Messages } from '../../types.js'
import type { pushToggle as es } from '../es/pushToggle.js'

export const pushToggle: Messages<typeof es> = {
  avisos: 'Notifications',
  browserEnOs: '{{browser}} on {{os}}',
}
