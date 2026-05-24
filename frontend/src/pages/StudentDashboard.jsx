import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, BookOpen, TrendingUp, AlertTriangle, Navigation } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { AttendancePieChart, SubjectBarChart } from '../components/ui/Charts'
import { attendanceAPI } from '../api'
import { useAuth } from '../context/AuthContext'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      attendanceAPI.stats(),
      attendanceAPI.records.list({ page_size: 10, ordering: '-timestamp' })
    ]).then(([statsRes, recordsRes]) => {
      setStats(statsRes.data)
      setRecords(recordsRes.data.results || recordsRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const pieData = stats ? [
    { name: 'Present', value: stats.present || 0 },
    { name: 'Absent', value: stats.absent || 0 },
    { name: 'Late', value: stats.late || 0 },
  ].filter(d => d.value > 0) : []

  const percentage = stats?.percentage ?? 0
  const isLow = percentage < 75

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">My Attendance</h1>
          <p className="text-muted mt-1">Welcome back, {user?.full_name?.split(' ')[0]}!</p>
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

      {/* Alert if low attendance */}
      {!loading && isLow && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Low Attendance Warning</p>
            <p className="text-xs text-amber-500 mt-0.5">
              Your attendance is {percentage}%, which is below the required 75%. Please attend upcoming classes.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Classes" value={loading ? '—' : stats?.total ?? 0} icon={BookOpen} color="primary" loading={loading} />
        <StatCard title="Present" value={loading ? '—' : stats?.present ?? 0} icon={CheckCircle} color="emerald" loading={loading} />
        <StatCard title="Absent" value={loading ? '—' : stats?.absent ?? 0} icon={XCircle} color="red" loading={loading} />
        <StatCard
          title="Attendance %"
          value={loading ? '—' : `${percentage}%`}
          icon={TrendingUp}
          color={isLow ? 'amber' : 'emerald'}
          loading={loading}
        />
      </div>

      {/* Overall percentage meter */}
      {!loading && (
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="section-title mb-1">Attendance Breakdown</h2>
          <p className="text-muted text-xs mb-4">Present / Absent / Late distribution</p>
          {!loading && pieData.length > 0 ? (
            <AttendancePieChart data={pieData} />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted">
              {loading ? <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /> : 'No records yet'}
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="section-title mb-4">Subject-wise</h2>
          {!loading && stats?.subject_stats?.length > 0 ? (
            <div className="space-y-3">
              {stats.subject_stats.map((subj, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{subj.subject}</span>
                    <span className={`font-semibold ${subj.percentage < 75 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {subj.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-700 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subj.percentage}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className={`h-2 rounded-full ${subj.percentage < 75 ? 'bg-red-500' : 'bg-primary-500'}`}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{subj.present}/{subj.total} classes</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted">
              {loading ? <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /> : 'No data available'}
            </div>
          )}
        </div>
      </div>

      {/* Recent attendance */}
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
              {records.length === 0 && !loading ? (
                <tr><td colSpan={4} className="text-center text-muted py-8">No attendance records yet</td></tr>
              ) : records.map(rec => (
                <tr key={rec.id}>
                  <td className="font-medium text-white">{rec.subject_name || '—'}</td>
                  <td>{rec.timestamp ? new Date(rec.timestamp).toLocaleDateString() : '—'}</td>
                  <td>
                    <span className={
                      rec.status === 'present' ? 'badge-present' :
                      rec.status === 'late' ? 'badge-late' : 'badge-absent'
                    }>{rec.status}</span>
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
