"""JWT Authentication for Frontier Tower Intelligence API."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from api.config import JWT_ALGORITHM, JWT_SECRET

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()

def create_access_token(
    subject: str,
    audience: str = "frontier-dashboard",
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=24)
    
    to_encode = {
        "sub": subject,
        "aud": audience,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    }
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            audience="frontier-dashboard"
        )
        return payload
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Verify JWT token from Authorization header."""
    token = credentials.credentials
    
    try:
        payload = decode_token(token)
        
        # Check expiration
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check audience
        if payload.get("aud") != "frontier-dashboard":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token audience",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return payload
        
    except JWTError as e:
        logger.error(f"JWT verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(jwt_payload: dict = Depends(verify_jwt)) -> str:
    """Get current user from JWT payload."""
    user_id = jwt_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    return user_id

def create_api_key(
    key_id: str,
    name: str,
    permissions: list = None
) -> str:
    """Create an API key token."""
    payload = {
        "kid": key_id,
        "name": name,
        "type": "api_key",
        "permissions": permissions or ["read"],
        "iat": datetime.now(timezone.utc)
    }
    
    encoded = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded

def verify_api_key(api_key: str) -> dict:
    """Verify an API key."""
    try:
        payload = jwt.decode(
            api_key,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        
        if payload.get("type") != "api_key":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        return payload
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

# Optional auth dependency (allows anonymous access)
async def optional_jwt(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[dict]:
    """Optional JWT verification - returns None if no token provided."""
    if not credentials:
        return None
    
    try:
        return decode_token(credentials.credentials)
    except:
        return None

# Admin verification
async def verify_admin(jwt_payload: dict = Depends(verify_jwt)) -> dict:
    """Verify user has admin privileges."""
    role = jwt_payload.get("role", "user")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return jwt_payload