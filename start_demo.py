#!/usr/bin/env python3
"""Simple demo server startup without Redis dependencies."""

import logging
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime

# Import only the demo router
from api.demo_routes import router as demo_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Frontier Tower Live Heatmap Demo",
    description="Real-time floor heatmap demonstration",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "*"  # Allow all origins in development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests."""
    start_time = datetime.utcnow()
    
    response = await call_next(request)
    
    process_time = (datetime.utcnow() - start_time).total_seconds() * 1000
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Duration: {process_time:.2f}ms"
    )
    
    return response

# Mount demo router
app.include_router(demo_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "frontier-tower-heatmap-demo"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "Frontier Tower Live Heatmap Demo",
        "version": "1.0.0",
        "status": "ready",
        "endpoints": {
            "health": "/health",
            "demo_health": "/api/health/demo",
            "floors": "/api/floors",
            "floor_pulse": "/api/floors/{floor_id}/pulse"
        },
        "features": [
            "real-time-activity-simulation",
            "dynamic-heatmap-data",
            "multi-room-support",
            "cors-enabled"
        ]
    }

if __name__ == "__main__":
    logger.info("Starting Frontier Tower Heatmap Demo Server...")
    uvicorn.run(
        "start_demo:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )