"""Database connection management for Frontier Tower Intelligence API."""

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

import asyncpg
from asyncpg import Connection, Pool

from api.config import DATABASE_URL, DATABASE_TIMEOUT, IS_PRODUCTION, SQLITE_URL

logger = logging.getLogger(__name__)

# Connection pool
_pool: Optional[Pool] = None

async def init_db_pool():
    """Initialize database connection pool."""
    global _pool
    
    if IS_PRODUCTION:
        # PostgreSQL for production
        try:
            _pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=5,
                max_size=20,
                timeout=DATABASE_TIMEOUT,
                command_timeout=DATABASE_TIMEOUT,
            )
            logger.info("PostgreSQL connection pool created")
        except Exception as e:
            logger.error(f"Failed to create PostgreSQL pool: {e}")
            raise
    else:
        # For development, we'll use asyncpg with a local PostgreSQL
        # or fall back to in-memory operations
        try:
            # Try to connect to local PostgreSQL
            _pool = await asyncpg.create_pool(
                "postgresql://postgres:postgres@localhost:5432/frontier_tower_dev",
                min_size=2,
                max_size=10,
                timeout=DATABASE_TIMEOUT,
            )
            logger.info("Development PostgreSQL connection pool created")
        except:
            logger.warning("PostgreSQL not available, using mock database")
            _pool = None

async def close_db_pool():
    """Close database connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed")

@asynccontextmanager
async def get_db_connection() -> AsyncGenerator[Connection, None]:
    """Get a database connection from the pool."""
    global _pool
    
    if not _pool:
        # Initialize pool if not exists
        await init_db_pool()
    
    if _pool:
        async with _pool.acquire() as connection:
            yield connection
    else:
        # Mock connection for testing without database
        yield MockConnection()

async def test_db_connection() -> bool:
    """Test database connectivity."""
    try:
        async with get_db_connection() as conn:
            if hasattr(conn, 'fetchval'):
                result = await conn.fetchval("SELECT 1")
                return result == 1
            return True  # Mock connection always returns True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False

async def execute_migration(migration_path: str):
    """Execute a SQL migration file."""
    try:
        with open(migration_path, 'r') as f:
            sql = f.read()
        
        async with get_db_connection() as conn:
            if hasattr(conn, 'execute'):
                await conn.execute(sql)
                logger.info(f"Migration executed: {migration_path}")
            else:
                logger.warning(f"Mock mode: Skipping migration {migration_path}")
                
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

class MockConnection:
    """Mock database connection for development without database."""
    
    async def fetch(self, query, *args):
        """Mock fetch - returns empty list."""
        logger.debug(f"Mock fetch: {query[:50]}...")
        return []
    
    async def fetchval(self, query, *args):
        """Mock fetchval - returns None or mock value."""
        logger.debug(f"Mock fetchval: {query[:50]}...")
        
        # Return mock values for specific queries
        if "COUNT" in query:
            return 0
        elif "SELECT 1" in query:
            return 1
        elif "AVG" in query or "SUM" in query:
            return 0.0
        return None
    
    async def fetchrow(self, query, *args):
        """Mock fetchrow - returns None."""
        logger.debug(f"Mock fetchrow: {query[:50]}...")
        return None
    
    async def execute(self, query, *args):
        """Mock execute - does nothing."""
        logger.debug(f"Mock execute: {query[:50]}...")
        return "MOCK"

# Database initialization queries
INIT_QUERIES = [
    """
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        calendar_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        start_utc TIMESTAMP NOT NULL,
        end_utc TIMESTAMP NOT NULL,
        location TEXT,
        room_id TEXT,
        url TEXT,
        tags TEXT[],
        raw JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        floor INTEGER NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        width INTEGER DEFAULT 20,
        height INTEGER DEFAULT 20,
        theme TEXT,
        capacity INTEGER DEFAULT 50,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        avatar_url TEXT,
        primary_topic TEXT,
        floor INTEGER,
        role TEXT,
        influence_score DECIMAL(3,1) DEFAULT 5.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
]

async def init_database():
    """Initialize database with required tables."""
    try:
        async with get_db_connection() as conn:
            if hasattr(conn, 'execute'):
                for query in INIT_QUERIES:
                    await conn.execute(query)
                logger.info("Database initialized successfully")
            else:
                logger.warning("Mock mode: Skipping database initialization")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

# Query helpers
async def fetch_one(query: str, *args):
    """Fetch a single row."""
    async with get_db_connection() as conn:
        return await conn.fetchrow(query, *args)

async def fetch_many(query: str, *args):
    """Fetch multiple rows."""
    async with get_db_connection() as conn:
        return await conn.fetch(query, *args)

async def fetch_value(query: str, *args):
    """Fetch a single value."""
    async with get_db_connection() as conn:
        return await conn.fetchval(query, *args)

async def execute(query: str, *args):
    """Execute a query without returning results."""
    async with get_db_connection() as conn:
        return await conn.execute(query, *args)