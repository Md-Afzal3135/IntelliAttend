import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach JWT access token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — auto-refresh on 401
API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        if (refresh) {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/refresh/`,
            { refresh }
          )
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return API(original)
        }
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default API

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => API.post('/auth/login/', data),
  register: (data) => API.post('/auth/register/', data),
  logout: (refresh) => API.post('/auth/logout/', { refresh }),
  me: () => API.get('/auth/me/'),
  changePassword: (data) => API.post('/auth/change-password/', data),
  // Use multipart when FormData (avatar upload), JSON otherwise
  updateProfile: (data) => API.patch('/auth/me/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  forgotPassword: (email) => API.post('/auth/forgot-password/', { email }),
  resetPassword: (uid, token, new_password) =>
    API.post('/auth/reset-password/', { uid, token, new_password }),
  validateResetToken: (uid, token) =>
    API.post('/auth/validate-reset-token/', { uid, token }),
}

// ─── Students ────────────────────────────────────────────────────────────────
export const studentsAPI = {
  list: (params) => API.get('/students/', { params }),
  get: (id) => API.get(`/students/${id}/`),
  create: (data) => API.post('/students/', data),
  update: (id, data) => API.patch(`/students/${id}/`, data),
  delete: (id) => API.delete(`/students/${id}/`),
  uploadFaces: (id, formData) => API.post(`/students/${id}/upload-faces/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  clearFaces: (id) => API.delete(`/students/${id}/clear-faces/`),
  myProfile: () => API.get('/students/my-profile/'),
}

// ─── Departments ──────────────────────────────────────────────────────────────
export const departmentsAPI = {
  list: () => API.get('/departments/'),
  create: (data) => API.post('/departments/', data),
  update: (id, data) => API.patch(`/departments/${id}/`, data),
  delete: (id) => API.delete(`/departments/${id}/`),
}

// ─── Courses ──────────────────────────────────────────────────────────────────
export const coursesAPI = {
  list: (params) => API.get('/courses/', { params }),
  create: (data) => API.post('/courses/', data),
  update: (id, data) => API.patch(`/courses/${id}/`, data),
  delete: (id) => API.delete(`/courses/${id}/`),
}

// ─── Subjects ────────────────────────────────────────────────────────────────
export const subjectsAPI = {
  list: (params) => API.get('/subjects/', { params }),
  get: (id) => API.get(`/subjects/${id}/`),
  create: (data) => API.post('/subjects/', data),
  update: (id, data) => API.patch(`/subjects/${id}/`, data),
  delete: (id) => API.delete(`/subjects/${id}/`),
  /** GET /subjects/{id}/students/ — returns SubjectEnrollment-based student list */
  getStudents: (id) => API.get(`/subjects/${id}/students/`),
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceAPI = {
  sessions: {
    list: (params) => API.get('/attendance/sessions/', { params }),
    get: (id) => API.get(`/attendance/sessions/${id}/`),
    create: (data) => API.post('/attendance/sessions/', data),
    markAttendance: (sessionId, data) => API.post(`/attendance/sessions/${sessionId}/mark-attendance/`, data),
    complete: (sessionId) => API.post(`/attendance/sessions/${sessionId}/complete/`),
    exportCSV: (sessionId) => API.get(`/attendance/sessions/${sessionId}/export-csv/`, { responseType: 'blob' }),
    currentQR: (sessionId) => API.get(`/attendance/sessions/${sessionId}/current-qr/`),
  },
  records: {
    list: (params) => API.get('/attendance/records/', { params }),
  },
  stats: () => API.get('/stats/'),
  exportCSV: (params) => API.get('/reports/export-csv/', { params, responseType: 'blob' }),
  recognizeFace: (data) => API.post('/ai/recognize/', data),
}

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersAPI = {
  list: (params) => API.get('/users/', { params }),
}

// ─── Admin — Teacher Management ───────────────────────────────────────────────
export const adminAPI = {
  teachers: {
    list: (params) => API.get('/admin/teachers/', { params }),
    get: (id) => API.get(`/admin/teachers/${id}/`),
    create: (data) => API.post('/admin/teachers/', data),
    update: (id, data) => API.patch(`/admin/teachers/${id}/`, data),
    delete: (id) => API.delete(`/admin/teachers/${id}/`),
  },
  collegeConfig: {
    get: () => API.get('/admin/college-config/'),
    save: (data) => API.put('/admin/college-config/', data),
  },
}

// ─── Student GPS + Face Attendance ────────────────────────────────────────────
export const studentAttendanceAPI = {
  activeSessions: () => API.get('/attendance/active-sessions/'),
  markAttendance: (data) => API.post('/ai/student-mark/', data),
}
