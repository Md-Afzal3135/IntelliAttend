FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install pre-compiled heavy wheels directly from links to bypass 8GB compilation crash
RUN pip install --no-cache-dir \
    https://github.com/themagicalmammal/Automated-Attendance-System/releases/download/v1.0.0/dlib-19.24.1-cp311-cp311-linux_x86_64.whl \
    face-recognition \
    opencv-python-headless

# 2. Install rest of the light dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]