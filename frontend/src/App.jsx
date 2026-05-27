import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

// Layout
import DashboardLayout from './components/layout/DashboardLayout'

// Pages — Public
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'

import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import NotFoundPage from './pages/NotFoundPage'

// Pages — Admin
import AdminDashboard from './pages/AdminDashboard'
import AdminTeachers from './pages/AdminTeachers'
import AdminCollegeConfig from './pages/AdminCollegeConfig'
import AdminSubjectManagement from './pages/AdminSubjectManagement'
import AdminBranchesCourses from './pages/AdminBranchesCourses'
import StudentManagement from './pages/StudentManagement'
import ReportsPage from './pages/ReportsPage'

// Pages — Teacher
import TeacherDashboard from './pages/TeacherDashboard'
import TeacherStudentOnboarding from './pages/TeacherStudentOnboarding'
import TeacherSessions from './pages/TeacherSessions'
import TeacherSubjects from './pages/TeacherSubjects'
import AttendancePage from './pages/AttendancePage'

// Pages — Student
import StudentDashboard from './pages/StudentDashboard'
import StudentAttendanceMark from './pages/StudentAttendanceMark'

// Pages — Shared
import ProfilePage from './pages/ProfilePage'

// ─── Route Guards ─────────────────────────────────────────────────────────────

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading IntelliAttend...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    const redirects = { admin: '/admin', teacher: '/teacher', student: '/student' }
    return <Navigate to={redirects[user.role] || '/login'} replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) {
    const redirects = { admin: '/admin', teacher: '/teacher', student: '/student' }
    return <Navigate to={redirects[user.role] || '/'} replace />
  }
  return children
}

// ─── Routes ──────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />

      {/* ── Admin ── */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <DashboardLayout><AdminDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/teachers" element={
        <ProtectedRoute roles={['admin']}>
          <DashboardLayout><AdminTeachers /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/college-config" element={
        <ProtectedRoute roles={['admin']}>
          <DashboardLayout><AdminCollegeConfig /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/students" element={
        <ProtectedRoute roles={['admin']}>
          <DashboardLayout><StudentManagement /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/branches" element={
        <ProtectedRoute roles={['admin']}>
          <DashboardLayout><AdminBranchesCourses /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/subjects" element={
        <ProtectedRoute roles={['admin']}>
          <DashboardLayout><AdminSubjectManagement /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute roles={['admin']}>
          <DashboardLayout><ReportsPage /></DashboardLayout>
        </ProtectedRoute>
      } />

      {/* ── Teacher ── */}
      <Route path="/teacher" element={
        <ProtectedRoute roles={['teacher']}>
          <DashboardLayout><TeacherDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/onboarding" element={
        <ProtectedRoute roles={['teacher', 'admin']}>
          <DashboardLayout><TeacherStudentOnboarding /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/sessions" element={
        <ProtectedRoute roles={['teacher', 'admin']}>
          <DashboardLayout><TeacherSessions /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/subjects" element={
        <ProtectedRoute roles={['teacher']}>
          <DashboardLayout><TeacherSubjects /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/attendance" element={
        <ProtectedRoute roles={['teacher', 'admin']}>
          <DashboardLayout><AttendancePage /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute roles={['teacher', 'admin']}>
          <DashboardLayout><ReportsPage /></DashboardLayout>
        </ProtectedRoute>
      } />

      {/* ── Student ── */}
      <Route path="/student" element={
        <ProtectedRoute roles={['student']}>
          <DashboardLayout><StudentDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/student/mark-attendance" element={
        <ProtectedRoute roles={['student']}>
          <DashboardLayout><StudentAttendanceMark /></DashboardLayout>
        </ProtectedRoute>
      } />

      {/* ── Shared ── */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <DashboardLayout><ProfilePage /></DashboardLayout>
        </ProtectedRoute>
      } />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
