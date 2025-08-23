/**
 * FloorRenderer: Axonometric floor visualization with professional aesthetics
 * Creates ghosted tower effect with opacity transitions
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, BoxGeometry, MeshLambertMaterial, EdgesGeometry, LineBasicMaterial, LineSegments } from 'three';
import type { FloorData } from '../types/tower';
import { TOWER_CONFIG } from '../types/tower';

interface FloorRendererProps {
  floor: FloorData;
  index: number;
  isFocused: boolean;
}

const FloorRenderer: React.FC<FloorRendererProps> = ({ floor, index, isFocused }) => {
  const meshRef = useRef<Mesh>(null);
  const edgesRef = useRef<LineSegments>(null);
  const roomRefs = useRef<(Mesh | null)[]>([]);
  
  const floorHeight = index * TOWER_CONFIG.FLOOR_HEIGHT;
  
  // Calculate floor dimensions from bounding box
  const floorWidth = floor.boundingBox.maxX - floor.boundingBox.minX;
  const floorDepth = floor.boundingBox.maxY - floor.boundingBox.minY;
  const floorCenterX = (floor.boundingBox.maxX + floor.boundingBox.minX) / 2;
  const floorCenterY = (floor.boundingBox.maxY + floor.boundingBox.minY) / 2;
  
  // Memoized geometries and materials for performance
  const { floorGeometry, floorMaterial, edgeMaterial } = useMemo(() => {
    const geometry = new BoxGeometry(floorWidth, 8, floorDepth);
    const material = new MeshLambertMaterial({
      color: isFocused ? '#7c3aed' : '#475569',
      transparent: true,
      opacity: floor.opacity * (isFocused ? 0.3 : 0.1),
      wireframe: false
    });
    const edges = new EdgesGeometry(geometry);
    const edgeMat = new LineBasicMaterial({
      color: isFocused ? '#a855f7' : '#7c3aed',
      transparent: true,
      opacity: floor.opacity * 0.8
    });
    
    return {
      floorGeometry: geometry,
      floorMaterial: material,
      edgeMaterial: edgeMat
    };
  }, [floor.opacity, isFocused, floorWidth, floorDepth]);
  
  // Room geometries
  const roomMeshes = useMemo(() => {
    return floor.rooms.map((room, roomIndex) => {
      const roomGeometry = new BoxGeometry(room.width, 12, room.height);
      const activityLevel = room.activityHeat || 0;
      
      // Color based on activity level
      let roomColor = '#64748b'; // Default gray
      if (activityLevel > 0.7) roomColor = '#ef4444'; // High activity - red
      else if (activityLevel > 0.4) roomColor = '#f59e0b'; // Medium activity - orange  
      else if (activityLevel > 0.2) roomColor = '#3b82f6'; // Low activity - blue
      
      const roomMaterial = new MeshLambertMaterial({
        color: roomColor,
        transparent: true,
        opacity: floor.opacity * (0.6 + activityLevel * 0.4)
      });
      
      return {
        geometry: roomGeometry,
        material: roomMaterial,
        position: [
          room.x - floorCenterX + room.width / 2,
          floorHeight + 10,
          room.y - floorCenterY + room.height / 2
        ] as [number, number, number],
        activityLevel,
        roomId: room.id
      };
    });
  }, [floor.rooms, floor.opacity, floorHeight, floorCenterX, floorCenterY]);
  
  // Subtle animation for focused floors
  useFrame((state, delta) => {
    if (isFocused && meshRef.current) {
      // Gentle pulsing glow effect
      const time = state.clock.getElapsedTime();
      const pulseIntensity = 0.1 + Math.sin(time * 2) * 0.05;
      floorMaterial.opacity = floor.opacity * (0.1 + pulseIntensity);
    }
    
    // Animate room activities
    roomRefs.current.forEach((roomMesh, i) => {
      if (roomMesh && roomMeshes[i]) {
        const room = roomMeshes[i];
        if (room.activityLevel > 0.3) {
          // Subtle pulse for active rooms
          const time = state.clock.getElapsedTime() + i * 0.5;
          const scale = 1 + Math.sin(time * 3) * 0.02;
          roomMesh.scale.set(scale, 1, scale);
        }
      }
    });
  });
  
  return (
    <group>
      {/* Main floor slab */}
      <mesh
        ref={meshRef}
        position={[floorCenterX, floorHeight, floorCenterY]}
        geometry={floorGeometry}
        material={floorMaterial}
        castShadow
        receiveShadow
        onClick={() => {
          // Handle floor click for focus mode
          console.log(`Floor ${index} clicked`);
        }}
      />
      
      {/* Floor edges for architectural definition */}
      <lineSegments
        ref={edgesRef}
        position={[floorCenterX, floorHeight, floorCenterY]}
        geometry={new EdgesGeometry(floorGeometry)}
        material={edgeMaterial}
      />
      
      {/* Room representations */}
      {roomMeshes.map((room, roomIndex) => (
        <group key={`room-${floor.floor}-${roomIndex}`}>
          <mesh
            ref={(ref) => { roomRefs.current[roomIndex] = ref; }}
            position={room.position}
            geometry={room.geometry}
            material={room.material}
            castShadow
            receiveShadow
          />
          
          {/* Room edges */}
          <lineSegments
            position={room.position}
            geometry={new EdgesGeometry(room.geometry)}
            material={new LineBasicMaterial({
              color: '#ffffff',
              transparent: true,
              opacity: floor.opacity * 0.4
            })}
          />
        </group>
      ))}
      
      {/* Floor label (only for focused floors) */}
      {isFocused && (
        <mesh position={[floorCenterX, floorHeight + 30, floorCenterY]}>
          <planeGeometry args={[40, 12]} />
          <meshBasicMaterial
            color="#7c3aed"
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
};

export default FloorRenderer;