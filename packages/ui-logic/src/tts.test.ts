import { describe, expect, it } from 'vitest'
import { narration, system } from './blocks.js'
import { createTtsController, speechQueue, TTS_IDLE, ttsReducer, type SpeechEngine, type TtsState } from './tts.js'

/** Motor falso: no termina solo, el test decide cuando acaba cada bloque. */
function fakeEngine(options: { native?: boolean } = {}) {
  const calls: string[] = []
  let pending: (() => void) | null = null
  const engine: SpeechEngine = {
    speak(text, onDone) {
      calls.push(`speak:${text}`)
      pending = onDone
    },
    stop() {
      calls.push('stop')
      pending = null
    },
  }
  if (options.native) {
    engine.pause = () => calls.push('pause')
    engine.resume = () => calls.push('resume')
  }
  return {
    engine,
    calls,
    finish() {
      const done = pending
      pending = null
      done?.()
    },
    /** Callback tardio de un speak ya sustituido. */
    stale() {
      return pending
    },
  }
}

const items = [
  { blockId: 'a', text: 'Uno' },
  { blockId: 'b', text: 'Dos' },
  { blockId: 'c', text: 'Tres' },
]

describe('ttsReducer', () => {
  const speaking = (index: number): TtsState => ({ status: 'speaking', index, total: 3 })

  it('start abre en el indice pedido y done si no hay nada', () => {
    expect(ttsReducer(TTS_IDLE, { type: 'start', total: 3 })).toEqual(speaking(0))
    expect(ttsReducer(TTS_IDLE, { type: 'start', total: 3, at: 2 })).toEqual(speaking(2))
    expect(ttsReducer(TTS_IDLE, { type: 'start', total: 0 })).toEqual({ status: 'done', index: -1, total: 0 })
    expect(ttsReducer(TTS_IDLE, { type: 'start', total: 3, at: 7 })).toEqual({ status: 'done', index: -1, total: 3 })
  })

  it('finished y next avanzan hasta done', () => {
    expect(ttsReducer(speaking(0), { type: 'finished' })).toEqual(speaking(1))
    expect(ttsReducer(speaking(2), { type: 'finished' })).toEqual({ status: 'done', index: -1, total: 3 })
    expect(ttsReducer(speaking(1), { type: 'next' })).toEqual(speaking(2))
  })

  it('pause solo desde speaking; resume nativo retoma el mismo bloque y sin nativo salta al siguiente', () => {
    const paused = ttsReducer(speaking(1), { type: 'pause' })
    expect(paused).toEqual({ status: 'paused', index: 1, total: 3 })
    expect(ttsReducer(paused, { type: 'resume', native: true })).toEqual(speaking(1))
    expect(ttsReducer(paused, { type: 'resume', native: false })).toEqual(speaking(2))
    expect(ttsReducer(TTS_IDLE, { type: 'pause' })).toBe(TTS_IDLE)
    expect(ttsReducer(speaking(0), { type: 'resume', native: true })).toEqual(speaking(0))
  })

  it('stop vuelve a idle desde cualquier estado', () => {
    expect(ttsReducer(speaking(1), { type: 'stop' })).toEqual({ status: 'idle', index: -1, total: 3 })
    expect(ttsReducer({ status: 'done', index: -1, total: 3 }, { type: 'stop' })).toEqual({ status: 'idle', index: -1, total: 3 })
  })

  it('acciones sin efecto devuelven el mismo objeto', () => {
    expect(ttsReducer(TTS_IDLE, { type: 'finished' })).toBe(TTS_IDLE)
    expect(ttsReducer(TTS_IDLE, { type: 'next' })).toBe(TTS_IDLE)
  })
})

