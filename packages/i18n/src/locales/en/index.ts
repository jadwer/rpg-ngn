import type { Messages } from '../../types.js'
import type { es } from '../es/index.js'
import { account } from './account.js'
import { auth } from './auth.js'
import { catalogHome } from './catalogHome.js'
import { common } from './common.js'
import { cta } from './cta.js'
import { home } from './home.js'
import { shell } from './shell.js'
import { table } from './table.js'
import { worlds } from './worlds.js'

export const en: Messages<typeof es> = { account, auth, catalogHome, common, cta, home, shell, table, worlds }
