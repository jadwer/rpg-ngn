import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fantasyD20Lite } from '@rpg-ngn/rules'
import { loadPilot, pilotSnapshotPath } from '../src/pilot.test-helpers.js'
import { reduce } from '../src/reduce.js'
import { serializeSnapshot, takeSnapshot } from '../src/snapshot.js'

/**
 * Escribe campaigns/pilot/snapshots/002.json: el estado canonico al cierre
 * de la sesion 002, producido por reduce con fantasy-d20-lite@1.0.0.
 *
 * Es el fixture de regresion de BA2. Se regenera solo cuando el cambio de
 * estado es deliberado (y entonces el commit explica que cambio y por que);
 * si el test lo detecta divergente sin ese motivo, el bug esta en el codigo.
 */
const { pack, events } = await loadPilot()
const state = reduce(events, { pack, ruleset: fantasyD20Lite })
const snapshot = takeSnapshot(state, '002')

await mkdir(dirname(pilotSnapshotPath), { recursive: true })
await writeFile(pilotSnapshotPath, serializeSnapshot(snapshot), 'utf8')
console.log(`${pilotSnapshotPath}: snapshot de la sesion 002 en seq ${snapshot.seq} (${snapshot.ruleset})`)
