import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { DividerOr, GoogleButton } from '../components/AuthButtons'
import { TextInput } from '../components/FormInputs'
import { useAuth } from '../context/AuthContext'

export function SignupPage() {
  const navigate = useNavigate()
  const { signup, requestRegisterOtp, authError, clearError } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null)
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)

  const canSubmit =
    fullName.trim() &&
    email.trim() &&
    otpSent &&
    otp.trim().length === 6 &&
    agree

  async function handleSendOtp() {
    if (!email.trim()) {
      return
    }
    setOtpLoading(true)
    setOtpSuccessMessage(null)
    clearError()
    try {
      const otpCode = await requestRegisterOtp(email.trim())
      setOtpSent(true)
      if (otpCode) {
        setOtpSuccessMessage(`OTP sent successfully!`)
      } else {
        setOtpSuccessMessage('OTP sent successfully!')
      }
    } catch {
      /* error shown via authError */
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    clearError()
    try {
      await signup(email.trim(), fullName.trim(), otp.trim())
      navigate('/', { replace: true })
    } catch {
      /* error shown via authError */
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Seconds to sign up!"
      subtitle={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-violet-600 hover:text-violet-700">
            Sign in
          </Link>
        </>
      }
      footer={
        <>
          By continuing, you agree to our{' '}
          <a href="#" className="text-violet-600 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-violet-600 hover:underline">
            Privacy Policy
          </a>
          . Need help?
        </>
      }
    >
      <GoogleButton />
      <DividerOr />

      <form onSubmit={handleSubmit} className="space-y-3">
        <TextInput
          id="fullName"
          placeholder="Full name"
          value={fullName}
          onChange={setFullName}
          required
        />
        
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <TextInput
              id="email"
              type="email"
              placeholder="Work email"
              value={email}
              onChange={(val) => {
                setEmail(val)
                if (otpSent) {
                  setOtpSent(false)
                  setOtpSuccessMessage(null)
                  setOtp('')
                }
              }}
              required
            />
          </div>
          <button
            type="button"
            disabled={!email.trim() || otpLoading}
            onClick={handleSendOtp}
            className="h-[46px] px-3 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:bg-gray-200 disabled:text-gray-400 transition whitespace-nowrap"
          >
            {otpLoading ? 'Sending…' : otpSent ? 'Resend OTP' : 'Send OTP'}
          </button>
        </div>

        {otpSent && (
          <div className="space-y-1">
            {otpSuccessMessage && (
              <p className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                {otpSuccessMessage}
              </p>
            )}
            <TextInput
              id="otp"
              type="text"
              placeholder="6-digit OTP"
              value={otp}
              onChange={setOtp}
              required
              maxLength={6}
            />
          </div>
        )}

        <div className="flex items-start gap-2.5 py-1">
          <input
            type="checkbox"
            id="agreeTerms"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer accent-violet-600"
            required
          />
          <label htmlFor="agreeTerms" className="text-[14px] leading-snug text-gray-600 cursor-pointer select-none">
            I agree to the{' '}
            <a href="#" className="text-violet-600 hover:underline font-medium">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-violet-600 hover:underline font-medium">
              Privacy Policy
            </a>
            .
          </label>
        </div>

        {authError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{authError}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="mt-2 w-full rounded-lg bg-violet-600 py-3 text-[15px] font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:opacity-70 disabled:hover:bg-gray-300"
        >
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
    </AuthLayout>
  )
}
