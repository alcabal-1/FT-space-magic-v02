# LiveFloorHeatmap Component - Implementation Brief

## 🎯 Mission: Build a Real-Time Activity Heatmap (6-8 hour MVP)

Create a living, breathing visualization of Tower activity that makes investors say "holy shit, it's alive!"

## 📦 Core Deliverables (MUST HAVE - 4 hours)

### 1. Base Floor Visualization
- **Input**: `rooms.json` structure
- **Output**: Grid/layout of rooms as colored rectangles/circles
- **Tech**: React component with SVG or Canvas
- **Data**: Static room positions from JSON

### 2. Activity Heatmap
- **API**: `GET /api/floors/{floor}/pulse`
- **Visual**: Color intensity mapping (blue=quiet → orange=active → red=buzzing)
- **Update**: Poll every 5 seconds or WebSocket if available
- **Animation**: Smooth color transitions using CSS transitions or framer-motion

### 3. Event Bubbles
- **Display**: Floating bubbles over active rooms showing:
  - Event title (truncated to 20 chars)
  - Attendance count
- **Animation**: Scale bubble size based on attendance (10px to 50px radius)
- **Interaction**: Click bubble to show full event details (modal or tooltip)

### 4. Member Presence (Stubbed)
- **Mock Data**: 2-3 test avatars with positions
- **Visual**: Small circles or initials in rooms
- **Animation**: Fade in/out on room entry/exit
- **Note**: Use placeholder data, not real auth

## 🚀 Stretch Goals (IF TIME ALLOWS - 2 hours)

### 5. Basic Pan/Zoom
- **Library**: d3-zoom or CSS transform
- **Controls**: Mouse wheel zoom, click-drag pan
- **Bounds**: Constrain to floor plan boundaries

### 6. Connection Lines (Simple)
- **API**: `GET /api/community/network` (if exists)
- **Visual**: Simple SVG lines between 2-3 connected rooms
- **Animation**: Subtle pulse or gradient animation
- **Fallback**: Mock 1-2 connections if API unavailable

### 7. Trending Topics Banner
- **API**: `GET /api/analytics/live`
- **Visual**: Ticker at top showing 3-5 trending tags
- **Animation**: Horizontal scroll or fade rotation

## 🔧 Technical Requirements

### Stack
```javascript
// Required dependencies
- React 18+
- TypeScript
- Tailwind CSS
- framer-motion (for animations)
- Optional: d3-zoom (for pan/zoom)
```

### Component Structure
```
LiveFloorHeatmap.tsx (main container)
├── FloorGrid.tsx (room layout)
├── RoomTile.tsx (individual room with heatmap color)
├── EventBubble.tsx (floating event indicator)
├── MemberAvatar.tsx (user presence indicator)
└── TrendingBanner.tsx (optional - topics ticker)
```

### Data Flow
```typescript
// Primary data source
const pulseData = await fetch(`/api/floors/${floorId}/pulse`);
// Returns: { rooms: [{ id, activity_level, current_event, member_count }] }

// Fallback if API is down
const MOCK_PULSE_DATA = {
  rooms: [
    { id: "901", activity_level: 0.8, current_event: "AI Safety Workshop", member_count: 12 },
    { id: "902", activity_level: 0.3, current_event: null, member_count: 2 }
  ]
};
```

## ✨ Key Animation Priorities

1. **Color transitions** (biggest impact, least effort):
   ```css
   transition: background-color 0.5s ease-in-out;
   ```

2. **Bubble scaling** (instant "wow"):
   ```javascript
   animate={{ scale: attendance / 10 }}
   transition={{ type: "spring", stiffness: 300 }}
   ```

3. **Avatar fade** (creates "life"):
   ```javascript
   initial={{ opacity: 0 }}
   animate={{ opacity: 1 }}
   exit={{ opacity: 0 }}
   ```

## 🎬 Demo Scenario

1. Open floor view → see immediate color differentiation
2. Watch as room colors shift in real-time (even if simulated)
3. Event bubble grows as "attendance increases"
4. Avatar appears in room, moves to another room
5. Connection line pulses between two active spaces
6. Trending banner shows "AI Safety" rising

## ⚠️ Constraints & Guardrails

- **NO complex physics**: No force-directed graphs or particle systems
- **NO real authentication**: All member data is mocked
- **NO multi-floor views**: Focus on single floor perfection
- **PREFER CSS animations**: Over complex JS animation libraries
- **ALWAYS show something**: Use mock data if APIs fail

## 📊 Success Metrics

✅ Renders within 2 seconds
✅ Updates feel real-time (< 100ms visual feedback)
✅ At least 3 simultaneous animations running
✅ Works with mock data (no backend dependency)
✅ One "holy shit" moment when colors pulse in sync

## 🏁 Implementation Order

1. Static floor grid with rooms
2. Add color mapping from activity_level
3. Add event bubbles with static data
4. Wire up API or mock data updates
5. Add animations (color, scale, fade)
6. (If time) Add zoom/pan
7. (If time) Add connection lines
8. (If time) Add trending banner

---

**Remember**: The goal is a WORKING DEMO that feels alive, not a perfect system. Mock liberally, animate simply, ship boldly.