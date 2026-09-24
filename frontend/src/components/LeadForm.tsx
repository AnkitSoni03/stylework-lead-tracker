import { useState, type FormEvent } from 'react'
import { ApiError, createLead } from '../api'
import type { Lead, NewLead } from '../types'
import { validateLead, type LeadErrors as Errors } from '../validation'

const EMPTY: NewLead = { name: '', email: '', phone: '' }

interface Props {
  onCreated: (lead: Lead) => void
}

export function LeadForm({ onCreated }: Props) {
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
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Add lead"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="mb-3 text-base font-semibold">Add a lead</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name" name="name" value={values.name} error={errors.name} onChange={update} />
        <Field
          label="Email"
          name="email"
          type="email"
          value={values.email}
          error={errors.email}
          onChange={update}
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          value={values.phone}
          error={errors.phone}
          onChange={update}
        />
      </div>
      {formError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {formError}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {submitting ? 'Adding…' : 'Add lead'}
      </button>
    </form>
  )
}

interface FieldProps {
  label: string
  name: keyof NewLead
  value: string
  error?: string
  type?: string
  onChange: (field: keyof NewLead, value: string) => void
}

function Field({ label, name, value, error, type = 'text', onChange }: FieldProps) {
  const id = `lead-${name}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
          error ? 'border-red-400' : 'border-slate-300'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
