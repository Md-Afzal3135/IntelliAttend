import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import clsx from 'clsx'

export default function StatCard({ title, value, icon: Icon, color = 'primary', trend, trendValue, subtitle, loading }) {
  const colorMap = {
    primary: 'from-primary-500/20 to-primary-600/10 border-primary-500/30 text-primary-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
  }
  const colors = colorMap[color] || colorMap.primary

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="shimmer h-4 w-24 rounded mb-4" />
        <div className="shimmer h-8 w-16 rounded mb-2" />
        <div className="shimmer h-3 w-32 rounded" />
      </div>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="glass-card-hover p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted mb-1">{title}</p>
          <h3 className="text-3xl font-bold font-heading text-white mb-1">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          {trendValue !== undefined && (
            <div className={clsx('flex items-center gap-1 mt-2 text-xs font-medium',
              trend === 'up' ? 'text-emerald-400' : 'text-red-400'
            )}>
              {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={clsx('w-12 h-12 rounded-xl bg-gradient-to-br border flex items-center justify-center', colors)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  )
}
