import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/Users/ajmal/Desktop/IntelliAttend/run_screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('🚀 Starting Puppeteer E2E validation...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => console.log('📺 BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('❌ BROWSER ERROR:', err.message));

  try {
    // ─── 1. Register a Student ───────────────────────────────────────────────
    console.log('📝 Navigating to register page...');
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'v1_register_form.png') });

    console.log('✏️ Filling out registration form...');
    const randomSuffix = Math.floor(Math.random() * 100000);
    const studentEmail = `e2e_student_${randomSuffix}@student.com`;
    const studentId = `STU_E2E_${randomSuffix}`;

    await page.type('input[name="first_name"]', 'E2E');
    await page.type('input[name="last_name"]', 'Student');
    await page.type('input[name="email"]', studentEmail);
    await page.type('input[name="student_id"]', studentId);
    await page.type('input[name="roll_number"]', `ROLL_E2E_${randomSuffix}`);

    console.log('Selecting Branch and Course...');
    await page.waitForSelector('select[name="department_id"] option');
    await page.select('select[name="department_id"]', await page.evaluate(() => {
      const opts = document.querySelectorAll('select[name="department_id"] option');
      return opts[1] ? opts[1].value : '';
    }));
    await delay(500);

    await page.waitForSelector('select[name="course_id"] option');
    await page.select('select[name="course_id"]', await page.evaluate(() => {
      const opts = document.querySelectorAll('select[name="course_id"] option');
      return opts[1] ? opts[1].value : '';
    }));

    await page.type('input[name="password"]', 'Password@123');
    await page.type('input[name="confirm_password"]', 'Password@123');

    console.log('Submitting registration...');
    await page.evaluate(() => document.getElementById('register-submit').click());
    await page.waitForFunction(() => window.location.pathname === '/student', { timeout: 10000 });
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'v2_student_dashboard.png') });
    console.log('📸 Saved student dashboard screenshot.');

    // Logout student
    console.log('Logging out student...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const logoutBtn = btns.find(b => b.textContent.includes('Logout'));
      if (logoutBtn) logoutBtn.click();
    });
    await delay(1000);

    // ─── 2. Login as Admin ───────────────────────────────────────────────────
    console.log('🔑 Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.type('#login-email', 'admin@intelliattend.com');
    await page.type('#login-password', 'Admin@123');
    await page.evaluate(() => document.getElementById('login-submit').click());
    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 10000 });
    await delay(1000);

    // Go to Students Management
    console.log('👥 Navigating to student management...');
    await page.goto('http://localhost:5173/admin/students', { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'v3_admin_students.png') });

    // Verify 'Add Student' is missing
    const hasAddStudentBtn = await page.evaluate(() => {
      return !!document.getElementById('add-student-btn') || 
             Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Add Student'));
    });
    console.log(`🔍 "Add Student" button exists? ${hasAddStudentBtn} (Expected: false)`);

    // Verify new student reflects in table
    const studentReflected = await page.evaluate((id) => {
      return document.body.textContent.includes(id);
    }, studentId);
    console.log(`🔍 Registered student ID (${studentId}) reflected in admin list? ${studentReflected} (Expected: true)`);

    // Go to Teachers Management
    console.log('👩‍🏫 Navigating to teacher management...');
    await page.goto('http://localhost:5173/admin/teachers', { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'v4_admin_teachers.png') });

    // Verify 'Add Teacher' is present
    const hasAddTeacherBtn = await page.evaluate(() => {
      return !!document.getElementById('add-teacher-btn') ||
             Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Add Teacher'));
    });
    console.log(`🔍 "Add Teacher" button exists? ${hasAddTeacherBtn} (Expected: true)`);

    // Logout admin
    console.log('Logging out admin...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const logoutBtn = btns.find(b => b.textContent.includes('Logout'));
      if (logoutBtn) logoutBtn.click();
    });
    await delay(1000);

    // ─── 3. Login as Teacher ─────────────────────────────────────────────────
    console.log('🔑 Logging in as Teacher...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.type('#login-email', 'teacher@intelliattend.com');
    await page.type('#login-password', 'Teacher@123');
    await page.evaluate(() => document.getElementById('login-submit').click());
    await page.waitForFunction(() => window.location.pathname === '/teacher', { timeout: 10000 });
    await delay(1000);

    // Go to Face Attendance page
    console.log('📸 Navigating to face attendance...');
    await page.goto('http://localhost:5173/attendance', { waitUntil: 'networkidle2' });
    await delay(1000);

    // Start a session
    console.log('Starting active session to verify QR removal...');
    await page.waitForSelector('#subject-select option:not([value=""])');
    await page.select('#subject-select', await page.evaluate(() => {
      const opt = document.querySelector('#subject-select option:not([value=""])');
      return opt ? opt.value : '';
    }));
    await delay(500);

    await page.waitForFunction(() => {
      const btn = document.getElementById('start-session-btn');
      return btn && !btn.disabled;
    }, { timeout: 5000 });
    await delay(500);

    await page.evaluate(() => {
      document.getElementById('start-session-btn').click();
    });
    
    // Wait for session to start or error message
    try {
      await page.waitForFunction(() => {
        return Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('End Session'));
      }, { timeout: 15000 });
    } catch (e) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'err_teacher_session_start.png') });
      console.log('📸 Saved error screenshot: err_teacher_session_start.png');
      throw e;
    }
    
    await delay(1000);
    const activeSessionId = await page.evaluate(() => {
      return window.location.pathname.split('/').pop() || '';
    });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'v6_active_session_no_qr.png') });

    // Verify 'Live QR Code' is missing
    const hasQrCode = await page.evaluate(() => {
      return document.body.textContent.includes('Live QR Code') ||
             document.body.textContent.includes('Expires in');
    });
    console.log(`🔍 "Live QR Code" panel visible in teacher session? ${hasQrCode} (Expected: false)`);

    // Logout teacher
    console.log('Logging out teacher...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const logoutBtn = btns.find(b => b.textContent.includes('Logout'));
      if (logoutBtn) logoutBtn.click();
    });
    await delay(1000);

    // ─── 4. Mark Attendance as Student (QR-code-less) ───────────────────────
    console.log('🔑 Logging in as default seeded student...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#login-email');
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const studentBtn = btns.find(b => b.textContent.trim() === 'student');
      if (studentBtn) studentBtn.click();
    });
    await delay(500);
    
    await page.evaluate(() => document.getElementById('login-submit').click());
    await page.waitForFunction(() => window.location.pathname === '/student', { timeout: 10000 });
    await delay(1000);

    console.log('📸 Navigating to mark attendance page...');
    await page.goto('http://localhost:5173/student/mark-attendance', { waitUntil: 'networkidle2' });
    
    try {
      await page.waitForSelector('#session-select option:not([value=""])', { timeout: 15000 });
    } catch (e) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'err_student_mark_sessions.png') });
      console.log('📸 Saved error screenshot: err_student_mark_sessions.png');
      throw e;
    }

    // Verify QR code input is NOT present in student panel
    const hasQrInput = await page.evaluate(() => {
      return !!document.querySelector('input[placeholder*="QR"]') || 
             document.body.textContent.includes('Teacher QR Code');
    });
    console.log(`🔍 "Teacher QR Code" input panel exists? ${hasQrInput} (Expected: false)`);

    // Verify we can proceed with selected session
    await page.select('#session-select', await page.evaluate(() => {
      const opt = document.querySelector('#session-select option:not([value=""])');
      return opt ? opt.value : '';
    }));
    await delay(500);

    // Verify button is enabled without QR code
    const isStartBtnDisabled = await page.evaluate(() => {
      const btn = document.getElementById('start-attendance-btn');
      return btn ? btn.disabled : true;
    });
    console.log(`🔍 "Mark My Attendance" button disabled? ${isStartBtnDisabled} (Expected: false)`);

    // Clean up student user from DB
    console.log('Cleaning up registered student from database...');
    execSync(`../backend/venv/bin/python ../backend/manage.py shell -c "from django.contrib.auth import get_user_model; get_user_model().objects.filter(email='${studentEmail}').delete()"`);
    console.log('✅ Cleaned up student successfully.');

  } catch (error) {
    console.error('❌ E2E Error:', error);
    try {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'err_general_failure.png') });
      console.log('📸 Saved general error screenshot: err_general_failure.png');
    } catch (e) {
      console.error('Failed to take screenshot:', e);
    }
  } finally {
    await browser.close();
    console.log('🏁 E2E Test execution finished.');
  }
}

run();
