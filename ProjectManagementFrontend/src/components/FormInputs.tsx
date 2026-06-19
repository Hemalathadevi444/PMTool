import { useState } from 'react'

interface PasswordInputProps {
  id: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export function PasswordInput({
  id,
  placeholder = 'Password',
  value,
  onChange,
  required,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-11 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3l18 18M10.58 10.58A2 2 0 0 0 12 15a2 2 0 0 0 1.42-.58M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8-1.02 2.79-3.06 5.09-5.67 6.41M6.11 6.11C3.6 7.64 1.78 10.09 1 13c1.73 4.89 6 8 11 8 1.05 0 2.07-.13 3.03-.37" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

export function TextInput({
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  maxLength,
}: {
  id: string
  type?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  maxLength?: number
}) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      maxLength={maxLength}
      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
    />
  )
}
