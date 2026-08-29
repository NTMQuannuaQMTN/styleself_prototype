import { useId, useState } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: ReactNode
}

export function TextField({ label, hint, id, className = '', ...rest }: FieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="field-label">
        {label}
      </label>
      <input id={fieldId} className="field-input" {...rest} />
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export function PasswordField({
  label,
  hint,
  id,
  className = '',
  ...rest
}: FieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const [show, setShow] = useState(false)
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={show ? 'text' : 'password'}
          className="field-input pr-16"
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-muted transition-colors hover:text-ink"
          tabIndex={-1}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export function FormAlert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success'
  children: ReactNode
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-3.5 py-2.5 text-sm ${
        tone === 'error'
          ? 'border-[#e2b9ad] bg-[#faf0ec] text-[#8f3a24]'
          : 'border-success/30 bg-success/10 text-success'
      }`}
    >
      {children}
    </div>
  )
}

export function SubmitButton({
  loading,
  children,
  ...rest
}: {
  loading?: boolean
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      className="btn btn-primary w-full"
      disabled={loading}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-paper/40 border-t-paper"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  )
}

export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="text-xs uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

export function GoogleButton({
  onClick,
  disabled,
  label = 'Continue with Google',
}: {
  onClick: () => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn btn-secondary w-full"
    >
      <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
        />
      </svg>
      {label}
    </button>
  )
}
