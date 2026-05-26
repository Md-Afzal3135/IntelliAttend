import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Square, CheckCircle, XCircle,
  User, Clock, Users, RefreshCw
} from 'lucide-react'
import { attendanceAPI, subjectsAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function AttendancePage() {
  const { user } = useAuth()

  // ─── State ─────────────────────────────────────────────────────────────────
  const [subjects, setSubjects]           = useState([])
  const [enrolledStudents, setEnrolled]   = useState([])
  const [selectedSubject, setSelected]    = useState('')
  const [activeSession, setSession]       = useState(null)
  const [records, setRecords]             = useState([])
  const [loading, setLoading]             = useState(false)
  const [markingId, setMarkingId]         = useState(null)
  const [loadingStudents, setLoadStu]     = useState(false)

  // ─── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    subjectsAPI.list().then(r => setSubjects(r.data.results || r.data)).catch(() => {})
  }, [])

  // ─── Load enrolled students when subject changes ───────────────────────────
  useEffect(() => {
    if (!selectedSubject) {
      setEnrolled([])
      return
    }
    setLoadStu(true)
    subjectsAPI.getStudents(selectedSubject)
      .then(r => setEnrolled(r.data.students || []))
      .catch(() => setEnrolled([]))
      .finally(() => setLoadStu(false))
  }, [selectedSubject])

  // ─── Session management ────────────────────────────────────────────────────
  const startSession = async () => {
    if (!selectedSubject) { toast.error('Please select a subject'); return }
    setLoading(true)
    try {
      const { data: session } = await attendanceAPI.sessions.create({
        subject: selectedSubject,
        status: 'active',
      })
      setSession(session)

      const { data } = await attendanceAPI.sessions.get(session.id)
      setRecords(data.records || [])
      toast.success('Attendance session started!')
    } catch {
      toast.error('Failed to start session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const endSession = async () => {
    if (!activeSession) return
    try {
      await attendanceAPI.sessions.complete(activeSession.id)
      toast.success('Session completed!')
    } catch {}
    setSession(null)
  }

  const refreshRecords = async () => {
    if (!activeSession) return
    try {
      const { data } = await attendanceAPI.sessions.get(activeSession.id)
      setRecords(data.records || [])
    } catch {}
  }

  // ─── Manual attendance ─────────────────────────────────────────────────────
  const manualMark = async (studentId, status) => {
    if (!activeSession) return
    setMarkingId(studentId)
    try {
      await attendanceAPI.sessions.markAttendance(activeSession.id, {
        student_id: studentId,
        status,
        method: 'manual',
      })
      toast.success(`Marked ${status}`)
      refreshRecords()
    } catch {
      toast.error('Failed to mark attendance')
    } finally {
      setMarkingId(null)
    }
  }

  const exportCSV = async () => {
    if (!activeSession) return
    try {
      const { data } = await attendanceAPI.sessions.exportCSV(activeSession.id)
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${activeSession.id}.csv`
      a.click()
    } catch { toast.error('Export failed') }
  }

  // Derived counts
  const presentCount = records.filter(r => r.status === 'present').length
  const absentCount  = records.filter(r => r.status === 'absent').length

  // Merge enrolled students with live attendance records
  const mergedRoster = enrolledStudents.map(stu => {
    const rec = records.find(r => r.student_id === stu.student_id || r.student_uuid === stu.id)
    return { ...stu, record: rec || null }
  })

  return (
    <div className="space-y-5 animate-in max-w-5xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Session Management</h1>
          <p className="text-muted mt-1">Control active class attendance and manual overrides</p>
        </div>
      </div>

      {/* ── Subject Selector / Session Header ─────────────────────────────── */}
      {!activeSession ? (
        <div className="glass-card p-5">
          <h2 className="section-title mb-4">Start New Session</h2>
          {/* Flexbox row: dropdown + button */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              id="subject-select"
              value={selectedSubject}
              onChange={e => setSelected(e.target.value)}
              className="input-field"
              style={{ flex: '1 1 240px', minWidth: 200 }}
            >
              <option value="">Select Subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
            <button
              onClick={startSession}
              disabled={loading || !selectedSubject}
              className="btn-primary flex items-center gap-2"
              id="start-session-btn"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Play className="w-4 h-4" /> Start Session</>
              }
            </button>
          </div>
          {selectedSubject && enrolledStudents.length > 0 && (
            <p className="text-slate-500 text-xs mt-3">
              {enrolledStudents.length} students enrolled — they will be pre-marked absent when session starts.
            </p>
          )}
        </div>
      ) : (
        /* Active session status bar */
        <div className="glass-card p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="live-dot" />
            <div>
              <p className="text-white text-sm font-semibold">{activeSession.subject_name}</p>
              <p className="text-slate-500 text-xs">{activeSession.date}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="text-emerald-400 font-semibold text-sm">{presentCount} Present</span>
            <span className="text-red-400 font-semibold text-sm">{absentCount} Absent</span>
            <button onClick={exportCSV} className="btn-secondary text-xs py-1.5 px-3">Export CSV</button>
            <button onClick={endSession} className="btn-danger flex items-center gap-1 text-xs py-1.5 px-3">
              <Square className="w-3 h-3" /> End Session
            </button>
          </div>
        </div>
      )}

      {/*
        ── Main Layout (Dashboard) ──────────────────────────────────────
        Full width: Enrolled students roster with manual mark buttons
      */}
      <div
        className="glass-card w-full flex flex-col overflow-hidden max-h-[700px]"
      >
        {/* Panel header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users className="w-4 h-4 text-primary-400" />
              <h2 className="section-title" style={{ margin: 0 }}>Enrolled Students</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {presentCount > 0 && (
                <span className="text-xs text-emerald-400 font-semibold">{presentCount}✓</span>
              )}
              <span className="text-xs text-slate-500">
                {loadingStudents ? '…' : `${enrolledStudents.length} enrolled`}
              </span>
              {activeSession && (
                <button onClick={refreshRecords} className="text-slate-500 hover:text-white transition-colors" title="Refresh">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Student list — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px' }}>
            {loadingStudents ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', gap: 8 }} className="text-slate-500">
                <User className="w-10 h-10 opacity-30" />
                <p className="text-sm text-center">
                  {selectedSubject ? 'No students enrolled' : 'Select a subject to see enrolled students'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mergedRoster.map(stu => {
                  const rec = stu.record
                  const statusColor = rec?.status === 'present'
                    ? { bg: 'rgba(16,185,129,0.15)', text: '#10b981', badge: 'bg-emerald-500/20 text-emerald-400' }
                    : rec?.status === 'late'
                    ? { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', badge: 'bg-amber-500/20 text-amber-400' }
                    : rec?.status === 'absent'
                    ? { bg: 'rgba(239,68,68,0.08)', text: '#ef4444', badge: 'bg-red-500/20 text-red-400' }
                    : { bg: 'rgba(255,255,255,0.03)', text: '#64748b', badge: 'bg-surface-700/50 text-slate-500' }

                  return (
                    <div
                      key={stu.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: statusColor.bg,
                        border: '1px solid rgba(255,255,255,0.05)',
                        flexWrap: 'wrap',      /* prevents overflow on narrow panel */
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: `${statusColor.text}22`,
                          color: statusColor.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {stu.full_name?.charAt(0)}
                      </div>

                      {/* Name + ID */}
                      <div style={{ flex: '1 1 80px', minWidth: 0 }}>
                        <p className="text-white text-xs font-medium" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {stu.full_name}
                        </p>
                        <p className="text-slate-500 text-xs">{stu.roll_number || stu.student_id}</p>
                      </div>

                      {/* Status badge + manual mark buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {rec && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor.badge}`}>
                            {rec.status}
                          </span>
                        )}
                        {activeSession && (
                          <>
                            <button
                              onClick={() => manualMark(stu.id, 'present')}
                              disabled={markingId === stu.id}
                              className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 flex items-center justify-center transition-colors"
                              title="Mark Present"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => manualMark(stu.id, 'absent')}
                              disabled={markingId === stu.id}
                              className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                              title="Mark Absent"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
    </div>
  )
}
