"""
IntelliAttend Seed Data — Hardcoded 5 Subjects + 10 Students
============================================================
Usage:
  python manage.py seed_data            # Adds data (idempotent)
  python manage.py seed_data --reset    # Wipes all attendance/students/subjects then re-seeds
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


# ─── Hardcoded Seed Data ──────────────────────────────────────────────────────

DEPARTMENT = {
    'name': 'Computer Science Engineering',
    'code': 'CSE',
}

COURSE = {
    'name': 'B.Tech Computer Science',
    'code': 'BTCS',
    'duration_years': 4,
}

# 5 Subjects — each has a teacher_key (matches TEACHERS below) and credits
SUBJECTS = [
    {'name': 'Data Structures & Algorithms', 'code': 'CS101', 'credits': 4, 'teacher_key': 'teacher1'},
    {'name': 'Database Management Systems',  'code': 'CS102', 'credits': 3, 'teacher_key': 'teacher1'},
    {'name': 'Operating Systems',            'code': 'CS103', 'credits': 4, 'teacher_key': 'teacher1'},
    {'name': 'Computer Networks',            'code': 'CS104', 'credits': 3, 'teacher_key': 'teacher2'},
    {'name': 'Software Engineering',         'code': 'CS105', 'credits': 3, 'teacher_key': 'teacher2'},
]

# 2 Teachers
TEACHERS = {
    'teacher1': {
        'email': 'teacher@intelliattend.com',
        'first_name': 'Md',
        'last_name': 'Afzal',
        'password': 'Teacher@123',
        'phone': '7525881560',
    },
    'teacher2': {
        'email': 'teacher2@intelliattend.com',
        'first_name': 'Rajesh',
        'last_name': 'Kumar',
        'password': 'Teacher@123',
        'phone': '',
    },
}

# 10 Students — all enrolled in ALL 5 subjects
STUDENTS = [
    {'first_name': 'Arjun',  'last_name': 'Mehta',    'email': 'arjun.mehta@student.intelliattend.com',   'student_id': 'CSE2024001', 'roll': 'A01', 'year': 2, 'section': 'A'},
    {'first_name': 'Priya',  'last_name': 'Sharma',   'email': 'priya.sharma@student.intelliattend.com',  'student_id': 'CSE2024002', 'roll': 'A02', 'year': 2, 'section': 'A'},
    {'first_name': 'Ravi',   'last_name': 'Patel',    'email': 'ravi.patel@student.intelliattend.com',    'student_id': 'CSE2024003', 'roll': 'A03', 'year': 2, 'section': 'A'},
    {'first_name': 'Sneha',  'last_name': 'Reddy',    'email': 'sneha.reddy@student.intelliattend.com',   'student_id': 'CSE2024004', 'roll': 'A04', 'year': 2, 'section': 'A'},
    {'first_name': 'Amit',   'last_name': 'Singh',    'email': 'amit.singh@student.intelliattend.com',    'student_id': 'CSE2024005', 'roll': 'A05', 'year': 2, 'section': 'A'},
    {'first_name': 'Kavya',  'last_name': 'Nair',     'email': 'kavya.nair@student.intelliattend.com',    'student_id': 'CSE2024006', 'roll': 'A06', 'year': 2, 'section': 'A'},
    {'first_name': 'Rohit',  'last_name': 'Verma',    'email': 'rohit.verma@student.intelliattend.com',   'student_id': 'CSE2024007', 'roll': 'A07', 'year': 2, 'section': 'A'},
    {'first_name': 'Deepa',  'last_name': 'Krishnan', 'email': 'deepa.krishnan@student.intelliattend.com','student_id': 'CSE2024008', 'roll': 'A08', 'year': 2, 'section': 'A'},
    {'first_name': 'Suresh', 'last_name': 'Kumar',    'email': 'suresh.kumar@student.intelliattend.com',  'student_id': 'CSE2024009', 'roll': 'A09', 'year': 2, 'section': 'A'},
    {'first_name': 'Ananya', 'last_name': 'Iyer',     'email': 'ananya.iyer@student.intelliattend.com',   'student_id': 'CSE2024010', 'roll': 'A10', 'year': 2, 'section': 'A'},
]

ADMIN = {
    'email': 'admin@intelliattend.com',
    'first_name': 'Super',
    'last_name': 'Admin',
    'password': 'Admin@123',
}


class Command(BaseCommand):
    help = 'Seed IntelliAttend with 5 hardcoded subjects and 10 students'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete ALL existing data before seeding (keeps superuser)',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from api.models import (
            Department, Course, Subject, SubjectEnrollment,
            Student, AttendanceSession, AttendanceRecord, CollegeConfig
        )

        if options['reset']:
            self.stdout.write('🗑  Resetting database...')
            AttendanceRecord.objects.all().delete()
            AttendanceSession.objects.all().delete()
            SubjectEnrollment.objects.all().delete()
            Subject.objects.all().delete()
            Student.objects.filter(user__email__contains='student.intelliattend.com').delete()
            User.objects.filter(role='student').delete()
            # Remove seeded teachers (keep admin)
            for t in TEACHERS.values():
                User.objects.filter(email=t['email']).delete()
            self.stdout.write('  Done resetting.\n')

        # ── Admin ─────────────────────────────────────────────────────────────
        admin_user, created = User.objects.get_or_create(email=ADMIN['email'])
        if created or options['reset']:
            admin_user.first_name = ADMIN['first_name']
            admin_user.last_name = ADMIN['last_name']
            admin_user.role = 'admin'
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.set_password(ADMIN['password'])
            admin_user.save()
        self.stdout.write(f'✅ Admin: {admin_user.email}')

        # ── Department ────────────────────────────────────────────────────────
        dept, _ = Department.objects.get_or_create(
            code=DEPARTMENT['code'],
            defaults={'name': DEPARTMENT['name']}
        )
        self.stdout.write(f'✅ Department: {dept.name}')

        # ── Course ────────────────────────────────────────────────────────────
        course, _ = Course.objects.get_or_create(
            code=COURSE['code'],
            defaults={
                'name': COURSE['name'],
                'department': dept,
                'duration_years': COURSE['duration_years'],
            }
        )
        self.stdout.write(f'✅ Course: {course.name}')

        # ── Teachers ──────────────────────────────────────────────────────────
        teacher_objects = {}
        for key, tdata in TEACHERS.items():
            user, created = User.objects.get_or_create(email=tdata['email'])
            user.first_name = tdata['first_name']
            user.last_name = tdata['last_name']
            user.role = 'teacher'
            user.phone = tdata.get('phone', '')
            if created or options['reset']:
                user.set_password(tdata['password'])
            user.save()
            teacher_objects[key] = user
            self.stdout.write(f'✅ Teacher ({key}): {user.get_full_name()} — {user.email}')

        # ── Subjects (5 hardcoded) ────────────────────────────────────────────
        subject_objects = []
        for sdata in SUBJECTS:
            teacher = teacher_objects[sdata['teacher_key']]
            subj, created = Subject.objects.get_or_create(
                code=sdata['code'],
                course=course,
                defaults={
                    'name': sdata['name'],
                    'teacher': teacher,
                    'credits': sdata['credits'],
                }
            )
            if not created:
                # Update teacher assignment in case it changed
                subj.teacher = teacher
                subj.name = sdata['name']
                subj.credits = sdata['credits']
                subj.save()
            subject_objects.append(subj)
            self.stdout.write(f'  📚 Subject: {subj.name} ({subj.code}) → {teacher.get_full_name()}')

        # ── Students (10 hardcoded) ───────────────────────────────────────────
        student_objects = []
        for i, sdata in enumerate(STUDENTS):
            user, created = User.objects.get_or_create(email=sdata['email'])
            user.first_name = sdata['first_name']
            user.last_name = sdata['last_name']
            user.role = 'student'
            if created or options['reset']:
                user.set_password('Student@123')
            user.save()

            student, _ = Student.objects.get_or_create(
                user=user,
                defaults={
                    'student_id': sdata['student_id'],
                    'department': dept,
                    'course': course,
                    'year': sdata['year'],
                    'section': sdata['section'],
                    'roll_number': sdata['roll'],
                }
            )
            # Ensure fields are up to date
            student.department = dept
            student.course = course
            student.year = sdata['year']
            student.section = sdata['section']
            student.roll_number = sdata['roll']
            student.save()
            student_objects.append(student)
            self.stdout.write(f'  👤 Student: {user.get_full_name()} ({sdata["student_id"]})')

        # ── Enroll ALL 10 students in ALL 5 subjects ──────────────────────────
        self.stdout.write('\n📝 Enrolling students in subjects...')
        enrollment_count = 0
        for subj in subject_objects:
            for stu in student_objects:
                _, created = SubjectEnrollment.objects.get_or_create(
                    subject=subj, student=stu
                )
                if created:
                    enrollment_count += 1
        self.stdout.write(f'✅ Created {enrollment_count} new enrollments '
                          f'({len(subject_objects)} subjects × {len(student_objects)} students)')

        # ── College Config (default) ──────────────────────────────────────────
        if not CollegeConfig.objects.exists():
            CollegeConfig.objects.create(
                college_name='IntelliAttend College',
                latitude=12.9716,
                longitude=77.5946,
                radius_meters=150,
                updated_by=admin_user,
            )
            self.stdout.write('✅ CollegeConfig seeded (Bangalore, 150m radius)')

        self.stdout.write(self.style.SUCCESS(
            f'\n🎉 Seeding complete!\n'
            f'   Admin:    {ADMIN["email"]} / {ADMIN["password"]}\n'
            f'   Teacher1: {TEACHERS["teacher1"]["email"]} / Teacher@123  (CS101, CS102, CS103)\n'
            f'   Teacher2: {TEACHERS["teacher2"]["email"]} / Teacher@123  (CS104, CS105)\n'
            f'   Students: Student@123 (all 10)\n'
        ))
