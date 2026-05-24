import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Camera, CameraOff, CheckCircle, XCircle, AlertTriangle,
  Navigation, RefreshCw, ChevronDown, Loader, Shield, WifiOff
} from 'lucide-react'
import { studentAttendanceAPI } from '../api'

const STATUS = {
  IDLE: 'idle',
  LOCATING: 'locating',
  LOCATION_OK: 'location_ok',
  LOCATION_DENIED: 'location_denied',
  OUT_OF_RANGE: 'out_of_range',
  CAMERA: 'camera',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FACE_FAIL: 'face_fail',
  ERROR: 'error',
}

export default function StudentAttendanceMark() {
  const [statusState, setStatus] = useState(STATUS.IDLE)
  const [activeSessions, setActiveSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState('')
  const [gpsCoords, setGpsCoords] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successData, setSuccessData] = useState(null)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [qrCode, setQrCode] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const countdownRef = useRef(null)

  // Fetch active sessions
  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      const res = await studentAttendanceAPI.activeSessions()
      const sessions = res.data.sessions || []
      setActiveSessions(sessions)
      if (sessions.length === 1) setSelectedSession(sessions[0].id)
    } catch {
      setActiveSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => { loadSessions() }, [])

  // Camera helpers
  const startCamera = useCallback(async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err) {
      setCameraError('Camera access denied: ' + err.message)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (countdownRef.current) clearInterval(countdownRef.current)
  }, [])

  useEffect(() => {
    if (statusState === STATUS.CAMERA) startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [statusState, startCamera, stopCamera])

  // Step 1: Get GPS location
  const handleGetLocation = () => {
    setStatus(STATUS.LOCATING)
    setErrorMsg('')

    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.')
      setStatus(STATUS.ERROR)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setStatus(STATUS.LOCATION_OK)
      },
      (err) => {
        if (err.code === 1) {
          setStatus(STATUS.LOCATION_DENIED)
          setErrorMsg('Location permission denied. Please allow location access in your browser settings.')
        } else {
          setStatus(STATUS.ERROR)
          setErrorMsg('Could not get your location: ' + err.message)
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  // Step 2: Open camera
  const handleOpenCamera = () => {
    if (!selectedSession) {
      setErrorMsg('Please select an active session.')
      return
    }
    setErrorMsg('')
    setStatus(STATUS.CAMERA)
    // Start 3-second auto-capture countdown
    let ct = 3
    setCountdown(ct)
    countdownRef.current = setInterval(() => {
      ct -= 1
      setCountdown(ct)
      if (ct <= 0) {
        clearInterval(countdownRef.current)
        setCountdown(null)
        captureAndSubmit()
      }
    }, 1000)
  }

  const captureAndSubmit = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    const frame = canvas.toDataURL('image/jpeg', 0.85)

    setStatus(STATUS.PROCESSING)
    stopCamera()

    try {
      const res = await studentAttendanceAPI.markAttendance({
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        session_id: selectedSession,
        frame,
        qr_data: qrCode.trim(),
      })
      setSuccessData(res.data)
      setStatus(STATUS.SUCCESS)
    } catch (err) {
      const data = err.response?.data
      const code = err.response?.status

      if (code === 403 && data?.error === 'Out of Campus Range') {
        setErrorMsg(data.detail || 'You are outside the campus boundary.')
        setStatus(STATUS.OUT_OF_RANGE)
      } else if (code === 401 && data?.recognized === false) {
        setErrorMsg(data.detail || 'Face not recognized. Please try again in good lighting.')
        setStatus(STATUS.FACE_FAIL)
      } else if (code === 409) {
        setErrorMsg(data?.error || 'You have already marked attendance for this session.')
        setStatus(STATUS.SUCCESS)
        setSuccessData({ already_marked: true, message: data?.error })
      } else if (code === 503) {
        setErrorMsg(data?.error || 'Face recognition service offline. Contact admin.')
        setStatus(STATUS.ERROR)
      } else {
        setErrorMsg(data?.error || data?.detail || 'An unexpected error occurred. Please try again.')
        setStatus(STATUS.ERROR)
      }
    }
  }

  const handleReset = () => {
    stopCamera()
    setStatus(STATUS.IDLE)
    setGpsCoords(null)
    setErrorMsg('')
    setSuccessData(null)
    setCountdown(null)
    setQrCode('')
    loadSessions()
  }

  const handleRetryCamera = () => {
    setStatus(STATUS.CAMERA)
    setErrorMsg('')
    let ct = 3
    setCountdown(ct)
    countdownRef.current = setInterval(() => {
      ct -= 1
      setCountdown(ct)
      if (ct <= 0) {
        clearInterval(countdownRef.current)
        setCountdown(null)
        captureAndSubmit()
      }
    }, 1000)
  }

  return (
    <div className="min-h-screen-safe max-w-lg mx-auto space-y-4 animate-in px-0 sm:px-4">
      {/* Header */}
      <div className="px-4 sm:px-0 pt-2">
        <h1 className="page-title">Mark Attendance</h1>
        <p className="text-muted mt-1 text-sm">GPS-verified face attendance — must be on campus</p>
      </div>

      {/* Main Card */}
      <div className="glass-card rounded-2xl overflow-hidden">

        {/* ─ IDLE ─ */}
        {statusState === STATUS.IDLE && (
          <div className="p-6 space-y-5">
            {/* Session Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-400">Active Session</label>
                <button onClick={loadSessions} disabled={loadingSessions} className="text-xs text-primary-400 flex items-center gap-1">
                  <RefreshCw className={`w-3 h-3 ${loadingSessions ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              {loadingSessions ? (
                <div className="shimmer h-11 rounded-xl" />
              ) : activeSessions.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  No active sessions right now. Wait for your teacher to start a session.
                </div>
              ) : (
                <div className="relative">
                  <select
                    id="session-select"
                    className="input-field w-full appearance-none pr-8"
                    value={selectedSession}
                    onChange={e => setSelectedSession(e.target.value)}
                  >
                    <option value="">Select a session...</option>
                    {activeSessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.subject_name} ({s.subject_code}) — {s.teacher_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Steps Info */}
            <div className="space-y-3">
              {[
                { icon: Navigation, color: 'primary', title: 'Verify Location', desc: 'We\'ll check if you\'re on campus' },
                { icon: Camera, color: 'violet', title: 'Face Scan', desc: 'Front camera opens for recognition' },
                { icon: CheckCircle, color: 'emerald', title: 'Attendance Marked', desc: 'Instantly recorded in the system' },
              ].map((step, i) => {
                const Icon = step.icon
                const colors = { primary: 'bg-primary-500/20 text-primary-400', violet: 'bg-violet-500/20 text-violet-400', emerald: 'bg-emerald-500/20 text-emerald-400' }
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-700/30">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[step.color]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{step.title}</p>
                      <p className="text-slate-500 text-xs">{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              id="start-attendance-btn"
              onClick={handleGetLocation}
              disabled={activeSessions.length === 0 || !selectedSession}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MapPin className="w-5 h-5" /> Mark My Attendance
            </button>
          </div>
        )}

        {/* ─ LOCATING ─ */}
        {statusState === STATUS.LOCATING && (
          <div className="p-10 flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary-500/20 border-2 border-primary-500/40 flex items-center justify-center relative">
              <Navigation className="w-8 h-8 text-primary-400" />
              <div className="absolute inset-0 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Getting Your Location</p>
              <p className="text-slate-400 text-sm mt-1">Please allow location access when prompted...</p>
            </div>
          </div>
        )}

        {/* ─ LOCATION OK — ready for camera ─ */}
        {statusState === STATUS.LOCATION_OK && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Location Verified ✓</p>
                <p className="text-xs opacity-80 mt-0.5">
                  {gpsCoords?.lat.toFixed(5)}, {gpsCoords?.lng.toFixed(5)}
                  {gpsCoords?.accuracy && ` · ±${Math.round(gpsCoords.accuracy)}m accuracy`}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
              <Camera className="w-8 h-8 text-violet-400 mx-auto mb-2" />
              <p className="text-white font-semibold text-sm">Face Verification Next</p>
              <p className="text-slate-400 text-xs mt-1">
                Camera will open and auto-capture in 3 seconds.
                Ensure good lighting and look directly at the camera.
              </p>
            </div>

            <button
              id="open-camera-btn"
              onClick={handleOpenCamera}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              <Camera className="w-5 h-5" /> Open Camera & Capture
            </button>
            <button onClick={handleReset} className="btn-secondary w-full">Cancel</button>
          </div>
        )}

        {/* ─ CAMERA ─ */}
        {statusState === STATUS.CAMERA && (
          <div className="p-4 space-y-4">
            <div className="text-center">
              <p className="text-white font-semibold">Look directly at the camera</p>
              <p className="text-slate-400 text-sm">Auto-capturing in...</p>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-surface-900 aspect-[4/3] max-h-[320px] mx-auto">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-red-400">
                  <CameraOff className="w-12 h-12 opacity-50" />
                  <p className="text-sm text-center px-4">{cameraError}</p>
                </div>
              ) : (
                <>
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                  {/* Oval face guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-36 h-48 rounded-full border-2 border-primary-500/70 border-dashed" />
                  </div>
                  {/* Countdown */}
                  {countdown !== null && (
                    <div className="absolute top-3 right-3 w-12 h-12 rounded-full bg-black/70 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">{countdown}</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                    <div className="px-3 py-1 rounded-full bg-black/60 text-white text-xs flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Live
                    </div>
                  </div>
                </>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <button
              id="manual-capture-btn"
              onClick={() => {
                if (countdownRef.current) { clearInterval(countdownRef.current); setCountdown(null) }
                captureAndSubmit()
              }}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Capture Now
            </button>
          </div>
        )}

        {/* ─ PROCESSING ─ */}
        {statusState === STATUS.PROCESSING && (
          <div className="p-10 flex flex-col items-center text-center gap-4">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-primary-500 animate-spin" />
              <Shield className="w-8 h-8 text-primary-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Verifying Identity</p>
              <p className="text-slate-400 text-sm mt-1">Running face recognition...</p>
            </div>
          </div>
        )}

        {/* ─ SUCCESS ─ */}
        {statusState === STATUS.SUCCESS && (
          <div className="p-8 text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
              className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto"
            >
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-white font-heading">
                {successData?.already_marked ? 'Already Marked!' : 'Attendance Marked!'}
              </h2>
              <p className="text-slate-400 mt-2 text-sm">
                {successData?.message || `Marked Present for ${successData?.subject}`}
              </p>
            </div>
            {successData && !successData.already_marked && (
              <div className="grid grid-cols-2 gap-3 text-left">
                {successData.subject && (
                  <div className="p-3 rounded-xl bg-surface-700/50">
                    <p className="text-slate-500 text-xs">Subject</p>
                    <p className="text-white text-sm font-semibold">{successData.subject}</p>
                  </div>
                )}
                {successData.distance_meters !== undefined && (
                  <div className="p-3 rounded-xl bg-surface-700/50">
                    <p className="text-slate-500 text-xs">Distance from Campus</p>
                    <p className="text-emerald-400 text-sm font-semibold">{successData.distance_meters}m</p>
                  </div>
                )}
                {successData.confidence && (
                  <div className="p-3 rounded-xl bg-surface-700/50">
                    <p className="text-slate-500 text-xs">Face Confidence</p>
                    <p className="text-primary-400 text-sm font-semibold">{Math.round(successData.confidence * 100)}%</p>
                  </div>
                )}
                {successData.session_date && (
                  <div className="p-3 rounded-xl bg-surface-700/50">
                    <p className="text-slate-500 text-xs">Date</p>
                    <p className="text-white text-sm font-semibold">{successData.session_date}</p>
                  </div>
                )}
              </div>
            )}
            <button onClick={handleReset} className="btn-primary w-full mt-2">Done</button>
          </div>
        )}

        {/* ─ OUT OF RANGE ─ */}
        {statusState === STATUS.OUT_OF_RANGE && (
          <div className="p-8 text-center space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
              className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto"
            >
              <MapPin className="w-10 h-10 text-red-400" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-white font-heading">Out of Campus Range</h2>
              <p className="text-slate-400 mt-2 text-sm">{errorMsg}</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              Attendance can only be marked from within the college campus boundary.
              Please move closer to campus and try again.
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">Try Again</button>
          </div>
        )}

        {/* ─ FACE FAIL ─ */}
        {statusState === STATUS.FACE_FAIL && (
          <div className="p-8 text-center space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
              className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mx-auto"
            >
              <XCircle className="w-10 h-10 text-amber-400" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-white font-heading">Face Not Recognized</h2>
              <p className="text-slate-400 mt-2 text-sm">{errorMsg}</p>
            </div>
            <ul className="text-left text-slate-400 text-sm space-y-1.5 p-4 rounded-xl bg-surface-700/50">
              <li>✓ Ensure the area is well-lit (natural or direct light)</li>
              <li>✓ Remove glasses or face coverings if possible</li>
              <li>✓ Look directly at the camera</li>
              <li>✓ Hold the device at eye level</li>
            </ul>
            <div className="flex gap-3">
              <button onClick={handleReset} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleRetryCamera} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          </div>
        )}

        {/* ─ LOCATION DENIED / ERROR ─ */}
        {(statusState === STATUS.LOCATION_DENIED || statusState === STATUS.ERROR) && (
          <div className="p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto">
              {statusState === STATUS.LOCATION_DENIED
                ? <Navigation className="w-10 h-10 text-red-400" />
                : <WifiOff className="w-10 h-10 text-red-400" />
              }
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-heading">
                {statusState === STATUS.LOCATION_DENIED ? 'Location Denied' : 'Error Occurred'}
              </h2>
              <p className="text-slate-400 mt-2 text-sm">{errorMsg}</p>
            </div>
            {statusState === STATUS.LOCATION_DENIED && (
              <p className="text-slate-500 text-xs">
                On iOS: Settings → Safari → Location → Allow.<br />
                On Android: Browser → Site Settings → Location → Allow.
              </p>
            )}
            <button onClick={handleReset} className="btn-secondary w-full">Go Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
