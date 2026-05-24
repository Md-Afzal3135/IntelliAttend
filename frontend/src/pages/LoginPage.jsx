import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Brain, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors }, setValue } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const user = await login(data)
      toast.success(`Welcome back, ${user.full_name || user.email}!`)
      const redirects = { admin: '/admin', teacher: '/teacher', student: '/student' }
      navigate(redirects[user.role] || '/')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid credentials. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    const creds = {
      admin: { email: 'admin@intelliattend.com', password: 'Admin@123' },
      teacher: { email: 'teacher@intelliattend.com', password: 'Teacher@123' },
      student: { email: 'arjun.mehta@student.intelliattend.com', password: 'Student@123' },
    }
    setValue('email', creds[role].email)
    setValue('password', creds[role].password)
  }

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-surface-800 to-surface-900" />
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-primary-600/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-20 h-20 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-6 shadow-glow animate-float">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-heading text-4xl font-bold text-white mb-4">IntelliAttend</h1>
            <p className="text-slate-400 text-lg max-w-sm leading-relaxed">
              AI-powered attendance management with real-time face recognition
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 grid grid-cols-1 gap-4 w-full max-w-xs"
          >
            {[
              { label: '99.2% Recognition Accuracy', color: 'text-emerald-400' },
              { label: 'Anti-Spoofing Liveness Check', color: 'text-blue-400' },
              { label: 'Role-Based Dashboards', color: 'text-purple-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 glass-card px-4 py-3">
                <div className={`w-2 h-2 rounded-full ${item.color.replace('text-', 'bg-')} animate-pulse`} />
                <span className={`text-sm ${item.color}`}>{item.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-white">IntelliAttend</span>
          </div>

          <h2 className="font-heading text-2xl font-bold text-white mb-2">Welcome back</h2>
          <p className="text-muted mb-8">Sign in to your account to continue</p>

          {/* Demo quick-fill buttons */}
          <div className="mb-6">
            <p className="text-xs text-slate-500 mb-2">Quick demo login:</p>
            <div className="flex gap-2">
              {['admin', 'teacher', 'student'].map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemo(role)}
                  className="flex-1 text-xs py-1.5 rounded-lg border border-primary-500/20 text-slate-400 hover:text-white hover:border-primary-500/50 hover:bg-primary-600/10 transition-all capitalize"
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Email Address</label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' }
                })}
                type="email"
                placeholder="you@example.com"
                className="input-field"
                id="login-email"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pr-11"
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.password.message}
                </p>
              )}
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-xs text-slate-400 hover:text-primary-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
              id="login-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-center text-muted mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Register here
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
