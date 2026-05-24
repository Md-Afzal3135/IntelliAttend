# IntelliAttend 🎓

> **AI-Powered Attendance Management System** — Real-time face recognition for colleges, schools, and organizations.

![IntelliAttend Banner](docs/banner.png)

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS, Framer Motion, Recharts |
| Backend | Django 6.0.5, DRF, JWT Auth, SQLite (dev) |
| AI Service | FastAPI, face_recognition, OpenCV, MediaPipe |
| Auth | JWT (access + refresh tokens), Role-based access |

## 🧩 Runtime Versions

- Python **3.12+** (tested on **3.13**)
- Node.js **22+** (tested on **22.17.1**)
- npm **10+**

## 📁 Project Structure

```
IntelliAttend/
├── frontend/        # React + Tailwind CSS SPA
├── backend/         # Django REST Framework API
├── ai_service/      # FastAPI AI microservice (face recognition)
├── media/           # Uploaded face images
└── docs/            # Documentation
```

## 🔐 Roles

| Role | Access |
|---|---|
| **Admin** | Full access — manage students, teachers, departments, reports |
| **Teacher** | Run attendance sessions, view reports for their subjects |
| **Student** | View own attendance records and percentage |

## ⚡ Quick Start

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data        # Creates demo admin/teacher/student
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm ci
npm run dev
```

### AI Service
```bash
cd ai_service
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload
```

## 🌐 Environment Variables

Copy `.env.example` to `.env` in each service directory.

Tip: this repo includes `.python-version` and `.nvmrc` for consistent local runtime setup.

## 📋 Default Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@intelliattend.com | Admin@123 |
| Teacher | teacher@intelliattend.com | Teacher@123 |
| Student | arjun.mehta@student.intelliattend.com | Student@123 |
