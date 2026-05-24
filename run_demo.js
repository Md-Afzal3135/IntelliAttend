const puppeteer = require('/Users/ajmal/Desktop/IntelliAttend/frontend/node_modules/puppeteer');

const BASE = 'http://localhost:5173';
const OUT  = '/Users/ajmal/Desktop/IntelliAttend/run_screenshots';
const fs   = require('fs');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function screenshot(page, name) {
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(`📸 ${name}`);
  return file;
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 20000 });
  await sleep(1000);
  await page.evaluate(() => { document.querySelectorAll('input').forEach(i => i.value = ''); });
  const inputs = await page.$$('input');
  for (const inp of inputs) {
    const type = await inp.evaluate(el => el.type);
    if (type === 'email' || type === 'text') { await inp.click({ clickCount: 3 }); await inp.type(email, { delay: 40 }); }
    if (type === 'password') { await inp.click({ clickCount: 3 }); await inp.type(password, { delay: 40 }); }
  }
  await sleep(400);
  await page.click('button[type="submit"]');
  await sleep(4000);
}

async function clickNav(page, label) {
  const clicked = await page.evaluate((lbl) => {
    const els = [...document.querySelectorAll('nav a, aside a, nav button')];
    const match = els.find(e => e.textContent.trim().toLowerCase().includes(lbl.toLowerCase()));
    if (match) { match.click(); return true; }
    return false;
  }, label);
  await sleep(2500);
  return clicked;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  console.log('\n🚀 IntelliAttend — Running Full App Demo\n');

  // 1. Landing page
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 20000 });
  await sleep(2000);
  await screenshot(page, '01_landing');

  // 2. Login page
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await screenshot(page, '02_login');

  // ── ADMIN SESSION ───────────────────────────────────────────────
  await login(page, 'admin@intelliattend.com', 'Admin@123');
  await screenshot(page, '03_admin_dashboard');

  await clickNav(page, 'student');
  await screenshot(page, '04_student_management');

  await clickNav(page, 'attendance');
  await screenshot(page, '05_attendance');

  await clickNav(page, 'report');
  await screenshot(page, '06_reports');

  await clickNav(page, 'setting');
  await screenshot(page, '07_profile');

  // Logout
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.toLowerCase().includes('logout'));
    if (btn) btn.click();
  });
  await sleep(2500);
  await screenshot(page, '08_after_logout');

  // ── TEACHER SESSION ─────────────────────────────────────────────
  await login(page, 'teacher@intelliattend.com', 'Teacher@123');
  await screenshot(page, '09_teacher_dashboard');

  await clickNav(page, 'attendance');
  await screenshot(page, '10_teacher_attendance');

  // Logout
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.toLowerCase().includes('logout'));
    if (btn) btn.click();
  });
  await sleep(2500);

  // ── STUDENT SESSION ─────────────────────────────────────────────
  await login(page, 'student@intelliattend.com', 'Student@123');
  await screenshot(page, '11_student_dashboard');

  await clickNav(page, 'profile');
  await screenshot(page, '12_student_profile');

  await browser.close();

  console.log('\n════════════════════════════════════════');
  console.log('  ✅ Demo complete — 12 screenshots saved');
  if (errors.length) {
    console.log(`  ⚠️  ${errors.length} JS errors detected:`);
    errors.slice(0, 5).forEach(e => console.log(`     - ${e.substring(0,100)}`));
  } else {
    console.log('  ✅ No JS errors detected');
  }
  console.log(`  📁 ${OUT}`);
  console.log('════════════════════════════════════════');
})();
