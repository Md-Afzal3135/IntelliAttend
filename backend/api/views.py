"""
IntelliAttend API Views
"""
import csv
import io
import math
import os
import time
import requests
from datetime import date, timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import viewsets, status, generics, parsers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    Department, Course, Student, FaceImage,
    Subject, SubjectEnrollment, AttendanceSession, AttendanceRecord, CollegeConfig
)
from .permissions import IsAdmin, IsAdminOrTeacher, IsAdminOrReadOnly, IsStudent
from .serializers import (
    UserRegistrationSerializer, UserSerializer, UserProfileUpdateSerializer,
    ChangePasswordSerializer, DepartmentSerializer, CourseSerializer,
    SubjectSerializer, StudentListSerializer, StudentDetailSerializer,
    FaceImageSerializer, AttendanceSessionSerializer,
    AttendanceSessionListSerializer, AttendanceRecordSerializer,
    CollegeConfigSerializer, TeacherListSerializer, TeacherCreateSerializer
)

User = get_user_model()



# ─── JWT Custom Claims ───────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['name'] = user.get_full_name()
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        request = self.context.get('request')
        avatar_url = request.build_absolute_uri(user.avatar.url) if (user.avatar and request) else None
        data['user'] = {
            'id': str(user.id),
            'email': user.email,
            'full_name': user.get_full_name(),
            'role': user.role,
            'avatar': avatar_url,
            'avatar_url': avatar_url,
        }
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


# ─── Auth Views ──────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Registration successful',
            'user': UserSerializer(user, context={'request': request}).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)

class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    # Accept both JSON and multipart (for avatar file upload)
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserSerializer
        return UserProfileUpdateSerializer

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True  # Always allow partial updates
        return super().update(request, *args, **kwargs)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully'})


