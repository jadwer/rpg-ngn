import type { Messages } from '../../types.js'
import type { es } from '../es/index.js'
import { auth } from './auth.js'
import { common } from './common.js'
import { shell } from './shell.js'

export const en: Messages<typeof es> = { auth, common, shell }
