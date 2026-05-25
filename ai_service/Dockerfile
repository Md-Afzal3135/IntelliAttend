# 1. Base Python image jisme dlib install karna aasan ho
FROM python:3.11-slim

# 2. System dependencies jo OpenCV aur Face-Recognition ke liye zaroori hain
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 3. Working directory set karein
WORKDIR /app

# 4. Requirements copy aur install karein
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Baaki saara code copy karein
COPY . .

# 6. FastAPI app chalane ki command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]