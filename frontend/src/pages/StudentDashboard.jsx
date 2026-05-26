import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle, XCircle, Clock, BookOpen, TrendingUp,
  AlertTriangle, Navigation, GraduationCap, User, Layers
} from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { AttendancePieChart } from '../components/ui/Charts'
import { studentDashboardAPI, attendanceAPI } from '../api'
import { useAuth } from '../context/AuthContext'

/* ────────────────────────────────────────────────────────── helpers ── */
const pct = (n) => `${n ?? 0}%`
const pctColor = (n) => (n < 75 ? 'text-red-400' : 'text-emerald-400')
const barColor = (n) => (n < 75 ? 'bg-red-500' : 'bg-primary-500')

/* ───────────────────────────── Subject Card ────────────────────────── */
function SubjectCard({ subj, idx }) {
  const p = subj.percentage ?? 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className="glass-card p-5 flex flex-col gap-3"
    >
      {/* header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{subj.subject || subj.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{subj.code}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
          p < 75
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {p}%
        </span>
      </div>

      {/* progress bar */}
      <div className="w-full bg-surface-700 rounded-full h-1.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(p, 100)}%` }}
          transition={{ duration: 0.8, delay: idx * 0.06 + 0.2 }}
          className={`h-1.5 rounded-full ${barColor(p)}`}
        />
      </div>

      {/* footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{subj.present ?? 0}/{subj.total ?? 0} classes</span>
        {subj.teacher_name && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {subj.teacher_name}
          </span>
        )}
        {subj.credits != null && (
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {subj.credits} cr
          </span>
        )}
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════ Main Component ════════════════════════════ */
export default function StudentDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)   // from /student/dashboard/
  const [records, setRecords]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    Promise.all([
      studentDashboardAPI.get(),
      attendanceAPI.records.list({ page_size: 10, ordering: '-timestamp' }),
    ])
      .then(([dashRes, recRes]) => {
        setDashboard(dashRes.data)
        setRecords(recRes.data.results || recRes.data)
      })
      .catch((e) => {
        setError(e.response?.data?.error || 'Failed to load dashboard data.')
      })
      .finally(() => setLoading(false))
  }, [])

  const summary    = dashboard?.attendance_summary ?? {}
  const subjects   = dashboard?.subject_stats     ?? []
  const enrolled   = dashboard?.assigned_subjects ?? []

  const percentage = summary.percentage ?? 0
  const isLow      = percentage < 75

  const pieData = [
    { name: 'Present', value: summary.present ?? 0 },
    { name: 'Absent',  value: summary.absent  ?? 0 },
    { name: 'Late',    value: summary.late    ?? 0 },
  ].filter((d) => d.value > 0)

  /* ── skeleton loader ── */
  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="h-8 w-48 bg-surface-700 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-28 animate-pulse bg-surface-700/50" />
          ))}
        </div>
        <div className="glass-card p-6 h-40 animate-pulse bg-surface-700/50" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">My Dashboard</h1>
          <p className="text-muted mt-1">
            Welcome back,{' '}
            <span className="text-white font-medium">
              {user?.full_name?.split(' ')[0] || 'Student'}
            </span>
            !
            {dashboard?.department_name && (
              <span className="ml-2 text-slate-500 text-xs">
                · {dashboard.department_name}
                {dashboard.course_name && ` › ${dashboard.course_name}`}
              </span>
            )}
          </p>
        </div>
        <Link
          to="/student/mark-attendance"
          id="mark-attendance-cta"
          className="btn-primary flex items-center gap-2 px-5 py-3 text-base"
        >
          <Navigation className="w-5 h-5" />
          Mark Attendance
        </Link>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Low attendance warning ── */}
      {isLow && summary.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Low Attendance Warning</p>
            <p className="text-xs text-amber-500 mt-0.5">
              Your overall attendance is {percentage}%, which is below the required 75%.
              Please attend upcoming classes.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Classes"     value={summary.total   ?? 0} icon={BookOpen}     color="primary"  />
        <StatCard title="Present"           value={summary.present ?? 0} icon={CheckCircle}  color="emerald"  />
        <StatCard title="Absent"            value={summary.absent  ?? 0} icon={XCircle}      color="red"      />
        <StatCard
          title="Attendance %"
          value={pct(percentage)}
          icon={TrendingUp}
          color={isLow ? 'amber' : 'emerald'}
        />
      </div>

      {/* ── Overall progress bar ── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Overall Attendance</h2>
          <span className={`text-2xl font-bold font-heading ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
            {percentage}%
          </span>
        </div>
        <div className="w-full bg-surface-700 rounded-full h-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            className={`h-4 rounded-full ${isLow ? 'bg-amber-500' : 'bg-primary-500'}`}
            style={{ boxShadow: isLow ? '0 0 10px rgba(245,158,11,0.5)' : '0 0 10px rgba(99,102,241,0.5)' }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>0%</span>
          <span className="text-amber-500">75% minimum</span>
          <span>100%</span>
        </div>
      </div>

      {/* ── My Subjects (auto-enrolled) ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="w-5 h-5 text-primary-400" />
          <h2 className="section-title">
            My Subjects
            <span className="ml-2 text-xs font-normal text-slate-500">
              ({enrolled.length} enrolled)
            </span>
          </h2>
        </div>

        {enrolled.length === 0 ? (
          <div className="glass-card p-10 text-center text-muted">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No subjects assigned yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              Ask your teacher or admin to add subjects for your course.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.length > 0
              /* prefer subject_stats (has attendance data) */
              ? subjects.map((s, i) => <SubjectCard key={s.subject_id || i} subj={s} idx={i} />)
              /* fall back to enrolled list (no attendance data yet) */
              : enrolled.map((s, i) => (
                  <SubjectCard
                    key={s.subject_id || i}
                    subj={{ ...s, subject: s.name, percentage: 0, present: 0, total: 0 }}
                    idx={i}
                  />
                ))}
          </div>
        )}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="section-title mb-1">Attendance Breakdown</h2>
          <p className="text-muted text-xs mb-4">Present / Absent / Late distribution</p>
          {pieData.length > 0 ? (
            <AttendancePieChart data={pieData} />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted text-sm">
              No records yet
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="section-title mb-4">Subject-wise Attendance</h2>
          {subjects.length > 0 ? (
            <div className="space-y-3 overflow-y-auto max-h-72 pr-1">
              {subjects.map((subj, i) => (
                <div key={subj.subject_id || i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 truncate max-w-[65%]">{subj.subject}</span>
                    <span className={`font-semibold ${pctColor(subj.percentage)}`}>
                      {subj.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-700 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subj.percentage}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className={`h-2 rounded-full ${barColor(subj.percentage)}`}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {subj.present}/{subj.total} classes
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted text-sm">
              {enrolled.length > 0
                ? 'No sessions held yet for your subjects'
                : 'No subjects assigned'}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent attendance records ── */}
      <div className="glass-card p-6">
        <h2 className="section-title mb-4">Recent Attendance</h2>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr>
              <th>Subject</th>
              <th>Date</th>
              <th>Status</th>
              <th>Method</th>
            </tr></thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-muted py-8">No attendance records yet</td></tr>
              ) : records.map((rec) => (
                <tr key={rec.id}>
                  <td className="font-medium text-white">{rec.subject_name || '—'}</td>
                  <td>{rec.timestamp ? new Date(rec.timestamp).toLocaleDateString() : '—'}</td>
                  <td>
                    <span className={
                      rec.status === 'present' ? 'badge-present' :
                      rec.status === 'late'    ? 'badge-late'    : 'badge-absent'
                    }>
                      {rec.status}
                    </span>
                  </td>
                  <td className="capitalize text-slate-400 text-xs">{rec.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
