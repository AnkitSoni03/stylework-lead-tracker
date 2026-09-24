import type { Lead, LeadListResponse, LeadQuery, LeadStatus, NewLead } from './types'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

export interface FieldError {
  field: string
  message: string
}

export class ApiError extends Error {
  status: number
  details: FieldError[]

  constructor(status: number, message: string, details: FieldError[] = []) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Please try again.')
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`, body?.details)
  }
  return body as T
}

export function listLeads(query: LeadQuery = {}, signal?: AbortSignal) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return request<LeadListResponse>(`/api/leads${qs ? `?${qs}` : ''}`, { signal })
}

export function createLead(input: NewLead) {
  return request<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(input) })
}

export function updateLeadStatus(id: string, status: LeadStatus) {
  return request<Lead>(`/api/leads/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
