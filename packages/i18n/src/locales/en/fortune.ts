import type { Messages } from '../../types.js'
import type { fortune as es } from '../es/fortune.js'

export const fortune: Messages<typeof es> = {
  d20: { badLuck: 'Bad luck', awkward: 'Awkward', normal: 'Normal', goodStar: 'Lucky star', lucky: 'Fortunate', destiny: 'Destiny' },
  court: { noticed: 'Someone notices', doorCloses: 'The door closes', tradeoff: 'You get something, you leave a trace', letThrough: 'They let you through', wideOpen: 'They throw the doors wide open' },
  masquerade: { blunder: 'You put your foot in it in front of everyone', politeSmile: 'A polite smile', looksAway: 'They listen, but look away', realLaugh: 'A real laugh', maskOff: 'The mask comes off' },
}
