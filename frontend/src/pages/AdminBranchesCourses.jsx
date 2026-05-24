import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, GraduationCap, Plus, Trash2, X, Check, Loader,
  Search, AlertTriangle
} from 'lucide-react'
import { departmentsAPI, coursesAPI, adminAPI } from '../api'
import toast from 'react-hot-toast'

export default function AdminBranchesCourses() {
  const [activeTab, setActiveTab] = useState('branches') // 'branches' or 'courses'
  const [branches, setBranches] = useState([])
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Form states
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const initBranchForm = { name: '', code: '', head: '' }
  const [branchForm, setBranchForm] = useState({ ...initBranchForm })

  const initCourseForm = { name: '', code: '', department: '', duration_years: 4 }
  const [courseForm, setCourseForm] = useState({ ...initCourseForm })

  // Delete states
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [depRes, courseRes, teachRes] = await Promise.all([
        departmentsAPI.list(),
        coursesAPI.list(),
        adminAPI.teachers.list({ page_size: 100 })
      ])
      setBranches(depRes.data.results || depRes.data)
      setCourses(courseRes.data.results || courseRes.data)
      setTeachers(teachRes.data.results || teachRes.data)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // ─── Handlers for Branches ──────────────────────────────────────────────────
  const handleCreateBranch = async (e) => {
    e.preventDefault()
    if (!branchForm.name || !branchForm.code) { toast.error('Name and Code are required'); return }
    setSaving(true)
    try {
      const payload = { ...branchForm }
      if (!payload.head) delete payload.head // don't send empty string if no teacher selected
      await departmentsAPI.create(payload)
      toast.success(`Branch "${branchForm.name}" created!`)
      setBranchForm({ ...initBranchForm })
      setShowForm(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create branch')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBranch = async (branch) => {
    setDeletingId(branch.id)
    try {
      await departmentsAPI.delete(branch.id)
      toast.success(`Branch deleted`)
      setConfirmDelete(null)
      loadData()
    } catch {
      toast.error('Failed to delete branch. It might have students attached.')
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Handlers for Courses ───────────────────────────────────────────────────
  const handleCreateCourse = async (e) => {
    e.preventDefault()
    if (!courseForm.name || !courseForm.code || !courseForm.department) {
      toast.error('Name, Code, and Branch are required')
      return
    }
    setSaving(true)
    try {
      await coursesAPI.create(courseForm)
      toast.success(`Course "${courseForm.name}" created!`)
      setCourseForm({ ...initCourseForm })
      setShowForm(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create course')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCourse = async (course) => {
    setDeletingId(course.id)
    try {
      await coursesAPI.delete(course.id)
      toast.success(`Course deleted`)
      setConfirmDelete(null)
      loadData()
    } catch {
      toast.error('Failed to delete course. It might have students attached.')
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Render Helpers ─────────────────────────────────────────────────────────

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    b.code.toLowerCase().includes(search.toLowerCase())
  )

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Branches & Courses</h1>
          <p className="text-muted mt-1">Manage academic departments (branches) and degree courses</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add {activeTab === 'branches' ? 'Branch' : 'Course'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 2 }}>
        <button
          onClick={() => { setActiveTab('branches'); setShowForm(false); setSearch('') }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'branches' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
          style={{ marginBottom: -3 }}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Branches
          </div>
        </button>
        <button
          onClick={() => { setActiveTab('courses'); setShowForm(false); setSearch('') }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'courses' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}
          style={{ marginBottom: -3 }}
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> Courses
          </div>
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <Search className="w-4 h-4 text-slate-500" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          className="input-field w-full"
          style={{ paddingLeft: 40 }}
          placeholder={`Search ${activeTab}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Forms */}
      <AnimatePresence mode="wait">
        {showForm && activeTab === 'branches' && (
          <motion.div
            key="branchForm"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title text-primary-400">Add New Branch</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateBranch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name *</label>
                <input className="input-field w-full" value={branchForm.name} onChange={e => setBranchForm({...branchForm, name: e.target.value})} placeholder="e.g. Computer Science" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Code *</label>
                <input className="input-field w-full" value={branchForm.code} onChange={e => setBranchForm({...branchForm, code: e.target.value})} placeholder="e.g. CSE" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Head of Department (Optional)</label>
                <select className="input-field w-full" value={branchForm.head} onChange={e => setBranchForm({...branchForm, head: e.target.value})}>
                  <option value="">None</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create Branch
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {showForm && activeTab === 'courses' && (
          <motion.div
            key="courseForm"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title text-emerald-400">Add New Course</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateCourse} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name *</label>
                <input className="input-field w-full" value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} placeholder="e.g. B.Tech Computer Science" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Code *</label>
                <input className="input-field w-full" value={courseForm.code} onChange={e => setCourseForm({...courseForm, code: e.target.value})} placeholder="e.g. BTCS" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Branch *</label>
                <select className="input-field w-full" value={courseForm.department} onChange={e => setCourseForm({...courseForm, department: e.target.value})} required>
                  <option value="">Select Branch...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Duration (Years)</label>
                <input type="number" min="1" max="6" className="input-field w-full" value={courseForm.duration_years} onChange={e => setCourseForm({...courseForm, duration_years: e.target.value})} required />
              </div>
              <div className="lg:col-span-4 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2" style={{ background: '#10b981', borderColor: '#059669' }}>
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create Course
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tables */}
      <div className="glass-card overflow-hidden relative min-h-[300px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-900/50 backdrop-blur-sm z-10">
            <Loader className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        )}

        {activeTab === 'branches' && (
          <>
            <div className="grid grid-cols-4 gap-4 p-4 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Name</span>
              <span>Code</span>
              <span>Head</span>
              <span className="text-right">Actions</span>
            </div>
            {filteredBranches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <Building2 className="w-8 h-8 opacity-20" />
                <p>No branches found</p>
              </div>
            ) : (
              filteredBranches.map(branch => (
                <div key={branch.id} className="grid grid-cols-4 gap-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors">
                  <span className="text-white font-medium">{branch.name}</span>
                  <span className="text-slate-300 font-mono text-xs bg-surface-700 px-2 py-1 rounded w-fit">{branch.code}</span>
                  <span className="text-slate-400 text-sm">{branch.head || '—'}</span>
                  <div className="flex justify-end">
                    {confirmDelete?.id === branch.id && confirmDelete?.type === 'branch' ? (
                      <div className="flex gap-2">
                         <button onClick={() => handleDeleteBranch(branch)} disabled={!!deletingId} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/40">
                           {deletingId ? <Loader className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                         </button>
                         <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-lg bg-surface-700 text-slate-300 flex items-center justify-center hover:bg-surface-600">
                           <X className="w-4 h-4"/>
                         </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete({ id: branch.id, type: 'branch', name: branch.name })} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'courses' && (
          <>
            <div className="grid grid-cols-5 gap-4 p-4 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span className="col-span-2">Course Name</span>
              <span>Code</span>
              <span>Branch</span>
              <span className="text-right">Actions</span>
            </div>
            {filteredCourses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <GraduationCap className="w-8 h-8 opacity-20" />
                <p>No courses found</p>
              </div>
            ) : (
              filteredCourses.map(course => (
                <div key={course.id} className="grid grid-cols-5 gap-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors">
                  <span className="text-white font-medium col-span-2">{course.name}</span>
                  <span className="text-slate-300 font-mono text-xs bg-surface-700 px-2 py-1 rounded w-fit">{course.code}</span>
                  <span className="text-slate-400 text-sm">{course.department_name}</span>
                  <div className="flex justify-end">
                    {confirmDelete?.id === course.id && confirmDelete?.type === 'course' ? (
                      <div className="flex gap-2">
                         <button onClick={() => handleDeleteCourse(course)} disabled={!!deletingId} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/40">
                           {deletingId ? <Loader className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                         </button>
                         <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-lg bg-surface-700 text-slate-300 flex items-center justify-center hover:bg-surface-600">
                           <X className="w-4 h-4"/>
                         </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete({ id: course.id, type: 'course', name: course.name })} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Banner Overlay */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/30 backdrop-blur-md p-4 rounded-xl shadow-2xl z-50 flex items-center gap-4"
          >
            <AlertTriangle className="text-red-400 w-5 h-5" />
            <div>
              <p className="text-white font-semibold text-sm">Delete {confirmDelete.name}?</p>
              <p className="text-red-300/80 text-xs mt-0.5">This action cannot be undone.</p>
            </div>
            <div className="flex gap-2 ml-4">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
              <button 
                onClick={() => confirmDelete.type === 'branch' ? handleDeleteBranch(confirmDelete) : handleDeleteCourse(confirmDelete)}
                disabled={!!deletingId} 
                className="btn-danger text-xs py-1.5 px-3 flex items-center gap-2"
              >
                {deletingId ? <Loader className="w-3 h-3 animate-spin"/> : <Trash2 className="w-3 h-3"/>}
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
