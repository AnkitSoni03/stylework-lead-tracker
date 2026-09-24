import { describe, expect, it } from 'vitest'
import { validateLead } from './validation'

describe('validateLead', () => {
  it('accepts a valid lead', () => {
    expect(validateLead({ name: 'Priya', email: 'priya@example.com', phone: '+91 98765-43210' })).toEqual({})
  })

  it('flags every invalid field', () => {
    const errors = validateLead({ name: ' A ', email: 'nope', phone: '12' })
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'phone'])
  })

  it('rejects letters in phone numbers', () => {
    expect(validateLead({ name: 'Priya', email: 'p@x.io', phone: '98765abcde' }).phone).toBeDefined()
  })
})
