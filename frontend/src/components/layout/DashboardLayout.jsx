import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  BarChart3, Settings, LogOut, Menu, X, ChevronRight,
  Brain, Bell, Sun, Moon, UserCircle, GraduationCap,
  Camera, FileText, UserPlus, MapPin, Play, Shield, Navigation,
  Building2
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import toast from 'react-hot-toast'

const adminNav = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/teachers', icon: Shield, label: 'Manage Teachers' },
  { path: '/admin/branches', icon: Building2, label: 'Branches & Courses' },
  { path: '/admin/subjects', icon: BookOpen, label: 'Subjects' },
  { path: '/admin/college-config', icon: MapPin, label: 'College Location' },
  { path: '/admin/students', icon: Users, label: 'Students' },
  { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { path: '/profile', icon: Settings, label: 'Settings' },
]

const teacherNav = [
  { path: '/teacher', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/teacher/sessions', icon: Play, label: 'Sessions' },
  { path: '/teacher/subjects', icon: BookOpen, label: 'My Subjects' },
  { path: '/attendance', icon: Camera, label: 'Face Attendance' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/profile', icon: Settings, label: 'Settings' },
]

const studentNav = [
  { path: '/student', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/student/mark-attendance', icon: Navigation, label: 'Mark Attendance' },
  { path: '/profile', icon: UserCircle, label: 'My Profile' },
]

const roleNavMap = { admin: adminNav, teacher: teacherNav, student: studentNav }
const roleBadgeMap = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  teacher: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  student: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = roleNavMap[user?.role] || []

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path
    return location.pathname.startsWith(item.path)
  }

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-primary-500/10">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-glow-sm">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <span className="font-heading font-bold text-white text-lg leading-none">IntelliAttend</span>
              <p className="text-xs text-slate-500 mt-0.5">AI Attendance System</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Info */}
      <div className={`px-4 py-4 border-b border-primary-500/10 ${sidebarOpen ? '' : 'flex justify-center'}`}>
        <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'flex-col'}`}>
          {user?.avatar ? (
            <img src={user.avatar} alt="avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-primary-500/30 flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
          )}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0"
              >
                <p className="text-white text-sm font-semibold truncate">{user?.full_name || user?.email}</p>
                <span className={`badge border text-xs ${roleBadgeMap[user?.role]}`}>
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={active ? 'nav-item-active' : 'nav-item'}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {active && sidebarOpen && (
                <ChevronRight className="w-4 h-4 ml-auto text-primary-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-primary-500/10">
        <button
          onClick={handleLogout}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          title={!sidebarOpen ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full bg-surface-800/90 backdrop-blur-md border-r border-primary-500/10 z-40 overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 h-full w-64 bg-surface-800 border-r border-primary-500/10 z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.div
        animate={{ marginLeft: sidebarOpen ? '260px' : '72px' }}
        transition={{ duration: 0.3 }}
        className="hidden lg:block flex-1 min-h-screen"
      >
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-surface-800/80 backdrop-blur-md border-b border-primary-500/10">
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className="btn-ghost p-2 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="btn-ghost p-2 rounded-lg">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="btn-ghost p-2 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
            </button>
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar"
                  className="w-8 h-8 rounded-full object-cover border border-primary-500/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </motion.div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-surface-800/90 backdrop-blur-md border-b border-primary-500/10">
          <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary-400" />
            <span className="font-heading font-bold text-white text-sm">IntelliAttend</span>
          </div>
          <button onClick={toggleTheme} className="btn-ghost p-2">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>
        <main className="flex-1 p-4">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
