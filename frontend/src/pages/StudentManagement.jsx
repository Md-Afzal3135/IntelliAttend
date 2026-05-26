import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, Search, Filter, Edit2, Trash2, Upload,
  Camera, CheckCircle, XCircle, ChevronLeft, ChevronRight, X
} from 'lucide-react'
import { studentsAPI, departmentsAPI, coursesAPI } from '../api'
import toast from 'react-hot-toast'

function AddStudentModal({ departments, courses, onClose, onSuccess }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: 'Student@123', student_id: '', year: 1, section: 'A', roll_number: '', department_id: '', course_id: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await studentsAPI.create(form)
      toast.success('Student added successfully!')
      onSuccess()
      onClose()
    } catch (err) {
      const errs = err.response?.data
      if (errs) toast.error(Object.values(errs).flat().join(' '))
      else toast.error('Failed to create student')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title">Add New Student</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Arjun" className="input-field" required />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Last Name *</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Mehta" className="input-field" required />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="arjun@student.edu" className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Student ID *</label>
              <input value={form.student_id} onChange={e => set('student_id', e.target.value)} placeholder="BTCS2024001" className="input-field" required />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Roll Number</label>
              <input value={form.roll_number} onChange={e => set('roll_number', e.target.value)} placeholder="24CS001" className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Department</label>
              <select value={form.department_id} onChange={e => set('department_id', e.target.value)} className="input-field">
                <option value="">Select...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Course</label>
              <select value={form.course_id} onChange={e => set('course_id', e.target.value)} className="input-field">
                <option value="">Select...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Year</label>
              <select value={form.year} onChange={e => set('year', e.target.value)} className="input-field">
                {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Section</label>
              <select value={form.section} onChange={e => set('section', e.target.value)} className="input-field">
                {['A', 'B', 'C', 'D'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Initial Password</label>
            <input value={form.password} onChange={e => set('password', e.target.value)} type="text" className="input-field" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add Student'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function FaceUploadModal({ student, onClose, onSuccess }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const upload = async () => {
    if (!files.length) { toast.error('Select at least one image'); return }
    setLoading(true)
    const fd = new FormData()
    files.forEach(f => fd.append('images', f))
    try {
      const { data } = await studentsAPI.uploadFaces(student.id, fd)
      if (data.face_registered) {
        toast.success(data.message)
        onSuccess()
        onClose()
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.error || 'Upload failed'
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="section-title">Upload Face Images</h2>
            <p className="text-muted text-xs mt-0.5">{student.full_name} · {student.student_id}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-primary-500/30 hover:border-primary-500/60 rounded-xl p-8 text-center cursor-pointer transition-colors"
        >
          <Camera className="w-10 h-10 text-primary-400/50 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Click to select face images</p>
          <p className="text-slate-600 text-xs mt-1">JPG, PNG up to 10MB. Multiple images recommended.</p>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => setFiles([...e.target.files])} className="hidden" />
        </div>

        {files.length > 0 && (
          <div className="mt-3 space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-400 bg-surface-700/50 px-3 py-2 rounded-lg">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                {f.name}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={upload} disabled={loading || !files.length} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Upload className="w-4 h-4" /> Upload & Encode</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function StudentManagement() {
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [faceUploadStudent, setFaceUploadStudent] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const params = { page, page_size: 10 }
      if (search) params.search = search
      if (filterDept) params.department = filterDept
      const { data } = await studentsAPI.list(params)
      setStudents(data.results || data)
      if (data.count) setTotalPages(Math.ceil(data.count / 10))
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchStudents() }, [page, search, filterDept])
  useEffect(() => {
    departmentsAPI.list().then(r => setDepartments(r.data.results || r.data))
    coursesAPI.list().then(r => setCourses(r.data.results || r.data))
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this student? This cannot be undone.')) return
    setDeleting(id)
    try {
      await studentsAPI.delete(id)
      toast.success('Student deleted')
      fetchStudents()
    } catch { toast.error('Delete failed') }
    finally { setDeleting(null) }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Student Management</h1>
          <p className="text-muted mt-1">Manage student profiles and face registration</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search students..."
            className="input-field pl-10"
          />
        </div>
        <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1) }} className="input-field min-w-40">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr>
              <th>Student</th>
              <th>ID / Roll</th>
              <th>Department</th>
              <th>Year</th>
              <th>Attendance</th>
              <th>Face</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j}><div className="shimmer h-4 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-12">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  No students found
                </td></tr>
              ) : students.map(student => (
                <motion.tr key={student.id} layout>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center text-primary-400 text-xs font-bold">
                        {student.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{student.full_name}</p>
                        <p className="text-slate-500 text-xs">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-white text-xs font-mono">{student.student_id}</p>
                    <p className="text-slate-500 text-xs">{student.roll_number}</p>
                  </td>
                  <td>
                    <p className="text-sm">{student.department_name || student.branch || student.department?.name || '—'}</p>
                    <p className="text-slate-500 text-xs">{student.course_name || student.course?.name || '—'}</p>
                  </td>
                  <td>Year {student.year}{student.section && ` - ${student.section}`}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-surface-700 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${student.attendance_percentage || 0}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-white">{student.attendance_percentage || 0}%</span>
                    </div>
                  </td>
                  <td>
                    {student.face_registered ? (
                      <span className="badge-present"><CheckCircle className="w-3 h-3 mr-1" />Registered</span>
                    ) : (
                      <span className="badge-absent"><XCircle className="w-3 h-3 mr-1" />Not Set</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFaceUploadStudent(student)}
                        className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center justify-center transition-colors"
                        title="Upload Face"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        disabled={deleting === student.id}
                        className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                        title="Delete"
                      >
                        {deleting === student.id
                          ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-primary-500/10">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost flex items-center gap-1 text-sm disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-muted text-sm">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost flex items-center gap-1 text-sm disabled:opacity-40">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAdd && <AddStudentModal departments={departments} courses={courses} onClose={() => setShowAdd(false)} onSuccess={fetchStudents} />}
        {faceUploadStudent && <FaceUploadModal student={faceUploadStudent} onClose={() => setFaceUploadStudent(null)} onSuccess={fetchStudents} />}
      </AnimatePresence>
    </div>
  )
}
