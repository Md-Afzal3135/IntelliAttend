import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, GraduationCap, BookOpen, Camera, TrendingUp, Clock, CheckCircle, Shield, MapPin, ArrowRight } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import { AttendanceBarChart, AttendancePieChart } from '../components/ui/Charts'
import { attendanceAPI, studentsAPI } from '../api'
import { format } from 'date-fns'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentSessions, setRecentSessions] = useState([])

  useEffect(() => {
    Promise.all([
      attendanceAPI.stats(),
      attendanceAPI.sessions.list({ page_size: 5, ordering: '-created_at' })
    ]).then(([statsRes, sessionsRes]) => {
      setStats(statsRes.data)
      setRecentSessions(sessionsRes.data.results || sessionsRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const pieData = stats ? [
    { name: 'Present', value: stats.daily_stats?.reduce((a, d) => a + d.present, 0) || 0 },
    { name: 'Absent', value: stats.daily_stats?.reduce((a, d) => a + (d.total - d.present), 0) || 0 },
  ] : []

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="text-muted mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <div className="live-dot" />
          <span>Live</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={loading ? '—' : stats?.total_students ?? 0} icon={Users} color="primary" loading={loading} />
        <StatCard title="Total Teachers" value={loading ? '—' : stats?.total_teachers ?? 0} icon={GraduationCap} color="blue" loading={loading} />
        <StatCard title="Total Sessions" value={loading ? '—' : stats?.total_sessions ?? 0} icon={BookOpen} color="purple" loading={loading} />
        <StatCard title="Sessions Today" value={loading ? '—' : stats?.sessions_today ?? 0} icon={Camera} color="emerald" loading={loading} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/admin/teachers" id="quick-manage-teachers"
          className="glass-card p-5 flex items-center gap-4 hover:border-primary-500/40 border border-transparent transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
            <Shield className="w-6 h-6 text-primary-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">Manage Teachers</p>
            <p className="text-slate-500 text-sm">Add, update, or remove teacher accounts</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-primary-400 transition-colors" />
        </Link>
        <Link to="/admin/college-config" id="quick-college-config"
          className="glass-card p-5 flex items-center gap-4 hover:border-emerald-500/40 border border-transparent transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
            <MapPin className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">College Location Setup</p>
            <p className="text-slate-500 text-sm">Configure GPS coordinates & geofencing radius</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="section-title mb-1">Weekly Attendance</h2>
          <p className="text-muted text-xs mb-4">Last 7 days — present vs absent</p>
          {!loading && stats?.daily_stats ? (
            <AttendanceBarChart data={stats.daily_stats} />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="section-title mb-1">Overall Split</h2>
          <p className="text-muted text-xs mb-4">Present vs Absent ratio</p>
          {!loading && pieData.length > 0 ? (
            <AttendancePieChart data={pieData} />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Department Stats */}
      {stats?.department_stats?.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="section-title mb-4">Department-wise Attendance</h2>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr>
                <th>Department</th>
                <th>Students</th>
                <th>Attendance Rate</th>
                <th>Status</th>
              </tr></thead>
              <tbody>
                {stats.department_stats.map((dept, i) => (
                  <tr key={i}>
                    <td className="font-medium text-white">{dept.department}</td>
                    <td>{dept.students}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-surface-700 rounded-full h-2 max-w-32">
                          <div
                            className="h-2 rounded-full bg-primary-500"
                            style={{ width: `${dept.attendance_rate}%` }}
                          />
                        </div>
                        <span className="text-white font-semibold">{dept.attendance_rate}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={dept.attendance_rate >= 75 ? 'badge-present' : 'badge-absent'}>
                        {dept.attendance_rate >= 75 ? 'Good' : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="glass-card p-6">
        <h2 className="section-title mb-4">Recent Sessions</h2>
        {recentSessions.length === 0 && !loading ? (
          <p className="text-muted text-center py-8">No sessions yet. Teachers can start sessions from the Attendance page.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr>
                <th>Subject</th>
                <th>Teacher</th>
                <th>Date</th>
                <th>Present</th>
                <th>Status</th>
              </tr></thead>
              <tbody>
                {recentSessions.map(session => (
                  <tr key={session.id}>
                    <td className="font-medium text-white">{session.subject_name}</td>
                    <td>{session.teacher_name}</td>
                    <td>{session.date}</td>
                    <td>{session.present_count}/{session.total_count}</td>
                    <td>
                      <span className={
                        session.status === 'active' ? 'badge-active' :
                        session.status === 'completed' ? 'badge-present' : 'badge-absent'
                      }>
                        {session.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
