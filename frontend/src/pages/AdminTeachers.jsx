import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, Search, Edit2, Trash2, X, Check, BookOpen,
  Mail, Phone, Shield, AlertTriangle, Eye, EyeOff
} from 'lucide-react'
import { adminAPI } from '../api'
import { format } from 'date-fns'

const EMPTY_FORM = {
  first_name: '', last_name: '', email: '',
  phone: '', password: '', is_active: true,
}

function TeacherModal({ teacher, onClose, onSaved }) {
  const [form, setForm] = useState(teacher
    ? { first_name: teacher.first_name, last_name: teacher.last_name, email: teacher.email, phone: teacher.phone || '', password: '', is_active: teacher.is_active }
    : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      const res = teacher
        ? await adminAPI.teachers.update(teacher.id, payload)
        : await adminAPI.teachers.create(payload)
      onSaved(res.data)
    } catch (err) {
      setError(err.response?.data?.email?.[0] || err.response?.data?.detail || 'An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg glass-card p-8 rounded-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-xl font-bold text-white font-heading">
              {teacher ? 'Edit Teacher' : 'Add New Teacher'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-700 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">First Name *</label>
              <input
                className="input-field w-full"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                required placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Last Name *</label>
              <input
                className="input-field w-full"
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                required placeholder="Smith"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                className="input-field w-full pl-10"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required placeholder="teacher@college.edu"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                className="input-field w-full pl-10"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">
              {teacher ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="input-field w-full pr-10"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required={!teacher}
                placeholder={teacher ? '••••••••' : 'Min 8 characters'}
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                onClick={() => setShowPass(v => !v)}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-700/50 border border-primary-500/10">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 accent-primary-500"
            />
            <label htmlFor="is_active" className="text-sm text-slate-300 cursor-pointer">
              Account Active (can log in)
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {teacher ? 'Save Changes' : 'Create Teacher'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function DeleteConfirmModal({ teacher, onClose, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm glass-card p-6 rounded-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Delete Teacher</h2>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Are you sure you want to delete <span className="text-white font-semibold">{teacher.full_name}</span>?
          This action cannot be undone and will remove all their sessions.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all font-semibold text-sm flex items-center justify-center gap-2"
          >
            {deleting ? <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalTeacher, setModalTeacher] = useState(undefined) // undefined=closed, null=new, obj=edit
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const searchTimeout = useRef(null)

  const fetchTeachers = async (q = search) => {
    setLoading(true)
    try {
      const res = await adminAPI.teachers.list(q ? { search: q } : {})
      setTeachers(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTeachers() }, [])

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => fetchTeachers(val), 400)
  }

  const handleSaved = (teacher) => {
    setModalTeacher(undefined)
    fetchTeachers()
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await adminAPI.teachers.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchTeachers()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Manage Teachers</h1>
          <p className="text-muted mt-1">Add, update, and remove teacher accounts</p>
        </div>
        <button
          id="add-teacher-btn"
          onClick={() => setModalTeacher(null)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add Teacher
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <p className="text-slate-400 text-xs">Total Teachers</p>
            <p className="text-white text-2xl font-bold font-heading">{teachers.length}</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-400 text-xs">Active</p>
            <p className="text-white text-2xl font-bold font-heading">{teachers.filter(t => t.is_active).length}</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-slate-400 text-xs">Subjects Assigned</p>
            <p className="text-white text-2xl font-bold font-heading">
              {teachers.reduce((a, t) => a + (t.subject_count || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Search + Table */}
      <div className="glass-card p-6">
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="teacher-search"
            className="input-field w-full pl-10 max-w-sm"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="shimmer h-16 rounded-xl" />)}
          </div>
        ) : teachers.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-500">
            <Shield className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-semibold">No teachers found</p>
            <p className="text-sm mt-1">Click "Add Teacher" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Subjects</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {t.first_name?.[0]}{t.last_name?.[0]}
                        </div>
                        <span className="font-medium text-white">{t.full_name}</span>
                      </div>
                    </td>
                    <td className="text-slate-400 text-sm">{t.email}</td>
                    <td className="text-slate-400 text-sm">{t.phone || '—'}</td>
                    <td>
                      <span className="px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-400 text-xs font-semibold">
                        {t.subject_count} subject{t.subject_count !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="text-slate-500 text-sm">
                      {t.date_joined ? format(new Date(t.date_joined), 'MMM d, yyyy') : '—'}
                    </td>
                    <td>
                      <span className={t.is_active ? 'badge-present' : 'badge-absent'}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setModalTeacher(t)}
                          className="p-1.5 rounded-lg hover:bg-surface-700 text-slate-400 hover:text-primary-400 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 rounded-lg hover:bg-surface-700 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modalTeacher !== undefined && (
          <TeacherModal
            teacher={modalTeacher}
            onClose={() => setModalTeacher(undefined)}
            onSaved={handleSaved}
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            teacher={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
