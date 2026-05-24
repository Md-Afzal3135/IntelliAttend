"""
IntelliAttend Admin Configuration — Enhanced with Subject Enrollments & College Config
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import (
    User, Department, Course, Student, FaceImage,
    Subject, SubjectEnrollment, AttendanceSession, AttendanceRecord, CollegeConfig
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'get_full_name', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone', 'avatar')}),
        ('Role', {'fields': ('role',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates', {'fields': ('date_joined', 'last_login')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2')}),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'head']
    search_fields = ['name', 'code']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'department', 'duration_years']
    list_filter = ['department']
    search_fields = ['name', 'code']


class FaceImageInline(admin.TabularInline):
    model = FaceImage
    extra = 0
    readonly_fields = ['uploaded_at']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['student_id', 'get_name', 'department', 'course', 'year', 'section', 'face_registered', 'get_subject_count']
    list_filter = ['department', 'course', 'year', 'face_registered']
    search_fields = ['student_id', 'user__first_name', 'user__last_name', 'user__email']
    inlines = [FaceImageInline]

    def get_name(self, obj):
        return obj.user.get_full_name()
    get_name.short_description = 'Name'

    def get_subject_count(self, obj):
        count = obj.enrollments.count()
        return format_html('<span style="color:#4CAF50;font-weight:bold">{} subjects</span>', count)
    get_subject_count.short_description = 'Enrolled In'


# ─── Subject Enrollment Inline ─────────────────────────────────────────────────

class SubjectEnrollmentInline(admin.TabularInline):
    """Show enrolled students directly inside a Subject's admin page."""
    model = SubjectEnrollment
    extra = 1
    autocomplete_fields = ['student']
    readonly_fields = ['enrolled_at']
    verbose_name = "Enrolled Student"
    verbose_name_plural = "Enrolled Students"


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'teacher', 'course', 'credits', 'get_enrolled_count']
    list_filter = ['course', 'teacher']
    search_fields = ['name', 'code']
    inlines = [SubjectEnrollmentInline]

    def get_enrolled_count(self, obj):
        count = obj.enrollments.count()
        return format_html('<span style="color:#2196F3;font-weight:bold">{} students</span>', count)
    get_enrolled_count.short_description = 'Enrolled'


@admin.register(SubjectEnrollment)
class SubjectEnrollmentAdmin(admin.ModelAdmin):
    list_display = ['subject', 'student', 'enrolled_at']
    list_filter = ['subject']
    search_fields = ['student__student_id', 'student__user__first_name', 'subject__name']
    autocomplete_fields = ['student', 'subject']


# ─── Attendance ─────────────────────────────────────────────────────────────────

class AttendanceRecordInline(admin.TabularInline):
    model = AttendanceRecord
    extra = 0
    readonly_fields = ['timestamp']


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ['subject', 'teacher', 'date', 'status', 'get_present', 'get_total']
    list_filter = ['status', 'date', 'subject']
    search_fields = ['subject__name', 'teacher__first_name']
    inlines = [AttendanceRecordInline]

    def get_present(self, obj):
        return obj.records.filter(status='present').count()
    get_present.short_description = 'Present'

    def get_total(self, obj):
        return obj.records.count()
    get_total.short_description = 'Total'


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ['student', 'session', 'status', 'method', 'confidence', 'timestamp']
    list_filter = ['status', 'method']
    search_fields = ['student__student_id', 'student__user__first_name']


# ─── College Configuration ──────────────────────────────────────────────────────

@admin.register(CollegeConfig)
class CollegeConfigAdmin(admin.ModelAdmin):
    list_display = ['college_name', 'latitude', 'longitude', 'radius_meters', 'updated_at', 'updated_by']
    readonly_fields = ['updated_at']

    def has_add_permission(self, request):
        # Only one config row allowed
        return not CollegeConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
