import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, Camera, CameraOff, RotateCcw, Check, AlertTriangle,
  User, Mail, Phone, BookOpen, Hash, ChevronDown, Loader
} from 'lucide-react'
import { studentsAPI, departmentsAPI, coursesAPI } from '../api'

const STEP_FORM = 'form'
const STEP_CAMERA = 'camera'
const STEP_PREVIEW = 'preview'
const STEP_SUCCESS = 'success'

const EMPTY_FORM = {
  first_name: '', last_name: '', email: '', password: 'Student@123',
  student_id: '', roll_number: '', year: '1', section: 'A',
  department_id: '', course_id: '',
}

export default function TeacherStudentOnboarding() {
  const [step, setStep] = useState(STEP_FORM)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])
  const [capturedImage, setCapturedImage] = useState(null) // base64
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdStudent, setCreatedStudent] = useState(null)
  const [cameraError, setCameraError] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Load departments
  useEffect(() => {
    departmentsAPI.list().then(r => setDepartments(r.data.results || r.data)).catch(() => {})
  }, [])

  // Load courses when department changes
  useEffect(() => {
    if (form.department_id) {
      coursesAPI.list({ department: form.department_id })
        .then(r => setCourses(r.data.results || r.data))
        .catch(() => setCourses([]))
    } else {
      setCourses([])
    }
  }, [form.department_id])

  // Start camera when entering camera step
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
      setCameraError('Could not access camera: ' + err.message)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (step === STEP_CAMERA) startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [step, startCamera, stopCamera])

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl)
    setStep(STEP_PREVIEW)
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!form.department_id || !form.course_id) {
      setError('Please select a department and course.')
      return
    }
    setStep(STEP_CAMERA)
  }

  const handleFinalSubmit = async () => {
    if (!capturedImage) return
    setSubmitting(true)
    setError('')
    try {
      // Step 1: Create student account
      const studentRes = await studentsAPI.create({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        student_id: form.student_id,
        roll_number: form.roll_number,
        year: parseInt(form.year),
        section: form.section,
        department_id: form.department_id,
        course_id: form.course_id,
      })
      const student = studentRes.data
      setCreatedStudent(student)

      // Step 2: Upload face photo for encoding
      // Send the full data-URL (including 'data:image/jpeg;base64,' prefix) — ai_service strips it
      const blob = await (await fetch(capturedImage)).blob()
      const formData = new FormData()
      formData.append('images', new File([blob], 'face.jpg', { type: 'image/jpeg' }))
      await studentsAPI.uploadFaces(student.id, formData)

      setStep(STEP_SUCCESS)
    } catch (err) {
      const data = err.response?.data
      const status = err.response?.status

      // 422 from ai_service = no face detected — show bilingual message
      if (status === 422 && data?.detail) {
        setError(data.detail)
      } else if (data?.email) {
        setError('Email: ' + data.email[0])
      } else if (data?.student_id) {
        setError('Student ID: ' + data.student_id[0])
      } else if (data?.detail) {
        setError(data.detail)
      } else {
        setError('Failed to register student. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm({ ...EMPTY_FORM })
    setCapturedImage(null)
    setCreatedStudent(null)
    setError('')
    setStep(STEP_FORM)
  }

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="space-y-6 animate-in max-w-3xl">
      <div>
        <h1 className="page-title">Student Onboarding</h1>
        <p className="text-muted mt-1">Register a new student and capture their face for attendance recognition</p>
      </div>

      {/* Progress Steps */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-surface-700 -translate-y-1/2 z-0" />
          {[
            { id: STEP_FORM, label: 'Student Details', icon: User },
            { id: STEP_CAMERA, label: 'Capture Face', icon: Camera },
            { id: STEP_PREVIEW, label: 'Confirm Photo', icon: Check },
            { id: STEP_SUCCESS, label: 'Registered!', icon: Check },
          ].map((s, i) => {
            const steps = [STEP_FORM, STEP_CAMERA, STEP_PREVIEW, STEP_SUCCESS]
            const current = steps.indexOf(step)
            const this_i = steps.indexOf(s.id)
            const done = current > this_i
            const active = current === this_i
            const Icon = s.icon
            return (
              <div key={s.id} className="flex flex-col items-center z-10 gap-1.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  done ? 'bg-emerald-500 border-emerald-500'
                    : active ? 'bg-primary-500 border-primary-500'
                    : 'bg-surface-800 border-surface-600'
                }`}>
                  <Icon className={`w-4 h-4 ${done || active ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <span className={`text-xs hidden sm:block ${active ? 'text-white font-semibold' : done ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* STEP 1: Form */}
      {step === STEP_FORM && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">First Name *</label>
                <input className="input-field w-full" value={form.first_name} onChange={f('first_name')} required placeholder="Jane" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Last Name *</label>
                <input className="input-field w-full" value={form.last_name} onChange={f('last_name')} required placeholder="Doe" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5"><Mail className="inline w-4 h-4 mr-1 -mt-0.5" />Email *</label>
              <input type="email" className="input-field w-full" value={form.email} onChange={f('email')} required placeholder="student@college.edu" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5"><Hash className="inline w-4 h-4 mr-1 -mt-0.5" />Student ID *</label>
                <input className="input-field w-full" value={form.student_id} onChange={f('student_id')} required placeholder="STU2024001" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Roll Number</label>
                <input className="input-field w-full" value={form.roll_number} onChange={f('roll_number')} placeholder="A01" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5"><BookOpen className="inline w-4 h-4 mr-1 -mt-0.5" />Department *</label>
              <div className="relative">
                <select
                  className="input-field w-full appearance-none pr-8"
                  value={form.department_id}
                  onChange={f('department_id')}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Course *</label>
              <div className="relative">
                <select
                  className="input-field w-full appearance-none pr-8"
                  value={form.course_id}
                  onChange={f('course_id')}
                  required
                  disabled={!form.department_id}
                >
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Year *</label>
                <select className="input-field w-full" value={form.year} onChange={f('year')} required>
                  {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Section</label>
                <input className="input-field w-full" value={form.section} onChange={f('section')} placeholder="A" maxLength={5} />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Default Password</label>
              <input className="input-field w-full" value={form.password} onChange={f('password')} placeholder="Min 8 characters" minLength={8} />
              <p className="text-xs text-slate-600 mt-1">Student can change this after first login</p>
            </div>

            <button id="proceed-to-camera-btn" type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" /> Proceed to Face Capture →
            </button>
          </form>
        </motion.div>
      )}

      {/* STEP 2: Camera */}
      {step === STEP_CAMERA && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-white">Face Capture</h2>
            <p className="text-slate-400 text-sm mt-1">
              Ask <span className="text-primary-400 font-semibold">{form.first_name} {form.last_name}</span> to look directly at the camera
            </p>
          </div>

          {cameraError ? (
            <div className="flex flex-col items-center py-12 text-red-400 gap-3">
              <CameraOff className="w-16 h-16 opacity-50" />
              <p className="text-sm">{cameraError}</p>
              <button onClick={startCamera} className="btn-secondary">Retry Camera</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-surface-900 aspect-video max-h-[400px] mx-auto" style={{ maxWidth: 480 }}>
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-60 rounded-full border-2 border-primary-500/60 border-dashed" />
                </div>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                  <div className="px-3 py-1 rounded-full bg-black/60 text-white text-xs flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Live Camera
                  </div>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-3 justify-center">
                <button onClick={() => setStep(STEP_FORM)} className="btn-secondary flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Back
                </button>
                <button id="capture-photo-btn" onClick={capturePhoto} className="btn-primary flex items-center gap-2 px-8">
                  <Camera className="w-4 h-4" /> Capture Photo
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* STEP 3: Preview */}
      {step === STEP_PREVIEW && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="text-center mb-5">
            <h2 className="text-lg font-bold text-white">Confirm Photo</h2>
            <p className="text-slate-400 text-sm mt-1">Is the face clearly visible? If not, retake.</p>
          </div>

          <div className="flex justify-center mb-5">
            <div className="relative rounded-2xl overflow-hidden border-2 border-primary-500/40" style={{ maxWidth: 320 }}>
              <img src={capturedImage} alt="Captured face" className="w-full" />
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setCapturedImage(null); setStep(STEP_CAMERA) }}
              className="btn-secondary flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Retake
            </button>
            <button
              id="confirm-register-btn"
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="btn-primary flex items-center gap-2 px-8"
            >
              {submitting
                ? <><Loader className="w-4 h-4 animate-spin" /> Registering...</>
                : <><Check className="w-4 h-4" /> Register Student</>
              }
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 4: Success */}
      {step === STEP_SUCCESS && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-6"
          >
            <Check className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white font-heading mb-2">Student Registered!</h2>
          <p className="text-slate-400 mb-1">
            <span className="text-white font-semibold">{createdStudent?.user?.full_name || `${form.first_name} ${form.last_name}`}</span> has been successfully registered
          </p>
          <p className="text-slate-500 text-sm mb-8">Face embedding captured and stored for attendance recognition.</p>

          {capturedImage && (
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500/50">
                <img src={capturedImage} alt="Registered face" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={handleReset} className="btn-primary flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Register Another Student
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
