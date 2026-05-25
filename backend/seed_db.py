import os
import django

# Django settings configure karna
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'intelliattend.settings')
django.setup()

from api.models import User, Department, Course, Student

def run():
    print("⏳ Connecting to Neon Cloud and injecting accounts...")
    
    # 1. Dropdown values (Branch aur Course setup)
    dept, _ = Department.objects.get_or_create(name="Computer Science & IT", code="CS-IT")
    course, _ = Course.objects.get_or_create(name="B.Tech", code="BTECH", department=dept)

    # 2. ADMIN ACCOUNT
    admin_email = "admin@intelliattend.com"
    User.objects.filter(email=admin_email).delete()
    admin_user = User.objects.create_user(email=admin_email, password="admin@123", first_name="System", last_name="Admin", role="admin")
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()

    # 3. TEACHER ACCOUNT
    teacher_email = "teacher@intelliattend.com"
    User.objects.filter(email=teacher_email).delete()
    teacher_user = User.objects.create_user(email=teacher_email, password="teacher@123", first_name="Sharma", last_name="Sir", role="teacher")
    teacher_user.save()

    # 4. STUDENT ACCOUNT
    student_email = "amohd3135@gmail.com"
    User.objects.filter(email=student_email).delete()
    student_user = User.objects.create_user(email=student_email, password="afzal@123", first_name="Mohd", last_name="Afzal", role="student")
    student_user.save()
    
    # Student profile link karna
    Student.objects.filter(user=student_user).delete()
    Student.objects.create(user=student_user, student_id="BTC201768", roll_number="24CS001", department=dept, course=course)

    print("\n🚀 SUCCESS: ADMIN, TEACHER & STUDENT ARE NOW LIVE ON NEON! 🚀\n")

if __name__ == '__main__':
    run()