"""Frontier Tower Event Intelligence API."""

import hashlib
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.auth import verify_jwt
from api.database import get_db_connection

router = APIRouter(prefix="/api", tags=["intelligence"])

# Redis client
redis_client: Optional[redis.Redis] = None

async def get_redis():
    global redis_client
    if not redis_client:
        redis_client = await redis.from_url("redis://localhost:6379", decode_responses=True)
    return redis_client

# Rate limiting
RATE_LIMITS = {
    "/api/floors/*/pulse": (180, 60),  # 180 requests per minute
    "/api/analytics/live": (240, 60),   # 240 requests per minute
    "/api/bot/query": (15, 60),         # 15 requests per minute per chat
}

# Cache TTLs
CACHE_TTLS = {
    "intel:pulse": 30,      # 30 seconds
    "intel:network": 300,   # 5 minutes
    "intel:live": 15,       # 15 seconds
    "bot": 30,              # 30 seconds
    "intel:revenue": 60,    # 1 minute
}

# Models
class RoomEvent(BaseModel):
    id: str
    title: str
    topicTags: List[str]
    status: str
    attendeeCount: int

class LiveMetrics(BaseModel):
    attendeeCount: int
    capacity: int
    activityHeat: float
    utilizationRate: float

class RoomPulse(BaseModel):
    roomId: str
    roomName: str
    coordinates: Dict[str, int]
    event: Optional[RoomEvent]
    liveMetrics: LiveMetrics

class NetworkNode(BaseModel):
    id: str
    name: str
    avatarUrl: Optional[str]
    primaryTopic: str
    floor: int
    influenceScore: float

class NetworkEdge(BaseModel):
    source: str
    target: str
    strength: float
    reason: str
    eventCount: int

class NetworkGraph(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]

class TrendingTopic(BaseModel):
    topic: str
    velocity: float
    eventCount: int

class FloorActivity(BaseModel):
    floor: int
    activityScore: float
    currentEvents: int

class TowerMetrics(BaseModel):
    activeMembers: int
    liveEvents: int
    collaborationScore: float
    revenueToday: float

class LiveAnalytics(BaseModel):
    tower: TowerMetrics
    trendingTopics: List[TrendingTopic]
    floorActivity: List[FloorActivity]

class RevenueOpportunity(BaseModel):
    timeSlot: str
    currentUtilization: float
    recommendedPriceMultiplier: float
    projectedRevenue: float

class FloorUtilization(BaseModel):
    floor: int
    utilizationRate: float
    revenueContribution: float

class RevenueOptimization(BaseModel):
    opportunities: List[RevenueOpportunity]
    floorUtilization: List[FloorUtilization]

class BotQuery(BaseModel):
    chatId: str
    message: str

class BotResponse(BaseModel):
    message: str
    data: Optional[Dict[str, Any]]
    suggestions: List[str]

# Helper functions
async def cache_get(key: str) -> Optional[str]:
    r = await get_redis()
    return await r.get(key)

async def cache_set(key: str, value: str, ttl: int):
    r = await get_redis()
    await r.setex(key, ttl, value)

async def check_rate_limit(path: str, identifier: str) -> bool:
    r = await get_redis()
    key = f"rate:{path}:{identifier}"
    
    for pattern, (limit, window) in RATE_LIMITS.items():
        if pattern.replace("*", "") in path:
            count = await r.incr(key)
            if count == 1:
                await r.expire(key, window)
            return count <= limit
    return True

