import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Trash2, Edit2, X, Check, Loader,
  Search, AlertTriangle, Users, GraduationCap, Award
} from 'lucide-react'
import { subjectsAPI, adminAPI, coursesAPI } from '../api'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', code: '', teacher: '', course: '', credits: 3 }

export default function AdminSubjectManagement() {
  const [subjects, setSubjects]     = useState([])
  const [teachers, setTeachers]     = useState([])
  const [courses, setCourses]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ ...EMPTY_FORM })
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirm] = useState(null) // subject to confirm

  // ─── Load data ─────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const [sRes, tRes, cRes] = await Promise.all([
        subjectsAPI.list(),
        adminAPI.teachers.list({ page_size: 100 }),
        coursesAPI.list(),
      ])
      setSubjects(sRes.data.results || sRes.data)
      setTeachers(tRes.data.results || tRes.data)
      setCourses(cRes.data.results || cRes.data)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ─── Create subject ─────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.code || !form.teacher || !form.course) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      await subjectsAPI.create({
        name: form.name,
        code: form.code,
        teacher: form.teacher,
        course: form.course,
        credits: Number(form.credits),
      })
      toast.success(`Subject "${form.name}" created!`)
      setForm({ ...EMPTY_FORM })
      setShowForm(false)
      load()
    } catch (err) {
      const data = err.response?.data
      if (data?.code) toast.error('Code: ' + data.code[0])
      else if (data?.non_field_errors) toast.error(data.non_field_errors[0])
      else toast.error('Failed to create subject')
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete subject ─────────────────────────────────────────────────────────
  const handleDelete = async (subject) => {
    setDeletingId(subject.id)
    try {
      await subjectsAPI.delete(subject.id)
      toast.success(`"${subject.name}" deleted`)
      setConfirm(null)
      load()
    } catch {
      toast.error('Failed to delete subject')
    } finally {
      setDeletingId(null)
    }
  }

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Manage Subjects</h1>
          <p className="text-muted mt-1">Add, assign, and delete subjects across all courses</p>
        </div>
        <button
          id="add-subject-btn"
          onClick={() => { setShowForm(true); setForm({ ...EMPTY_FORM }) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Subjects', value: subjects.length, icon: BookOpen, color: '#818cf8' },
          { label: 'Teachers Assigned', value: new Set(subjects.map(s => s.teacher)).size, icon: GraduationCap, color: '#34d399' },
          { label: 'Avg Credits', value: subjects.length ? (subjects.reduce((a, s) => a + (s.credits || 0), 0) / subjects.length).toFixed(1) : '—', icon: Award, color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-5" style={{ flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <stat.icon style={{ width: 20, height: 20, color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add Subject Form ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="glass-card p-6"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="section-title flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary-400" /> New Subject
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {/* Subject Name */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Subject Name *</label>
                  <input
                    className="input-field w-full"
                    value={form.name}
                    onChange={f('name')}
                    placeholder="e.g. Computer Networks"
                    required
                  />
                </div>

                {/* Subject Code */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Subject Code *</label>
                  <input
                    className="input-field w-full"
                    value={form.code}
                    onChange={f('code')}
                    placeholder="e.g. CS104"
                    required
                  />
                </div>

                {/* Teacher */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Assign Teacher *</label>
                  <select className="input-field w-full" value={form.teacher} onChange={f('teacher')} required>
                    <option value="">Select Teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                    ))}
                  </select>
                </div>

                {/* Course */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Course *</label>
                  <select className="input-field w-full" value={form.course} onChange={f('course')} required>
                    <option value="">Select Course</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                {/* Credits */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Credits</label>
                  <select className="input-field w-full" value={form.credits} onChange={f('credits')}>
                    {[1, 2, 3, 4, 5].map(c => <option key={c} value={c}>{c} credits</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving
                    ? <><Loader className="w-4 h-4 animate-spin" /> Creating...</>
                    : <><Check className="w-4 h-4" /> Create Subject</>
                  }
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <Search className="w-4 h-4 text-slate-500" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          className="input-field w-full"
          style={{ paddingLeft: 40 }}
          placeholder="Search by name or code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Subject Table ────────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr 80px', gap: 0, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['SUBJECT', 'CODE', 'TEACHER', 'CREDITS', 'ACTION'].map(h => (
            <span key={h} className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, gap: 8 }} className="text-slate-500">
            <BookOpen className="w-12 h-12 opacity-20" />
            <p className="text-sm">{search ? 'No subjects match your search' : 'No subjects yet — click Add Subject'}</p>
          </div>
        ) : (
          filtered.map((subj, i) => (
            <motion.div
              key={subj.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 2fr 1fr 80px',
                gap: 0,
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                alignItems: 'center',
              }}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen className="w-4 h-4 text-primary-400" />
                </div>
                <span className="text-white text-sm font-medium truncate">{subj.name}</span>
              </div>

              {/* Code */}
              <span className="text-xs font-mono px-2 py-1 rounded-lg bg-surface-700/50 text-slate-300 w-fit">{subj.code}</span>

              {/* Teacher */}
              <span className="text-slate-300 text-sm truncate">{subj.teacher_name || '—'}</span>

              {/* Credits */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-300 text-sm">{subj.credits}</span>
              </div>

              {/* Delete */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {confirmDelete?.id === subj.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleDelete(subj)}
                      disabled={deletingId === subj.id}
                      className="w-7 h-7 rounded-lg bg-red-600/30 text-red-400 hover:bg-red-600/50 flex items-center justify-center transition-colors"
                      title="Confirm delete"
                    >
                      {deletingId === subj.id
                        ? <Loader className="w-3.5 h-3.5 animate-spin" />
                        : <Check className="w-3.5 h-3.5" />
                      }
                    </button>
                    <button
                      onClick={() => setConfirm(null)}
                      className="w-7 h-7 rounded-lg bg-surface-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirm(subj)}
                    className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                    title="Delete subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Confirm delete banner */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(239,68,68,0.15)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(239,68,68,0.4)', borderRadius: 14,
              padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
              zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold">Delete "{confirmDelete.name}"?</p>
              <p className="text-slate-400 text-xs mt-0.5">This will also remove all attendance sessions for this subject.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
              <button onClick={() => setConfirm(null)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={!!deletingId}
                className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1"
              >
                {deletingId ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
