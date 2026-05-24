import { useEffect, useState, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Square, BookOpen, Users, Clock, Calendar,
  ChevronDown, Plus, RefreshCw, TrendingUp, AlertCircle
} from 'lucide-react'
import { attendanceAPI, subjectsAPI } from '../api'
import { format } from 'date-fns'

const SessionCard = forwardRef(({ session, onStop }, ref) => {
  const isActive = session.status === 'active'
  const [stopping, setStopping] = useState(false)

  const handleStop = async () => {
    setStopping(true)
    try {
      await attendanceAPI.sessions.complete(session.id)
      onStop(session.id)
    } finally {
      setStopping(false)
    }
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`glass-card p-5 border-l-4 ${isActive ? 'border-emerald-500' : 'border-surface-600'}`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={isActive ? 'badge-active' : 'badge-present'}>{session.status}</span>
            <span className="text-slate-500 text-xs">{session.date}</span>
          </div>
          <h3 className="text-white font-semibold truncate">{session.subject_name}</h3>
          <p className="text-slate-400 text-sm mt-0.5">{session.subject_code}</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold font-heading text-emerald-400">{session.present_count}</p>
            <p className="text-slate-500 text-xs">Present</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-heading text-slate-300">{session.total_count}</p>
            <p className="text-slate-500 text-xs">Total</p>
          </div>

          {isActive && (
            <button
              id={`stop-session-${session.id}`}
              onClick={handleStop}
              disabled={stopping}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all font-semibold text-sm"
            >
              {stopping
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Square className="w-4 h-4" />
              }
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Attendance bar */}
      {session.total_count > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Attendance Rate</span>
            <span>{Math.round((session.present_count / session.total_count) * 100)}%</span>
          </div>
          <div className="w-full bg-surface-700 rounded-full h-1.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(session.present_count / session.total_count) * 100}%` }}
              transition={{ duration: 0.8 }}
              className="h-1.5 rounded-full bg-emerald-500"
            />
          </div>
        </div>
      )}
    </motion.div>
  )
})

export default function TeacherSessions() {
  const [sessions, setSessions] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showStartForm, setShowStartForm] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // all | active | completed
  const [polling, setPolling] = useState(null)

  const fetchSessions = async () => {
    try {
      const params = { ordering: '-created_at', page_size: 50 }
      if (filter === 'active') params.status = 'active'
      else if (filter === 'completed') params.status = 'completed'
      const res = await attendanceAPI.sessions.list(params)
      setSessions(res.data.results || res.data)
    } catch (e) {
      // silently handle
    }
  }

  const fetchSubjects = async () => {
    try {
      const res = await subjectsAPI.list()
      setSubjects(res.data.results || res.data)
      if ((res.data.results || res.data).length > 0) {
        setSelectedSubject((res.data.results || res.data)[0].id)
      }
    } catch (e) {}
  }

  useEffect(() => {
    Promise.all([fetchSessions(), fetchSubjects()]).finally(() => setLoading(false))
  }, [filter])

  // Poll active sessions every 10s
  useEffect(() => {
    const hasActive = sessions.some(s => s.status === 'active')
    if (hasActive) {
      const id = setInterval(fetchSessions, 10000)
      setPolling(id)
      return () => clearInterval(id)
    }
    if (polling) { clearInterval(polling); setPolling(null) }
  }, [sessions])

  const handleStartSession = async (e) => {
    e.preventDefault()
    if (!selectedSubject) { setError('Please select a subject.'); return }
    setCreating(true)
    setError('')
    try {
      const res = await attendanceAPI.sessions.create({ subject: selectedSubject })
      setSessions(prev => [res.data, ...prev])
      setShowStartForm(false)
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.subject?.[0] || 'Failed to start session.')
    } finally {
      setCreating(false)
    }
  }

  const handleStop = (sessionId) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'completed' } : s))
  }

  const filtered = sessions.filter(s => {
    if (filter === 'active') return s.status === 'active'
    if (filter === 'completed') return s.status === 'completed'
    return true
  })

  const activeSessions = sessions.filter(s => s.status === 'active')
  const todaySessions = sessions.filter(s => s.date === format(new Date(), 'yyyy-MM-dd'))

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Session Management</h1>
          <p className="text-muted mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button
          id="start-session-btn"
          onClick={() => setShowStartForm(v => !v)}
          className={`flex items-center gap-2 ${showStartForm ? 'btn-secondary' : 'btn-primary'}`}
        >
          {showStartForm ? <ChevronDown className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {showStartForm ? 'Cancel' : 'Start Session'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <p className="text-slate-400 text-xs">Active Now</p>
            <p className="text-white text-2xl font-bold font-heading">{activeSessions.length}</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <p className="text-slate-400 text-xs">Today's Sessions</p>
            <p className="text-white text-2xl font-bold font-heading">{todaySessions.length}</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-slate-400 text-xs">Total Sessions</p>
            <p className="text-white text-2xl font-bold font-heading">{sessions.length}</p>
          </div>
        </div>
      </div>

      {/* Start Session Panel */}
      <AnimatePresence>
        {showStartForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-6 border border-primary-500/20">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Play className="w-4 h-4 text-primary-400" /> Start New Attendance Session
              </h2>
              {error && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <form onSubmit={handleStartSession} className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-slate-400 mb-1.5">
                    <BookOpen className="inline w-4 h-4 mr-1" />Select Subject *
                  </label>
                  <div className="relative">
                    <select
                      id="subject-select"
                      className="input-field w-full appearance-none pr-8"
                      value={selectedSubject}
                      onChange={e => setSelectedSubject(e.target.value)}
                      required
                    >
                      <option value="">Choose subject...</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                <button
                  id="confirm-start-session-btn"
                  type="submit"
                  disabled={creating || !selectedSubject}
                  className="btn-primary flex items-center gap-2 h-11"
                >
                  {creating
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Play className="w-4 h-4" />
                  }
                  Start Session
                </button>
              </form>
              {subjects.length === 0 && (
                <p className="text-slate-500 text-sm mt-3">
                  No subjects assigned to you yet. Ask admin to assign subjects.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['all', 'active', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
              filter === f
                ? 'bg-primary-500/20 border border-primary-500/40 text-primary-400'
                : 'text-slate-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            {f} {f === 'active' && activeSessions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-xs">
                {activeSessions.length}
              </span>
            )}
          </button>
        ))}

        <div className="ml-auto">
          <button
            onClick={fetchSessions}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-700 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-28 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No sessions found</p>
          <p className="text-slate-500 text-sm mt-1">
            {filter === 'active' ? 'No active sessions right now.' : 'Click "Start Session" to begin.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map(session => (
              <SessionCard key={session.id} session={session} onStop={handleStop} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
