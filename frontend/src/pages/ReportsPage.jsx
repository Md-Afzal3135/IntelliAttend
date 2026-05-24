import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Filter, BarChart3, Calendar, BookOpen } from 'lucide-react'
import { AttendanceLineChart, AttendanceBarChart, SubjectBarChart } from '../components/ui/Charts'
import { attendanceAPI, subjectsAPI } from '../api'
import toast from 'react-hot-toast'
import { format, subDays } from 'date-fns'

export default function ReportsPage() {
  const [sessions, setSessions] = useState([])
  const [subjects, setSubjects] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ subject: '', start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end_date: format(new Date(), 'yyyy-MM-dd') })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    subjectsAPI.list().then(r => setSubjects(r.data.results || r.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = { page_size: 50, ordering: '-date' }
    if (filters.subject) params.subject = filters.subject
    if (filters.start_date) params.start_date = filters.start_date
    if (filters.end_date) params.end_date = filters.end_date

    Promise.all([
      attendanceAPI.sessions.list(params),
      attendanceAPI.stats(),
    ]).then(([sessRes, statsRes]) => {
      setSessions(sessRes.data.results || sessRes.data)
      setStats(statsRes.data)
    }).finally(() => setLoading(false))
  }, [filters])

  const exportCSV = async () => {
    setExporting(true)
    try {
      const { data } = await attendanceAPI.exportCSV({
        subject_id: filters.subject || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      })
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported!')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  // Build chart data from sessions
  const sessionsByDate = {}
  sessions.forEach(s => {
    if (!sessionsByDate[s.date]) sessionsByDate[s.date] = { date: s.date, present: 0, total: 0, absent: 0 }
    sessionsByDate[s.date].present += s.present_count || 0
    sessionsByDate[s.date].total += s.total_count || 0
    sessionsByDate[s.date].absent += (s.total_count - s.present_count) || 0
  })
  const chartData = Object.values(sessionsByDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-14)

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-muted mt-1">Detailed attendance insights and exports</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={exporting}
          className="btn-primary flex items-center gap-2"
          id="export-csv-btn"
        >
          {exporting
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Download className="w-4 h-4" />
          }
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <select
          value={filters.subject}
          onChange={e => setFilters(p => ({ ...p, subject: e.target.value }))}
          className="input-field min-w-40 flex-1"
        >
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">From</label>
          <input
            type="date"
            value={filters.start_date}
            onChange={e => setFilters(p => ({ ...p, start_date: e.target.value }))}
            className="input-field"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">To</label>
          <input
            type="date"
            value={filters.end_date}
            onChange={e => setFilters(p => ({ ...p, end_date: e.target.value }))}
            className="input-field"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: sessions.length, icon: BookOpen, color: 'text-primary-400 bg-primary-500/10' },
          { label: 'Total Present', value: sessions.reduce((a, s) => a + (s.present_count || 0), 0), icon: BarChart3, color: 'text-emerald-400 bg-emerald-500/10' },
          { label: 'Total Absent', value: sessions.reduce((a, s) => a + ((s.total_count - s.present_count) || 0), 0), icon: BarChart3, color: 'text-red-400 bg-red-500/10' },
          {
            label: 'Avg Attendance',
            value: sessions.length
              ? `${Math.round(sessions.reduce((a, s) => a + (s.total_count ? (s.present_count / s.total_count) * 100 : 0), 0) / sessions.length)}%`
              : '—',
            icon: BarChart3,
            color: 'text-amber-400 bg-amber-500/10'
          },
        ].map((item, i) => {
          const Icon = item.icon
          return (
            <motion.div key={i} whileHover={{ y: -3 }} className="glass-card p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-muted text-xs">{item.label}</p>
                <p className="text-white font-bold text-xl font-heading">{loading ? '—' : item.value}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="section-title mb-1">Attendance Trend</h2>
          <p className="text-muted text-xs mb-4">Present vs absent over time</p>
          {!loading && chartData.length > 0 ? (
            <AttendanceBarChart data={chartData} />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted text-sm">
              {loading ? <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /> : 'No data for selected range'}
            </div>
          )}
        </div>

        {stats?.subject_stats?.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="section-title mb-1">Subject-wise Rates</h2>
            <p className="text-muted text-xs mb-4">Percentage attendance per subject</p>
            <SubjectBarChart data={stats.subject_stats} />
          </div>
        )}
      </div>

      {/* Sessions table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-primary-500/10">
          <h2 className="section-title">Session History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr>
              <th>Subject</th>
              <th>Teacher</th>
              <th>Date</th>
              <th>Present</th>
              <th>Total</th>
              <th>Rate</th>
              <th>Status</th>
            </tr></thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="shimmer h-4 rounded w-20" /></td>)}</tr>
                ))
              ) : sessions.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-12">No sessions found for selected filters</td></tr>
              ) : sessions.map(s => {
                const rate = s.total_count ? Math.round((s.present_count / s.total_count) * 100) : 0
                return (
                  <tr key={s.id}>
                    <td className="font-medium text-white">{s.subject_name}</td>
                    <td>{s.teacher_name}</td>
                    <td>{s.date}</td>
                    <td className="text-emerald-400 font-semibold">{s.present_count}</td>
                    <td>{s.total_count}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-surface-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{rate}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={s.status === 'completed' ? 'badge-present' : s.status === 'active' ? 'badge-active' : 'badge-absent'}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
