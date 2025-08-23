/**
 * ULTIMATE 3D AXONOMETRIC FRONTIER TOWER
 * Layer 1: Professional 3D Tower Skeleton with 16 floors
 * Industry-defining architectural visualization
 */

import React, { useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
// import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useTower3DStore } from '../stores/tower3DStore';
import FloorRenderer from './FloorRenderer';
import EventBubbles from './EventBubbles';
import CameraController from './CameraController';
import { TOWER_CONFIG } from '../types/tower';
import { motion } from 'framer-motion';

// Loading component for Suspense
const TowerLoader = () => (
  <motion.div
    className="flex items-center justify-center h-full"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-frontier-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-frontier-300 text-lg font-medium">
        Initializing Frontier Tower Intelligence...
      </p>
    </div>
  </motion.div>
);

// Professional Lighting Setup
const ProfessionalLighting = () => (
  <>
    {/* Ambient light for global soft illumination */}
    <ambientLight intensity={0.4} color="#f8fafc" />
    
    {/* Key directional light for dramatic shadows and depth */}
    <directionalLight
      position={[50, 100, 50]}
      intensity={1.2}
      color="#ffffff"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-near={0.5}
      shadow-camera-far={500}
      shadow-camera-left={-200}
      shadow-camera-right={200}
      shadow-camera-top={200}
      shadow-camera-bottom={-200}
    />
    
    {/* Fill light from opposite direction for balance */}
    <directionalLight
      position={[-30, 60, -30]}
      intensity={0.6}
      color="#e0e7ff"
    />
    
    {/* Rim light for edge definition */}
    <directionalLight
      position={[0, 20, -100]}
      intensity={0.4}
      color="#7c3aed"
    />
  </>
);

// Tower Scene Component
const TowerScene = () => {
  const { floors, eventBubbles, focusedFloor, isLoading } = useTower3DStore();
  
  return (
    <>
      <ProfessionalLighting />
      
      {/* Render all floors */}
      {floors.map((floor, index) => (
        <FloorRenderer
          key={floor.floor}
          floor={floor}
          index={index}
          isFocused={focusedFloor === floor.floor}
        />
      ))}
      
      {/* Render event bubbles */}
      <EventBubbles bubbles={eventBubbles} />
      
      {/* Camera controller for cinematic movements */}
      <CameraController />
    </>
  );
};

const Tower3D: React.FC = () => {
  const initializeTower = useTower3DStore(state => state.initializeTower);
  const isLoading = useTower3DStore(state => state.isLoading);
  const focusedFloor = useTower3DStore(state => state.focusedFloor);
  const setFocusedFloor = useTower3DStore(state => state.setFocusedFloor);
  
  // Initialize tower on mount
  useEffect(() => {
    initializeTower();
    
    return () => {
      // Cleanup on unmount
      useTower3DStore.getState().stopRealTimeUpdates();
    };
  }, [initializeTower]);
  
  if (isLoading) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-frontier-900 flex items-center justify-center">
        <TowerLoader />
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-frontier-900 overflow-hidden">
      {/* Header UI */}
      <motion.div 
        className="absolute top-6 left-6 z-10 pointer-events-none"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">
          Frontier Tower Intelligence
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></div>
            <span className="text-emerald-400 font-semibold">3D LIVE</span>
          </div>
          <span className="text-slate-400">•</span>
          <span className="text-slate-300">16 Floors • Real-time Data</span>
          {focusedFloor !== null && (
            <>
              <span className="text-slate-400">•</span>
              <span className="text-frontier-300 font-medium">Floor {focusedFloor + 1} Focus</span>
            </>
          )}
        </div>
      </motion.div>
      
      {/* Floor Navigation Pills */}
      <motion.div 
        className="absolute top-6 right-6 z-10 flex flex-col gap-1 max-h-96 overflow-y-auto"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
          <h3 className="text-white font-semibold mb-2 text-sm">Floors</h3>
          <div className="flex flex-col gap-1">
            {Array.from({ length: TOWER_CONFIG.TOTAL_FLOORS }, (_, i) => (
              <button
                key={i}
                onClick={() => setFocusedFloor(focusedFloor === i ? null : i)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                  focusedFloor === i
                    ? 'bg-frontier-500 text-white shadow-lg shadow-frontier-500/25'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
              >
                F{i + 1}
              </button>
            ))}
          </div>
          {focusedFloor !== null && (
            <button
              onClick={() => setFocusedFloor(null)}
              className="mt-2 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white rounded text-xs font-medium transition-all duration-200 w-full"
            >
              Overview
            </button>
          )}
        </div>
      </motion.div>
      
      {/* 3D Canvas */}
      <motion.div
        className="w-full h-full"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        <Canvas
          shadows
          gl={{ 
            antialias: true, 
            alpha: false,
            powerPreference: "high-performance"
          }}
          camera={{
            position: [400, 600, 400],
            fov: 50,
            near: 1,
            far: 2000
          }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <TowerScene />
            
            {/* Post-processing disabled temporarily for compatibility */}
            {/* <EffectComposer>
              <Bloom
                intensity={0.7}
                luminanceThreshold={0.2}
                luminanceSmoothing={0.9}
                height={300}
                kernelSize={5}
              />
            </EffectComposer> */}
          </Suspense>
        </Canvas>
      </motion.div>
      
      {/* Footer info */}
      <motion.div 
        className="absolute bottom-4 left-6 text-xs text-slate-500 pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        3D Axonometric • 60fps WebGL • Real-time Intelligence
      </motion.div>
      
      {/* Performance indicator */}
      <div className="absolute bottom-4 right-6 text-xs text-slate-500">
        Three.js • React Fiber • Zustand
      </div>
    </div>
  );
};

export default Tower3D;