FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/ml-service:/app

WORKDIR /app

# Install system utilities needed for building wheels and healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install core wheel/typing dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel typing-extensions

# Install PyTorch CPU using --extra-index-url so PyPI packages resolve cleanly
RUN pip install --no-cache-dir torch --extra-index-url https://download.pytorch.org/whl/cpu

# Install service dependencies
COPY ml-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Download small spaCy model for PII redaction (Presidio)
RUN python -m spacy download en_core_web_sm

# Copy ml-service production code
COPY ml-service/ /app/ml-service/

# Expose port FastAPI
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--app-dir", "ml-service", "--host", "0.0.0.0", "--port", "8000"]
