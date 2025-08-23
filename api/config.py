"""Configuration settings for Frontier Tower Intelligence API."""

import os
from typing import Optional

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Settings
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_RELOAD = os.getenv("API_RELOAD", "true").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "info").lower()

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "frontier-tower-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Database Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/frontier_tower"
)

# SQLite for development
SQLITE_URL = os.getenv("SQLITE_URL", "sqlite:///frontier_tower.db")

# Use SQLite in development, Postgres in production
IS_PRODUCTION = os.getenv("ENV", "development") == "production"
ACTIVE_DATABASE_URL = DATABASE_URL if IS_PRODUCTION else SQLITE_URL

# Redis Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
REDIS_DECODE_RESPONSES = True

# CORS Settings
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,https://frontiertower.ai"
).split(",")

# Rate Limiting
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
RATE_LIMIT_REDIS_PREFIX = "rate:"

# Cache Configuration
CACHE_ENABLED = os.getenv("CACHE_ENABLED", "true").lower() == "true"
CACHE_PREFIX = "intel:"

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL = 30  # seconds
WS_MAX_CONNECTIONS_PER_IP = 10

# Security
BCRYPT_ROUNDS = 12
API_KEY_HEADER = "X-API-Key"
REQUIRE_HTTPS = IS_PRODUCTION

# Feature Flags
ENABLE_WEBSOCKET = os.getenv("ENABLE_WEBSOCKET", "true").lower() == "true"
ENABLE_BOT_QUERY = os.getenv("ENABLE_BOT_QUERY", "true").lower() == "true"
ENABLE_REVENUE_OPTIMIZATION = os.getenv("ENABLE_REVENUE_OPTIMIZATION", "true").lower() == "true"

# Monitoring
ENABLE_METRICS = os.getenv("ENABLE_METRICS", "true").lower() == "true"
METRICS_PORT = int(os.getenv("METRICS_PORT", "9090"))

# External Services
CALENDAR_API_URL = os.getenv("CALENDAR_API_URL", "https://api.frontiertower.ai/calendar")
CALENDAR_API_KEY = os.getenv("CALENDAR_API_KEY", "")

# Limits
MAX_NETWORK_NODES = 100
MAX_NETWORK_EDGES = 200
MAX_TRENDING_TOPICS = 5
MAX_REVENUE_OPPORTUNITIES = 10

# Timeouts (seconds)
DATABASE_TIMEOUT = 30
REDIS_TIMEOUT = 5
HTTP_TIMEOUT = 30

def get_settings():
    """Get current configuration settings."""
    return {
        "api_host": API_HOST,
        "api_port": API_PORT,
        "environment": "production" if IS_PRODUCTION else "development",
        "database": "postgresql" if IS_PRODUCTION else "sqlite",
        "redis_enabled": CACHE_ENABLED,
        "websocket_enabled": ENABLE_WEBSOCKET,
        "rate_limiting": RATE_LIMIT_ENABLED,
        "cors_origins": CORS_ORIGINS,
    }