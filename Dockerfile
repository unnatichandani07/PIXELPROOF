FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY backend ./backend
COPY frontend ./frontend
COPY models ./models
EXPOSE 7860
CMD ["gunicorn", "--chdir", "backend", "-b", "0.0.0.0:7860", "--timeout", "120", "--workers", "1", "app:app"]
