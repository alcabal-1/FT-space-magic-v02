"""Frontier Tower Event Intelligence - Main FastAPI Application."""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import routers
from api.intelligence import router as intelligence_router
from api.websocket import router as websocket_router, redis_listener
from api.demo_routes import router as demo_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Background tasks
background_tasks = set()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    logger.info("Starting Frontier Tower Event Intelligence...")
    
    # Try to start Redis listener for WebSocket broadcasts (optional for demo)
    try:
        task = asyncio.create_task(redis_listener())
        background_tasks.add(task)
        logger.info("Redis listener started for WebSocket broadcasts")
    except Exception as e:
        logger.warning(f"Redis not available for WebSocket broadcasts: {e}")
    
    yield
    
    # Cleanup
    logger.info("Shutting down...")
    for task in background_tasks:
        task.cancel()
    await asyncio.gather(*background_tasks, return_exceptions=True)

# Create FastAPI app
app = FastAPI(
    title="Frontier Tower Event Intelligence",
    description="AI-powered event analytics and real-time tower intelligence",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://frontiertower.ai",
        "*"  # Allow all origins in development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
)

# Request ID middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID for tracing."""
    import uuid
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Logging middleware
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

# Health check endpoints
@app.get("/health")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "frontier-tower-intelligence"
    }

@app.get("/api/health/ready")
async def readiness_check():
    """Readiness check with dependency status."""
    import redis.asyncio as redis
    from api.database import test_db_connection
    
    checks = {
        "database": False,
        "redis": False,
        "status": "not_ready"
    }
    
    # Check database
    try:
        await test_db_connection()
        checks["database"] = True
    except Exception as e:
        logger.error(f"Database check failed: {e}")
    
    # Check Redis
    try:
        r = await redis.from_url("redis://localhost:6379")
        await r.ping()
        await r.close()
        checks["redis"] = True
    except Exception as e:
        logger.error(f"Redis check failed: {e}")
    
    # Overall status
    if all([checks["database"], checks["redis"]]):
        checks["status"] = "ready"
        return JSONResponse(content=checks, status_code=200)
    else:
        return JSONResponse(content=checks, status_code=503)

# Mount routers
app.include_router(intelligence_router)
app.include_router(websocket_router)
app.include_router(demo_router)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "Frontier Tower Event Intelligence",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "readiness": "/api/health/ready",
            "intelligence": {
                "floor_pulse": "/api/floors/{floor_id}/pulse",
                "community_network": "/api/community/network",
                "live_analytics": "/api/analytics/live",
                "revenue_optimization": "/api/revenue/optimization",
                "bot_query": "/api/bot/query"
            },
            "websocket": {
                "tower_feed": "/ws/tower-feed",
                "floor_pulse": "/ws/floor-pulse/{floor_id}"
            }
        },
        "documentation": "/docs",
        "openapi": "/openapi.json"
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors."""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"Path {request.url.path} not found",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Handle 500 errors."""
    logger.error(f"Internal error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# CLI runner
if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("API_RELOAD", "true").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    
    logger.info(f"Starting server on {host}:{port}")
    logger.info(f"Reload: {reload}, Log level: {log_level}")
    
    # Run with uvicorn
    uvicorn.run(
        "api.app:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level,
        access_log=True
    )