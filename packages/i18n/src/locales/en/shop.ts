import type { Messages } from '../../types.js'
import type { shop as es } from '../es/shop.js'

export const shop: Messages<typeof es> = {
  title: 'Shop',
  sub: 'Everything you can buy in Ad Astra Mentis. One-time payments: nothing renews on its own.',
  passTitle: 'Season pass: {{season}}',
  worldsTitle: 'Worlds for sale',
  worldsText: 'Some official worlds are bought once and are yours forever. They are in Explore worlds, marked with their price.',
  worldsLink: 'See the worlds',
}
