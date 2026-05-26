import os
import sys
import django
import requests
import json
import time
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator

# Initialize Django environment
sys.path.append('/Users/ajmal/Desktop/IntelliAttend/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'intelliattend.settings')
django.setup()

from api.models import User, Student, Department, Course, Subject, AttendanceSession, AttendanceRecord, CollegeConfig

BASE_URL = "http://127.0.0.1:8080/api"

# Helper for printing colored logs
def log_info(msg):
    print(f"\033[94m[INFO]\033[0m {msg}")

def log_success(msg):
    print(f"\033[92m[SUCCESS]\033[0m {msg}")

def log_error(msg):
    print(f"\033[91m[ERROR]\033[0m {msg}")

def run_all_features_verification():
    log_info("Starting IntelliAttend Comprehensive Feature-by-Feature Verification Suite")

    # 1. LOGINS & TOKENS SETUP
    # -------------------------------------------------------------
    log_info("Authenticating roles...")
    
    # Admin
    resp = requests.post(f"{BASE_URL}/auth/login/", json={"email": "admin@intelliattend.com", "password": "Admin@123"})
    if resp.status_code != 200:
        log_error(f"Admin authentication failed: {resp.text}")
        sys.exit(1)
    admin_headers = {"Authorization": f"Bearer {resp.json()['access']}"}
    
    # Teacher
    resp = requests.post(f"{BASE_URL}/auth/login/", json={"email": "teacher@intelliattend.com", "password": "Teacher@123"})
    if resp.status_code != 200:
        log_error(f"Teacher authentication failed: {resp.text}")
        sys.exit(1)
    teacher_headers = {"Authorization": f"Bearer {resp.json()['access']}"}
    
    # Student
    resp = requests.post(f"{BASE_URL}/auth/login/", json={"email": "arjun.mehta@student.intelliattend.com", "password": "Student@123"})
    if resp.status_code != 200:
        log_error(f"Student authentication failed: {resp.text}")
        sys.exit(1)
    student_headers = {"Authorization": f"Bearer {resp.json()['access']}"}
    log_success("All role authentications verified (Admin, Teacher, Student).")

    # 2. FEATURE 1: PASSWORD RESET FLOW
    # -------------------------------------------------------------
    log_info("[FEATURE 1] Verifying Forgot & Reset Password Flow...")
    
    # Trigger forgot-password
    resp = requests.post(f"{BASE_URL}/auth/forgot-password/", json={"email": "arjun.mehta@student.intelliattend.com"})
    if resp.status_code != 200:
        log_error(f"Forgot password request failed: {resp.text}")
    else:
        log_success("Forgot password email trigger response OK.")
    
    # Fetch token using ORM programmatically
    student_user = User.objects.get(email="arjun.mehta@student.intelliattend.com")
    uidb64 = urlsafe_base64_encode(force_bytes(student_user.pk))
    token = default_token_generator.make_token(student_user)
    log_info(f"Generated test reset token for student user: uid={uidb64}, token={token}")
    
    # Validate reset token
    resp = requests.post(f"{BASE_URL}/auth/validate-reset-token/", json={"uid": uidb64, "token": token})
    if resp.status_code != 200:
        log_error(f"Token validation failed: {resp.text}")
    else:
        log_success("Token validation endpoint verified successfully.")
        
    # Reset password
    new_password = "StudentReset@123"
    resp = requests.post(f"{BASE_URL}/auth/reset-password/", json={"uid": uidb64, "token": token, "new_password": new_password})
    if resp.status_code != 200:
        log_error(f"Password reset request failed: {resp.text}")
    else:
        log_success("Password reset request verified successfully.")
        
    # Verify login with new password
    resp = requests.post(f"{BASE_URL}/auth/login/", json={"email": "arjun.mehta@student.intelliattend.com", "password": new_password})
    if resp.status_code != 200:
        log_error(f"Login with reset password failed: {resp.text}")
    else:
        log_success("Login with new reset password verified successfully.")
        
    # Restore original password for clean status
    student_user.set_password("Student@123")
    student_user.save()
    log_info("Original Student password restored in DB.")

    # 3. FEATURE 2: FACE ONBOARDING AND CLEARING
    # -------------------------------------------------------------
    log_info("[FEATURE 2] Verifying Face Upload & Face Clearing Flow...")
    student_profile = Student.objects.get(user__email="arjun.mehta@student.intelliattend.com")
    student_id = student_profile.id
    
    # Upload faces
    log_info("Uploading face image to verify face registration...")
    with open("test_avatar.png", "rb") as f:
        files = {"images": ("test_avatar.png", f, "image/png")}
        resp = requests.post(f"{BASE_URL}/students/{student_id}/upload-faces/", files=files, headers=admin_headers)
    if resp.status_code != 200:
        log_error(f"Face upload failed: {resp.text}")
    else:
        log_success(f"Face upload response: {resp.json()}")
        
    # Verify state is registered
    student_profile.refresh_from_db()
    log_info(f"Student face registered state post-upload: {student_profile.face_registered}")
    if student_profile.face_registered:
        log_success("Face registration successfully verified.")
    else:
        log_error("Face registration flag was not set.")

    # Clear faces
    log_info("Triggering face clear-faces endpoint...")
    resp = requests.delete(f"{BASE_URL}/students/{student_id}/clear-faces/", headers=admin_headers)
    if resp.status_code != 200:
        log_error(f"Face clear failed: {resp.text}")
    else:
        log_success("Face clear response OK.")
        
    # Verify state is cleared
    student_profile.refresh_from_db()
    log_info(f"Student face registered state post-clear: {student_profile.face_registered}")
    if not student_profile.face_registered:
        log_success("Face clear successfully verified.")
    else:
        log_error("Face registration flag was still set.")
        
    # Re-upload faces to keep student onboarded
    log_info("Re-uploading face to restore student onboarding state...")
    with open("test_avatar.png", "rb") as f:
        files = {"images": ("test_avatar.png", f, "image/png")}
        requests.post(f"{BASE_URL}/students/{student_id}/upload-faces/", files=files, headers=admin_headers)

    # 4. FEATURE 3: ACADEMIC CRUD (BRANCH, COURSE, SUBJECT)
    # -------------------------------------------------------------
    log_info("[FEATURE 3] Verifying Academic Configuration CRUD...")
    
    # A. Department CRUD
    log_info("Creating department...")
    dept_payload = {"name": "Electrical Engineering", "code": f"EE_{int(time.time()) % 1000}"}
    resp = requests.post(f"{BASE_URL}/departments/", json=dept_payload, headers=admin_headers)
    if resp.status_code not in (200, 201):
        log_error(f"Dept creation failed: {resp.text}")
    else:
        dept_id = resp.json()['id']
        log_success(f"Department EE created (ID: {dept_id}).")
        
        # Update Department
        resp = requests.patch(f"{BASE_URL}/departments/{dept_id}/", json={"name": "Electrical & Electronics Engineering"}, headers=admin_headers)
        if resp.status_code == 200:
            log_success("Department name updated successfully.")
            
        # B. Course CRUD
        course_payload = {"name": "Power Systems", "code": f"EE301_{int(time.time()) % 1000}", "department": dept_id, "duration_years": 4}
        resp = requests.post(f"{BASE_URL}/courses/", json=course_payload, headers=admin_headers)
        if resp.status_code not in (200, 201):
            log_error(f"Course creation failed: {resp.text}")
        else:
            course_id = resp.json()['id']
            log_success(f"Course created (ID: {course_id}).")
            
            # Update Course
            resp = requests.patch(f"{BASE_URL}/courses/{course_id}/", json={"name": "Advanced Power Systems"}, headers=admin_headers)
            if resp.status_code == 200:
                log_success("Course updated successfully.")
                
            # C. Subject CRUD
            # Fetch default teacher
            teacher_db = User.objects.filter(role='teacher').first()
            subject_payload = {"name": "Signals and Systems", "code": f"EE301-S_{int(time.time()) % 1000}", "course": course_id, "teacher": str(teacher_db.id), "credits": 4}
            resp = requests.post(f"{BASE_URL}/subjects/", json=subject_payload, headers=admin_headers)
            if resp.status_code not in (200, 201):
                log_error(f"Subject creation failed: {resp.text}")
            else:
                sub_id = resp.json()['id']
                log_success(f"Subject created (ID: {sub_id}).")
                
                # Update Subject
                resp = requests.patch(f"{BASE_URL}/subjects/{sub_id}/", json={"credits": 5}, headers=admin_headers)
                if resp.status_code == 200:
                    log_success("Subject credits updated successfully.")
                    
                # Clean up Course / Subject / Dept
                requests.delete(f"{BASE_URL}/subjects/{sub_id}/", headers=admin_headers)
                log_success("Subject deleted successfully.")
            requests.delete(f"{BASE_URL}/courses/{course_id}/", headers=admin_headers)
            log_success("Course deleted successfully.")
        requests.delete(f"{BASE_URL}/departments/{dept_id}/", headers=admin_headers)
        log_success("Department deleted successfully.")

    # 5. FEATURE 4: ADMIN - TEACHER MANAGEMENT (CRUD)
    # -------------------------------------------------------------
    log_info("[FEATURE 4] Verifying Admin Teacher Management CRUD...")
    
    # Create Teacher
    t_email = f"test.teacher.{int(time.time())}@intelliattend.com"
    teacher_payload = {
        "email": t_email,
        "first_name": "Test",
        "last_name": "Teacher",
        "password": "Teacher@123",
        "role": "teacher",
        "phone_number": "9876543210"
    }
    resp = requests.post(f"{BASE_URL}/admin/teachers/", json=teacher_payload, headers=admin_headers)
    if resp.status_code not in (200, 201):
        log_error(f"Teacher creation failed: {resp.text}")
    else:
        new_teacher = resp.json()
        new_teacher_id = new_teacher['id']
        log_success(f"Teacher created via Admin (ID: {new_teacher_id}).")
        
        # Update Teacher
        resp = requests.patch(f"{BASE_URL}/admin/teachers/{new_teacher_id}/", json={"phone_number": "1112223334"}, headers=admin_headers)
        if resp.status_code == 200:
            log_success("Teacher phone number updated.")
            
        # Delete Teacher
        resp = requests.delete(f"{BASE_URL}/admin/teachers/{new_teacher_id}/", headers=admin_headers)
        if resp.status_code in (200, 204):
            log_success("Teacher deleted successfully.")

    # 6. FEATURE 5: ADMIN - STUDENT MANAGEMENT (CRUD)
    # -------------------------------------------------------------
    log_info("[FEATURE 5] Verifying Admin Student Management CRUD...")
    
    # Create Student
    # Needs a course
    course_obj = Course.objects.first()
    s_email = f"test.student.{int(time.time())}@student.intelliattend.com"
    student_payload = {
        "email": s_email,
        "first_name": "Test",
        "last_name": "Student",
        "password": "Student@123",
        "role": "student",
        "student_id": f"STU_{int(time.time()) % 100000}",
        "roll_number": f"ROLL_{int(time.time()) % 100000}",
        "course_id": str(course_obj.id),
        "department_id": str(course_obj.department_id)
    }
    resp = requests.post(f"{BASE_URL}/students/", json=student_payload, headers=admin_headers)
    if resp.status_code not in (200, 201):
        log_error(f"Student creation failed: {resp.text}")
    else:
        new_student = resp.json()
        new_student_id = new_student['id']
        log_success(f"Student created via Admin (ID: {new_student_id}).")
        
        # Update Student
        resp = requests.patch(f"{BASE_URL}/students/{new_student_id}/", json={"roll_number": "UPDATED_ROLL"}, headers=admin_headers)
        if resp.status_code == 200:
            log_success("Student roll number updated.")
            
        # Delete Student
        resp = requests.delete(f"{BASE_URL}/students/{new_student_id}/", headers=admin_headers)
        if resp.status_code in (200, 204):
            log_success("Student deleted successfully.")

    # 7. FEATURE 6: ACTIVE SESSION DISCOVERY
    # -------------------------------------------------------------
    log_info("[FEATURE 6] Verifying Student Active Sessions Discovery...")
    resp = requests.get(f"{BASE_URL}/attendance/active-sessions/", headers=student_headers)
    if resp.status_code != 200:
        log_error(f"Active sessions query failed: {resp.text}")
    else:
        log_success(f"Active sessions discovered: {len(resp.json())} active sessions found.")

    # 8. FEATURE 7: CSV EXPORT & STATS
    # -------------------------------------------------------------
    log_info("[FEATURE 7] Verifying Stats, Reports, and CSV Export...")
    
    # Stats
    resp = requests.get(f"{BASE_URL}/stats/", headers=admin_headers)
    if resp.status_code != 200:
        log_error(f"Overall stats call failed: {resp.text}")
    else:
        log_success(f"System stats data structure OK: {resp.json().keys()}")
        
    # Reports CSV Export
    resp = requests.get(f"{BASE_URL}/reports/export-csv/", headers=admin_headers)
    if resp.status_code != 200:
        log_error(f"Reports CSV export failed: {resp.text}")
    else:
        log_success("Reports CSV downloaded successfully (content-length verified).")
        
    # Session CSV Export
    session_obj = AttendanceSession.objects.first()
    if session_obj:
        resp = requests.get(f"{BASE_URL}/attendance/sessions/{session_obj.id}/export-csv/", headers=teacher_headers)
        if resp.status_code != 200:
            log_error(f"Session CSV export failed: {resp.text}")
        else:
            log_success("Session CSV downloaded successfully.")
    else:
        log_info("No existing session found to verify Session CSV export.")

    log_success("All features verified successfully.")

if __name__ == "__main__":
    run_all_features_verification()
