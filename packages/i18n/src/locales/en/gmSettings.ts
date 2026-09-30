import type { Messages } from '../../types.js'
import type { gmSettings as es } from '../es/gmSettings.js'

export const gmSettings: Messages<typeof es> = {
  proveedor: 'Provider',
  guardar: 'Save',
  tuPropiaClave: 'Your own key is saved in My account and credits; if you have one for this provider, the table uses it.',
  modeloOpcional: 'Model (optional)',
  vacioElDelPreset: 'Empty: {{model}}. Only if you know which model you want.',
  elDelPreset: 'the preset one',
  probar: 'Test',
  probarNoGasta: 'Testing does not spend a turn; it only checks the key and model.',
}
