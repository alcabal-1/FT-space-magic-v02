/**
 * Zustand store for 3D Axonometric Tower state management
 * High-performance state for real-time 3D visualization
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  TowerState, 
  FloorData, 
  EventBubble, 
  Room, 
  APIFloorPulse 
} from '../types/tower';
import { TOWER_CONFIG, EVENT_COLORS } from '../types/tower';

interface Tower3DStore extends TowerState {
  // Actions
  initializeTower: () => Promise<void>;
  setFocusedFloor: (floor: number | null) => void;
  setCameraMode: (mode: 'overview' | 'focused' | 'orbital') => void;
  updateFloorActivity: (floorId: string, activityData: APIFloorPulse) => void;
  loadRoomsData: () => Promise<void>;
  fetchFloorPulse: (floorId: string) => Promise<void>;
  startRealTimeUpdates: () => void;
  stopRealTimeUpdates: () => void;
  
  // Internal state
  roomsData: Record<string, Room[]>;
  updateInterval: NodeJS.Timeout | null;
}

// Helper function to calculate floor bounding box
const calculateBoundingBox = (rooms: Room[]) => {
  if (rooms.length === 0) {
    return { minX: -300, maxX: 300, minY: -300, maxY: 300 };
  }
  
  const minX = Math.min(...rooms.map(r => r.x));
  const maxX = Math.max(...rooms.map(r => r.x + r.width));
  const minY = Math.min(...rooms.map(r => r.y));
  const maxY = Math.max(...rooms.map(r => r.y + r.height));
  
  // Add padding
  const padding = 50;
  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minY: minY - padding,
    maxY: maxY + padding
  };
};

// Helper to create event bubbles from room activity
const createEventBubblesFromActivity = (
  floorIndex: number,
  rooms: Room[],
  activityData?: APIFloorPulse
): EventBubble[] => {
  return rooms
    .filter(room => {
      const activity = activityData?.rooms[room.id]?.level || room.activityHeat || 0;
      return activity > 0.2; // Only show bubbles for active rooms
    })
    .map(room => {
      const activity = activityData?.rooms[room.id]?.level || room.activityHeat || 0;
      const attendeeCount = Math.round(activity * room.capacity);
      
      // Determine event type based on room name (simplified)
      let eventType = 'General';
      if (room.name.toLowerCase().includes('lab')) eventType = 'AI';
      if (room.name.toLowerCase().includes('crypto')) eventType = 'Crypto';
      if (room.name.toLowerCase().includes('bio')) eventType = 'Biotech';
      if (room.name.toLowerCase().includes('workshop')) eventType = 'Workshop';
      if (room.name.toLowerCase().includes('lounge') || room.name.toLowerCase().includes('cafe')) eventType = 'Social';
      
      return {
        id: `${room.id}-${Date.now()}`,
        roomId: room.id,
        position: [
          room.x + room.width / 2,
          room.y + room.height / 2,
          floorIndex * TOWER_CONFIG.FLOOR_HEIGHT + 20
        ] as [number, number, number],
        size: Math.max(
          TOWER_CONFIG.BUBBLE_BASE_SIZE,
          Math.min(TOWER_CONFIG.BUBBLE_MAX_SIZE, activity * 30)
        ),
        color: EVENT_COLORS[eventType] || EVENT_COLORS.General,
        eventType,
        attendeeCount,
        impactScore: activity,
        title: `${room.name} (${attendeeCount} people)`,
        isActive: activity > 0.3,
        pulseIntensity: activity
      };
    });
};

export const useTower3DStore = create<Tower3DStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    floors: [],
    eventBubbles: [],
    focusedFloor: null,
    cameraMode: 'overview',
    isLoading: true,
    lastUpdate: Date.now(),
    roomsData: {},
    updateInterval: null,

    // Actions
    initializeTower: async () => {
      const { loadRoomsData } = get();
      
      set({ isLoading: true });
      
      try {
        await loadRoomsData();
        
        // Create floor data structure
        const floors: FloorData[] = Array.from({ length: TOWER_CONFIG.TOTAL_FLOORS }, (_, index) => {
          const floorNumber = index;
          const rooms = get().roomsData[`floor${floorNumber + 1}`] || [];
          const boundingBox = calculateBoundingBox(rooms);
          
          return {
            floor: floorNumber,
            rooms,
            opacity: 1.0,
            isActive: rooms.some(r => (r.activityHeat || 0) > 0.3),
            boundingBox
          };
        });
        
        set({ 
          floors, 
          isLoading: false,
          lastUpdate: Date.now()
        });
        
        // Start real-time updates
        get().startRealTimeUpdates();
        
      } catch (error) {
        console.error('Failed to initialize tower:', error);
        set({ isLoading: false });
      }
    },

    setFocusedFloor: (floor) => {
      const { floors } = get();
      
      // Update floor opacities for ghosted effect
      const updatedFloors = floors.map(f => ({
        ...f,
        opacity: floor === null ? 1.0 : (f.floor === floor ? 1.0 : 0.1)
      }));
      
      set({ 
        focusedFloor: floor,
        floors: updatedFloors,
        cameraMode: floor === null ? 'overview' : 'focused'
      });
    },

    setCameraMode: (mode) => {
      set({ cameraMode: mode });
    },

    updateFloorActivity: (floorId, activityData) => {
      const { floors } = get();
      const floorIndex = parseInt(floorId.replace('floor', '')) - 1;
      
      if (floorIndex >= 0 && floorIndex < floors.length) {
        const floor = floors[floorIndex];
        
        // Update room activities
        const updatedRooms = floor.rooms.map(room => ({
          ...room,
          activityHeat: activityData.rooms[room.id]?.level || room.activityHeat || 0
        }));
        
        // Create event bubbles
        const newBubbles = createEventBubblesFromActivity(floorIndex, updatedRooms, activityData);
        
        // Update floors and bubbles
        const updatedFloors = floors.map(f => 
          f.floor === floorIndex 
            ? { ...f, rooms: updatedRooms, isActive: newBubbles.length > 0 }
            : f
        );
        
        // Remove old bubbles for this floor and add new ones
        const otherBubbles = get().eventBubbles.filter(b => 
          !b.roomId.startsWith(`floor${floorIndex + 1}-`)
        );
        
        set({
          floors: updatedFloors,
          eventBubbles: [...otherBubbles, ...newBubbles],
          lastUpdate: Date.now()
        });
      }
    },

    loadRoomsData: async () => {
      try {
        const response = await fetch('/rooms.json');
        if (!response.ok) throw new Error('Failed to load rooms data');
        const data = await response.json();
        set({ roomsData: data });
        return data;
      } catch (error) {
        console.error('Error loading rooms data:', error);
        // Fallback data for demo
        const fallbackData = {
          floor1: [
            {
              id: 'demo-room-1',
              name: 'Innovation Lab',
              x: 50, y: 100, width: 120, height: 80,
              capacity: 12, activityHeat: 0.7
            },
            {
              id: 'demo-room-2',
              name: 'AI Workshop',
              x: 200, y: 100, width: 100, height: 60,
              capacity: 8, activityHeat: 0.5
            }
          ]
        };
        set({ roomsData: fallbackData });
        return fallbackData;
      }
    },

    fetchFloorPulse: async (floorId) => {
      try {
        const response = await fetch(`http://localhost:8001/api/floors/${floorId}/pulse`);
        if (!response.ok) throw new Error('Failed to fetch floor pulse');
        const data: APIFloorPulse = await response.json();
        
        get().updateFloorActivity(floorId, data);
      } catch (error) {
        console.error('Error fetching floor pulse:', error);
        // Continue with existing data
      }
    },

    startRealTimeUpdates: () => {
      const { updateInterval } = get();
      if (updateInterval) return; // Already running
      
      const interval = setInterval(async () => {
        const { floors } = get();
        
        // Update active floors
        for (const floor of floors) {
          if (floor.isActive || floor.floor === 0) { // Always update floor 1
            await get().fetchFloorPulse(`floor${floor.floor + 1}`);
          }
        }
      }, TOWER_CONFIG.UPDATE_INTERVAL);
      
      set({ updateInterval: interval });
    },

    stopRealTimeUpdates: () => {
      const { updateInterval } = get();
      if (updateInterval) {
        clearInterval(updateInterval);
        set({ updateInterval: null });
      }
    }
  }))
);