import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Lock, Brain, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'
import { authAPI } from '../api'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [tokenValid, setTokenValid] = useState(null) // null=checking, true, false
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  // Validate token on mount
  useEffect(() => {
    if (!uid || !token) { setTokenValid(false); return }
    authAPI.validateResetToken(uid, token)
      .then(res => setTokenValid(res.data.valid))
      .catch(() => setTokenValid(false))
  }, [uid, token])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authAPI.resetPassword(uid, token, data.new_password)
      setDone(true)
      toast.success('Password reset! You can now log in.')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. Link may be expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-glow">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="font-heading font-bold text-white text-xl">IntelliAttend</span>
        </div>

        <div className="glass-card p-8">
          {/* Checking token */}
          {tokenValid === null && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Validating reset link…</p>
            </div>
          )}

          {/* Invalid token */}
          {tokenValid === false && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="font-heading text-xl font-bold text-white mb-2">Link Expired</h2>
              <p className="text-slate-400 text-sm mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link to="/forgot-password" className="btn-primary inline-flex items-center gap-2">
                Request New Link
              </Link>
            </div>
          )}

          {/* Success */}
          {done && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="font-heading text-xl font-bold text-white mb-2">Password Reset!</h2>
              <p className="text-slate-400 text-sm mb-2">
                Your password has been updated successfully.
              </p>
              <p className="text-slate-500 text-xs">Redirecting to login…</p>
            </motion.div>
          )}

          {/* Reset form */}
          {tokenValid === true && !done && (
            <>
              <h1 className="font-heading text-2xl font-bold text-white text-center mb-2">
                Set New Password
              </h1>
              <p className="text-slate-400 text-sm text-center mb-8">
                Choose a strong password for your account.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      {...register('new_password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Minimum 8 characters' }
                      })}
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="input-field pl-10 pr-11"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.new_password && <p className="text-red-400 text-xs mt-1">{errors.new_password.message}</p>}
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      {...register('confirm_password', {
                        required: 'Please confirm your password',
                        validate: val => val === watch('new_password') || 'Passwords do not match'
                      })}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="input-field pl-10 pr-11"
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirm_password && <p className="text-red-400 text-xs mt-1">{errors.confirm_password.message}</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Lock className="w-4 h-4" />}
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
