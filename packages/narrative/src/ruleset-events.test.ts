import { describe, expect, it } from 'vitest'
import { allowedEventFor } from './model-dm.js'
import { DM_SYSTEM_PROMPT, DM_SYSTEM_PROMPT_COMPACT, systemPromptFor } from './prompt.js'

/**
 * El prompt y los eventos aceptados dependen del ruleset. La mesa 4 de
 * produccion (court-intrigue) narro un turno entero sin mover el estado
 * porque el prompt era el del d20 y el provider descartaba `suspicion` como
 * basura (VAM del 19-09, motor A8).
 */
describe('prompt por ruleset', () => {
  it('el d20 recibe el prompt de siempre, byte a byte', () => {
    expect(systemPromptFor('fantasy-d20-lite')).toBe(DM_SYSTEM_PROMPT)
    expect(systemPromptFor(undefined)).toBe(DM_SYSTEM_PROMPT)
    expect(systemPromptFor('fantasy-d20-lite', true)).toBe(DM_SYSTEM_PROMPT_COMPACT)
  })

  it('la corte ofrece credito, sospecha y pistas, y no puntos de vida', () => {
    const prompt = systemPromptFor('court-intrigue')
    expect(prompt).toContain('"op":"suspicion"')
    expect(prompt).toContain('"op":"standing"')
    expect(prompt).toContain('"op":"clue"')
    expect(prompt).not.toContain('"op":"hp"')
    expect(prompt).not.toContain('"op":"memory_recovered"')
    // El tronco (contrato de realidad, agencia, estilo, formato) es el mismo.
    expect(prompt.startsWith(DM_SYSTEM_PROMPT.slice(0, DM_SYSTEM_PROMPT.indexOf('# Eventos que puedes proponer')))).toBe(true)

    const compact = systemPromptFor('court-intrigue', true)
    expect(compact).toContain('"op":"suspicion"')
    expect(compact).not.toContain('"op":"hp"')
    expect(compact.length).toBeLessThan(DM_SYSTEM_PROMPT.length)
  })
})

describe('prompt de la mascarada', () => {
  it('ofrece vinculos, rumores, prestigio y escandalo, y ni hp ni sospecha', () => {
    const prompt = systemPromptFor('masquerade')
    for (const op of ['bond', 'prestige', 'scandal']) expect(prompt).toContain(`"op":"${op}"`)
    // Los rumores dejaron de ser un efecto del ruleset y son un evento del dominio.
    expect(prompt).toContain('"type":"rumor_heard"')
    expect(prompt).not.toContain('"op":"hp"')
    expect(prompt).not.toContain('"op":"suspicion"')
    expect(prompt).toContain('Nunca digas al jugador lo que un NPC siente')
    expect(prompt.startsWith(DM_SYSTEM_PROMPT.slice(0, DM_SYSTEM_PROMPT.indexOf('# Eventos que puedes proponer')))).toBe(true)
    const compact = systemPromptFor('masquerade', true)
    expect(compact).toContain('"op":"bond"')
    expect(compact.length).toBeLessThan(DM_SYSTEM_PROMPT.length)
  })
})

