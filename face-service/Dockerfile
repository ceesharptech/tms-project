# Use Python 3.9 slim image (smaller size)
FROM python:3.13-slim-bookworm

# Install system dependencies for OpenCV and DeepFace
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first (for Docker layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# CRITICAL: Pre-download DeepFace models during build
# This runs a Python script that forces model download
RUN python -c "from deepface import DeepFace; \
    DeepFace.build_model('ArcFace'); \
    print('ArcFace model downloaded successfully')"

EXPOSE 8000

# Run the FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
