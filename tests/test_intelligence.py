"""Tests for Frontier Tower Event Intelligence API."""

import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from api.intelligence import (
    router,
    get_floor_pulse,
    get_community_network,
    get_live_analytics,
    get_revenue_optimization,
    query_bot
)

# Test fixtures
@pytest.fixture
def mock_jwt_payload():
    return {
        "sub": "test_user",
        "aud": "frontier-dashboard",
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())
    }

@pytest.fixture
def mock_redis():
    redis_mock = AsyncMock()
    redis_mock.get = AsyncMock(return_value=None)
    redis_mock.setex = AsyncMock(return_value=True)
    redis_mock.incr = AsyncMock(return_value=1)
    redis_mock.expire = AsyncMock(return_value=True)
    redis_mock.publish = AsyncMock(return_value=1)
    return redis_mock

@pytest.fixture
def mock_db_connection():
    conn_mock = AsyncMock()
    return conn_mock

# Test floor pulse endpoint
@pytest.mark.asyncio
async def test_get_floor_pulse(mock_jwt_payload, mock_redis, mock_db_connection):
    """Test /api/floors/{floor_id}/pulse endpoint."""
    
    # Mock room data
    mock_rooms = [
        {
            'id': 'f16r1',
            'name': 'Lounge',
            'x': 45,
            'y': 42,
            'width': 25,
            'height': 30,
            'capacity': 60
        }
    ]
    
    # Mock event data
    mock_events = [
        {
            'id': 'evt_123',
            'title': 'AI Safety Workshop',
            'tags': ['AI Safety'],
            'room_id': 'f16r1',
            'attendee_count': 45
        }
    ]
    
    mock_db_connection.fetch = AsyncMock(side_effect=[mock_rooms, mock_events])
    
    with patch('api.intelligence.get_redis', return_value=mock_redis):
        with patch('api.intelligence.get_db_connection', return_value=mock_db_connection):
            with patch('api.intelligence.verify_jwt', return_value=mock_jwt_payload):
                result = await get_floor_pulse(16, mock_jwt_payload)
    
    assert len(result) == 1
    room_pulse = result[0]
    assert room_pulse["roomId"] == "f16r1"
    assert room_pulse["roomName"] == "Lounge"
    assert room_pulse["coordinates"]["x"] == 45
    assert room_pulse["event"]["id"] == "evt_123"
    assert room_pulse["event"]["attendeeCount"] == 45
    assert room_pulse["liveMetrics"]["utilizationRate"] == 0.75

# Test community network endpoint
@pytest.mark.asyncio
async def test_get_community_network(mock_jwt_payload, mock_redis, mock_db_connection):
    """Test /api/community/network endpoint."""
    
    # Mock member data
    mock_members = [
        {
            'id': 'member_123',
            'name': 'Dr. Sarah Chen',
            'avatar_url': 'https://example.com/avatar.jpg',
            'primary_topic': 'AI Safety',
            'floor': 9,
            'influence_score': 8.5
        }
    ]
    
    # Mock connection data
    mock_connections = [
        {
            'member_a': 'member_123',
            'member_b': 'member_456',
            'strength': 0.85,
            'reason': 'Co-attended 3 events',
            'event_count': 3
        }
    ]
    
    mock_db_connection.fetch = AsyncMock(side_effect=[mock_members, mock_connections])
    
    with patch('api.intelligence.get_redis', return_value=mock_redis):
        with patch('api.intelligence.get_db_connection', return_value=mock_db_connection):
            with patch('api.intelligence.verify_jwt', return_value=mock_jwt_payload):
                result = await get_community_network(30, mock_jwt_payload)
    
    assert len(result["nodes"]) == 1
    assert result["nodes"][0]["id"] == "member_123"
    assert result["nodes"][0]["influenceScore"] == 8.5
    
    assert len(result["edges"]) == 1
    assert result["edges"][0]["strength"] == 0.85

# Test live analytics endpoint
@pytest.mark.asyncio
async def test_get_live_analytics(mock_jwt_payload, mock_redis, mock_db_connection):
    """Test /api/analytics/live endpoint."""
    
    mock_db_connection.fetchval = AsyncMock(side_effect=[
        127,     # active_members
        3,       # live_events
        0.85,    # collaboration_score (will be * 10)
        2400.00  # revenue_today
    ])
    
    mock_trending = [
        {'topic': 'AI Safety', 'event_count': 4}
    ]
    
    mock_floor_activity = [
        {'floor': 9, 'activity_score': 0.89, 'current_events': 2}
    ]
    
    mock_db_connection.fetch = AsyncMock(side_effect=[mock_trending, mock_floor_activity])
    
    with patch('api.intelligence.get_redis', return_value=mock_redis):
        with patch('api.intelligence.get_db_connection', return_value=mock_db_connection):
            with patch('api.intelligence.verify_jwt', return_value=mock_jwt_payload):
                result = await get_live_analytics(mock_jwt_payload)
    
    assert result["tower"]["activeMembers"] == 127
    assert result["tower"]["liveEvents"] == 3
    assert result["tower"]["collaborationScore"] == 8.5
    assert result["tower"]["revenueToday"] == 2400.00
    
    assert len(result["trendingTopics"]) == 1
    assert result["trendingTopics"][0]["topic"] == "AI Safety"
    
    assert len(result["floorActivity"]) == 1
    assert result["floorActivity"][0]["floor"] == 9

# Test revenue optimization endpoint
@pytest.mark.asyncio
async def test_get_revenue_optimization(mock_jwt_payload, mock_redis, mock_db_connection):
    """Test /api/revenue/optimization endpoint."""
    
    mock_opportunities = [
        {
            'slot': 'Tuesday 18:00-20:00',
            'avg_utilization': 0.34,
            'price_multiplier': 2.1,
            'projected_revenue': 1800.00
        }
    ]
    
    mock_floor_util = [
        {
            'floor': 16,
            'utilization_rate': 0.78,
            'revenue_contribution': 0.45
        }
    ]
    
    mock_db_connection.fetch = AsyncMock(side_effect=[mock_opportunities, mock_floor_util])
    
    with patch('api.intelligence.get_redis', return_value=mock_redis):
        with patch('api.intelligence.get_db_connection', return_value=mock_db_connection):
            with patch('api.intelligence.verify_jwt', return_value=mock_jwt_payload):
                result = await get_revenue_optimization(mock_jwt_payload)
    
    assert len(result["opportunities"]) == 1
    assert result["opportunities"][0]["timeSlot"] == "Tuesday 18:00-20:00"
    assert result["opportunities"][0]["recommendedPriceMultiplier"] == 2.1
    
    assert len(result["floorUtilization"]) == 1
    assert result["floorUtilization"][0]["floor"] == 16
    assert result["floorUtilization"][0]["utilizationRate"] == 0.78

# Test bot query endpoint
@pytest.mark.asyncio
async def test_query_bot(mock_jwt_payload, mock_redis, mock_db_connection):
    """Test /api/bot/query endpoint."""
    
    query = {
        "chatId": "test_chat",
        "message": "Show floor pulse"
    }
    
    mock_floor_data = [
        {
            'floor': 9,
            'pulse': 8.5,
            'active_events_24h': 12,
            'unique_attendees_7d': 45
        }
    ]
    
    mock_db_connection.fetch = AsyncMock(return_value=mock_floor_data)
    
    with patch('api.intelligence.get_redis', return_value=mock_redis):
        with patch('api.intelligence.get_db_connection', return_value=mock_db_connection):
            with patch('api.intelligence.verify_jwt', return_value=mock_jwt_payload):
                from api.intelligence import BotQuery
                bot_query = BotQuery(**query)
                result = await query_bot(bot_query, mock_jwt_payload)
    
    assert "Floor 9 pulse" in result["message"]
    assert "8.5/10" in result["message"]
    assert result["data"]["floors"][0]["floor"] == 9
    assert len(result["suggestions"]) > 0