class ForgotPasswordView(APIView):
    """Send password reset email."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal whether email exists — always 200
            return Response({'message': 'If this email is registered, a reset link has been sent.'})

        uid   = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

        try:
            send_mail(
                subject='Reset Your IntelliAttend Password',
                message=(
                    f'Hello {user.get_full_name() or user.email},\n\n'
                    f'Click the link below to reset your password (valid for 1 hour):\n\n'
                    f'{reset_url}\n\n'
                    f'If you did not request this, ignore this email.\n\n'
                    f'— IntelliAttend Team'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            import logging
            logging.getLogger('intelliattend').error('Email send failed: %s', e)
            # In dev (console backend) this still works; in prod log the error

        return Response({'message': 'If this email is registered, a reset link has been sent.'})


class ResetPasswordView(APIView):
    """Confirm password reset using uid + token from email link."""
    permission_classes = [AllowAny]

    def post(self, request):
        uid      = request.data.get('uid', '')
        token    = request.data.get('token', '')
        password = request.data.get('new_password', '')

        if not all([uid, token, password]):
            return Response({'error': 'uid, token, and new_password are required.'}, status=400)

        if len(password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=400)

        try:
            user_pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_pk)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Invalid reset link.'}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({'error': 'Reset link is invalid or has expired.'}, status=400)

        user.set_password(password)
        user.save()
        return Response({'message': 'Password reset successfully. You can now log in.'})


class ValidateResetTokenView(APIView):
    """Check if a uid/token pair is still valid (for frontend pre-validation)."""
    permission_classes = [AllowAny]

    def post(self, request):
        uid   = request.data.get('uid', '')
        token = request.data.get('token', '')
        try:
            user_pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_pk)
            valid = default_token_generator.check_token(user, token)
        except Exception:
            valid = False
        return Response({'valid': valid})

# ─── Department Views ────────────────────────────────────────────────────────

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'created_at']


# ─── Course Views ────────────────────────────────────────────────────────────

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related('department').all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['department']
    search_fields = ['name', 'code']


# ─── Subject Views ────────────────────────────────────────────────────────────

class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    filterset_fields = ['course', 'teacher']
    search_fields = ['name', 'code']

    def get_permissions(self):
        """
        Admin:   full CRUD on any subject.
        Teacher: list/retrieve (own), create (auto-self), destroy (own only).
        Other:   read-only.
        """
        if self.action in ('create', 'destroy', 'enrolled_students'):
            return [IsAdminOrTeacher()]
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdmin()]

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'teacher':
            from .models import Course as CourseModel
            course = serializer.validated_data.get('course') or CourseModel.objects.first()
            serializer.save(teacher=user, course=course)
        else:
            serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'teacher' and instance.teacher != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete subjects you teach.')
        instance.delete()

    def update(self, request, *args, **kwargs):
        if request.user.role == 'teacher':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Teachers cannot edit subjects. Contact admin.')
        return super().update(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        # Guard against AnonymousUser (schema generation)
        if not hasattr(user, 'role'):
            return Subject.objects.none()
        if user.role == 'teacher':
            # Teachers see ONLY their assigned subjects
            return Subject.objects.filter(teacher=user).select_related('teacher', 'course')
        if user.role == 'student':
            return Subject.objects.filter(
                enrollments__student__user=user
            ).select_related('teacher', 'course').distinct()
        return Subject.objects.select_related('teacher', 'course').all()

    @action(detail=True, methods=['get'], url_path='students', permission_classes=[IsAdminOrTeacher])
    def enrolled_students(self, request, pk=None):
        """
        GET /api/subjects/{id}/students/
        Returns the 10 students enrolled in this subject via SubjectEnrollment.
        Teacher can only access their own subjects.
        """
        subject = self.get_object()
        enrollments = SubjectEnrollment.objects.filter(subject=subject).select_related('student__user')
        students_data = []
        for enr in enrollments:
            s = enr.student
            students_data.append({
                'id': str(s.id),
                'student_id': s.student_id,
                'roll_number': s.roll_number,
                'full_name': s.user.get_full_name(),
                'email': s.user.email,
                'face_registered': s.face_registered,
                'year': s.year,
                'section': s.section,
            })
        return Response({
            'subject': subject.name,
            'subject_code': subject.code,
            'count': len(students_data),
            'students': students_data,
        })


# ─── Student Views ────────────────────────────────────────────────────────────

class StudentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrTeacher]
    filterset_fields = ['department', 'course', 'year', 'section', 'face_registered']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'student_id', 'roll_number']
    ordering_fields = ['created_at', 'student_id']

    def get_queryset(self):
        return Student.objects.select_related('user', 'department', 'course').prefetch_related('face_images').all()

    def get_serializer_class(self):
        if self.action == 'list':
            return StudentListSerializer
        return StudentDetailSerializer

    @action(detail=True, methods=['post'], url_path='upload-faces')
    def upload_faces(self, request, pk=None):
        """Upload face images for a student and trigger AI encoding."""
        student = self.get_object()
        images = request.FILES.getlist('images')
        if not images:
            return Response({'error': 'No images provided.'}, status=status.HTTP_400_BAD_REQUEST)

        face_image_urls = []
        for img in images:
            fi = FaceImage.objects.create(student=student, image=img)
            if request.build_absolute_uri:
                face_image_urls.append(request.build_absolute_uri(fi.image.url))

        # Trigger AI service to encode faces
        ai_url = os.getenv('AI_SERVICE_URL', 'http://localhost:8001')
        try:
            resp = requests.post(f"{ai_url}/encode", json={
                'student_id': str(student.id),
                'image_urls': face_image_urls,
            }, timeout=30)
            if resp.status_code == 200:
                encodings = resp.json().get('encodings', [])
                student.face_encodings = encodings
                student.face_registered = True
                student.save()
                return Response({
                    'message': f'{len(images)} image(s) uploaded and encoded.',
                    'face_registered': True,
                    'encodings_count': len(encodings),
                })
        except requests.exceptions.RequestException:
            # AI service not running — still save images
            pass

        return Response({
            'message': f'{len(images)} image(s) uploaded. AI service unavailable — encoding pending.',
            'face_registered': False,
        })

    @action(detail=True, methods=['delete'], url_path='clear-faces')
    def clear_faces(self, request, pk=None):
        student = self.get_object()
        student.face_images.all().delete()
        student.face_encodings = []
        student.face_registered = False
        student.save()
        return Response({'message': 'Face data cleared.'})

    @action(detail=False, methods=['get'], url_path='my-profile', permission_classes=[IsAuthenticated])
    def my_profile(self, request):
        """Student's own profile"""
        try:
            student = Student.objects.get(user=request.user)
            return Response(StudentDetailSerializer(student, context={'request': request}).data)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found.'}, status=404)