# Endpoints
@router.get("/floors/{floor_id}/pulse", response_model=List[RoomPulse])
async def get_floor_pulse(
    floor_id: int,
    jwt_payload: dict = Depends(verify_jwt)
) -> List[RoomPulse]:
    """Get real-time pulse for all rooms on a floor."""
    
    # Check rate limit
    if not await check_rate_limit(f"/api/floors/{floor_id}/pulse", jwt_payload.get("sub", "anonymous")):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # Check cache
    cache_key = f"intel:pulse:{floor_id}"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)
    
    async with get_db_connection() as conn:
        # Get rooms on floor
        rooms = await conn.fetch("""
            SELECT id, name, x, y, width, height, capacity
            FROM rooms
            WHERE floor = $1
        """, floor_id)
        
        # Get current events
        now = datetime.now(timezone.utc)
        events = await conn.fetch("""
            SELECT e.id, e.title, e.tags, e.room_id, 
                   COUNT(ea.member_id) as attendee_count
            FROM events e
            LEFT JOIN event_attendees ea ON e.id = ea.event_id
            WHERE e.room_id IN (SELECT id FROM rooms WHERE floor = $1)
              AND e.start_utc <= $2 AND e.end_utc >= $2
            GROUP BY e.id
        """, floor_id, now)
        
        events_by_room = {e['room_id']: e for e in events}
        
        result = []
        for room in rooms:
            event_data = events_by_room.get(room['id'])
            
            room_pulse = {
                "roomId": room['id'],
                "roomName": room['name'],
                "coordinates": {
                    "x": room['x'],
                    "y": room['y'],
                    "width": room['width'],
                    "height": room['height']
                },
                "event": None,
                "liveMetrics": {
                    "attendeeCount": 0,
                    "capacity": room['capacity'],
                    "activityHeat": 0.0,
                    "utilizationRate": 0.0
                }
            }
            
            if event_data:
                attendee_count = event_data['attendee_count'] or 0
                utilization = min(attendee_count / room['capacity'], 1.0) if room['capacity'] > 0 else 0
                
                room_pulse["event"] = {
                    "id": event_data['id'],
                    "title": event_data['title'],
                    "topicTags": event_data['tags'] or [],
                    "status": "live",
                    "attendeeCount": attendee_count
                }
                room_pulse["liveMetrics"] = {
                    "attendeeCount": attendee_count,
                    "capacity": room['capacity'],
                    "activityHeat": utilization * 0.8 + 0.2,  # Base heat of 0.2 for any event
                    "utilizationRate": utilization
                }
            
            result.append(room_pulse)
    
    # Cache result
    await cache_set(cache_key, json.dumps(result), CACHE_TTLS["intel:pulse"])
    
    return result

@router.get("/community/network", response_model=NetworkGraph)
async def get_community_network(
    days: int = Query(30, ge=1, le=365),
    jwt_payload: dict = Depends(verify_jwt)
) -> NetworkGraph:
    """Get community network graph."""
    
    # Check cache
    cache_key = f"intel:network:{days}"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)
    
    async with get_db_connection() as conn:
        # Get active members
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        members = await conn.fetch("""
            SELECT DISTINCT m.id, m.name, m.avatar_url, m.primary_topic, 
                   m.floor, m.influence_score
            FROM members m
            JOIN event_attendees ea ON m.id = ea.member_id
            JOIN events e ON ea.event_id = e.id
            WHERE e.start_utc >= $1
            LIMIT 100
        """, cutoff_date)
        
        # Get connections
        member_ids = [m['id'] for m in members]
        connections = await conn.fetch("""
            SELECT member_a, member_b, strength, reason, event_count
            FROM member_connections
            WHERE member_a = ANY($1::text[]) AND member_b = ANY($1::text[])
              AND last_interaction >= $2
            ORDER BY strength DESC
            LIMIT 200
        """, member_ids, cutoff_date)
        
        nodes = [
            {
                "id": m['id'],
                "name": m['name'],
                "avatarUrl": m['avatar_url'],
                "primaryTopic": m['primary_topic'] or "General",
                "floor": m['floor'] or 1,
                "influenceScore": float(m['influence_score'] or 5.0)
            }
            for m in members
        ]
        
        edges = [
            {
                "source": c['member_a'],
                "target": c['member_b'],
                "strength": float(c['strength']),
                "reason": c['reason'] or f"Co-attended {c['event_count']} events",
                "eventCount": c['event_count']
            }
            for c in connections
        ]
        
        result = {"nodes": nodes, "edges": edges}
    
    # Cache result
    await cache_set(cache_key, json.dumps(result), CACHE_TTLS["intel:network"])
    
    return result

