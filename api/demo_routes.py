"""Demo routes for heatmap without authentication."""

import json
import random
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["demo"])

# Sample room data matching our frontend rooms.json
DEMO_ROOMS = {
    "floor1": [
        {
            "id": "conf-room-1",
            "name": "Innovation Lab",
            "x": 50,
            "y": 100,
            "width": 120,
            "height": 80,
            "capacity": 12,
            "baseActivityHeat": 0.7
        },
        {
            "id": "conf-room-2", 
            "name": "Strategy Hub",
            "x": 200,
            "y": 100,
            "width": 100,
            "height": 60,
            "capacity": 8,
            "baseActivityHeat": 0.4
        },
        {
            "id": "open-space-1",
            "name": "Collaboration Zone",
            "x": 320,
            "y": 80,
            "width": 200,
            "height": 150,
            "capacity": 25,
            "baseActivityHeat": 0.9
        },
        {
            "id": "booth-1",
            "name": "Focus Pod A",
            "x": 100,
            "y": 220,
            "width": 40,
            "height": 40,
            "capacity": 2,
            "baseActivityHeat": 0.3
        },
        {
            "id": "booth-2",
            "name": "Focus Pod B", 
            "x": 160,
            "y": 220,
            "width": 40,
            "height": 40,
            "capacity": 2,
            "baseActivityHeat": 0.8
        },
        {
            "id": "lounge-1",
            "name": "Community Lounge",
            "x": 50,
            "y": 300,
            "width": 180,
            "height": 100,
            "capacity": 20,
            "baseActivityHeat": 0.6
        },
        {
            "id": "kitchen-1",
            "name": "Kitchen & Cafe",
            "x": 350,
            "y": 280,
            "width": 140,
            "height": 80,
            "capacity": 15,
            "baseActivityHeat": 0.5
        },
        {
            "id": "workspace-1",
            "name": "Hot Desk Area",
            "x": 250,
            "y": 300,
            "width": 80,
            "height": 120,
            "capacity": 10,
            "baseActivityHeat": 0.2
        }
    ]
}

def generate_dynamic_activity(room_id: str, base_activity: float) -> float:
    """Generate realistic activity variations."""
    import time
    import math
    
    current_time = time.time()
    
    # Create different patterns for different room types
    if "booth" in room_id:
        # Focus pods: shorter, more intense usage cycles
        cycle = math.sin(current_time / 300) * 0.4  # 5-minute cycles
    elif "open-space" in room_id:
        # Collaboration zones: longer activity periods
        cycle = math.sin(current_time / 1200) * 0.3  # 20-minute cycles
    elif "lounge" in room_id:
        # Social spaces: steady with periodic spikes
        cycle = math.sin(current_time / 900) * 0.25 + math.sin(current_time / 180) * 0.1
    else:
        # Default pattern for meeting rooms
        cycle = math.sin(current_time / 600) * 0.3  # 10-minute cycles
    
    # Add some randomness
    noise = (random.random() - 0.5) * 0.2
    
    # Calculate final activity level
    activity = base_activity + cycle + noise
    
    # Clamp to valid range
    return max(0.05, min(0.95, activity))

@router.get("/floors/{floor_id}/pulse")
async def get_floor_pulse_demo(floor_id: str) -> Dict[str, Any]:
    """Get real-time pulse for all rooms on a floor (demo version)."""
    
    if floor_id not in DEMO_ROOMS:
        return {
            "error": f"Floor {floor_id} not found",
            "floors": list(DEMO_ROOMS.keys())
        }
    
    rooms = DEMO_ROOMS[floor_id]
    
    # Generate dynamic activity levels for each room
    room_activities = {}
    for room in rooms:
        activity_level = generate_dynamic_activity(room["id"], room["baseActivityHeat"])
        room_activities[room["id"]] = {
            "level": activity_level,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    return {
        "floorId": floor_id,
        "timestamp": datetime.utcnow().isoformat(),
        "rooms": room_activities,
        "metadata": {
            "totalRooms": len(rooms),
            "averageActivity": sum(r["level"] for r in room_activities.values()) / len(rooms),
            "highActivityRooms": len([r for r in room_activities.values() if r["level"] > 0.7])
        }
    }

@router.get("/floors")
async def list_floors() -> Dict[str, Any]:
    """List all available floors."""
    return {
        "floors": list(DEMO_ROOMS.keys()),
        "metadata": {
            "totalFloors": len(DEMO_ROOMS),
            "totalRooms": sum(len(rooms) for rooms in DEMO_ROOMS.values())
        }
    }

@router.get("/health/demo")
async def demo_health():
    """Demo health check."""
    return {
        "status": "healthy",
        "service": "frontier-tower-heatmap-demo",
        "timestamp": datetime.utcnow().isoformat(),
        "features": [
            "real-time-pulse",
            "dynamic-activity-simulation", 
            "multi-floor-support",
            "websocket-ready"
        ]
    }