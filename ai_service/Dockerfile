FROM jess/face_recognition:latest

WORKDIR /app

# Only copy requirements first to check other light dependencies
COPY requirements.txt .

# Remove face-recognition and opencv from requirements temporarily during install 
# because they are already pre-installed in this heavy base image!
RUN sed -i '/face-recognition/d' requirements.txt && \
    sed -i '/opencv-python/d' requirements.txt && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]