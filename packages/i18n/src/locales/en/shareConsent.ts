import type { Messages } from '../../types.js'
import type { shareConsent as es } from '../es/shareConsent.js'

/** The request to share the story, as a dialog inside the table (03-10). */
export const shareConsent: Messages<typeof es> = {
  title: 'The table wants to share the story',
  asked: '{{names}} already agreed to share this table\'s story.',
  link: 'It can be read with a link, without being published in Community.',
  listed: 'It can be read with a link and will also be published in Community.',
  anonymous: 'Without the players\' names.',
  everyone: 'It is only shared if everyone agrees. You can withdraw it later from Reading.',
  accept: 'I agree',
  later: 'Not now',
}