@router.get("/analytics/live", response_model=LiveAnalytics)
async def get_live_analytics(jwt_payload: dict = Depends(verify_jwt)) -> LiveAnalytics:
    """Get live dashboard analytics."""
    
    # Check rate limit
    if not await check_rate_limit("/api/analytics/live", jwt_payload.get("sub", "anonymous")):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # Check cache
    cache_key = "intel:live"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)
    
    async with get_db_connection() as conn:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Tower metrics
        active_members = await conn.fetchval("""
            SELECT COUNT(DISTINCT member_id)
            FROM event_attendees ea
            JOIN events e ON ea.event_id = e.id
            WHERE e.start_utc >= $1
        """, now - timedelta(hours=24))
        
        live_events = await conn.fetchval("""
            SELECT COUNT(*)
            FROM events
            WHERE start_utc <= $1 AND end_utc >= $1
        """, now)
        
        collaboration_score = await conn.fetchval("""
            SELECT AVG(strength) * 10
            FROM member_connections
            WHERE last_interaction >= $1
        """, now - timedelta(days=7)) or 5.0
        
        revenue_today = await conn.fetchval("""
            SELECT COALESCE(SUM(projected_revenue), 0)
            FROM revenue_metrics
            WHERE updated_at >= $1
        """, today_start) or 0.0
        
        # Trending topics
        trending = await conn.fetch("""
            SELECT unnest(tags) as topic, COUNT(*) as event_count
            FROM events
            WHERE start_utc >= $1
            GROUP BY topic
            ORDER BY event_count DESC
            LIMIT 5
        """, now - timedelta(days=7))
        
        trending_topics = [
            {
                "topic": t['topic'],
                "velocity": min(t['event_count'] / 10, 0.99),  # Normalize to 0-1
                "eventCount": t['event_count']
            }
            for t in trending
        ]
        
        # Floor activity
        floor_activity = await conn.fetch("""
            SELECT f.floor, f.activity_score,
                   COUNT(e.id) as current_events
            FROM floor_insights f
            LEFT JOIN rooms r ON f.floor = r.floor
            LEFT JOIN events e ON r.id = e.room_id 
                AND e.start_utc <= $1 AND e.end_utc >= $1
            GROUP BY f.floor, f.activity_score
            ORDER BY f.floor
        """, now)
        
        result = {
            "tower": {
                "activeMembers": active_members or 0,
                "liveEvents": live_events or 0,
                "collaborationScore": float(collaboration_score),
                "revenueToday": float(revenue_today)
            },
            "trendingTopics": trending_topics,
            "floorActivity": [
                {
                    "floor": f['floor'],
                    "activityScore": float(f['activity_score'] or 0.5),
                    "currentEvents": f['current_events'] or 0
                }
                for f in floor_activity
            ]
        }
    
    # Cache result
    await cache_set(cache_key, json.dumps(result), CACHE_TTLS["intel:live"])
    
    return result

@router.get("/revenue/optimization", response_model=RevenueOptimization)
async def get_revenue_optimization(jwt_payload: dict = Depends(verify_jwt)) -> RevenueOptimization:
    """Get revenue optimization insights."""
    
    # Check cache
    cache_key = "intel:revenue"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)
    
    async with get_db_connection() as conn:
        # Get underutilized time slots
        opportunities = await conn.fetch("""
            SELECT slot, avg_utilization, price_multiplier, projected_revenue
            FROM revenue_metrics
            WHERE avg_utilization < 0.5
            ORDER BY price_multiplier DESC
            LIMIT 10
        """)
        
        # Get floor utilization
        floor_util = await conn.fetch("""
            SELECT r.floor,
                   AVG(ea.attendance_rate) as utilization_rate,
                   SUM(rm.projected_revenue) / NULLIF(SUM(rm.projected_revenue) OVER (), 0) as revenue_contribution
            FROM rooms r
            LEFT JOIN LATERAL (
                SELECT e.room_id, 
                       COUNT(ea.member_id)::float / NULLIF(r.capacity, 0) as attendance_rate
                FROM events e
                LEFT JOIN event_attendees ea ON e.id = ea.event_id
                WHERE e.room_id = r.id
                  AND e.start_utc >= NOW() - INTERVAL '7 days'
                GROUP BY e.room_id
            ) ea ON true
            LEFT JOIN revenue_metrics rm ON rm.slot LIKE '%' || r.floor || '%'
            GROUP BY r.floor
            ORDER BY r.floor
        """)
        
        result = {
            "opportunities": [
                {
                    "timeSlot": o['slot'],
                    "currentUtilization": float(o['avg_utilization']),
                    "recommendedPriceMultiplier": float(o['price_multiplier']),
                    "projectedRevenue": float(o['projected_revenue'])
                }
                for o in opportunities
            ],
            "floorUtilization": [
                {
                    "floor": f['floor'],
                    "utilizationRate": float(f['utilization_rate'] or 0.5),
                    "revenueContribution": float(f['revenue_contribution'] or 0.2)
                }
                for f in floor_util
            ]
        }
    
    # Cache result
    await cache_set(cache_key, json.dumps(result), CACHE_TTLS["intel:revenue"])
    
    return result

