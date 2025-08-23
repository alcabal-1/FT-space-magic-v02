-- Migration 0003: Event Intelligence Schema
-- Idempotent migration for analytics and intelligence features

-- Events table with extended metadata
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
    tags TEXT[], -- Array of topic tags
    raw JSONB, -- Store original calendar data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_utc);
CREATE INDEX IF NOT EXISTS idx_events_room ON events(room_id);
CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING GIN(tags);

-- Rooms table with spatial data
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
);

CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(floor);

-- Members table
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
);

CREATE INDEX IF NOT EXISTS idx_members_floor ON members(floor);
CREATE INDEX IF NOT EXISTS idx_members_topic ON members(primary_topic);

-- Event analytics
CREATE TABLE IF NOT EXISTS event_analytics (
    event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
    attendance_count INTEGER DEFAULT 0,
    impact_score DECIMAL(3,1) DEFAULT 5.0,
    floor_synergy DECIMAL(3,2) DEFAULT 0.50,
    topic_trend_score DECIMAL(3,2) DEFAULT 0.50,
    prime_time BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Floor insights aggregated data
CREATE TABLE IF NOT EXISTS floor_insights (
    floor INTEGER PRIMARY KEY,
    active_events_24h INTEGER DEFAULT 0,
    unique_attendees_7d INTEGER DEFAULT 0,
    top_tags TEXT[],
    cross_floor_edges INTEGER DEFAULT 0,
    pulse DECIMAL(3,1) DEFAULT 5.0,
    activity_score DECIMAL(3,2) DEFAULT 0.50,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Revenue metrics for optimization
CREATE TABLE IF NOT EXISTS revenue_metrics (
    slot TEXT PRIMARY KEY, -- e.g., "Tuesday 18:00-20:00"
    avg_utilization DECIMAL(3,2) DEFAULT 0.50,
    demand_index DECIMAL(3,2) DEFAULT 1.00,
    recommended_price DECIMAL(10,2) DEFAULT 100.00,
    price_multiplier DECIMAL(3,2) DEFAULT 1.00,
    projected_revenue DECIMAL(10,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member connections network
CREATE TABLE IF NOT EXISTS member_connections (
    member_a TEXT NOT NULL,
    member_b TEXT NOT NULL,
    strength DECIMAL(3,2) DEFAULT 0.50,
    reason TEXT,
    event_count INTEGER DEFAULT 0,
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_a, member_b),
    CONSTRAINT member_order CHECK (member_a < member_b)
);

CREATE INDEX IF NOT EXISTS idx_connections_member_a ON member_connections(member_a);
CREATE INDEX IF NOT EXISTS idx_connections_member_b ON member_connections(member_b);
CREATE INDEX IF NOT EXISTS idx_connections_strength ON member_connections(strength DESC);

-- Event attendees junction table
CREATE TABLE IF NOT EXISTS event_attendees (
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    rsvp_status TEXT DEFAULT 'confirmed',
    attended BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (event_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_member ON event_attendees(member_id);

-- Insert default rooms data
INSERT INTO rooms (id, name, floor, x, y, width, height, theme, capacity) VALUES
    -- Floor 16
    ('f16r1', 'Lounge', 16, 45, 42, 25, 30, 'social', 60),
    ('f16r2', 'Dining Hall', 16, 7, 23, 35, 10, 'dining', 100),
    -- Floor 15
    ('f15r1', 'Coworking', 15, 49, 40, 20, 20, 'work', 40),
    ('f15r2', 'Deep Work', 15, 7, 40, 15, 30, 'focus', 20),
    ('f15r3', 'Blue Room', 15, 71, 15, 20, 10, 'meeting', 15),
    -- Floor 9
    ('f9r1', 'Simulation Annex VR', 9, 5, 5, 10, 10, 'tech', 10),
    -- Floor 4
    ('f4r1', 'Robotics Lab', 4, 35, 56, 13, 13, 'tech', 25),
    -- Floor 2
    ('f2r1', 'Spaceship', 2, 10, 30, 80, 22, 'event', 200),
    ('f2r2', 'Green Room', 2, 8, 56, 10, 10, 'prep', 10)
ON CONFLICT (id) DO NOTHING;

-- Initialize floor insights
INSERT INTO floor_insights (floor, pulse, activity_score) VALUES
    (2, 5.0, 0.50),
    (4, 5.0, 0.50),
    (9, 5.0, 0.50),
    (15, 5.0, 0.50),
    (16, 5.0, 0.50)
ON CONFLICT (floor) DO NOTHING;

-- Sample revenue metrics slots
INSERT INTO revenue_metrics (slot, avg_utilization, demand_index, recommended_price) VALUES
    ('Monday 09:00-12:00', 0.45, 0.80, 80.00),
    ('Monday 14:00-17:00', 0.65, 1.20, 120.00),
    ('Tuesday 18:00-20:00', 0.34, 2.10, 210.00),
    ('Wednesday 09:00-12:00', 0.55, 1.00, 100.00),
    ('Thursday 14:00-17:00', 0.75, 1.50, 150.00),
    ('Friday 18:00-21:00', 0.85, 1.80, 180.00)
ON CONFLICT (slot) DO NOTHING;