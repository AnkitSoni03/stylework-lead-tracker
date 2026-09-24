import { describe, expect, it } from 'vitest'
import { avatarColor, initials, timeAgo } from './format'

describe('timeAgo', () => {
  const now = new Date('2026-09-25T12:00:00Z').getTime()

  it('formats recent and older timestamps', () => {
    expect(timeAgo('2026-09-25T11:59:30Z', now)).toBe('just now')
    expect(timeAgo('2026-09-25T11:55:00Z', now)).toBe('5 minutes ago')
    expect(timeAgo('2026-09-24T12:00:00Z', now)).toBe('yesterday')
    expect(timeAgo('2026-09-11T12:00:00Z', now)).toBe('2 weeks ago')
  })
})

describe('initials', () => {
  it('uses first and last name', () => {
    expect(initials('Priya Sharma')).toBe('PS')
    expect(initials('  ananya  rao iyer ')).toBe('AI')
    expect(initials('Kabir')).toBe('K')
  })
})

describe('avatarColor', () => {
  it('is stable for the same name', () => {
    expect(avatarColor('Priya Sharma')).toBe(avatarColor('Priya Sharma'))
  })
})