describe('eventos aceptados por ruleset', () => {
  const suspicion = { type: 'state_change', actor: 'character:ryomen', effects: [{ op: 'suspicion', who: 'character:ryomen', delta: 2 }] }
  const clue = { type: 'state_change', effects: [{ op: 'clue', who: 'character:kogen', clue: 'la tetera salió de las cocinas del oeste' }] }
  const hp = { type: 'state_change', actor: 'character:zahira', effects: [{ op: 'hp', who: 'character:zahira', delta: -3 }] }
  const condition = { type: 'state_change', effects: [{ op: 'condition', who: 'character:tenma', add: 'vigilado' }] }

  it('la corte acepta sospecha y pistas y rechaza hp', () => {
    const allowed = allowedEventFor('court-intrigue')
    expect(allowed.safeParse(suspicion).success).toBe(true)
    expect(allowed.safeParse(clue).success).toBe(true)
    expect(allowed.safeParse(condition).success).toBe(true)
    expect(allowed.safeParse(hp).success).toBe(false)
    // Una pista vacia no es una pista, y un delta 0 no cambia nada.
    expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'clue', who: 'character:kogen', clue: '' }] }).success).toBe(false)
    expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'suspicion', who: 'character:kogen', delta: 0 }] }).success).toBe(false)
  })

  it('el d20 sigue aceptando hp y rechaza lo de la corte', () => {
    const allowed = allowedEventFor('fantasy-d20-lite')
    expect(allowed.safeParse(hp).success).toBe(true)
    expect(allowed.safeParse(condition).success).toBe(true)
    expect(allowed.safeParse(suspicion).success).toBe(false)
    expect(allowed.safeParse(clue).success).toBe(false)
  })

  it('la mascarada acepta vinculos con estado conocido y rechaza lo de la corte', () => {
    const allowed = allowedEventFor('masquerade')
    const bond = { type: 'state_change', effects: [{ op: 'bond', who: 'character:camille', with: 'npc:julien', state: 'interes' }] }
    expect(allowed.safeParse(bond).success).toBe(true)
    expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'bond', who: 'character:camille', with: 'npc:julien', state: 'amor' }] }).success).toBe(false)
    // Con tilde, como lo escribe el modelo, y sale normalizado (Haiku en produccion, mesa 9, 20-09).
    const accented = allowed.safeParse({ type: 'state_change', effects: [{ op: 'bond', who: 'character:camille', with: 'npc:julien', state: 'Atracción' }] })
    expect(accented.success).toBe(true)
    expect((accented.data as { effects: Array<{ state: string }> }).effects[0]!.state).toBe('atraccion')
    expect(allowed.safeParse({ type: 'rumor_heard', targets: ['character:camille'], payload: { text: 'la dama de rojo llegó sola' } }).success).toBe(true)
    expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'scandal', who: 'character:camille', delta: 2 }] }).success).toBe(true)
    expect(allowed.safeParse(condition).success).toBe(true)
    expect(allowed.safeParse(suspicion).success).toBe(false)
    expect(allowed.safeParse(hp).success).toBe(false)
  })

  it('lo comun (tiradas, objetos, mundo, secretos) vale en los dos', () => {
    const roll = { type: 'roll', actor: 'character:shiho', resolved: { kind: 'social', die: '1d20', skill: 'Etiqueta' } }
    const world = { type: 'world_event', payload: { note: 'Se dobla la guardia' } }
    for (const id of ['court-intrigue', 'fantasy-d20-lite']) {
      expect(allowedEventFor(id).safeParse(roll).success).toBe(true)
      expect(allowedEventFor(id).safeParse(world).success).toBe(true)
    }
  })
})

describe('lo que pasa en una escena social', () => {
  const npcAction = { type: 'npc_action', actor: 'npc:tomas', payload: { text: 'Cierra la puerta' } }
  const discovery = { type: 'discovery', targets: ['character:calder'], payload: { fact: 'fact:osric-bajo-anoche', confidence: 'uncertain', method: 'se contradice' } }
  const relationship = { type: 'state_change', effects: [{ op: 'relationship', who: 'npc:tomas', with: 'character:calder', delta: 1 }] }

  it('los tres rulesets aceptan npc_action, discovery y relationship', () => {
    // El modelo los proponia y el motor los tiraba en silencio: un turno
    // entero podia irse en "4 lineas que no se pudieron aplicar" (20-09).
    for (const id of ['fantasy-d20-lite', 'court-intrigue', 'masquerade']) {
      const allowed = allowedEventFor(id)
      expect(allowed.safeParse(npcAction).success).toBe(true)
      expect(allowed.safeParse(discovery).success).toBe(true)
      expect(allowed.safeParse(relationship).success).toBe(true)
    }
  })

  it('rechaza lo mal formado: sin fact, confianza inventada, delta fuera de escala o sujeto que no es NPC', () => {
    const allowed = allowedEventFor('fantasy-d20-lite')
    expect(allowed.safeParse({ ...discovery, payload: { ...discovery.payload, fact: 'osric' } }).success).toBe(false)
    expect(allowed.safeParse({ ...discovery, payload: { ...discovery.payload, confidence: 'probable' } }).success).toBe(false)
    expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'relationship', who: 'npc:tomas', with: 'character:calder', delta: 9 }] }).success).toBe(false)
    // El sujeto de una relacion es el NPC, que es quien tiene la actitud.
    expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'relationship', who: 'character:calder', with: 'npc:tomas', delta: 1 }] }).success).toBe(false)
  })

  it('el prompt se las ofrece al DM en los tres rulesets', () => {
    for (const id of ['fantasy-d20-lite', 'court-intrigue', 'masquerade']) {
      const prompt = systemPromptFor(id)
      expect(prompt).toContain('"type":"npc_action"')
      expect(prompt).toContain('"type":"discovery"')
      expect(prompt).toContain('"op":"relationship"')
    }
  })
})

