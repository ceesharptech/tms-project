from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="DDITS Face Recognition Service",
    description="Facial recognition microservice using DeepFace + ArcFace",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PORT = int(os.getenv("PORT", "8000"))
MODEL_NAME = os.getenv("MODEL_NAME", "ArcFace")
DETECTION_BACKEND = os.getenv("DETECTION_BACKEND", "opencv")
FACE_CONFIDENCE_THRESHOLD = float(os.getenv("FACE_CONFIDENCE_THRESHOLD", "0.4"))


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ddits-face-service",
        "model": MODEL_NAME,
        "detection_backend": DETECTION_BACKEND,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }


# Enroll and identify routes – full implementation in Phase 3
# from routes import enrollment, identification
# app.include_router(enrollment.router)
# app.include_router(identification.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