@router.post("/bot/query", response_model=BotResponse)
async def query_bot(
    query: BotQuery,
    jwt_payload: dict = Depends(verify_jwt)
) -> BotResponse:
    """Query the enhanced AI bot."""
    
    # Check rate limit per chat
    if not await check_rate_limit("/api/bot/query", f"{jwt_payload.get('sub')}:{query.chatId}"):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # Generate cache key from message hash
    msg_hash = hashlib.md5(f"{query.chatId}:{query.message}".encode()).hexdigest()
    cache_key = f"bot:{query.chatId}:{msg_hash}"
    
    # Check cache
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)
    
    async with get_db_connection() as conn:
        # Analyze query intent
        message_lower = query.message.lower()
        
        if "pulse" in message_lower or "activity" in message_lower:
            # Get floor pulse data
            floor_data = await conn.fetch("""
                SELECT floor, pulse, active_events_24h, unique_attendees_7d
                FROM floor_insights
                ORDER BY pulse DESC
                LIMIT 3
            """)
            
            top_floor = floor_data[0] if floor_data else None
            message = f"🔥 Floor {top_floor['floor']} pulse: {float(top_floor['pulse'])}/10 impact with {top_floor['active_events_24h']} events in 24h"
            
            data = {
                "floors": [
                    {
                        "floor": f['floor'],
                        "pulse": float(f['pulse']),
                        "events24h": f['active_events_24h'],
                        "attendees7d": f['unique_attendees_7d']
                    }
                    for f in floor_data
                ]
            }
            
            suggestions = [
                "Check specific floor activity",
                "View trending topics",
                "Analyze cross-floor collaboration"
            ]
            
        elif "revenue" in message_lower or "optimization" in message_lower:
            # Get revenue insights
            opportunities = await conn.fetch("""
                SELECT slot, avg_utilization, recommended_price
                FROM revenue_metrics
                WHERE avg_utilization < 0.5
                ORDER BY (recommended_price - 100) DESC
                LIMIT 3
            """)
            
            if opportunities:
                top_opp = opportunities[0]
                message = f"💰 Opportunity: {top_opp['slot']} at {float(top_opp['avg_utilization'])*100:.0f}% utilization. Recommended price: ${float(top_opp['recommended_price']):.0f}"
            else:
                message = "All time slots are well optimized!"
            
            data = {
                "opportunities": [
                    {
                        "slot": o['slot'],
                        "utilization": float(o['avg_utilization']),
                        "price": float(o['recommended_price'])
                    }
                    for o in opportunities
                ]
            }
            
            suggestions = [
                "View floor utilization rates",
                "Check peak demand times",
                "Analyze pricing trends"
            ]
            
        elif "collaboration" in message_lower or "network" in message_lower:
            # Get collaboration insights
            top_connections = await conn.fetch("""
                SELECT mc.strength, m1.name as member_a_name, m2.name as member_b_name
                FROM member_connections mc
                JOIN members m1 ON mc.member_a = m1.id
                JOIN members m2 ON mc.member_b = m2.id
                WHERE mc.last_interaction >= NOW() - INTERVAL '7 days'
                ORDER BY mc.strength DESC
                LIMIT 3
            """)
            
            cross_floor = await conn.fetchval("""
                SELECT COUNT(*)
                FROM member_connections mc
                JOIN members m1 ON mc.member_a = m1.id
                JOIN members m2 ON mc.member_b = m2.id
                WHERE m1.floor != m2.floor
                  AND mc.last_interaction >= NOW() - INTERVAL '7 days'
            """) or 0
            
            message = f"🤝 Cross-floor collaboration: {cross_floor} connections this week"
            
            data = {
                "crossFloorConnections": cross_floor,
                "topConnections": [
                    {
                        "members": [c['member_a_name'], c['member_b_name']],
                        "strength": float(c['strength'])
                    }
                    for c in top_connections
                ]
            }
            
            suggestions = [
                "View network graph",
                "Check floor synergy scores",
                "Analyze topic clusters"
            ]
            
        else:
            # Default response with general insights
            live_events = await conn.fetchval("""
                SELECT COUNT(*) FROM events
                WHERE start_utc <= NOW() AND end_utc >= NOW()
            """) or 0
            
            message = f"👋 Frontier Tower is buzzing with {live_events} live events! What would you like to explore?"
            data = {"liveEvents": live_events}
            suggestions = [
                "Show floor pulse",
                "Check revenue optimization",
                "View collaboration network"
            ]
        
        result = {
            "message": message,
            "data": data,
            "suggestions": suggestions
        }
    
    # Cache result
    await cache_set(cache_key, json.dumps(result), CACHE_TTLS["bot"])
    
    # Publish to WebSocket for real-time updates
    r = await get_redis()
    await r.publish("tower-ai-feed", json.dumps({
        "type": "bot_response",
        "chatId": query.chatId,
        "response": result
    }))
    
    return result