describe('escenas y paso del tiempo', () => {
  const escena = { type: 'scene_started', worldTime: 'Valdoria, a la mañana siguiente', payload: { text: 'Amanece sobre el pueblo' } }

  it('los tres rulesets aceptan abrir y cerrar escena, con o sin worldTime', () => {
    // El reductor ya guardaba scene_started/scene_closed y ya aplicaba
    // worldTime; el DM no podia emitirlos, asi que una sesion nueva
    // arrastraba el momento de la anterior (20-09).
    for (const id of ['fantasy-d20-lite', 'court-intrigue', 'masquerade']) {
      const allowed = allowedEventFor(id)
      expect(allowed.safeParse(escena).success).toBe(true)
      expect(allowed.safeParse({ type: 'scene_closed', payload: { text: 'Cae la noche' } }).success).toBe(true)
      expect(allowed.safeParse({ type: 'world_event', worldTime: 'Valdoria, medianoche', payload: { note: 'Dan las doce' } }).success).toBe(true)
    }
  })

  it('rechaza un momento del mundo vacio o interminable, y una escena sin texto', () => {
    const allowed = allowedEventFor('fantasy-d20-lite')
    expect(allowed.safeParse({ ...escena, worldTime: '' }).success).toBe(false)
    expect(allowed.safeParse({ ...escena, worldTime: 'x'.repeat(121) }).success).toBe(false)
    expect(allowed.safeParse({ type: 'scene_started', payload: {} }).success).toBe(false)
  })

  it('el prompt se las ofrece al DM', () => {
    for (const id of ['fantasy-d20-lite', 'court-intrigue', 'masquerade']) {
      expect(systemPromptFor(id)).toContain('"type":"scene_started"')
      expect(systemPromptFor(id)).toContain('"worldTime"')
    }
  })
})

describe('condiciones sobre NPC', () => {
  it('un NPC puede quedar receloso, y el sujeto sigue sin poder ser otra cosa', () => {
    // Lo que mas intentaba el DM y mas se descartaba: los rulesets solo
    // saben aplicar condiciones a personajes jugadores (20-09).
    for (const id of ['fantasy-d20-lite', 'court-intrigue', 'masquerade']) {
      const allowed = allowedEventFor(id)
      expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'condition', who: 'npc:tomas', add: 'receloso' }] }).success).toBe(true)
      expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'condition', who: 'character:zahira', add: 'envenenada' }] }).success).toBe(true)
      expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'condition', who: 'location:mina', add: 'inundada' }] }).success).toBe(false)
    }
  })
})

describe('rumores', () => {
  const rumor = { type: 'rumor_heard', targets: ['character:zahira'], payload: { text: 'dicen que Osric subió con los bolsillos llenos', from: 'npc:tomas' } }

  it('los tres rulesets aceptan rumor_heard, y ya no existe el efecto propio de la mascarada', () => {
    for (const id of ['fantasy-d20-lite', 'court-intrigue', 'masquerade']) {
      const allowed = allowedEventFor(id)
      expect(allowed.safeParse(rumor).success).toBe(true)
      expect(allowed.safeParse({ ...rumor, payload: { ...rumor.payload, false: true } }).success).toBe(true)
      // El `rumor` de la mascarada se migro a rumor_heard: un rumor puede ser
      // falso y eso no es estado del personaje, es lo que oyo.
      expect(allowed.safeParse({ type: 'state_change', effects: [{ op: 'rumor', who: 'character:camille', rumor: 'algo' }] }).success).toBe(false)
    }
  })

  it('rechaza un rumor vacio, sin destinatario o interminable', () => {
    const allowed = allowedEventFor('masquerade')
    expect(allowed.safeParse({ ...rumor, payload: { text: 'no' } }).success).toBe(false)
    expect(allowed.safeParse({ ...rumor, targets: [] }).success).toBe(false)
    expect(allowed.safeParse({ ...rumor, payload: { text: 'x'.repeat(301) } }).success).toBe(false)
  })
})

describe('misiones', () => {
  const avance = { type: 'quest_update', payload: { quest: 'quest:la-mina', objective: 'llegar-al-pueblo', note: 'Cruzaron el portón' } }

  it('los tres rulesets aceptan el avance de una mision', () => {
    // El schema de quest.ts decia desde el principio "el progreso vive en el
    // estado de campaña", y ese estado no existia (20-09).
    for (const id of ['fantasy-d20-lite', 'court-intrigue', 'masquerade']) {
      const allowed = allowedEventFor(id)
      expect(allowed.safeParse(avance).success).toBe(true)
      expect(allowed.safeParse({ type: 'quest_update', payload: { quest: 'quest:la-mina', status: 'done' } }).success).toBe(true)
    }
  })

  it('rechaza una referencia mal formada o un estado inventado', () => {
    const allowed = allowedEventFor('fantasy-d20-lite')
    expect(allowed.safeParse({ type: 'quest_update', payload: { quest: 'la-mina' } }).success).toBe(false)
    expect(allowed.safeParse({ type: 'quest_update', payload: { quest: 'quest:la-mina', status: 'casi' } }).success).toBe(false)
  })

  it('cada ruleset cita una mision de su propio pack en el prompt', () => {
    expect(systemPromptFor('fantasy-d20-lite')).toContain('quest:la-mina')
    expect(systemPromptFor('court-intrigue')).toContain('quest:el-te-envenenado')
    expect(systemPromptFor('masquerade')).toContain('quest:la-cena')
  })
})
