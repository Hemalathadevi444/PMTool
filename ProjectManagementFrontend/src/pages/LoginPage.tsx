import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { DividerOr, MicrosoftButton } from '../components/AuthButtons'
import { TextInput } from '../components/FormInputs'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, verifyLoginOtp, loginWithMicrosoft, authError, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [showOtp, setShowOtp] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [msLoading, setMsLoading] = useState(false)
  const [msError, setMsError] = useState<string | null>(null)

  const canSubmit = showOtp ? otp.trim().length === 6 : email.trim().length > 0

  async function handleMicrosoftLogin(idToken: string) {
    setMsLoading(true)
    clearError()
    try {
      await loginWithMicrosoft(idToken)
      navigate('/', { replace: true })
    } catch {
      /* error shown via authError */
    } finally {
      setMsLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    setSuccessMessage(null)
    setLoading(true)
    try {
      if (!showOtp) {
        if (!email.trim()) {
          setLoading(false)
          return
        }
        const result = await login(email.trim())
        if (result.requireOtp) {
          setShowOtp(true)
          if (result.otp) {
            setSuccessMessage(`OTP sent successfully!`)
          }
        } else {
          navigate('/', { replace: true })
        }
      } else {
        if (!otp.trim()) {
          setLoading(false)
          return
        }
        await verifyLoginOtp(email.trim(), otp.trim())
        navigate('/', { replace: true })
      }
    } catch {
      /* error shown via authError */
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back!"
      subtitle={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-violet-600 hover:text-violet-700">
            Sign up
          </Link>
        </>
      }
      footer={
        <a href="#" className="text-gray-500 hover:text-gray-700">
          Need help?
        </a>
      }
    >
      {!showOtp && (
        <>
          <MicrosoftButton
            onLogin={handleMicrosoftLogin}
            onError={setMsError}
            loading={msLoading}
          />
          <DividerOr />
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {!showOtp ? (
          <>
            <TextInput
              id="email"
              type="email"
              placeholder="Work email"
              value={email}
              onChange={setEmail}
              required
            />
          </>
        ) : (
          <>
            <div className="rounded-lg bg-violet-50 px-3 py-2.5 text-[14px] leading-relaxed text-violet-700">
              Please enter the 6-digit OTP sent to <strong>{email}</strong>.
            </div>
            {successMessage && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600 font-semibold mt-1">
                {successMessage}
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
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setShowOtp(false)
                  setOtp('')
                  clearError()
                }}
                className="text-xs font-semibold text-violet-600 hover:text-violet-700 hover:underline"
              >
                Change email
              </button>
            </div>
          </>
        )}

        {(authError || msError) && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {authError ?? msError}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="mt-2 w-full rounded-lg bg-violet-600 py-3 text-[15px] font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:opacity-70 disabled:hover:bg-gray-300"
        >
          {loading ? 'Processing…' : showOtp ? 'Verify & Log In' : 'Send OTP & Log In'}
        </button>
      </form>
    </AuthLayout>
  )
}