# ─── User Management ─────────────────────────────────────────────────────────

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']

    def get_queryset(self):
        role = self.request.query_params.get('role')
        qs = User.objects.all()
        if role:
            qs = qs.filter(role=role)
        return qs


# ─── Attendance Session Views ─────────────────────────────────────────────────

class AttendanceSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrTeacher]
    filterset_fields = ['subject', 'teacher', 'date', 'status']
    ordering_fields = ['date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = AttendanceSession.objects.select_related('subject', 'teacher').prefetch_related('records')
        if user.role == 'teacher':
            qs = qs.filter(teacher=user)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return AttendanceSessionListSerializer
        return AttendanceSessionSerializer

    def perform_create(self, serializer):
        import pyotp
        secret = pyotp.random_base32()
        session = serializer.save(teacher=self.request.user, qr_secret_seed=secret)
        
        # Pre-populate attendance records for all enrolled students
        enrolled_students = session.subject.get_enrolled_students()
        records_to_create = []
        for student in enrolled_students:
            records_to_create.append(
                AttendanceRecord(
                    session=session,
                    student=student,
                    status='absent',
                    method='manual',
                    marked_by=self.request.user
                )
            )
        if records_to_create:
            AttendanceRecord.objects.bulk_create(records_to_create)

    @action(detail=True, methods=['post'], url_path='mark-attendance')
    def mark_attendance(self, request, pk=None):
        """Mark attendance for a student in this session."""
        session = self.get_object()
        student_id = request.data.get('student_id')
        status_val = request.data.get('status', 'present')
        method = request.data.get('method', 'manual')
        confidence = request.data.get('confidence')

        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=404)

        record, created = AttendanceRecord.objects.update_or_create(
            session=session, student=student,
            defaults={
                'status': status_val,
                'method': method,
                'confidence': confidence,
                'marked_by': request.user,
            }
        )
        return Response({
            'record': AttendanceRecordSerializer(record).data,
            'created': created,
        })

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_session(self, request, pk=None):
        session = self.get_object()
        session.status = 'completed'
        session.end_time = timezone.now().time()
        session.save()
        return Response({'message': 'Session completed.'})

    @action(detail=True, methods=['get'], url_path='export-csv')
    def export_csv(self, request, pk=None):
        session = self.get_object()
        records = session.records.select_related('student__user').all()

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="attendance_{session.subject.code}_{session.date}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Student ID', 'Name', 'Roll Number', 'Status', 'Method', 'Confidence', 'Timestamp'])
        for r in records:
            writer.writerow([
                r.student.student_id,
                r.student.user.get_full_name(),
                r.student.roll_number,
                r.status,
                r.method,
                r.confidence or '',
                r.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            ])
        return response

    @action(detail=True, methods=['get'], url_path='current-qr')
    def current_qr(self, request, pk=None):
        """Return current 15-second TOTP code for an active session."""
        session = self.get_object()
        if session.status != 'active':
            return Response({'error': 'Session is not active.'}, status=400)
        if not session.qr_secret_seed:
            return Response({'error': 'QR seed not initialized for this session.'}, status=400)

        import pyotp
        interval = 15
        totp = pyotp.TOTP(session.qr_secret_seed, interval=interval)
        now = int(time.time())
        seconds_remaining = interval - (now % interval)

        return Response({
            'session_id': str(session.id),
            'qr_code': totp.now(),
            'expires_in': seconds_remaining,
            'interval': interval,
        })


# ─── Attendance Record Views ──────────────────────────────────────────────────

class AttendanceRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    filterset_fields = ['session', 'student', 'status', 'method']

    def get_permissions(self):
        """Students can only read (list/retrieve) their own records."""
        # Guard against AnonymousUser during schema generation
        user = self.request.user
        if self.request.method in ('GET', 'HEAD', 'OPTIONS') and hasattr(user, 'role') and user.role == 'student':
            from rest_framework.permissions import IsAuthenticated
            return [IsAuthenticated()]
        return [IsAdminOrTeacher()]

    def get_queryset(self):
        # Guard for drf-spectacular schema generation (AnonymousUser)
        if getattr(self, 'swagger_fake_view', False):
            return AttendanceRecord.objects.none()
        user = self.request.user
        qs = AttendanceRecord.objects.select_related('student__user', 'session__subject').all()
        # Students only see their own records
        if hasattr(user, 'role') and user.role == 'student':
            try:
                student = Student.objects.get(user=user)
                qs = qs.filter(student=student)
            except Student.DoesNotExist:
                return qs.none()
        return qs


# ─── Analytics & Stats ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_stats(request):
    """Dashboard statistics."""
    user = request.user
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    if user.role == 'admin':
        total_students = Student.objects.count()
        total_teachers = User.objects.filter(role='teacher').count()
        total_sessions = AttendanceSession.objects.count()
        sessions_today = AttendanceSession.objects.filter(date=today).count()

        # Daily attendance for last 7 days
        daily_stats = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            sessions = AttendanceSession.objects.filter(date=d)
            total = AttendanceRecord.objects.filter(session__in=sessions).count()
            present = AttendanceRecord.objects.filter(session__in=sessions, status='present').count()
            daily_stats.append({
                'date': d.strftime('%b %d'),
                'total': total,
                'present': present,
                'absent': total - present,
            })

        # Department-wise stats
        dept_stats = []
        for dept in Department.objects.all():
            students = Student.objects.filter(department=dept).count()
            records = AttendanceRecord.objects.filter(student__department=dept)
            total = records.count()
            present = records.filter(status='present').count()
            dept_stats.append({
                'department': dept.name,
                'students': students,
                'attendance_rate': round((present / total * 100), 1) if total else 0,
            })

        return Response({
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_sessions': total_sessions,
            'sessions_today': sessions_today,
            'daily_stats': daily_stats,
            'department_stats': dept_stats,
        })

    elif user.role == 'teacher':
        my_subjects = Subject.objects.filter(teacher=user)
        my_sessions = AttendanceSession.objects.filter(teacher=user)
        sessions_today = my_sessions.filter(date=today).count()

        subject_stats = []
        for subj in my_subjects:
            sessions = AttendanceSession.objects.filter(subject=subj)
            records = AttendanceRecord.objects.filter(session__in=sessions)
            total = records.count()
            present = records.filter(status='present').count()
            subject_stats.append({
                'subject': subj.name,
                'code': subj.code,
                'sessions': sessions.count(),
                'attendance_rate': round((present / total * 100), 1) if total else 0,
            })

        return Response({
            'total_subjects': my_subjects.count(),
            'total_sessions': my_sessions.count(),
            'sessions_today': sessions_today,
            'subject_stats': subject_stats,
        })

    else:  # student
        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=404)

        records = AttendanceRecord.objects.filter(student=student)
        total = records.count()
        present = records.filter(status='present').count()
        absent = records.filter(status='absent').count()
        late = records.filter(status='late').count()

        # Subject-wise breakdown
        subject_stats = []
        subjects = Subject.objects.filter(
            id__in=AttendanceSession.objects.filter(
                id__in=records.values('session')
            ).values('subject')
        )
        for subj in subjects:
            subj_sessions = AttendanceSession.objects.filter(subject=subj)
            subj_records = records.filter(session__in=subj_sessions)
            subj_total = subj_records.count()
            subj_present = subj_records.filter(status='present').count()
            subject_stats.append({
                'subject': subj.name,
                'total': subj_total,
                'present': subj_present,
                'percentage': round((subj_present / subj_total * 100), 1) if subj_total else 0,
            })

        return Response({
            'total': total,
            'present': present,
            'absent': absent,
            'late': late,
            'percentage': round((present / total * 100), 1) if total else 0,
            'subject_stats': subject_stats,
        })