describe('createTtsController sin pausa nativa (Android)', () => {
  it('lee bloque a bloque y termina en done', () => {
    const fake = fakeEngine()
    const tts = createTtsController(fake.engine, items)
    const seen: string[] = []
    tts.subscribe((s) => seen.push(`${s.status}:${s.index}`))

    expect(tts.nativePause).toBe(false)
    tts.start()
    expect(tts.current()).toEqual(items[0])
    fake.finish()
    fake.finish()
    expect(tts.current()).toEqual(items[2])
    fake.finish()
    expect(tts.getState()).toEqual({ status: 'done', index: -1, total: 3 })
    expect(fake.calls).toEqual(['speak:Uno', 'speak:Dos', 'speak:Tres'])
    expect(seen).toEqual(['speaking:0', 'speaking:1', 'speaking:2', 'done:-1'])
  })

  it('pausar detiene la voz y reanudar salta al bloque siguiente', () => {
    const fake = fakeEngine()
    const tts = createTtsController(fake.engine, items)
    tts.start()
    tts.pause()
    expect(tts.getState()).toEqual({ status: 'paused', index: 0, total: 3 })
    expect(fake.calls).toEqual(['speak:Uno', 'stop'])
    tts.resume()
    expect(tts.getState()).toEqual({ status: 'speaking', index: 1, total: 3 })
    expect(fake.calls).toEqual(['speak:Uno', 'stop', 'speak:Dos'])
  })

  it('next corta el bloque en curso y un onDone tardio no avanza dos veces', () => {
    const fake = fakeEngine()
    const tts = createTtsController(fake.engine, items)
    tts.start()
    const stale = fake.stale()
    tts.next()
    expect(tts.getState().index).toBe(1)
    stale?.()
    expect(tts.getState().index).toBe(1)
    expect(fake.calls).toEqual(['speak:Uno', 'stop', 'speak:Dos'])
  })

  it('stop vuelve a idle y start reinicia desde el bloque pedido', () => {
    const fake = fakeEngine()
    const tts = createTtsController(fake.engine, items)
    tts.start()
    tts.stop()
    expect(tts.getState().status).toBe('idle')
    expect(tts.current()).toBeNull()
    tts.start(2)
    expect(tts.current()).toEqual(items[2])
    fake.finish()
    expect(tts.getState().status).toBe('done')
  })

  it('start mientras habla reinicia limpio', () => {
    const fake = fakeEngine()
    const tts = createTtsController(fake.engine, items)
    tts.start()
    tts.start(1)
    expect(fake.calls).toEqual(['speak:Uno', 'stop', 'speak:Dos'])
  })

  it('pausar en el ultimo bloque y reanudar termina', () => {
    const fake = fakeEngine()
    const tts = createTtsController(fake.engine, items)
    tts.start(2)
    tts.pause()
    tts.resume()
    expect(tts.getState().status).toBe('done')
  })

  it('unsubscribe deja de avisar', () => {
    const fake = fakeEngine()
    const tts = createTtsController(fake.engine, items)
    let count = 0
    const off = tts.subscribe(() => count++)
    tts.start()
    off()
    fake.finish()
    expect(count).toBe(1)
  })
})

describe('createTtsController con pausa nativa (iOS, web)', () => {
  it('pausar y reanudar retoman el mismo bloque sin volver a hablar', () => {
    const fake = fakeEngine({ native: true })
    const tts = createTtsController(fake.engine, items)
    expect(tts.nativePause).toBe(true)
    tts.start()
    tts.pause()
    tts.resume()
    expect(tts.getState()).toEqual({ status: 'speaking', index: 0, total: 3 })
    expect(fake.calls).toEqual(['speak:Uno', 'pause', 'resume'])
    fake.finish()
    expect(tts.getState().index).toBe(1)
  })

  it('next en pausa nativa detiene y pasa al siguiente', () => {
    const fake = fakeEngine({ native: true })
    const tts = createTtsController(fake.engine, items)
    tts.start()
    tts.pause()
    tts.next()
    expect(tts.getState()).toEqual({ status: 'speaking', index: 1, total: 3 })
    expect(fake.calls).toEqual(['speak:Uno', 'pause', 'speak:Dos'])
  })
})

describe('speechQueue', () => {
  it('convierte bloques en items y descarta los vacios', () => {
    const queue = speechQueue([narration('n', 'Hola.'), system('s', {}), system('t', { title: 'Fortuna', items: ['1-3: Mala suerte'] })])
    expect(queue).toEqual([
      { blockId: 'n', text: 'Hola.' },
      { blockId: 't', text: 'Fortuna. 1-3: Mala suerte' },
    ])
  })
})
