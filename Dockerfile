# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build

# Stage 2: Setup Python environment and run the backend
FROM python:3.12-slim
WORKDIR /app

COPY pyproject.toml requirements.txt ./
COPY CallCenterAPI_FastAPI/requirements.txt ./CallCenterAPI_FastAPI/
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Copy built frontend assets into the FastAPI static directory so it serves them
COPY --from=frontend-builder /app/frontend/dist ./CallCenterAPI_FastAPI/static

EXPOSE 8000

CMD ["uvicorn", "CallCenterAPI_FastAPI.main:app", "--host", "0.0.0.0", "--port", "8000"]
