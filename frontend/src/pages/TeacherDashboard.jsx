import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Camera, BarChart3, Clock, CheckCircle, ArrowRight, UserPlus, Play } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { SubjectBarChart } from '../components/ui/Charts'
import { attendanceAPI } from '../api'
import { format } from 'date-fns'

export default function TeacherDashboard() {
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      attendanceAPI.stats(),
      attendanceAPI.sessions.list({ page_size: 5, ordering: '-created_at' })
    ]).then(([statsRes, sessionsRes]) => {
      setStats(statsRes.data)
      setSessions(sessionsRes.data.results || sessionsRes.data)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Teacher Dashboard</h1>
          <p className="text-muted mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link to="/attendance" className="btn-primary flex items-center gap-2">
          <Camera className="w-4 h-4" /> Start Attendance
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="My Subjects" value={loading ? '—' : stats?.total_subjects ?? 0} icon={BookOpen} color="primary" loading={loading} />
        <StatCard title="Total Sessions" value={loading ? '—' : stats?.total_sessions ?? 0} icon={CheckCircle} color="emerald" loading={loading} />
        <StatCard title="Sessions Today" value={loading ? '—' : stats?.sessions_today ?? 0} icon={Clock} color="amber" loading={loading} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4">
        <Link to="/teacher/sessions" id="quick-sessions"
          className="glass-card p-5 flex items-center gap-4 hover:border-primary-500/40 border border-transparent transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
            <Play className="w-6 h-6 text-primary-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">Session Management</p>
            <p className="text-slate-500 text-sm">Start or stop attendance sessions</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-primary-400 transition-colors" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="section-title mb-1">Subject Attendance Rates</h2>
          <p className="text-muted text-xs mb-4">Percentage across all sessions</p>
          {!loading && stats?.subject_stats?.length > 0 ? (
            <SubjectBarChart data={stats.subject_stats} />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted">
              {loading ? <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /> : 'No subjects assigned yet'}
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="section-title mb-4">My Subjects</h2>
          <div className="space-y-3">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="shimmer h-14 rounded-xl" />
              ))
            ) : stats?.subject_stats?.length > 0 ? (
              stats.subject_stats.map((subj, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-700/50 border border-primary-500/10">
                  <div>
                    <p className="text-white text-sm font-medium">{subj.subject}</p>
                    <p className="text-slate-500 text-xs">{subj.code} · {subj.sessions} sessions</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold text-lg ${subj.attendance_rate >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {subj.attendance_rate}%
                    </span>
                    <p className="text-slate-500 text-xs">attendance</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted text-center py-8">No subjects assigned</p>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Sessions</h2>
          <Link to="/reports" className="text-primary-400 text-sm flex items-center gap-1 hover:text-primary-300">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr>
              <th>Subject</th>
              <th>Date</th>
              <th>Present</th>
              <th>Status</th>
              <th>Action</th>
            </tr></thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted py-8">No sessions yet</td></tr>
              ) : sessions.map(s => (
                <tr key={s.id}>
                  <td className="font-medium text-white">{s.subject_name}</td>
                  <td>{s.date}</td>
                  <td>{s.present_count}/{s.total_count}</td>
                  <td>
                    <span className={s.status === 'active' ? 'badge-active' : s.status === 'completed' ? 'badge-present' : 'badge-absent'}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    {s.status === 'active' && (
                      <Link to="/attendance" className="text-primary-400 text-xs hover:text-primary-300">Continue →</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