@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def export_attendance_csv(request):
    """Export attendance records as CSV."""
    session_id = request.query_params.get('session_id')
    subject_id = request.query_params.get('subject_id')
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    records = AttendanceRecord.objects.select_related('student__user', 'session__subject').all()

    if session_id:
        records = records.filter(session_id=session_id)
    if subject_id:
        records = records.filter(session__subject_id=subject_id)
    if start_date:
        records = records.filter(session__date__gte=start_date)
    if end_date:
        records = records.filter(session__date__lte=end_date)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="attendance_report.csv"'

    writer = csv.writer(response)
    writer.writerow(['Date', 'Subject', 'Student ID', 'Student Name', 'Status', 'Method', 'Confidence', 'Timestamp'])
    for r in records:
        writer.writerow([
            r.session.date,
            r.session.subject.name,
            r.student.student_id,
            r.student.user.get_full_name(),
            r.status,
            r.method,
            r.confidence or '',
            r.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        ])
    return response


# ─── Face Recognition Integration ─────────────────────────────────────────────

@extend_schema(
    description="Proxy to AI service: send a webcam frame and get recognized student ID back.",
    responses={200: OpenApiResponse(description="Recognition result with optional attendance marking")},
)
@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
def recognize_face(request):
    """
    Proxy to AI service: send a frame and get recognized student ID back.
    Expects: { frame: base64_jpeg, session_id: uuid }
    """
    frame = request.data.get('frame')
    session_id = request.data.get('session_id')

    if not frame:
        return Response({'error': 'No frame provided.'}, status=400)

    ai_url = os.getenv('AI_SERVICE_URL', 'http://localhost:8001')
    try:
        # Load all face encodings from DB for matching
        students = Student.objects.filter(face_registered=True).exclude(face_encodings=[])
        known_encodings = []
        for s in students:
            known_encodings.append({
                'student_id': str(s.id),
                'student_name': s.user.get_full_name(),
                'encodings': s.face_encodings,
            })

        resp = requests.post(f"{ai_url}/recognize", json={
            'frame': frame,
            'known_encodings': known_encodings,
        }, timeout=10)

        if resp.status_code == 200:
            result = resp.json()
            # Auto-mark attendance if recognized
            if result.get('recognized') and session_id:
                try:
                    session = AttendanceSession.objects.get(id=session_id, status='active')
                    student = Student.objects.get(id=result['student_id'])
                    record, created = AttendanceRecord.objects.get_or_create(
                        session=session, student=student,
                        defaults={
                            'status': 'present',
                            'method': 'face',
                            'confidence': result.get('confidence'),
                            'marked_by': request.user,
                        }
                    )
                    attendance_marked = created
                    if not created and record.status != 'present':
                        record.status = 'present'
                        record.method = 'face'
                        record.confidence = result.get('confidence')
                        record.marked_by = request.user
                        record.save(update_fields=['status', 'method', 'confidence', 'marked_by'])
                        attendance_marked = True
                    result['attendance_marked'] = attendance_marked
                    result['student_name'] = student.user.get_full_name()
                    result['student_display_id'] = student.student_id
                except (AttendanceSession.DoesNotExist, Student.DoesNotExist):
                    pass
            return Response(result)

        return Response({'error': 'AI service error.'}, status=500)

    except requests.exceptions.RequestException as e:
        return Response({'error': f'AI service unavailable: {str(e)}'}, status=503)


# ─── College Config (Admin) ───────────────────────────────────────────────────

