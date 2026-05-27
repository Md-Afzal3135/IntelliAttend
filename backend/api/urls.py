"""
IntelliAttend API URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView, MeView, LogoutView, ChangePasswordView,
    ForgotPasswordView, ResetPasswordView, ValidateResetTokenView,
    DepartmentViewSet, CourseViewSet, SubjectViewSet, StudentViewSet,
    AttendanceSessionViewSet, AttendanceRecordViewSet,
    UserListView, attendance_stats, export_attendance_csv, recognize_face,
    # New RBAC + Geofencing views
    CollegeConfigView, TeacherManagementViewSet,
    student_self_mark, active_sessions_for_student,
    seed_database_view, verify_and_mark_attendance,
    ai_health_check,
    # Student Dashboard
    student_dashboard,
)

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'attendance/sessions', AttendanceSessionViewSet, basename='session')
router.register(r'attendance/records', AttendanceRecordViewSet, basename='record')
router.register(r'admin/teachers', TeacherManagementViewSet, basename='teacher-management')

urlpatterns = [
    # Auth
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('auth/validate-reset-token/', ValidateResetTokenView.as_view(), name='validate-reset-token'),

    # Users
    path('users/', UserListView.as_view(), name='user-list'),

    # Analytics
    path('stats/', attendance_stats, name='attendance-stats'),
    path('reports/export-csv/', export_attendance_csv, name='export-csv'),

    # AI
    path('ai/recognize/', recognize_face, name='recognize-face'),
    path('ai/health/', ai_health_check, name='ai-health-check'),

    # Admin — College Config & Teacher Management
    path('admin/college-config/', CollegeConfigView.as_view(), name='college-config'),

    # Student — GPS + Face attendance
    path('ai/student-mark/', student_self_mark, name='student-self-mark'),
    path('attendance/active-sessions/', active_sessions_for_student, name='active-sessions'),
    path('attendance/verify/', verify_and_mark_attendance, name='verify_attendance'),

    # Student Dashboard (subjects + attendance)
    path('student/dashboard/', student_dashboard, name='student-dashboard'),

    # Seed Production Database
    path('seed/', seed_database_view, name='seed-database'),

    # Router (students, departments, courses, subjects, sessions, records, admin/teachers)
    path('', include(router.urls)),
]
