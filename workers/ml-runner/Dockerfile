FROM python:3.11-slim
WORKDIR /app
COPY workers/ml-runner/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY workers/ml-runner /app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
