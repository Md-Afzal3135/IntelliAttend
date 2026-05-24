import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Brain, Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authAPI, departmentsAPI, coursesAPI } from '../api'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      student_id: '',
      roll_number: '',
      department_id: '',
      course_id: '',
      password: '',
      confirm_password: ''
    }
  })
  const password = watch('password')
  const selectedDept = watch('department_id')

  useEffect(() => {
    departmentsAPI.list().then(r => setDepartments(r.data.results || r.data)).catch(() => {})
    coursesAPI.list().then(r => setCourses(r.data.results || r.data)).catch(() => {})
  }, [])

  const filteredCourses = selectedDept
    ? courses.filter(c => c.department === selectedDept || c.department_id === selectedDept)
    : courses

  const onSubmit = async (data) => {
    const payload = { 
      ...data, 
      role: undefined,
      department_id: data.department_id || null,
      course_id: data.course_id || null
    }
    setLoading(true)
    try {
      await authAPI.register(payload)
      toast.success('Account created! Signing you in...')
      const user = await login({ email: data.email, password: data.password })
      const redirects = { admin: '/admin', teacher: '/teacher', student: '/student' }
      navigate(redirects[user.role] || '/')
    } catch (err) {
      const errData = err.response?.data
      if (errData) {
        const msgs = Object.values(errData).flat().join(' ')
        toast.error(msgs || 'Registration failed.')
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-glow-sm">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-white text-lg">IntelliAttend</span>
          </Link>
          <h2 className="font-heading text-2xl font-bold text-white mb-2">Create an account</h2>
          <p className="text-muted">Join IntelliAttend to get started</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">First Name</label>
                <input
                  {...register('first_name', { required: 'Required' })}
                  placeholder="Arjun"
                  className="input-field"
                />
                {errors.first_name && <p className="text-red-400 text-xs mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Last Name</label>
                <input
                  {...register('last_name', { required: 'Required' })}
                  placeholder="Mehta"
                  className="input-field"
                />
                {errors.last_name && <p className="text-red-400 text-xs mt-1">{errors.last_name.message}</p>}
              </div>
            </div>

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
              />
              {errors.email && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Student ID *</label>
                <input
                  {...register('student_id', { required: 'Student ID is required' })}
                  placeholder="BTCS2024001"
                  className="input-field"
                />
                {errors.student_id && <p className="text-red-400 text-xs mt-1">{errors.student_id.message}</p>}
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Roll Number</label>
                <input
                  {...register('roll_number')}
                  placeholder="24CS001"
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Branch / Dept</label>
                <select
                  {...register('department_id')}
                  className="input-field"
                >
                  <option value="">Select...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Course</label>
                <select
                  {...register('course_id')}
                  className="input-field"
                >
                  <option value="">Select...</option>
                  {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-700/50 border border-primary-500/20">
              <label className="text-sm text-slate-400 block">Account Type</label>
              <p className="text-white text-sm mt-1">Student</p>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pr-11"
                />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Confirm Password</label>
              <input
                {...register('confirm_password', {
                  required: 'Please confirm your password',
                  validate: v => v === password || 'Passwords do not match'
                })}
                type="password"
                placeholder="••••••••"
                className="input-field"
              />
              {errors.confirm_password && <p className="text-red-400 text-xs mt-1">{errors.confirm_password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2" id="register-submit">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><UserPlus className="w-4 h-4" /> Create Account</>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
