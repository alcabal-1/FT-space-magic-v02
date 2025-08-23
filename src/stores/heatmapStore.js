import { create } from 'zustand'

const useHeatmapStore = create((set, get) => ({
  // Floor data
  floors: {},
  currentFloor: 'floor1',
  
  // Activity data
  roomActivities: {},
  
  // WebSocket connection
  wsConnected: false,
  ws: null,
  
  // Animation state
  pulseIntensities: {},
  
  // Actions
  setFloors: (floors) => set({ floors }),
  
  setCurrentFloor: (floorId) => set({ currentFloor: floorId }),
  
  updateRoomActivity: (roomId, activityLevel) => 
    set((state) => ({
      roomActivities: {
        ...state.roomActivities,
        [roomId]: {
          level: activityLevel,
          timestamp: Date.now()
        }
      }
    })),
  
  setPulseIntensity: (roomId, intensity) =>
    set((state) => ({
      pulseIntensities: {
        ...state.pulseIntensities,
        [roomId]: intensity
      }
    })),
  
  // WebSocket management
  connectWebSocket: () => {
    const { ws } = get()
    if (ws && ws.readyState === WebSocket.OPEN) return
    
    try {
      const websocket = new WebSocket('ws://localhost:8001/ws/tower-feed')
      
      websocket.onopen = () => {
        console.log('WebSocket connected to tower feed')
        set({ wsConnected: true, ws: websocket })
      }
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'room_activity') {
            get().updateRoomActivity(data.roomId, data.activityLevel)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      websocket.onclose = () => {
        console.log('WebSocket disconnected')
        set({ wsConnected: false, ws: null })
        // Attempt reconnection after 3 seconds
        setTimeout(() => {
          get().connectWebSocket()
        }, 3000)
      }
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  },
  
  disconnectWebSocket: () => {
    const { ws } = get()
    if (ws) {
      ws.close()
      set({ wsConnected: false, ws: null })
    }
  },
  
  // API calls
  fetchFloorPulse: async (floorId) => {
    try {
      const response = await fetch(`http://localhost:8001/api/floors/${floorId}/pulse`)
      if (!response.ok) throw new Error('Failed to fetch floor pulse')
      const data = await response.json()
      
      // Update room activities with pulse data
      Object.entries(data.rooms || {}).forEach(([roomId, activity]) => {
        get().updateRoomActivity(roomId, activity.level)
      })
      
      return data
    } catch (error) {
      console.error('Error fetching floor pulse:', error)
      // Return mock data for demo
      return {
        floorId,
        timestamp: Date.now(),
        rooms: Object.fromEntries(
          (get().floors[floorId] || []).map(room => [
            room.id, 
            { level: Math.random() * 0.8 + 0.1 }
          ])
        )
      }
    }
  },
  
  loadRoomsData: async () => {
    try {
      const response = await fetch('/rooms.json')
      if (!response.ok) throw new Error('Failed to load rooms data')
      const data = await response.json()
      set({ floors: data })
      
      // Initialize room activities
      const activities = {}
      Object.values(data).flat().forEach(room => {
        activities[room.id] = {
          level: room.activityHeat || Math.random(),
          timestamp: Date.now()
        }
      })
      set({ roomActivities: activities })
      
      return data
    } catch (error) {
      console.error('Error loading rooms data:', error)
      return {}
    }
  }
}))

export default useHeatmapStore