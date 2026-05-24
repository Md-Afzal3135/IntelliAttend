import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Trash2, X, Check, Loader,
  AlertTriangle, Award, Users, ChevronDown
} from 'lucide-react'
import { subjectsAPI, coursesAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', code: '', credits: 3, course: '' }

export default function TeacherSubjects() {
  const { user } = useAuth()
  const [subjects, setSubjects]     = useState([])
  const [courses, setCourses]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ ...EMPTY_FORM })
  const [saving, setSaving]         = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, cRes] = await Promise.all([
        subjectsAPI.list(),                // backend filters to teacher's own subjects
        coursesAPI.list(),
      ])
      setSubjects(sRes.data.results || sRes.data)
      setCourses(cRes.data.results || cRes.data)
    } catch {
      toast.error('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.code) { toast.error('Name and Code are required'); return }
    setSaving(true)
    try {
      await subjectsAPI.create({
        name: form.name,
        code: form.code,
        credits: Number(form.credits),
        // course is optional — backend falls back to first course for teacher
        ...(form.course ? { course: form.course } : {}),
      })
      toast.success(`"${form.name}" added to your subjects!`)
      setForm({ ...EMPTY_FORM })
      setShowForm(false)
      load()
    } catch (err) {
      const data = err.response?.data
      if (data?.code) toast.error('Code: ' + (Array.isArray(data.code) ? data.code[0] : data.code))
      else if (data?.non_field_errors) toast.error(data.non_field_errors[0])
      else if (data?.detail) toast.error(data.detail)
      else toast.error('Failed to add subject')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (subj) => {
    setDeletingId(subj.id)
    try {
      await subjectsAPI.delete(subj.id)
      toast.success(`"${subj.name}" removed from your subjects`)
      setConfirmDel(null)
      load()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete subject'
      toast.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  // Credit colour helpers
  const creditColor = (c) => c >= 4 ? '#818cf8' : c === 3 ? '#34d399' : '#f59e0b'

  return (
    <div className="space-y-6 animate-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">My Subjects</h1>
          <p className="text-muted mt-1">Subjects assigned to you — add new ones or remove existing</p>
        </div>
        <button
          id="add-my-subject-btn"
          onClick={() => { setShowForm(true); setForm({ ...EMPTY_FORM }) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {/* ── Quick stats ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'My Subjects', value: subjects.length, color: '#818cf8' },
          { label: 'Total Credits', value: subjects.reduce((a, s) => a + (s.credits || 0), 0), color: '#34d399' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-5" style={{ flex: '1 1 160px' }}>
            <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Add Subject Form ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            className="glass-card p-6"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 className="section-title flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary-400" /> Add New Subject
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {/* Name */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Subject Name *</label>
                  <input
                    className="input-field w-full"
                    value={form.name}
                    onChange={f('name')}
                    placeholder="e.g. Machine Learning"
                    required
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Subject Code *</label>
                  <input
                    className="input-field w-full"
                    value={form.code}
                    onChange={f('code')}
                    placeholder="e.g. CS106"
                    required
                  />
                </div>

                {/* Course */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Course</label>
                  <div style={{ position: 'relative' }}>
                    <select className="input-field w-full appearance-none pr-8" value={form.course} onChange={f('course')}>
                      <option value="">Default course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                {/* Credits */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Credits</label>
                  <select className="input-field w-full" value={form.credits} onChange={f('credits')}>
                    {[1, 2, 3, 4, 5].map(c => <option key={c} value={c}>{c} credit{c > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>

              <p className="text-xs text-slate-600 mt-3">
                ℹ️  The subject will be automatically assigned to <span className="text-slate-400 font-medium">{user?.full_name || 'you'}</span>.
              </p>

              <div style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving
                    ? <><Loader className="w-4 h-4 animate-spin" /> Adding...</>
                    : <><Check className="w-4 h-4" /> Add Subject</>
                  }
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Subject Cards ────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
          <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 64, gap: 12 }}>
          <BookOpen className="w-16 h-16 opacity-20 text-slate-500" />
          <p className="text-slate-400 text-lg font-semibold">No subjects assigned yet</p>
          <p className="text-slate-600 text-sm">Click "Add Subject" to create your first subject</p>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 mt-2">
            <Plus className="w-4 h-4" /> Add Your First Subject
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {subjects.map((subj, i) => (
            <motion.div
              key={subj.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card"
              style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', overflow: 'hidden' }}
            >
              {/* Accent bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${creditColor(subj.credits)}, ${creditColor(subj.credits)}88)` }} />

              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: creditColor(subj.credits) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen style={{ width: 22, height: 22, color: creditColor(subj.credits) }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className="text-white font-semibold text-sm leading-snug truncate">{subj.name}</p>
                    <span className="text-xs font-mono text-slate-500">{subj.code}</span>
                  </div>
                </div>

                {/* Delete button */}
                {confirmDel?.id === subj.id ? (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => handleDelete(subj)}
                      disabled={deletingId === subj.id}
                      className="w-7 h-7 rounded-lg bg-red-600/30 text-red-400 hover:bg-red-600/50 flex items-center justify-center transition-colors"
                      title="Confirm"
                    >
                      {deletingId === subj.id
                        ? <Loader className="w-3.5 h-3.5 animate-spin" />
                        : <Check className="w-3.5 h-3.5" />
                      }
                    </button>
                    <button
                      onClick={() => setConfirmDel(null)}
                      className="w-7 h-7 rounded-lg bg-surface-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDel(subj)}
                    className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/30 flex items-center justify-center transition-colors flex-shrink-0"
                    title="Remove subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Meta row */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-slate-400">{subj.credits} credit{subj.credits !== 1 ? 's' : ''}</span>
                </div>
                {subj.course_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Users className="w-3.5 h-3.5 text-primary-400" />
                    <span className="text-xs text-slate-400">{subj.course_name}</span>
                  </div>
                )}
              </div>

              {/* Delete confirm warning */}
              <AnimatePresence>
                {confirmDel?.id === subj.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-red-400 flex items-center gap-1.5"
                    style={{ overflow: 'hidden' }}
                  >
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    Confirm deletion — this cannot be undone
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
