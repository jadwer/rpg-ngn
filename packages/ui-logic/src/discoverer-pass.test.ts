import { describe, expect, it } from 'vitest'
import type { PassReward } from '@rpg-ngn/api-client'
import { achievementProgress, chaptersLabel, galleryLabel, nextRewardText, pathProgress, rewardStatus, seasonDaysLeft, streakText } from './discoverer-pass.js'

const reward = (over: Partial<PassReward>): PassReward => ({ position: 1, threshold: 10, kind: 'item', label: 'Marco de plata', description: null, earned: false, ...over })

describe('pase de descubridor', () => {
  it('dice la racha y lo que se pierde si no juega', () => {
    expect(streakText({ streak: 0, playedToday: false })).toBe('Juega hoy para empezar una racha: cada día seguido vale más.')
    expect(streakText({ streak: 3, playedToday: false })).toBe('Racha de 3 días seguidos. Juega hoy o la pierdes.')
    expect(streakText({ streak: 1, playedToday: true })).toBe('Racha de 1 día. Vuelve mañana para no perderla.')
  })

  it('dice cuanto falta para el siguiente premio', () => {
    expect(nextRewardText({ next: { threshold: 20, label: 'La Mascarada', missing: 1 } })).toBe('Te falta 1 capítulo para La Mascarada.')
    expect(nextRewardText({ next: null })).toBe('Tienes todo el camino de la temporada.')
    expect(chaptersLabel(6)).toBe('6 capítulos')
  })

  it('mide el avance contra el ultimo premio anunciado', () => {
    const blocks = [{ index: 1, rewards: [reward({ threshold: 10 }), reward({ threshold: 20, kind: 'world' }), reward({ threshold: 70, kind: 'soon' })] }]
    expect(pathProgress({ chapters: 5, blocks })).toBe(0.25)
    expect(pathProgress({ chapters: 99, blocks })).toBe(1)
  })

  it('pone el estado de cada premio', () => {
    expect(rewardStatus(reward({ earned: true }), 30)).toBe('Ganado')
    expect(rewardStatus(reward({ earned: true, kind: 'world' }), 30)).toBe('Tuya')
    expect(rewardStatus(reward({ kind: 'soon' }), 0)).toBe('Por anunciar')
    expect(rewardStatus(reward({ threshold: 12 }), 4)).toBe('Faltan 8 capítulos')
    expect(rewardStatus(reward({ threshold: 5 }), 4)).toBe('Falta 1 capítulo')
  })

  it('logros, galerias y dias que quedan', () => {
    expect(achievementProgress({ code: 'x', label: 'x', description: '', points: 5, progress: 3, goal: 5, done: false })).toBe('3 de 5')
    expect(achievementProgress({ code: 'x', label: 'x', description: '', points: 5, progress: 5, goal: 5, done: true })).toBe('Logrado')
    expect(galleryLabel('marcos')).toBe('Marcos de retrato')
    expect(seasonDaysLeft('2026-10-10T00:00:00Z', new Date('2026-10-05T12:00:00Z'))).toBe(5)
  })
})
