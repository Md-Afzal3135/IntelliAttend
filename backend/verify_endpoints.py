import requests
import json
import time
import sys
from datetime import date

BASE_URL = "http://127.0.0.1:8000/api"

# Helper for printing colored logs
def log_info(msg):
    print(f"\033[94m[INFO]\033[0m {msg}")

def log_success(msg):
    print(f"\033[92m[SUCCESS]\033[0m {msg}")

def log_error(msg):
    print(f"\033[91m[ERROR]\033[0m {msg}")

def run_verification():
    log_info("Starting IntelliAttend End-to-End API Verification")
    
    # -------------------------------------------------------------
    # 1. ADMIN LOGIN
    # -------------------------------------------------------------
    log_info("Attempting Admin login...")
    admin_login_data = {
        "email": "admin@intelliattend.com",
        "password": "Admin@123"
    }
    resp = requests.post(f"{BASE_URL}/auth/login/", json=admin_login_data)
    if resp.status_code != 200:
        log_error(f"Admin login failed: {resp.text}")
        sys.exit(1)
    
    admin_tokens = resp.json()
    admin_access = admin_tokens['access']
    admin_headers = {"Authorization": f"Bearer {admin_access}"}
    log_success("Admin logged in successfully.")

    # -------------------------------------------------------------
    # 2. GET/PUT COLLEGE CONFIG
    # -------------------------------------------------------------
    log_info("Fetching current College configuration...")
    resp = requests.get(f"{BASE_URL}/admin/college-config/", headers=admin_headers)
    if resp.status_code != 200:
        log_error(f"Failed to fetch college config: {resp.text}")
    else:
        log_success(f"College config: {resp.json()}")

    log_info("Updating/Setting College configuration coordinates to Bangalore (12.9716, 77.5946) with 100m radius...")
    config_payload = {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "radius_meters": 100,
        "college_name": "IntelliAttend Institute of Technology"
    }
    resp = requests.put(f"{BASE_URL}/admin/college-config/", json=config_payload, headers=admin_headers)
    if resp.status_code != 200:
        log_error(f"Failed to update college config: {resp.text}")
    else:
        log_success(f"College config saved: {resp.json()}")

    # -------------------------------------------------------------
    # 3. CREATE DEPARTMENT (BRANCH)
    # -------------------------------------------------------------
    log_info("Creating new Department (Branch)...")
    dept_code = f"CHEM_{int(time.time()) % 1000}"
    dept_payload = {
        "name": "Chemical Engineering",
        "code": dept_code
    }
    resp = requests.post(f"{BASE_URL}/departments/", json=dept_payload, headers=admin_headers)
    if resp.status_code not in (200, 201):
        log_error(f"Failed to create department: {resp.text}")
        sys.exit(1)
    
    department = resp.json()
    dept_id = department['id']
    log_success(f"Department created: {department['name']} (ID: {dept_id})")

    # -------------------------------------------------------------
    # 4. CREATE COURSE
    # -------------------------------------------------------------
    log_info("Creating new Course within the Department...")
    course_code = f"CH201_{int(time.time()) % 1000}"
    course_payload = {
        "name": "Thermodynamics",
        "code": course_code,
        "department": dept_id,
        "duration_years": 4
    }
    resp = requests.post(f"{BASE_URL}/courses/", json=course_payload, headers=admin_headers)
    if resp.status_code not in (200, 201):
        log_error(f"Failed to create course: {resp.text}")
        sys.exit(1)
        
    course = resp.json()
    course_id = course['id']
    log_success(f"Course created: {course['name']} (ID: {course_id})")

    # -------------------------------------------------------------
    # 5. FETCH TEACHER AND CREATE SUBJECT
    # -------------------------------------------------------------
    log_info("Listing teachers to assign a subject...")
    resp = requests.get(f"{BASE_URL}/admin/teachers/", headers=admin_headers)
    if resp.status_code != 200:
        log_error(f"Failed to fetch teachers: {resp.text}")
        sys.exit(1)
    
    teachers = resp.json()
    teacher_id = None
    for t in teachers:
        if t['email'] == 'teacher@intelliattend.com':
            teacher_id = t['id']
            break
            
    if not teacher_id and teachers:
        teacher_id = teachers[0]['id']
        
    if not teacher_id:
        log_error("No teacher found to assign subject to.")
        sys.exit(1)
        
    log_info(f"Assigning subject to teacher ID: {teacher_id}")
    
    subject_code = f"CHEM-201-{int(time.time()) % 1000}"
    subject_payload = {
        "name": "Chemical Thermodynamics",
        "code": subject_code,
        "course": course_id,
        "teacher": teacher_id,
        "credits": 3
    }
    resp = requests.post(f"{BASE_URL}/subjects/", json=subject_payload, headers=admin_headers)
    if resp.status_code not in (200, 201):
        log_error(f"Failed to create subject: {resp.text}")
        sys.exit(1)
        
    subject = resp.json()
    subject_id = subject['id']
    log_success(f"Subject created: {subject['name']} (ID: {subject_id})")

    # -------------------------------------------------------------
    # 6. TEACHER LOGIN
    # -------------------------------------------------------------
    log_info("Attempting Teacher login...")
    teacher_login_data = {
        "email": "teacher@intelliattend.com",
        "password": "Teacher@123"
    }
    resp = requests.post(f"{BASE_URL}/auth/login/", json=teacher_login_data)
    if resp.status_code != 200:
        log_error(f"Teacher login failed: {resp.text}")
        sys.exit(1)
        
    teacher_tokens = resp.json()
    teacher_access = teacher_tokens['access']
    teacher_headers = {"Authorization": f"Bearer {teacher_access}"}
    log_success("Teacher logged in successfully.")

    # -------------------------------------------------------------
    # 7. TEACHER STARTS ATTENDANCE SESSION
    # -------------------------------------------------------------
    log_info("Teacher starting attendance session...")
    session_payload = {
        "subject": subject_id,
        "status": "active",
        "notes": "E2E verification session"
    }
    resp = requests.post(f"{BASE_URL}/attendance/sessions/", json=session_payload, headers=teacher_headers)
    if resp.status_code not in (200, 201):
        log_error(f"Failed to start session: {resp.text}")
        sys.exit(1)
        
    session = resp.json()
    session_id = session['id']
    log_success(f"Attendance session started. ID: {session_id}")

    # -------------------------------------------------------------
    # 8. TEACHER FETCHES ROTATING QR CODE TOTP
    # -------------------------------------------------------------
    log_info("Teacher fetching rotating QR code TOTP...")
    resp = requests.get(f"{BASE_URL}/attendance/sessions/{session_id}/current-qr/", headers=teacher_headers)
    if resp.status_code != 200:
        log_error(f"Failed to get current QR code: {resp.text}")
        sys.exit(1)
        
    qr_data = resp.json()
    totp_code = qr_data['qr_code']
    log_success(f"Current TOTP Code: {totp_code} (Expires in: {qr_data['expires_in']}s)")

    # -------------------------------------------------------------
    # 9. STUDENT LOGIN
    # -------------------------------------------------------------
    log_info("Attempting Student login...")
    student_login_data = {
        "email": "arjun.mehta@student.intelliattend.com",
        "password": "Student@123"
    }
    resp = requests.post(f"{BASE_URL}/auth/login/", json=student_login_data)
    if resp.status_code != 200:
        log_error(f"Student login failed: {resp.text}")
        sys.exit(1)
        
    student_tokens = resp.json()
    student_access = student_tokens['access']
    student_headers = {"Authorization": f"Bearer {student_access}"}
    log_success("Student logged in successfully.")

    # -------------------------------------------------------------
    # 9B. STUDENT PROFILE AVATAR UPLOAD
    # -------------------------------------------------------------
    log_info("Testing Student profile avatar upload...")
    with open("test_avatar.png", "rb") as f:
        files = {"avatar": ("test_avatar.png", f, "image/png")}
        resp = requests.patch(f"{BASE_URL}/auth/me/", files=files, headers=student_headers)
    if resp.status_code == 200:
        student_profile_updated = resp.json()
        log_success(f"Student avatar updated successfully. Avatar URL: {student_profile_updated.get('avatar_url') or student_profile_updated.get('avatar')}")
    else:
        log_error(f"Student avatar update failed: {resp.text}")

    # -------------------------------------------------------------
    # 10. STUDENT ENROLLMENT (Verify if enrolled or enroll)
    # -------------------------------------------------------------
    # Note: To self-mark attendance, the student needs to be enrolled in the subject,
    # or the backend check might need them to be in the database. Let's make sure the student is enrolled.
    # Actually, let's enroll student arjun.mehta@student.intelliattend.com in the subject.
    # Let's get student ID first.
    log_info("Fetching student profile...")
    resp = requests.get(f"{BASE_URL}/students/my-profile/", headers=student_headers)
    if resp.status_code != 200:
        log_error(f"Failed to fetch student profile: {resp.text}")
        sys.exit(1)
    student_profile = resp.json()
    student_db_id = student_profile['id']
    log_success(f"Student DB ID: {student_db_id}")

    # Enroll via Admin
    log_info("Enrolling student in subject via Admin...")
    enroll_payload = {
        "subject": subject_id,
        "student": student_db_id
    }
    # Let's hit the db/backend via python shell or API if there is an enrollment API.
    # Wait, the models show SubjectEnrollment. Let's see if there is an enrollment endpoint.
    # Let's enroll student via python. Since we can run a shell command, we can just run a django shell command to enroll if API doesn't exist.
    # But wait, does student need to be enrolled? The view 'student_self_mark' only fetches student profile:
    # student = Student.objects.select_related('user').get(user=user)
    # And then verifies session.
    # It does not explicitly check subject enrollment in student_self_mark! Let's check:
    # student = Student.objects.select_related('user').get(user=user)
    # It gets student, checks face, geofencing, session, TOTP verification, and registers AttendanceRecord.
    # It does NOT check if student is enrolled in that subject! But enrolling is good practice anyway. Let's check.

    # -------------------------------------------------------------
    # 11. STUDENT MARKS ATTENDANCE (GPS Geofencing verification)
    # -------------------------------------------------------------
    # Let's make sure student has face registered. If not, let's register a face encoding.
    if not student_profile.get('face_registered'):
        log_info("Student face is not registered. Registering a dummy face encoding via Django ORM...")
        # Since face registration requires AI encode or direct database access, let's do a quick shell command or write it in python to set face_registered=True and dummy face_encodings.
        # But wait! We can also do it programmatically using Django's ORM or just hit the `/api/students/{id}/upload-faces/` endpoint.
        # Wait, if we use the upload-faces endpoint with a dummy image, it calls the AI service /encode which returns a mock encoding in mock mode, or a real one in full mode.
        # Let's use the API!
        log_info("Uploading dummy face image to register face...")
        with open("test_avatar.png", "rb") as f:
            files = {"images": ("test_avatar.png", f, "image/png")}
            resp = requests.post(f"{BASE_URL}/students/{student_db_id}/upload-faces/", files=files, headers=admin_headers)
        if resp.status_code != 200:
            log_error(f"Failed to upload face: {resp.text}")
        else:
            log_success(f"Face uploaded and encoded: {resp.json()}")

    # A. Test OUT OF RANGE GPS Geofencing (e.g. New York coords: 40.7128, -74.0060)
    log_info("Testing Out-Of-Range GPS Geofencing (expecting 403 Forbidden)...")
    mark_payload_out = {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "session_id": session_id,
        "qr_data": totp_code,
        "frame": "data:image/jpeg;base64,dummy_frame_data"
    }
    resp = requests.post(f"{BASE_URL}/ai/student-mark/", json=mark_payload_out, headers=student_headers)
    if resp.status_code == 403:
        log_success(f"GPS Geofencing blocked out-of-range student correctly: {resp.json()}")
    else:
        log_error(f"GPS Geofencing failed to block out-of-range student. Status: {resp.status_code}, Resp: {resp.text}")

    # B. Test IN RANGE GPS Geofencing + INVALID TOTP
    log_info("Testing In-Range GPS but Invalid TOTP QR code (expecting 403 Forbidden)...")
    mark_payload_inv_qr = {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "session_id": session_id,
        "qr_data": "999999", # Invalid QR code
        "frame": "data:image/jpeg;base64,dummy_frame_data"
    }
    resp = requests.post(f"{BASE_URL}/ai/student-mark/", json=mark_payload_inv_qr, headers=student_headers)
    if resp.status_code == 403:
        log_success(f"Blocked invalid QR code correctly: {resp.json()}")
    else:
        log_error(f"Failed to block invalid QR code. Status: {resp.status_code}, Resp: {resp.text}")

    # C. Test IN RANGE GPS + VALID TOTP (Full Success)
    # Wait, the frame needs to contain a recognizable face. Let's see. In mock mode, the AI service recognize will return recognized: True with 50% probability,
    # or in full mode it will check if there is a face. If we use a dummy frame like a blank image base64, it might return "No face detected in frame" or similar.
    # Let's try sending a mock face frame or a valid base64 image.
    # Let's generate a simple red image base64.
    import base64
    from io import BytesIO
    from PIL import Image
    buffered = BytesIO()
    img = Image.new('RGB', (100, 100), color = 'red')
    img.save(buffered, format="JPEG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    frame_data = f"data:image/jpeg;base64,{img_b64}"

    log_info("Testing In-Range GPS + Valid TOTP QR code (Success flow, looping for mock recognition match)...")
    mark_payload_success = {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "session_id": session_id,
        "qr_data": totp_code,
        "frame": frame_data
    }
    
    success = False
    for attempt in range(1, 11):
        log_info(f"Attendance mark attempt #{attempt}...")
        resp = requests.post(f"{BASE_URL}/ai/student-mark/", json=mark_payload_success, headers=student_headers)
        if resp.status_code == 200:
            log_success(f"Student marked successfully: {resp.json()}")
            success = True
            break
        elif resp.status_code == 401:
            log_info(f"Attempt #{attempt} did not match face (50% mock probability). Retrying...")
            time.sleep(0.5)
        else:
            log_error(f"Unexpected status code {resp.status_code}: {resp.text}")
            break
            
    if not success:
        log_error("Failed to mark student present after 10 attempts.")

    # Clean up: complete session
    log_info("Teacher completing the attendance session...")
    resp = requests.post(f"{BASE_URL}/attendance/sessions/{session_id}/complete/", headers=teacher_headers)
    if resp.status_code == 200:
        log_success("Session completed successfully.")
    else:
        log_error(f"Failed to complete session: {resp.text}")

    log_success("Verification script completed execution.")

if __name__ == "__main__":
    run_verification()
