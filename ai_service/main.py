"""
IntelliAttend AI Microservice
FastAPI + face_recognition + OpenCV + MediaPipe

Endpoints:
  POST /encode      — Encode face images and return embeddings
  POST /recognize   — Match frame against known encodings
  POST /liveness    — Liveness detection (eye aspect ratio)
  GET  /health      — Health check
"""
import base64
import io
import logging
import os
import random
from contextlib import asynccontextmanager
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger("intelliattend.ai")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ─── Optional dependency flags ────────────────────────────────────────────────

FACE_RECOGNITION_AVAILABLE = False
CV2_AVAILABLE = False
MP_AVAILABLE = False
mp_face_mesh = None

try:
    if os.getenv("FORCE_MOCK_AI", "False").lower() == "true":
        raise ImportError("FORCE_MOCK_AI is enabled")
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
    logger.info("✅ face_recognition loaded")
except ImportError:
    logger.warning("⚠️  face_recognition not available — running in mock mode")

try:
    import cv2
    CV2_AVAILABLE = True
    logger.info("✅ OpenCV loaded")
except ImportError:
    logger.warning("⚠️  OpenCV not available — falling back to Pillow")

try:
    import mediapipe as mp
    # mediapipe >= 0.10 removed mp.solutions — check for it gracefully
    if hasattr(mp, 'solutions') and hasattr(mp.solutions, 'face_mesh'):
        mp_face_mesh = mp.solutions.face_mesh
        MP_AVAILABLE = True
        logger.info("✅ MediaPipe loaded (solutions API)")
    else:
        logger.warning("⚠️  MediaPipe >= 0.10 detected — mp.solutions removed, liveness detection bypassed")
except ImportError:
    logger.warning("⚠️  MediaPipe not available — liveness detection bypassed")


# ─── Lifespan (startup / shutdown) ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm models on startup so first request isn't slow."""
    logger.info("🚀 IntelliAttend AI Service starting...")
    if FACE_RECOGNITION_AVAILABLE:
        # Trigger dlib model load by running a dummy encode
        try:
            dummy = np.zeros((100, 100, 3), dtype=np.uint8)
            face_recognition.face_encodings(dummy)
            logger.info("✅ face_recognition model pre-warmed")
        except Exception:
            pass
    if MP_AVAILABLE:
        try:
            with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1):
                pass
            logger.info("✅ MediaPipe FaceMesh pre-warmed")
        except Exception:
            pass
    logger.info(f"   Mode: {'full' if FACE_RECOGNITION_AVAILABLE else 'mock'}")
    yield
    logger.info("🛑 AI Service shutting down")


# ─── App setup ────────────────────────────────────────────────────────────────

MAX_BODY_BYTES = 10 * 1024 * 1024  # 10 MB

