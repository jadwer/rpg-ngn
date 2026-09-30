import type { Messages } from '../../types.js'
import type { retireTable as es } from '../es/retireTable.js'

export const retireTable: Messages<typeof es> = {
  salirDeLaMesa: 'Leave the table',
  cancelar: 'Cancel',
  siBorrar: 'Yes, delete',
  borrarDelTodo: 'Delete for good',
}
