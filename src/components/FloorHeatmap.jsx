import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Text } from 'react-konva'
import { motion } from 'framer-motion'
import useHeatmapStore from '../stores/heatmapStore'
import { 
  getHeatmapColor, 
  getHeatmapColorWithAlpha, 
  getPulseIntensity, 
  getPulseScale 
} from '../utils/colorUtils'

const FloorHeatmap = ({ width = 800, height = 600 }) => {
  const stageRef = useRef()
  const animationRef = useRef()
  const [currentTime, setCurrentTime] = useState(Date.now())
  
  const {
    floors,
    currentFloor,
    roomActivities,
    pulseIntensities,
    loadRoomsData,
    connectWebSocket,
    fetchFloorPulse,
    updateRoomActivity
  } = useHeatmapStore()
  
  const currentFloorRooms = floors[currentFloor] || []
  
  // Initialize data loading
  useEffect(() => {
    loadRoomsData()
    connectWebSocket()
    
    // Periodic pulse data fetch
    const pulseInterval = setInterval(() => {
      fetchFloorPulse(currentFloor)
    }, 5000)
    
    return () => clearInterval(pulseInterval)
  }, [currentFloor])
  
  // Animation loop for smooth 60fps updates
  useEffect(() => {
    const animate = () => {
      setCurrentTime(Date.now())
      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])
  
  // Simulate real-time activity updates for demo
  useEffect(() => {
    const demoInterval = setInterval(() => {
      currentFloorRooms.forEach((room, index) => {
        // Simulate varying activity levels
        const baseActivity = room.activityHeat || 0.5
        const variation = Math.sin((currentTime / 10000) + index) * 0.3
        const newActivity = Math.max(0.1, Math.min(0.9, baseActivity + variation))
        updateRoomActivity(room.id, newActivity)
      })
    }, 2000)
    
    return () => clearInterval(demoInterval)
  }, [currentFloorRooms, currentTime])
  
  // Room component with pulse animation
  const AnimatedRoom = useCallback(({ room }) => {
    const activity = roomActivities[room.id]?.level || room.activityHeat || 0.5
    const pulseIntensity = getPulseIntensity(activity)
    const pulseScale = getPulseScale(currentTime, pulseIntensity)
    
    const fillColor = getHeatmapColor(activity)
    const strokeColor = getHeatmapColorWithAlpha(activity, 0.8)
    
    return (
      <>
        <Rect
          x={room.x}
          y={room.y}
          width={room.width}
          height={room.height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2}
          cornerRadius={8}
          scaleX={pulseScale}
          scaleY={pulseScale}
          offsetX={room.width / 2}
          offsetY={room.height / 2}
          x={room.x + room.width / 2}
          y={room.y + room.height / 2}
          shadowColor="rgba(0,0,0,0.3)"
          shadowBlur={6}
          shadowOpacity={activity}
        />
        <Text
          x={room.x}
          y={room.y + room.height / 2 - 8}
          width={room.width}
          height={16}
          text={room.name}
          fontSize={12}
          fontFamily="Inter, system-ui, sans-serif"
          fontStyle="600"
          fill="white"
          align="center"
          verticalAlign="middle"
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={2}
        />
        <Text
          x={room.x}
          y={room.y + room.height / 2 + 4}
          width={room.width}
          height={12}
          text={`${Math.round(activity * 100)}%`}
          fontSize={10}
          fontFamily="Inter, system-ui, sans-serif"
          fill="rgba(255,255,255,0.8)"
          align="center"
          verticalAlign="middle"
        />
      </>
    )
  }, [roomActivities, currentTime])
  
  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      {/* Header */}
      <motion.div 
        className="absolute top-4 left-4 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          Live Floor Heatmap
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-green-400 font-medium">LIVE</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-300">Floor 1 • {currentFloorRooms.length} Spaces</span>
        </div>
      </motion.div>
      
      {/* Legend */}
      <motion.div 
        className="absolute top-4 right-4 z-10 bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h3 className="text-white font-semibold mb-3">Activity Level</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatmapColor(0.2) }}></div>
            <span className="text-sm text-slate-300">Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatmapColor(0.5) }}></div>
            <span className="text-sm text-slate-300">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatmapColor(0.8) }}></div>
            <span className="text-sm text-slate-300">High</span>
          </div>
        </div>
      </motion.div>
      
      {/* Main Heatmap Canvas */}
      <motion.div
        className="w-full h-full flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.1 }}
      >
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          className="border border-slate-700 rounded-lg shadow-2xl"
          style={{ backgroundColor: '#1e293b' }}
        >
          <Layer>
            {/* Background grid */}
            {Array.from({ length: Math.ceil(width / 50) }).map((_, i) => (
              <Rect
                key={`grid-v-${i}`}
                x={i * 50}
                y={0}
                width={1}
                height={height}
                fill="rgba(71, 85, 105, 0.2)"
              />
            ))}
            {Array.from({ length: Math.ceil(height / 50) }).map((_, i) => (
              <Rect
                key={`grid-h-${i}`}
                x={0}
                y={i * 50}
                width={width}
                height={1}
                fill="rgba(71, 85, 105, 0.2)"
              />
            ))}
            
            {/* Room heatmap */}
            {currentFloorRooms.map((room) => (
              <AnimatedRoom key={room.id} room={room} />
            ))}
          </Layer>
        </Stage>
      </motion.div>
      
      {/* Performance indicator */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-500">
        60fps · Powered by Konva.js
      </div>
    </div>
  )
}

export default FloorHeatmap