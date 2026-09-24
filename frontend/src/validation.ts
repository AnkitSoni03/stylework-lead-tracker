import type { NewLead } from './types'

export type LeadErrors = Partial<Record<keyof NewLead, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Mirrors the backend rule: optional +, then 7–20 digits, spaces or dashes
const PHONE_RE = /^\+?[0-9\s-]{7,20}$/

export function validateLead(values: NewLead): LeadErrors {
  const errors: LeadErrors = {}
  if (values.name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address'
  if (!PHONE_RE.test(values.phone.trim())) errors.phone = 'Enter a valid phone number'
  return errors
}
