import type { Messages } from '../../types.js'
import type { shell as es } from '../es/shell.js'

export const shell: Messages<typeof es> = {
  nav: {
    stories: 'Stories',
    home: 'Home',
    worlds: 'Worlds',
    tables: 'Tables',
    community: 'Community',
    exploreWorlds: 'Explore worlds',
    myWorlds: 'My worlds',
    myTables: 'My tables',
    campaigns: 'Campaigns',
    characters: 'Characters',
    friends: 'Friends',
    account: 'My account and credits',
    voice: 'Voice',
    hostGuide: 'Host guide',
    settings: 'Settings',
  },
  aria: {
    home: 'Ad Astra Mentis, home',
    main: 'Main',
    sections: 'Sections',
    searchWorlds: 'Search worlds',
    notices: 'Notices',
    accountMenu: 'Your account menu',
    siteMenu: 'Site menu',
    site: 'Site',
  },
  logout: 'Sign out',
  signIn: 'Sign in',
  signUp: 'Create account',
}
