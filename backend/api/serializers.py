"""
IntelliAttend API Serializers
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Department, Course, Student, FaceImage,
    Subject, AttendanceSession, AttendanceRecord, CollegeConfig
)

User = get_user_model()


# ─── Auth Serializers ───────────────────────────────────────────────────────

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    # Student specific fields
    student_id = serializers.CharField(write_only=True, required=True)
    roll_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    department_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    course_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'phone', 'password', 'confirm_password', 'student_id', 'roll_number', 'department_id', 'course_id']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        student_id = attrs.get('student_id')
        if student_id and Student.objects.filter(student_id=student_id).exists():
            raise serializers.ValidationError({'student_id': 'A student with this Student ID already exists.'})
        return attrs

    def create(self, validated_data):
        student_id = validated_data.pop('student_id')
        roll_number = validated_data.pop('roll_number', '')
        department_id = validated_data.pop('department_id', None)
        course_id = validated_data.pop('course_id', None)
        
        user = User.objects.create_user(role='student', **validated_data)
        
        Student.objects.create(
            user=user,
            student_id=student_id,
            roll_number=roll_number,
            department_id=department_id,
            course_id=course_id
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'phone', 'avatar', 'avatar_url', 'date_joined', 'is_active']
        read_only_fields = ['id', 'date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'avatar']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)


# ─── Department & Course ────────────────────────────────────────────────────

class DepartmentSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'head', 'student_count', 'created_at']

    def get_student_count(self, obj):
        return obj.students.count()


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'department', 'department_name', 'duration_years', 'student_count', 'created_at']

    def get_student_count(self, obj):
        return obj.students.count()


# ─── Subject ────────────────────────────────────────────────────────────────

class SubjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'teacher', 'teacher_name', 'course', 'course_name', 'credits', 'created_at']


# ─── Student ─────────────────────────────────────────────────────────────────

class FaceImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = FaceImage
        fields = ['id', 'image', 'image_url', 'uploaded_at']
        read_only_fields = ['uploaded_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class StudentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    face_image_count = serializers.SerializerMethodField()
    attendance_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id', 'student_id', 'full_name', 'email',
            'department_name', 'course_name', 'year', 'section',
            'roll_number', 'face_registered', 'face_image_count',
            'attendance_percentage', 'created_at'
        ]

    def get_face_image_count(self, obj):
        return obj.face_images.count()

    def get_attendance_percentage(self, obj):
        total = obj.attendance_records.count()
        if total == 0:
            return 0
        present = obj.attendance_records.filter(status='present').count()
        return round((present / total) * 100, 1)


class StudentDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single student view"""
    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    course = CourseSerializer(read_only=True)
    face_images = FaceImageSerializer(many=True, read_only=True)

    # Write-only fields for creation
    email = serializers.EmailField(write_only=True, required=False)
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    department_id = serializers.UUIDField(write_only=True, required=False)
    course_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Student
        fields = [
            'id', 'student_id', 'user', 'year', 'section', 'roll_number',
            'department', 'course', 'face_registered', 'face_images',
            'face_encodings', 'created_at',
            # write-only
            'email', 'first_name', 'last_name', 'password', 'department_id', 'course_id'
        ]
        read_only_fields = ['face_encodings', 'face_registered', 'created_at']

    def create(self, validated_data):
        email = validated_data.pop('email')
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        password = validated_data.pop('password', 'Student@123')
        department_id = validated_data.pop('department_id', None)
        course_id = validated_data.pop('course_id', None)

        user = User.objects.create_user(
            email=email, password=password,
            first_name=first_name, last_name=last_name, role='student'
        )
        if department_id:
            validated_data['department_id'] = department_id
        if course_id:
            validated_data['course_id'] = course_id

        student = Student.objects.create(user=user, **validated_data)
        return student


# ─── Attendance ──────────────────────────────────────────────────────────────

class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    student_uuid = serializers.UUIDField(source='student.id', read_only=True)
    session_id = serializers.UUIDField(source='session.id', read_only=True)
    session_date = serializers.DateField(source='session.date', read_only=True)
    subject_name = serializers.CharField(source='session.subject.name', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'student_uuid', 'student_id', 'student_name',
            'session_id', 'session_date', 'subject_name',
            'status', 'method', 'confidence', 'timestamp', 'marked_by'
        ]
        read_only_fields = ['timestamp']


class AttendanceSessionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    records = AttendanceRecordSerializer(many=True, read_only=True)
    present_count = serializers.SerializerMethodField()
    absent_count = serializers.SerializerMethodField()
    total_count = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'subject', 'subject_name', 'subject_code',
            'teacher', 'teacher_name', 'date', 'start_time', 'end_time',
            'status', 'notes', 'records', 'present_count', 'absent_count', 'total_count', 'created_at'
        ]
        read_only_fields = ['teacher', 'start_time', 'created_at']
        extra_kwargs = {'date': {'required': False}}

    def get_present_count(self, obj):
        return obj.records.filter(status='present').count()

    def get_absent_count(self, obj):
        return obj.records.filter(status='absent').count()

    def get_total_count(self, obj):
        return obj.records.count()


class AttendanceSessionListSerializer(serializers.ModelSerializer):
    """Lightweight for list views"""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    present_count = serializers.SerializerMethodField()
    total_count = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'subject_name', 'teacher_name', 'date',
            'status', 'present_count', 'total_count', 'created_at'
        ]
        read_only_fields = ['teacher']

    def get_present_count(self, obj):
        return obj.records.filter(status='present').count()

    def get_total_count(self, obj):
        return obj.records.count()


# ─── College Config ──────────────────────────────────────────────────────────

class CollegeConfigSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(
        source='updated_by.get_full_name', read_only=True
    )

    class Meta:
        model = CollegeConfig
        fields = [
            'id', 'college_name', 'latitude', 'longitude',
            'radius_meters', 'updated_at', 'updated_by_name'
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by_name']


# ─── Teacher Management ──────────────────────────────────────────────────────

class TeacherListSerializer(serializers.ModelSerializer):
    """Lightweight teacher listing for admin panel."""
    full_name = serializers.SerializerMethodField()
    subject_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'is_active', 'date_joined', 'subject_count'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_subject_count(self, obj):
        return obj.taught_subjects.count()


class TeacherCreateSerializer(serializers.ModelSerializer):
    """Create/update a teacher account."""
    password = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone', 'password', 'is_active']
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def create(self, validated_data):
        password = validated_data.pop('password', 'Teacher@123')
        user = User.objects.create_user(
            role='teacher',
            **validated_data
        )
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
