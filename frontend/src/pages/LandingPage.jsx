import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Brain, Zap, Shield, BarChart3, Users, Camera,
  ChevronRight, Star, Check, Github, ArrowRight
} from 'lucide-react'

const features = [
  { icon: Camera, title: 'Real-Time Face Recognition', desc: 'AI-powered webcam attendance marking with 99%+ accuracy using state-of-the-art face_recognition library.' },
  { icon: Shield, title: 'Liveness Detection', desc: 'Advanced anti-spoofing with blink detection and head movement validation to prevent photo-based fraud.' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Beautiful charts, subject-wise breakdowns, attendance trends, and exportable CSV/PDF reports.' },
  { icon: Users, title: 'Role-Based Access', desc: 'Separate dashboards for Admins, Teachers, and Students with tailored features and permissions.' },
  { icon: Zap, title: 'Instant Updates', desc: 'Real-time attendance marking with live camera preview and instant status notifications.' },
  { icon: Brain, title: 'AI-Powered Insights', desc: 'Machine learning models analyze attendance patterns and flag students at risk of low attendance.' },
]

const stats = [
  { value: '99.2%', label: 'Recognition Accuracy' },
  { value: '<1s', label: 'Response Time' },
  { value: '10K+', label: 'Students Tracked' },
  { value: '50+', label: 'Institutions' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-900 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-surface-900/80 backdrop-blur-md border-b border-primary-500/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-glow-sm">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading font-bold text-white">IntelliAttend</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-primary text-sm py-2 px-4">Login</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto relative z-10"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm mb-8">
            <Zap className="w-4 h-4" />
            <span>AI-Powered Attendance for the Modern Era</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="font-heading text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Smart Attendance
            <br />
            <span className="gradient-text">Powered by AI</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Automate attendance tracking with real-time face recognition. No more manual rolls — just look at the camera and attendance is marked instantly.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="btn-primary flex items-center gap-2 justify-center text-base">
              Sign In to Demo <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, i) => (
              <div key={i} className="glass-card p-4 text-center">
                <div className="font-heading text-3xl font-bold gradient-text mb-1">{stat.value}</div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-4xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              A complete attendance management platform with cutting-edge AI capabilities
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div key={i} variants={itemVariants} className="glass-card-hover p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <h3 className="font-heading font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-12"
          >
            <Brain className="w-16 h-16 text-primary-400 mx-auto mb-6 animate-float" />
            <h2 className="font-heading text-3xl font-bold text-white mb-4">
              Ready to Transform Attendance?
            </h2>
            <p className="text-slate-400 mb-8">
              Join thousands of institutions using IntelliAttend for smarter, faster, fraud-proof attendance tracking.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              Sign In <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary-500/10 py-8 px-6 text-center text-slate-500 text-sm">
        <p>© 2025 IntelliAttend. Built with ❤️ using React, Django & AI.</p>
      </footer>
    </div>
  )
}
