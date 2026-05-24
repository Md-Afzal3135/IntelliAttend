import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Mail, Brain, ArrowLeft, CheckCircle } from 'lucide-react'
import { authAPI } from '../api'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors }, getValues } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authAPI.forgotPassword(data.email)
      setSent(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-glow">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="font-heading font-bold text-white text-xl">IntelliAttend</span>
        </div>

        <div className="glass-card p-8">
          {!sent ? (
            <>
              <h1 className="font-heading text-2xl font-bold text-white text-center mb-2">
                Forgot Password?
              </h1>
              <p className="text-slate-400 text-sm text-center mb-8">
                Enter your registered email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' }
                      })}
                      type="email"
                      placeholder="you@example.com"
                      className="input-field pl-10"
                      autoFocus
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Mail className="w-4 h-4" />}
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="font-heading text-xl font-bold text-white mb-2">Check your inbox!</h2>
              <p className="text-slate-400 text-sm mb-1">
                We've sent a password reset link to:
              </p>
              <p className="text-primary-400 font-medium text-sm mb-6">{getValues('email')}</p>
              <p className="text-slate-500 text-xs mb-6">
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-slate-400 text-sm hover:text-white transition-colors"
              >
                Resend to a different address
              </button>
            </motion.div>
          )}

          <div className="mt-6 pt-6 border-t border-primary-500/10 text-center">
            <Link to="/login" className="text-slate-400 text-sm hover:text-white transition-colors inline-flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
