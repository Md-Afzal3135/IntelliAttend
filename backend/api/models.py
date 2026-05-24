"""
IntelliAttend API Models

Defines all database models:
- User (custom, role-based)
- Department, Course, Subject
- Student, FaceImage, SubjectEnrollment
- AttendanceSession, AttendanceRecord
- CollegeConfig
"""
import uuid
from datetime import date
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('teacher', 'Teacher'),
        ('student', 'Student'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    head = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='headed_departments')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='courses')
    duration_years = models.PositiveIntegerField(default=4)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class Student(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    student_id = models.CharField(max_length=50, unique=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='students')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, related_name='students')
    year = models.PositiveIntegerField(default=1)
    section = models.CharField(max_length=10, default='A')
    roll_number = models.CharField(max_length=50, blank=True)
    face_encodings = models.JSONField(default=list, blank=True)  # List of 128-d face encoding arrays
    face_registered = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.student_id})"


class FaceImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='face_images')
    image = models.ImageField(upload_to='faces/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Face image for {self.student}"


class Subject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20)
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='taught_subjects')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='subjects')
    credits = models.PositiveIntegerField(default=3)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['code', 'course']

    def __str__(self):
        return f"{self.name} ({self.code})"

    def get_enrolled_students(self):
        """Return queryset of Students enrolled in this subject."""
        return Student.objects.filter(enrollments__subject=self)


class SubjectEnrollment(models.Model):
    """
    Explicit Many-to-Many between Subject and Student.
    Tracks which students are enrolled in which subjects.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='enrollments')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['subject', 'student']
        ordering = ['student__user__first_name']

    def __str__(self):
        return f"{self.student} enrolled in {self.subject}"


class AttendanceSession(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='sessions')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    date = models.DateField(default=date.today)
    start_time = models.TimeField(auto_now_add=True)
    end_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    notes = models.TextField(blank=True)
    
    # QR TOTP Logic
    qr_secret_seed = models.CharField(max_length=64, blank=True, help_text="Secret seed for generating rotating QR codes")
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-start_time']

    def __str__(self):
        return f"{self.subject} - {self.date}"


class AttendanceRecord(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
    ]
    METHOD_CHOICES = [
        ('face', 'Face Recognition'),
        ('manual', 'Manual'),
        ('qr', 'QR Code'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name='records')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='absent')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='manual')
    confidence = models.FloatField(null=True, blank=True)  # Face recognition confidence
    
    # Geofencing
    scanned_lat = models.FloatField(null=True, blank=True, help_text="Latitude captured during scan")
    scanned_long = models.FloatField(null=True, blank=True, help_text="Longitude captured during scan")
    
    timestamp = models.DateTimeField(auto_now_add=True)
    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='marked_records')

    class Meta:
        unique_together = ['session', 'student']
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.student} - {self.session} - {self.status}"


class CollegeConfig(models.Model):
    """
    Singleton model for college GPS configuration.
    Admin sets the college's official coordinates and the allowed attendance radius.
    Only one row should exist — access via CollegeConfig.get_config().
    """
    latitude = models.FloatField(help_text="College latitude (decimal degrees)")
    longitude = models.FloatField(help_text="College longitude (decimal degrees)")
    radius_meters = models.IntegerField(
        default=100,
        help_text="Permitted radius in meters within which attendance can be marked"
    )
    college_name = models.CharField(max_length=200, blank=True, default='My College')
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='config_updates'
    )

    class Meta:
        verbose_name = 'College Configuration'
        verbose_name_plural = 'College Configuration'

    def __str__(self):
        return f"CollegeConfig: {self.college_name} ({self.latitude}, {self.longitude}) ±{self.radius_meters}m"

    @classmethod
    def get_config(cls):
        """Return the single config row, or None if not configured yet."""
        return cls.objects.first()
