import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin, Save, CheckCircle, AlertTriangle, Info,
  Navigation, Globe, Ruler, RefreshCw
} from 'lucide-react'
import { adminAPI } from '../api'

export default function AdminCollegeConfig() {
  const [config, setConfig] = useState(null)
  const [configured, setConfigured] = useState(false)
  const [form, setForm] = useState({ college_name: '', latitude: '', longitude: '', radius_meters: 100 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await adminAPI.collegeConfig.get()
      if (res.data.configured) {
        setConfigured(true)
        setConfig(res.data)
        setForm({
          college_name: res.data.college_name || '',
          latitude: res.data.latitude,
          longitude: res.data.longitude,
          radius_meters: res.data.radius_meters,
        })
      }
    } catch (e) {
      setError('Failed to load configuration.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConfig() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const payload = {
        college_name: form.college_name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_meters: parseInt(form.radius_meters, 10),
      }
      if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
        setError('Please enter valid decimal coordinates.')
        return
      }
      const res = await adminAPI.collegeConfig.save(payload)
      setConfig(res.data)
      setConfigured(true)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save configuration.')
    } finally {
      setSaving(false)
    }
  }

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }))
        setLocating(false)
      },
      (err) => {
        setError('Could not get location: ' + err.message)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-6 animate-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="page-title">College Location Setup</h1>
        <p className="text-muted mt-1">
          Configure the official GPS coordinates and allowed attendance radius for geofencing
        </p>
      </div>

      {/* Status Banner */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            configured
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}
        >
          {configured ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <div>
            <p className="font-semibold text-sm">
              {configured ? 'Location Configured ✓' : 'Location Not Configured'}
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              {configured
                ? `${config?.college_name || 'College'} · ${config?.latitude}, ${config?.longitude} · ±${config?.radius_meters}m radius`
                : 'Students cannot mark attendance until you set the college GPS coordinates below.'
              }
            </p>
          </div>
        </motion.div>
      )}

      {/* Config Form */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">GPS Configuration</h2>
            <p className="text-slate-500 text-xs">Set the campus center point and attendance boundary</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-12 rounded-xl" />)}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> Configuration saved successfully!
              </div>
            )}

            {/* College Name */}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                <Globe className="inline w-4 h-4 mr-1 -mt-0.5" />College / Institution Name
              </label>
              <input
                id="college-name"
                className="input-field w-full"
                value={form.college_name}
                onChange={e => setForm(f => ({ ...f, college_name: e.target.value }))}
                placeholder="e.g. ABC Engineering College"
              />
            </div>

            {/* GPS Coordinates */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-slate-400">
                  <Navigation className="inline w-4 h-4 mr-1 -mt-0.5" />GPS Coordinates
                </label>
                <button
                  type="button"
                  id="use-my-location-btn"
                  onClick={handleGetMyLocation}
                  disabled={locating}
                  className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {locating
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Locating...</>
                    : <><MapPin className="w-3.5 h-3.5" /> Use My Location</>
                  }
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Latitude</label>
                  <input
                    id="latitude-input"
                    className="input-field w-full"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                    required
                    placeholder="e.g. 12.9716"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Longitude</label>
                  <input
                    id="longitude-input"
                    className="input-field w-full"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                    required
                    placeholder="e.g. 77.5946"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Find coordinates: Google Maps → Right-click campus → Copy coordinates
              </p>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                <Ruler className="inline w-4 h-4 mr-1 -mt-0.5" />Allowed Radius (meters)
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="radius-input"
                  className="input-field w-40"
                  type="number"
                  min="10"
                  max="5000"
                  value={form.radius_meters}
                  onChange={e => setForm(f => ({ ...f, radius_meters: e.target.value }))}
                  required
                />
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={form.radius_meters}
                  onChange={e => setForm(f => ({ ...f, radius_meters: e.target.value }))}
                  className="flex-1 accent-primary-500"
                />
                <span className="text-primary-400 font-semibold text-sm min-w-[60px]">
                  {form.radius_meters}m
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 mt-1.5">
                <span>10m (strict)</span>
                <span>100m (recommended)</span>
                <span>1000m (loose)</span>
              </div>
            </div>

            {/* Map Preview hint */}
            {form.latitude && form.longitude && (
              <div className="p-3 rounded-xl bg-surface-700/50 border border-primary-500/10">
                <p className="text-xs text-slate-400 mb-2">📍 Preview on map</p>
                <a
                  href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}&z=18`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 text-sm underline"
                >
                  View {form.latitude}, {form.longitude} in Google Maps →
                </a>
              </div>
            )}

            <div className="pt-2">
              <button
                id="save-college-config-btn"
                type="submit"
                disabled={saving}
                className="btn-primary w-full sm:w-auto flex items-center gap-2 px-8 justify-center"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save className="w-4 h-4" />
                }
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Info Card */}
      <div className="glass-card p-6 border-l-4 border-primary-500">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-primary-400" /> How Geofencing Works
        </h3>
        <ul className="space-y-2 text-slate-400 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary-400 mt-0.5">1.</span>
            When a student marks attendance, their device's GPS coordinates are captured
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-400 mt-0.5">2.</span>
            The backend calculates the distance using the <strong className="text-white">Haversine Formula</strong>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-400 mt-0.5">3.</span>
            If distance &gt; allowed radius → access denied with "Out of Campus Range" error
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-400 mt-0.5">4.</span>
            If within radius → face recognition camera activates → attendance marked
          </li>
        </ul>
      </div>
    </div>
  )
}
