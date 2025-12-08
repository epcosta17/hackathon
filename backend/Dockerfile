FROM python:3.11-slim

# Install system dependencies
# ffmpeg is required for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Cloud Run defaults to port 8080
ENV PORT=8080

# Run the application
# We use shell form to allow variable expansion for $PORT
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
