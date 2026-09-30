import type { Messages } from '../../types.js'
import type { tableRules as es } from '../es/tableRules.js'

export const tableRules: Messages<typeof es> = {
  dados: 'Dice',
  cuentaAtras: 'Countdown',
  ilustraciones: 'Illustrations',
  ilustrarEscenas: 'Illustrate scenes',
  soloTexto: 'Text only',
  secretosDelPack: 'Pack secrets',
  elMotorComparaCada: 'The engine compares every GM block with what the table has discovered. Only you see the warnings.',
}
