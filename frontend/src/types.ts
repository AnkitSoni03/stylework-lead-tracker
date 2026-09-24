export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  lost: 'Lost',
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  status: LeadStatus
  createdAt: string
  updatedAt: string
}

export interface NewLead {
  name: string
  email: string
  phone: string
}

export interface LeadListResponse {
  data: Lead[]
  total: number
  page: number
  limit: number
}

export interface LeadQuery {
  search?: string
  status?: LeadStatus
  page?: number
  limit?: number
}
