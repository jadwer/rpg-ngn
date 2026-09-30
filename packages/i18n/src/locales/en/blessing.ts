import type { Messages } from '../../types.js'
import type { blessing as es } from '../es/blessing.js'

export const blessing: Messages<typeof es> = {
  title: 'Bard\'s Blessing',
  kicker: 'The bard blesses you',
  theme: 'Season theme: {{name}}',
  todayTurns: '+{{n}} turns to play',
  daysLeftOne: '1 day left to collect',
  daysLeftMany: '{{n}} days left to collect',
  lastDay: 'Today is the last day of your Blessing',
  collect: 'Collect',
  collected: '{{n}} turns are now in your reserve',
  collectFailed: 'Could not collect. Try again.',
  cardText: '30 days. {{first}} turns when you buy it and {{daily}} every day from 3 am (Mexico City time). A day you do not collect is lost; what you collect never expires.',
  refundNote: 'Refundable as long as you have collected two days at most.',
  buy: 'Buy for {{price}}',
  extend: 'Add 30 days for {{price}}',
  activeUntil: 'Active until {{date}}',
  capReached: 'You already have the 180-day maximum stacked.',
  summary: 'Bard\'s Blessing: 30 days of daily turns. One-time payment, it does not renew on its own.',
  purchased: 'The bard tunes the lute: your first {{n}} turns are already in your reserve, and there will be more every morning.',
}
