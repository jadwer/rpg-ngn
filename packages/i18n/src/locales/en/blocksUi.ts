import type { Messages } from '../../types.js'
import type { blocksUi as es } from '../es/blocksUi.js'

export const blocksUi: Messages<typeof es> = {
  comprimir: 'Collapse',
  soloParaTiAnfitrion: 'Only for you, host',
  masN: '({{count}} more)',
  /** Un susurro del director (docs/26, H7). */
  soloParaTi: 'Only for you',
}
