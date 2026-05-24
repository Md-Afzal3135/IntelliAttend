import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { User, Mail, Phone, Lock, Save, Camera, Shield, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, loadUser } = useAuth()
  const [saving, setSaving] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const fileRef = useRef()

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { first_name: user?.first_name, last_name: user?.last_name, phone: user?.phone || '' }
  })

  const { register: regPass, handleSubmit: handlePass, reset: resetPass, formState: { errors: passErrors } } = useForm()

  const saveProfile = async (data) => {
    setSaving(true)
    try {
      await authAPI.updateProfile(data)
      await loadUser()
      toast.success('Profile updated!')
    } catch { toast.error('Update failed') }
    finally { setSaving(false) }
  }

  const changePassword = async (data) => {
    setSavingPass(true)
    try {
      await authAPI.changePassword(data)
      toast.success('Password changed!')
      resetPass()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    }
    finally { setSavingPass(false) }
  }

  const uploadAvatar = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('avatar', file)
    try {
      await authAPI.updateProfile(fd)
      await loadUser()
      toast.success('Avatar updated!')
    } catch { toast.error('Upload failed') }
  }

  const roleBadgeMap = {
    admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    teacher: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    student: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  }

  return (
    <div className="space-y-6 animate-in max-w-2xl">
      <div>
        <h1 className="page-title">Profile Settings</h1>
        <p className="text-muted mt-1">Manage your account and preferences</p>
      </div>

      {/* Avatar & Role */}
      <div className="glass-card p-6 flex items-center gap-6">
        <div className="relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="Avatar"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-primary-500/30"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white hover:bg-primary-500 transition-colors shadow-glow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
        </div>
        <div>
          <h2 className="text-white font-heading font-bold text-xl">{user?.full_name}</h2>
          <p className="text-slate-400 text-sm mb-2">{user?.email}</p>
          <span className={`badge border ${roleBadgeMap[user?.role]}`}>
            <Shield className="w-3 h-3 mr-1" />
            {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
          </span>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="glass-card p-6">
        <h2 className="section-title mb-4">Personal Information</h2>
        <form onSubmit={handleSubmit(saveProfile)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">First Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input {...register('first_name', { required: true })} className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Last Name</label>
              <input {...register('last_name', { required: true })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={user?.email} disabled className="input-field pl-10 opacity-50 cursor-not-allowed" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input {...register('phone')} placeholder="+91 98765 43210" className="input-field pl-10" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="glass-card p-6">
        <h2 className="section-title mb-4">Change Password</h2>
        <form onSubmit={handlePass(changePassword)} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Current Password</label>
            <div className="relative">
              <input
                {...regPass('old_password', { required: 'Required' })}
                type={showOld ? 'text' : 'password'}
                placeholder="••••••••"
                className="input-field pr-11"
              />
              <button type="button" onClick={() => setShowOld(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passErrors.old_password && <p className="text-red-400 text-xs mt-1">{passErrors.old_password.message}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">New Password</label>
            <div className="relative">
              <input
                {...regPass('new_password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
                type={showNew ? 'text' : 'password'}
                placeholder="••••••••"
                className="input-field pr-11"
              />
              <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passErrors.new_password && <p className="text-red-400 text-xs mt-1">{passErrors.new_password.message}</p>}
          </div>
          <button type="submit" disabled={savingPass} className="btn-primary flex items-center gap-2">
            {savingPass ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
}
