"""WebSocket server for real-time tower updates."""

import json
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, Set

import redis.asyncio as redis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from jwt import decode, InvalidTokenError

from api.config import JWT_SECRET

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

# Active connections
connections: Dict[str, Set[WebSocket]] = {
    "tower-ai-feed": set(),
    "floor-pulse-2": set(),
    "floor-pulse-4": set(),
    "floor-pulse-9": set(),
    "floor-pulse-15": set(),
    "floor-pulse-16": set(),
}

# Redis pubsub client
redis_client: Optional[redis.Redis] = None

async def get_redis():
    global redis_client
    if not redis_client:
        redis_client = await redis.from_url("redis://localhost:6379", decode_responses=True)
    return redis_client

async def verify_ws_token(token: str) -> dict:
    """Verify JWT token for WebSocket connection."""
    try:
        payload = decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("aud") != "frontier-dashboard":
            raise InvalidTokenError("Invalid audience")
        return payload
    except InvalidTokenError as e:
        logger.error(f"WebSocket auth failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

class ConnectionManager:
    """Manages WebSocket connections and broadcasts."""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "tower-ai-feed": set(),
            "floor-pulse-2": set(),
            "floor-pulse-4": set(),
            "floor-pulse-9": set(),
            "floor-pulse-15": set(),
            "floor-pulse-16": set(),
        }
        self.user_channels: Dict[WebSocket, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, channel: str):
        """Add connection to channel."""
        await websocket.accept()
        if channel in self.active_connections:
            self.active_connections[channel].add(websocket)
            if websocket not in self.user_channels:
                self.user_channels[websocket] = set()
            self.user_channels[websocket].add(channel)
            logger.info(f"WebSocket connected to channel: {channel}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove connection from all channels."""
        if websocket in self.user_channels:
            for channel in self.user_channels[websocket]:
                if channel in self.active_connections:
                    self.active_connections[channel].discard(websocket)
            del self.user_channels[websocket]
            logger.info("WebSocket disconnected")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send message to specific connection."""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
    
    async def broadcast(self, channel: str, message: str):
        """Broadcast message to all connections in channel."""
        if channel in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to connection: {e}")
                    disconnected.add(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn)

manager = ConnectionManager()

@router.websocket("/ws/tower-feed")
async def websocket_tower_feed(websocket: WebSocket, token: str = None):
    """WebSocket endpoint for tower AI feed."""
    
    # Verify JWT
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return
    
    try:
        jwt_payload = await verify_ws_token(token)
        user_id = jwt_payload.get("sub", "anonymous")
    except:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    # Connect to tower-ai-feed channel
    await manager.connect(websocket, "tower-ai-feed")
    
    # Send welcome message
    await manager.send_personal_message(
        json.dumps({
            "type": "connected",
            "channel": "tower-ai-feed",
            "user": user_id,
            "message": "Connected to Frontier Tower AI Feed"
        }),
        websocket
    )
    
    try:
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "ping":
                await manager.send_personal_message(
                    json.dumps({"type": "pong"}),
                    websocket
                )
            elif message.get("type") == "subscribe":
                # Subscribe to additional channels
                channel = message.get("channel")
                if channel and channel.startswith("floor-pulse-"):
                    await manager.connect(websocket, channel)
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "subscribed",
                            "channel": channel
                        }),
                        websocket
                    )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@router.websocket("/ws/floor-pulse/{floor_id}")
async def websocket_floor_pulse(websocket: WebSocket, floor_id: int, token: str = None):
    """WebSocket endpoint for floor-specific pulse updates."""
    
    # Verify JWT
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return
    
    try:
        jwt_payload = await verify_ws_token(token)
        user_id = jwt_payload.get("sub", "anonymous")
    except:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    # Validate floor
    if floor_id not in [2, 4, 9, 15, 16]:
        await websocket.close(code=1003, reason="Invalid floor")
        return
    
    channel = f"floor-pulse-{floor_id}"
    
    # Connect to floor-specific channel
    await manager.connect(websocket, channel)
    
    # Send welcome message
    await manager.send_personal_message(
        json.dumps({
            "type": "connected",
            "channel": channel,
            "floor": floor_id,
            "user": user_id,
            "message": f"Connected to Floor {floor_id} Pulse Feed"
        }),
        websocket
    )
    
    try:
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await manager.send_personal_message(
                    json.dumps({"type": "pong"}),
                    websocket
                )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

async def redis_listener():
    """Listen to Redis pubsub and broadcast to WebSocket clients."""
    r = await get_redis()
    pubsub = r.pubsub()
    
    # Subscribe to channels
    await pubsub.subscribe(
        "tower-ai-feed",
        "floor-pulse-2",
        "floor-pulse-4",
        "floor-pulse-9",
        "floor-pulse-15",
        "floor-pulse-16"
    )
    
    logger.info("Redis listener started")
    
    async for message in pubsub.listen():
        if message["type"] == "message":
            channel = message["channel"]
            data = message["data"]
            
            # Broadcast to WebSocket clients
            await manager.broadcast(channel, data)
            
            logger.debug(f"Broadcasted to {channel}: {data[:100]}...")

# Publish helper functions
async def publish_bot_response(chat_id: str, response: dict):
    """Publish bot response to tower-ai-feed."""
    r = await get_redis()
    await r.publish("tower-ai-feed", json.dumps({
        "type": "bot_response",
        "chatId": chat_id,
        "response": response,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }))

async def publish_floor_pulse(floor_id: int, pulse_data: dict):
    """Publish floor pulse update."""
    r = await get_redis()
    await r.publish(f"floor-pulse-{floor_id}", json.dumps({
        "type": "floor_pulse",
        "floor": floor_id,
        "data": pulse_data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }))

async def publish_live_metrics(metrics: dict):
    """Publish live metrics to tower feed."""
    r = await get_redis()
    await r.publish("tower-ai-feed", json.dumps({
        "type": "live_metrics",
        "metrics": metrics,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }))

async def publish_revenue_alert(opportunity: dict):
    """Publish revenue optimization alert."""
    r = await get_redis()
    await r.publish("tower-ai-feed", json.dumps({
        "type": "revenue_alert",
        "opportunity": opportunity,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }))