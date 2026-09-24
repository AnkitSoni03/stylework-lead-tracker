import { useState, type FormEvent } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { ApiError, createLead } from '../api'
import type { Lead, NewLead } from '../types'
import { validateLead, type LeadErrors as Errors } from '../validation'

const EMPTY: NewLead = { name: '', email: '', phone: '' }

interface Props {
  onCreated: (lead: Lead) => void
  onCancel?: () => void
}

export function LeadForm({ onCreated, onCancel }: Props) {
  const [values, setValues] = useState<NewLead>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof NewLead, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const clientErrors = validateLead(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      const lead = await createLead(values)
      setValues(EMPTY)
      onCreated(lead)
    } catch (err) {
      if (err instanceof ApiError && err.details.length > 0) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])))
      } else {
        setFormError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Add lead" className="flex flex-col gap-4">
      <Field
        label="Name"
        name="name"
        placeholder="e.g. Priya Sharma"
        autoComplete="name"
        value={values.name}
        error={errors.name}
        onChange={update}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        placeholder="name@company.com"
        autoComplete="email"
        value={values.email}
        error={errors.email}
        onChange={update}
      />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        placeholder="+91 98765 43210"
        autoComplete="tel"
        value={values.phone}
        error={errors.phone}
        onChange={update}
      />

      {formError && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {formError}
        </p>
      )}

      <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60"
        >
          {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {submitting ? 'Adding…' : 'Add lead'}
        </button>
      </div>
    </form>
  )
}

interface FieldProps {
  label: string
  name: keyof NewLead
  value: string
  error?: string
  type?: string
  placeholder?: string
  autoComplete?: string
  onChange: (field: keyof NewLead, value: string) => void
}

function Field({ label, name, value, error, type = 'text', placeholder, autoComplete, onChange }: FieldProps) {
  const id = `lead-${name}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(name, e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`block w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:outline-none ${
          error ? 'ring-rose-400 focus:ring-rose-500' : 'ring-slate-300 focus:ring-indigo-600'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  )
}