app = FastAPI(
    title="IntelliAttend AI Service",
    description="Face recognition microservice for IntelliAttend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """Reject requests larger than MAX_BODY_BYTES to prevent OOM on large frames."""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_BYTES:
        return JSONResponse(
            status_code=413,
            content={"detail": f"Request body too large. Max allowed: {MAX_BODY_BYTES // (1024*1024)} MB"},
        )
    return await call_next(request)


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class EncodeRequest(BaseModel):
    student_id: str
    image_urls: List[str] = []
    image_base64: List[str] = []  # Base64-encoded images


class KnownEncoding(BaseModel):
    student_id: str
    student_name: str
    encodings: List[List[float]]


class RecognizeRequest(BaseModel):
    frame: str              # Base64 JPEG frame from webcam
    known_encodings: List[KnownEncoding]
    tolerance: float = 0.6  # Lower = stricter match


class LivenessRequest(BaseModel):
    frame: str              # Base64 JPEG frame
    check_type: str = "blink"  # blink | head_movement


# ─── Utility Functions ────────────────────────────────────────────────────────

def base64_to_image(b64_string: str) -> np.ndarray:
    """
    Convert a React base64 data-URL (or raw base64) to an RGB numpy array.
    Handles the 'data:image/jpeg;base64,' prefix React's canvas.toDataURL() adds.
    Uses OpenCV + NumPy if available, falls back to Pillow.
    """
    # Strip the data-URL prefix (data:image/jpeg;base64,<data>)
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]

    # Strip any whitespace/newlines that might break decoding
    b64_string = b64_string.strip()

    try:
        img_data = base64.b64decode(b64_string)
    except Exception as e:
        raise ValueError(f"Base64 decode failed — make sure the image is a valid JPEG/PNG base64 string. Detail: {e}")

    if CV2_AVAILABLE:
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(
                "OpenCV could not decode the image. The frame may be corrupted or in an unsupported format. "
                "Ensure the camera is sending a valid JPEG frame."
            )
        # Convert BGR (OpenCV default) → RGB (face_recognition requirement)
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    else:
        from PIL import Image
        pil_img = Image.open(io.BytesIO(img_data)).convert("RGB")
        return np.array(pil_img)


def url_to_image(url: str) -> Optional[np.ndarray]:
    """Download image from URL and convert to RGB numpy array."""
    try:
        import requests
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        if CV2_AVAILABLE:
            nparr = np.frombuffer(resp.content, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return None
            return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        else:
            from PIL import Image
            return np.array(Image.open(io.BytesIO(resp.content)).convert("RGB"))
    except Exception as e:
        logger.error(f"Failed to load image from URL {url}: {e}")
        return None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Service health check — reports mode and available libraries."""
    return {
        "status": "ok",
        "face_recognition": FACE_RECOGNITION_AVAILABLE,
        "opencv": CV2_AVAILABLE,
        "mediapipe": MP_AVAILABLE,
        "mode": "full" if FACE_RECOGNITION_AVAILABLE else "mock",
        "max_body_mb": MAX_BODY_BYTES // (1024 * 1024),
    }


@app.post("/encode")
async def encode_faces(req: EncodeRequest):
    """
    Encode face images for a student and return 128-d embedding vectors.

    Accepts:
      - image_base64: list of base64 data-URLs from React's canvas.toDataURL()
      - image_urls:   list of HTTP URLs to images

    Returns 128-d face encoding vectors, or a 422 with a user-friendly
    bilingual error message when no face is detected.

    Mock mode (no dlib installed): returns one random 128-d vector.
    """
    if not FACE_RECOGNITION_AVAILABLE:
        logger.warning("Mock mode: returning dummy encodings for student %s", req.student_id)
        return {
            "student_id": req.student_id,
            "encodings": [np.random.rand(128).tolist()],
            "count": 1,
            "images_processed": 1,
            "images_failed": 0,
            "mock": True,
        }

    encodings: List[List[float]] = []
    images_processed = 0
    images_failed = 0
    last_error: str = ""

    # ── Process URL-based images ──────────────────────────────────────────────
    for url in req.image_urls:
        img = url_to_image(url)
        if img is None:
            images_failed += 1
            continue
        face_encs = face_recognition.face_encodings(img)
        if face_encs:
            encodings.append(face_encs[0].tolist())
            images_processed += 1
        else:
            logger.warning("No face detected in URL image: %s", url)
            images_failed += 1
            last_error = "url_no_face"

    # ── Process base64 images (from React camera) ─────────────────────────────
    for idx, b64 in enumerate(req.image_base64):
        try:
            img = base64_to_image(b64)
        except ValueError as e:
            logger.error("base64_to_image failed for image #%d: %s", idx, e)
            images_failed += 1
            last_error = "decode_error"
            continue
        except Exception as e:
            logger.error("Unexpected error decoding image #%d: %s", idx, e)
            images_failed += 1
            last_error = "decode_error"
            continue

        # face_recognition.face_encodings() returns [] if no face found — handle explicitly
        try:
            face_encs = face_recognition.face_encodings(img)
        except Exception as e:
            logger.error("face_recognition.face_encodings crashed for image #%d: %s", idx, e)
            images_failed += 1
            last_error = "recognition_crash"
            continue

        if face_encs:
            encodings.append(face_encs[0].tolist())
            images_processed += 1
        else:
            # ⚠️ Empty list = no face detected in this frame
            logger.warning("No face found in base64 image #%d — poor lighting or no face in frame", idx)
            images_failed += 1
            last_error = "no_face"

    # ── Return results or raise user-friendly error ───────────────────────────
    if not encodings:
        # Build bilingual error message based on what went wrong
        if last_error == "decode_error":
            detail = (
                "Image decode karne mein problem aayi. "
                "Camera frame invalid hai — please retry. "
                "(Image could not be decoded. Please try again.)"
            )
        else:
            # Most common case: face not visible (bad lighting, face not centred, blur)
            detail = (
                "Face read nahi ho paa raha. "
                "Please ensure proper lighting and look directly at the camera. "
                "(Kripya camera ke saamne seedha dekhe aur achchi roshni mein retry karein.)"
            )
        raise HTTPException(status_code=422, detail=detail)

    return {
        "student_id": req.student_id,
        "encodings": encodings,
        "count": len(encodings),
        "images_processed": images_processed,
        "images_failed": images_failed,
    }


@app.post("/recognize")
async def recognize_face(req: RecognizeRequest):
    """
    Recognize a face in a webcam frame against known student encodings.
    Returns matched student ID and confidence score.

    Mock mode: randomly matches ~50% of the time for UI testing.
    """
    if not req.known_encodings:
        return {"recognized": False, "reason": "No registered faces to compare against"}

    if not FACE_RECOGNITION_AVAILABLE:
        # Mock mode — random match for UI/integration testing
        if random.random() > 0.5:
            match = random.choice(req.known_encodings)
            return {
                "recognized": True,
                "student_id": match.student_id,
                "student_name": match.student_name,
                "confidence": round(random.uniform(0.75, 0.98), 3),
                "mock": True,
            }
        return {"recognized": False, "reason": "No match found", "mock": True}

    # Decode frame
    try:
        frame = base64_to_image(req.frame)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to decode frame: {e}")

    # Detect face locations
    face_locations = face_recognition.face_locations(frame, model="hog")
    if not face_locations:
        return {"recognized": False, "reason": "No face detected in frame"}

    # Get frame encodings
    frame_encodings = face_recognition.face_encodings(frame, face_locations)
    if not frame_encodings:
        return {"recognized": False, "reason": "Could not encode detected face"}

    frame_enc = frame_encodings[0]

    # Compare against all known students
    best_match = None
    best_distance = float("inf")

    for known in req.known_encodings:
        if not known.encodings:
            continue
        try:
            known_enc_arrays = [np.array(e) for e in known.encodings]
            distances = face_recognition.face_distance(known_enc_arrays, frame_enc)
            min_dist = float(np.min(distances))
        except Exception as e:
            logger.error("Error comparing encodings for %s: %s", known.student_id, e)
            continue

        if min_dist < best_distance:
            best_distance = min_dist
            best_match = known

    if best_match and best_distance <= req.tolerance:
        confidence = round(max(0.0, 1.0 - best_distance), 3)
        return {
            "recognized": True,
            "student_id": best_match.student_id,
            "student_name": best_match.student_name,
            "confidence": confidence,
            "distance": round(best_distance, 3),
        }

    return {
        "recognized": False,
        "reason": f"No match (best distance: {round(best_distance, 3)}, threshold: {req.tolerance})",
    }


@app.post("/liveness")
async def liveness_check(req: LivenessRequest):
    """
    Liveness detection using MediaPipe FaceMesh + Eye Aspect Ratio (EAR).
    EAR > 0.20 indicates open eyes (live face).
    Bypassed gracefully when MediaPipe is unavailable.
    """
    if not MP_AVAILABLE:
        return {
            "live": True,
            "method": "bypass",
            "message": "MediaPipe not available — liveness check bypassed",
        }

    try:
        frame = base64_to_image(req.frame)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to decode frame: {e}")

    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    ) as face_mesh:
        results = face_mesh.process(frame)

        if not results.multi_face_landmarks:
            return {"live": False, "reason": "No face landmarks detected"}

        landmarks = results.multi_face_landmarks[0]

        def get_lm(idx: int) -> np.ndarray:
            lm = landmarks.landmark[idx]
            return np.array([lm.x, lm.y, lm.z])

        def eye_aspect_ratio(indices: List[int]) -> float:
            """
            EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
            Left eye:  [33, 160, 158, 133, 153, 144]
            Right eye: [362, 385, 387, 263, 373, 380]
            """
            pts = [get_lm(i) for i in indices]
            v1 = np.linalg.norm(pts[1] - pts[5])
            v2 = np.linalg.norm(pts[2] - pts[4])
            h  = np.linalg.norm(pts[0] - pts[3])
            return float((v1 + v2) / (2.0 * h)) if h > 1e-6 else 0.0

        left_ear  = eye_aspect_ratio([33, 160, 158, 133, 153, 144])
        right_ear = eye_aspect_ratio([362, 385, 387, 263, 373, 380])
        avg_ear   = (left_ear + right_ear) / 2.0

        # EAR > 0.20 indicates open eyes (live person)
        # Photos/screens typically have EAR near 0 or very low
        EAR_THRESHOLD = 0.20
        is_live = avg_ear > EAR_THRESHOLD

        return {
            "live": is_live,
            "method": "eye_aspect_ratio",
            "ear": round(avg_ear, 4),
            "left_ear": round(left_ear, 4),
            "right_ear": round(right_ear, 4),
            "threshold": EAR_THRESHOLD,
        }
