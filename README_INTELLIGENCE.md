# Frontier Tower Event Intelligence API

Production-grade backend for AI-powered event analytics and real-time tower intelligence.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env

# Run migrations
psql -U postgres -d frontier_tower < migrations/0003_intelligence.sql

# Start Redis
redis-server

# Run the API
python3 api/app.py
```

## Architecture

### Core Components
- **FastAPI** - High-performance async API framework
- **PostgreSQL** - Primary database (SQLite for dev)
- **Redis** - Caching and rate limiting
- **WebSocket** - Real-time updates
- **JWT** - Authentication (aud="frontier-dashboard")

### Performance Targets
- p95 latency: cached ≤200ms, cold ≤600ms @ 100 RPS
- WebSocket: Real-time updates with 15s heartbeat
- Caching: 15-300s TTL based on endpoint

## API Endpoints

### Floor Intelligence
```
GET /api/floors/{floor_id}/pulse
```
Returns room-based visualization data with live metrics.

### Community Network
```
GET /api/community/network?days=30
```
Graph-ready format with nodes and edges for network visualization.

### Live Analytics
```
GET /api/analytics/live
```
Dashboard metrics including tower stats, trending topics, floor activity.

### Revenue Optimization
```
GET /api/revenue/optimization
```
Business intelligence with underutilized slots and pricing recommendations.

### AI Bot
```
POST /api/bot/query
```
Enhanced bot with caching and real-time WebSocket publishing.

## WebSocket Channels

- `/ws/tower-feed` - Main AI feed for dashboard updates
- `/ws/floor-pulse/{floor_id}` - Floor-specific real-time updates

## Rate Limits

- Floor Pulse: 180 req/min
- Live Analytics: 240 req/min  
- Bot Query: 15 req/min per chat

## Testing

```bash
# Run tests
pytest tests/test_intelligence.py -v

# With coverage
pytest tests/test_intelligence.py --cov=api --cov-report=html
```

## Database Schema

Key tables:
- `events` - Event data with tags and room assignments
- `rooms` - Spatial coordinates and capacity
- `members` - User profiles with influence scores
- `event_analytics` - Impact and synergy metrics
- `floor_insights` - Aggregated floor activity
- `revenue_metrics` - Pricing optimization data
- `member_connections` - Social graph edges

## Configuration

See `.env.example` for all configuration options.

## Production Deployment

1. Set `ENV=production` in environment
2. Configure PostgreSQL connection string
3. Set secure JWT_SECRET
4. Enable HTTPS with proper certificates
5. Configure Redis for persistence
6. Set up monitoring with Prometheus

## Monitoring

Metrics endpoint available at `:9090/metrics` when enabled.