# Test rate limiting
@pytest.mark.asyncio
async def test_rate_limiting(mock_jwt_payload, mock_redis, mock_db_connection):
    """Test rate limiting functionality."""
    
    # Simulate rate limit exceeded
    mock_redis.incr = AsyncMock(return_value=181)  # Over limit of 180
    
    with patch('api.intelligence.get_redis', return_value=mock_redis):
        with patch('api.intelligence.get_db_connection', return_value=mock_db_connection):
            with patch('api.intelligence.verify_jwt', return_value=mock_jwt_payload):
                with pytest.raises(Exception) as exc_info:
                    await get_floor_pulse(16, mock_jwt_payload)
                
                # Check that it raised an HTTPException with 429 status
                assert "429" in str(exc_info.value) or "Rate limit" in str(exc_info.value)

# Test caching behavior
@pytest.mark.asyncio
async def test_caching(mock_jwt_payload, mock_redis, mock_db_connection):
    """Test that cached responses are returned."""
    
    cached_data = json.dumps([
        {
            "roomId": "cached_room",
            "roomName": "Cached Room",
            "coordinates": {"x": 0, "y": 0, "width": 10, "height": 10},
            "event": None,
            "liveMetrics": {
                "attendeeCount": 0,
                "capacity": 50,
                "activityHeat": 0.0,
                "utilizationRate": 0.0
            }
        }
    ])
    
    mock_redis.get = AsyncMock(return_value=cached_data)
    
    with patch('api.intelligence.get_redis', return_value=mock_redis):
        with patch('api.intelligence.get_db_connection', return_value=mock_db_connection):
            with patch('api.intelligence.verify_jwt', return_value=mock_jwt_payload):
                result = await get_floor_pulse(16, mock_jwt_payload)
    
    # Should return cached data without hitting database
    assert len(result) == 1
    assert result[0]["roomId"] == "cached_room"
    mock_db_connection.fetch.assert_not_called()

# Test WebSocket publishing
@pytest.mark.asyncio
async def test_bot_query_publishes_to_websocket(mock_jwt_payload, mock_redis, mock_db_connection):
    """Test that bot queries publish to WebSocket channel."""
    
    query = {
        "chatId": "test_chat",
        "message": "test message"
    }
    
    mock_db_connection.fetchval = AsyncMock(return_value=5)
    
    with patch('api.intelligence.get_redis', return_value=mock_redis):
        with patch('api.intelligence.get_db_connection', return_value=mock_db_connection):
            with patch('api.intelligence.verify_jwt', return_value=mock_jwt_payload):
                from api.intelligence import BotQuery
                bot_query = BotQuery(**query)
                await query_bot(bot_query, mock_jwt_payload)
    
    # Check that publish was called
    mock_redis.publish.assert_called()
    call_args = mock_redis.publish.call_args
    assert call_args[0][0] == "tower-ai-feed"
    published_data = json.loads(call_args[0][1])
    assert published_data["type"] == "bot_response"
    assert published_data["chatId"] == "test_chat"

# Test exact JSON format compliance
@pytest.mark.asyncio
async def test_json_format_compliance(mock_jwt_payload, mock_redis, mock_db_connection):
    """Test that all endpoints return exact JSON formats as specified."""
    
    # Test floor pulse format
    mock_rooms = [{'id': 'f16r1', 'name': 'Lounge', 'x': 45, 'y': 42, 'width': 25, 'height': 30, 'capacity': 60}]
    mock_events = []
    mock_db_connection.fetch = AsyncMock(side_effect=[mock_rooms, mock_events])
    
    with patch('api.intelligence.get_redis', return_value=mock_redis):
        with patch('api.intelligence.get_db_connection', return_value=mock_db_connection):
            with patch('api.intelligence.verify_jwt', return_value=mock_jwt_payload):
                result = await get_floor_pulse(16, mock_jwt_payload)
    
    # Verify exact structure
    assert isinstance(result, list)
    room = result[0]
    assert "roomId" in room
    assert "roomName" in room
    assert "coordinates" in room
    assert all(k in room["coordinates"] for k in ["x", "y", "width", "height"])
    assert "event" in room
    assert "liveMetrics" in room
    assert all(k in room["liveMetrics"] for k in ["attendeeCount", "capacity", "activityHeat", "utilizationRate"])