import type { Messages } from '../../types.js'
import type { playersPanel as es } from '../es/playersPanel.js'

export const playersPanel: Messages<typeof es> = {
  anfitrion: 'host',
  tu: 'you',
  jugadores: 'Players',
  enLaMesa: 'At the table',
  sacar: 'Remove',
  sacarTitle: 'Remove this person from the table',
  bloquear: 'Block',
  bloquearTitle: 'Block this person',
  confirmSacar: 'Remove {{name}} from the table? They leave the turn, the GM sets their character aside and the invite link stops working; create a new one to invite more people.',
  confirmBloquear: 'Block {{name}}? They will not be able to send you requests or join your tables, and they leave the tables you share. You can unblock them in Community, under Friends.',
  confirmBloquearAnfitrion: 'Block {{name}}? They host this table: you will leave it and any other tables you share. You can unblock them in Community, under Friends.',
  siSacar: 'Yes, remove',
  siBloquear: 'Yes, block',
  cancelar: 'Cancel',
}
