/**
 * TypeScript types for 3D Axonometric Frontier Tower
 */

export interface RoomCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  activityHeat?: number;
  baseActivityHeat?: number;
}

export interface FloorData {
  floor: number;
  rooms: Room[];
  opacity: number;
  isActive: boolean;
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface EventBubble {
  id: string;
  roomId: string;
  position: [number, number, number]; // [x, y, z]
  size: number;
  color: string;
  eventType: string;
  attendeeCount: number;
  participants: number;
  impactScore: number;
  title: string;
  isActive: boolean;
  pulseIntensity: number;
}

export interface TowerState {
  floors: FloorData[];
  eventBubbles: EventBubble[];
  focusedFloor: number | null;
  cameraMode: 'overview' | 'focused' | 'orbital';
  isLoading: boolean;
  lastUpdate: number;
}

export interface APIFloorPulse {
  floorId: string;
  timestamp: number;
  overallActivity: number;
  rooms: Record<string, {
    level: number;
    trend: string;
  }>;
}

export interface EventTypeColors {
  [key: string]: string;
}

export const EVENT_COLORS: EventTypeColors = {
  'AI': '#3B82F6',        // Blue
  'Crypto': '#F59E0B',    // Gold
  'Biotech': '#10B981',   // Green
  'Climate': '#8B5CF6',   // Purple
  'Defense': '#EF4444',   // Red
  'General': '#6B7280',   // Gray
  'Workshop': '#F97316',  // Orange
  'Social': '#EC4899',    // Pink
};

export const TOWER_CONFIG = {
  TOTAL_FLOORS: 18,
  FLOOR_HEIGHT: 50,
  BASE_FLOOR_SIZE: 600,
  CAMERA_DISTANCE: 800,
  ANIMATION_DURATION: 1.5,
  BUBBLE_BASE_SIZE: 8,
  BUBBLE_MAX_SIZE: 25,
  UPDATE_INTERVAL: 5000,
} as const;