class CollegeConfigView(APIView):
    """
    GET  /api/admin/college-config/  — Retrieve current config (authenticated)
    PUT  /api/admin/college-config/  — Save/update config (admin only)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get(self, request):
        config = CollegeConfig.get_config()
        if not config:
            return Response({'configured': False, 'message': 'College location not configured yet.'})
        return Response({
            'configured': True,
            **CollegeConfigSerializer(config).data
        })

    def put(self, request):
        config = CollegeConfig.get_config()
        serializer = CollegeConfigSerializer(
            instance=config,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(updated_by=request.user)
        return Response({
            'message': 'College configuration saved successfully.',
            **CollegeConfigSerializer(instance).data
        })


# ─── Teacher Management (Admin) ───────────────────────────────────────────────

class TeacherManagementViewSet(viewsets.ViewSet):
    """
    Admin-only viewset for managing teacher accounts.
    GET    /api/admin/teachers/       — List all teachers
    POST   /api/admin/teachers/       — Create teacher
    GET    /api/admin/teachers/{id}/  — Retrieve teacher
    PATCH  /api/admin/teachers/{id}/  — Update teacher
    DELETE /api/admin/teachers/{id}/  — Delete teacher
    """
    permission_classes = [IsAdmin]

    def list(self, request):
        search = request.query_params.get('search', '')
        qs = User.objects.filter(role='teacher').order_by('-date_joined')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        return Response(TeacherListSerializer(qs, many=True).data)

    def create(self, request):
        serializer = TeacherCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        teacher = serializer.save()
        return Response(
            TeacherListSerializer(teacher).data,
            status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, pk=None):
        try:
            teacher = User.objects.get(pk=pk, role='teacher')
        except User.DoesNotExist:
            return Response({'error': 'Teacher not found.'}, status=404)
        return Response(TeacherListSerializer(teacher).data)

    def partial_update(self, request, pk=None):
        try:
            teacher = User.objects.get(pk=pk, role='teacher')
        except User.DoesNotExist:
            return Response({'error': 'Teacher not found.'}, status=404)
        serializer = TeacherCreateSerializer(teacher, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        teacher = serializer.save()
        return Response(TeacherListSerializer(teacher).data)

    def destroy(self, request, pk=None):
        try:
            teacher = User.objects.get(pk=pk, role='teacher')
        except User.DoesNotExist:
            return Response({'error': 'Teacher not found.'}, status=404)
        teacher.delete()
        return Response({'message': 'Teacher deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)


# ─── GPS Utility ─────────────────────────────────────────────────────────────

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance in meters between two GPS coordinates
    using the Haversine formula.
    """
    R = 6_371_000  # Earth's radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ─── Student Self-Mark Attendance (GPS + Face) ───────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def student_self_mark(request):
    """
    Student-triggered GPS-validated face attendance.

    Request body:
    {
        "latitude":   <float>,      # Student's current GPS latitude
        "longitude":  <float>,      # Student's current GPS longitude
        "session_id": "<uuid>",     # Active session the student is marking
        "frame":      "<base64>"    # Webcam frame for face recognition
    }

    Flow:
      1. Validate student has a registered face
      2. Look up CollegeConfig for GPS coords + radius
      3. Haversine formula: if distance > radius → 403 "Out of Campus Range"
      4. Forward frame to ai_service /recognize with student's own embeddings
      5. If match → mark AttendanceRecord as "present"
    """
    user = request.user

    # Resolve student profile
    try:
        student = Student.objects.select_related('user').get(user=user)
    except Student.DoesNotExist:
        return Response({'error': 'Student profile not found.'}, status=404)

    if not student.face_registered or not student.face_encodings:
        return Response(
            {'error': 'Face not registered. Please contact your teacher to complete onboarding.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Parse request payload
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    session_id = request.data.get('session_id')
    frame = request.data.get('frame')
    qr_data = request.data.get('qr_data')  # 6-digit TOTP from QR

    if not all([latitude is not None, longitude is not None, session_id, frame]):
        return Response(
            {'error': 'latitude, longitude, session_id, and frame are all required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ── Step 1: GPS Geofencing ──────────────────────────────────────────────
    config = CollegeConfig.get_config()
    if not config:
        return Response(
            {'error': 'College location not configured. Please ask your admin to set up GPS coordinates.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    try:
        student_lat = float(latitude)
        student_lon = float(longitude)
    except (TypeError, ValueError):
        return Response({'error': 'Invalid GPS coordinates.'}, status=400)

    distance = haversine_distance(student_lat, student_lon, config.latitude, config.longitude)

    if distance > config.radius_meters:
        return Response(
            {
                'error': 'Out of Campus Range',
                'detail': f'You are {round(distance)}m from campus. Maximum allowed distance is {config.radius_meters}m.',
                'distance_meters': round(distance, 1),
                'allowed_radius': config.radius_meters,
            },
            status=status.HTTP_403_FORBIDDEN
        )

    # ── Step 2: Validate active session and QR ──────────────────────────────
    try:
        session = AttendanceSession.objects.get(id=session_id, status='active')
    except AttendanceSession.DoesNotExist:
        return Response(
            {'error': 'Session not found or no longer active. Ask your teacher to start a session.'},
            status=404
        )

    # QR validation bypassed as teacher QR feature is removed

    # ── Step 3: Check not already marked ───────────────────────────────────
    if AttendanceRecord.objects.filter(session=session, student=student, status='present').exists():
        return Response(
            {'error': 'You have already marked attendance for this session.', 'already_marked': True},
            status=status.HTTP_409_CONFLICT
        )

    # ── Step 4: Face Recognition via AI service ─────────────────────────────
    ai_url = os.getenv('AI_SERVICE_URL', 'http://localhost:8001')
    try:
        resp = requests.post(f"{ai_url}/recognize", json={
            'frame': frame,
            'known_encodings': [{
                'student_id': str(student.id),
                'student_name': student.user.get_full_name(),
                'encodings': student.face_encodings,
            }],
        }, timeout=15)

        if resp.status_code != 200:
            return Response({'error': 'AI service returned an error. Please try again.'}, status=500)

        result = resp.json()

    except requests.exceptions.ConnectionError:
        return Response({'error': 'Face recognition service is offline. Please contact admin.'}, status=503)
    except requests.exceptions.Timeout:
        return Response({'error': 'Face recognition timed out. Please try again.'}, status=504)
    except requests.exceptions.RequestException as e:
        return Response({'error': f'AI service unavailable: {str(e)}'}, status=503)

    if not result.get('recognized'):
        return Response(
            {
                'error': 'Face not recognized',
                'detail': result.get('reason', 'Your face did not match the registered photo. Please ensure good lighting.'),
                'recognized': False,
            },
            status=status.HTTP_401_UNAUTHORIZED
        )

    # ── Step 5: Mark attendance ─────────────────────────────────────────────
    record, created = AttendanceRecord.objects.get_or_create(
        session=session,
        student=student,
        defaults={
            'status': 'present',
            'method': 'qr' if qr_data else 'face',
            'confidence': result.get('confidence'),
            'scanned_lat': student_lat,
            'scanned_long': student_lon,
            'marked_by': user,
        }
    )

    if not created:
        # Already exists but maybe as absent — update to present
        record.status = 'present'
        record.method = 'qr' if qr_data else 'face'
        record.confidence = result.get('confidence')
        record.scanned_lat = student_lat
        record.scanned_long = student_lon
        record.marked_by = user
        record.save()

    return Response({
        'success': True,
        'message': f'Attendance marked successfully for {session.subject.name}!',
        'student_name': student.user.get_full_name(),
        'subject': session.subject.name,
        'session_date': str(session.date),
        'confidence': result.get('confidence'),
        'distance_meters': round(distance, 1),
        'timestamp': record.timestamp.isoformat(),
    })


# ─── Active Sessions for Students ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_sessions_for_student(request):
    """
    Return all currently active attendance sessions.
    Students use this to pick which session to mark.
    """
    sessions = AttendanceSession.objects.filter(
        status='active'
    ).select_related('subject', 'teacher').order_by('-created_at')

    data = [{
        'id': str(s.id),
        'subject_name': s.subject.name,
        'subject_code': s.subject.code,
        'teacher_name': s.teacher.get_full_name(),
        'date': str(s.date),
        'start_time': s.start_time.strftime('%H:%M') if s.start_time else None,
    } for s in sessions]

    return Response({'sessions': data, 'count': len(data)})
