import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, ArrowLeft, Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="relative mb-8">
          <div className="text-[150px] font-heading font-black leading-none gradient-text opacity-20 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
              <Brain className="w-12 h-12 text-primary-400 animate-float" />
            </div>
          </div>
        </div>

        <h1 className="font-heading text-2xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Oops! The page you're looking for doesn't exist or you don't have permission to access it.
        </p>

        <div className="flex gap-3 justify-center">
          <button onClick={() => window.history.back()} className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <Link to="/" className="btn-primary flex items-center gap-2">
            <Home className="w-4 h-4" /> Home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
