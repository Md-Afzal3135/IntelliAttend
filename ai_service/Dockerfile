FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# Upgrade pip and run with fallback configuration to bypass lockouts
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefer-binary face-recognition opencv-python-headless

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]