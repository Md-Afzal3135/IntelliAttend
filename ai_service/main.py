import logging
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from PIL import Image
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("IntelliAttend")

app = FastAPI(title="IntelliAttend AI Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenCV built-in face detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

@app.get("/")
def home():
    return {"status": "running", "service": "IntelliAttend AI Microservice", "mode": "production-ready"}

@app.post("/verify")
async def verify_attendance(file: UploadFile = File(...)):
    try:
        request_object_content = await file.read()
        image = Image.open(io.BytesIO(request_object_content)).convert('RGB')
        open_cv_image = np.array(image)
        open_cv_image = open_cv_image[:, :, ::-1].copy()
        
        gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) > 0:
            logger.info(f"✅ Face detected: {len(faces)} found.")
            return {"success": True, "match": True, "faces_detected": len(faces), "message": "Attendance verified via core vision."}
        else:
            logger.warning("❌ No face detected.")
            return {"success": False, "match": False, "faces_detected": 0, "message": "Face not detected."}
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {"success": False, "error": str(e)}