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
          floorIndex * TOWER_CONFIG.FLOOR_HEIGHT + 8,  // Y is height in 3D, positioned on floor surface
          room.y + room.height / 2
        ] as [number, number, number],
        size: Math.max(
          TOWER_CONFIG.BUBBLE_BASE_SIZE,
          Math.min(TOWER_CONFIG.BUBBLE_MAX_SIZE, activity * 30)
        ),
        color: EVENT_COLORS[eventType] || EVENT_COLORS.General,
        eventType,
        attendeeCount,
        participants: attendeeCount,
        impactScore: activity,
        title: room.name,
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
      // Use mock data for all floors
      const mockRoomsData: Record<string, Room[]> = {};
      
      // Generate rooms for each floor
      for (let floor = 1; floor <= TOWER_CONFIG.TOTAL_FLOORS; floor++) {
        const rooms: Room[] = [];
        const roomsPerFloor = 3 + Math.floor(Math.random() * 3);
        
        for (let room = 0; room < roomsPerFloor; room++) {
          const floorTypes = [
            ['Underground Vault', 'Storage Room', 'Archive'],  // F0: Catacombs
            ['Reception', 'Welcome Desk', 'Information Hub'],   // F1: Lobby
            ['Launch Pad', 'Mission Control', 'Space Sim'],     // F2: Spaceship
            ['Meeting Room', 'Office Suite', 'Conference'],     // F3: Offices
            ['Living Space', 'Kitchen', 'Common Area'],         // F4: Co-living
            ['Fitness Center', 'Yoga Studio', 'Sports Court'],  // F5: Gym
            ['Workshop', 'Tool Lab', 'Prototype Zone'],         // F6: Makerspace
            ['Recording Studio', 'Gallery', 'Performance'],     // F7: Music/Art
            ['Biolab', 'Neuro Research', 'Life Sciences'],      // F8: Biotech/Neurotech
            ['Startup Hub', 'Accelerator', 'Demo Room'],        // F9: Accelerate
            ['AI Lab', 'ML Studio', 'Neural Net Center'],       // F10: AI
            ['Longevity Lab', 'Health Research', 'Med Tech'],   // F11: Longevity
            ['Trading Floor', 'Crypto Lab', 'Blockchain Hub'],  // F12: Crypto
            ['Reserved Space', 'Private Room', 'Exclusive'],    // F13: (skip but handle)
            ['Wellness Center', 'Meditation', 'Therapy Room'],  // F14: Human Flourishing
            ['Co-working Space', 'Hot Desk', 'Team Room'],     // F15: Co-working
            ['Social Lounge', 'Cafe', 'Relaxation Zone'],      // F16: Lounge
            ['Rooftop Terrace', 'Sky Garden', 'Event Space']   // F17: Rooftop
          ];
          
          const floorType = floorTypes[floor - 1] || floorTypes[0];
          const roomName = floorType[room % floorType.length];
          
          rooms.push({
            id: `floor${floor}-room-${room + 1}`,
            name: roomName,
            x: -200 + (room % 3) * 150,
            y: -200 + Math.floor(room / 3) * 150,
            width: 80 + Math.random() * 40,
            height: 80 + Math.random() * 40,
            capacity: 10 + Math.floor(Math.random() * 40),
            activityHeat: Math.random() * 0.9
          });
        }
        
        mockRoomsData[`floor${floor}`] = rooms;
      }
      
      set({ roomsData: mockRoomsData });
      return mockRoomsData;
    },

    fetchFloorPulse: async (floorId) => {
      // Simulate floor pulse with mock data
      const floorNumber = parseInt(floorId.replace('floor', ''));
      const rooms = get().roomsData[floorId] || [];
      
      const mockPulseData: APIFloorPulse = {
        floorId,
        timestamp: Date.now(),
        overallActivity: 0.5 + Math.random() * 0.5,
        rooms: rooms.reduce((acc, room) => {
          acc[room.id] = {
            level: Math.min(1, Math.max(0, room.activityHeat + (Math.random() - 0.5) * 0.2)),
            trend: Math.random() > 0.5 ? 'up' : 'stable'
          };
          return acc;
        }, {} as Record<string, { level: number; trend: string }>)
      };
      
      get().updateFloorActivity(floorId, mockPulseData);
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