/**
 * EventBubbles: Living 3D spheres showing community activity
 * Layer 2: Performance-optimized with InstancedMesh for hundreds of bubbles
 */

import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { 
  InstancedMesh, 
  SphereGeometry, 
  MeshLambertMaterial, 
  Object3D, 
  Color,
  Vector3
} from 'three';
import { Text } from 'troika-three-text';
import { extend } from '@react-three/fiber';
import type { EventBubble } from '../types/tower';
import { EVENT_COLORS, TOWER_CONFIG } from '../types/tower';
import { useTower3DStore } from '../stores/tower3DStore';

extend({ Text });

interface EventBubblesProps {
  bubbles: EventBubble[];
}

// 3D Text Label Component
const BubbleLabel: React.FC<{ 
  bubble: EventBubble; 
  position: [number, number, number];
}> = ({ bubble, position }) => {
  const groupRef = useRef<any>(null);
  
  // Manual billboard effect with smooth rotation
  useFrame(({ camera }) => {
    if (groupRef.current) {
      groupRef.current.lookAt(camera.position);
      // Prevent text from being upside down
      groupRef.current.rotation.z = 0;
    }
  });
  
  const labelText = `${bubble.title} (${bubble.participants})`;
  
  return (
    <group ref={groupRef} position={[position[0], position[1] + bubble.size + 10, position[2]]}>
      <text
        text={labelText}
        fontSize={6}
        color="white"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.2}
        outlineColor="#000000"
        maxWidth={50}
      />
    </group>
  );
};

// Individual bubble component for detailed interactions
const SingleEventBubble: React.FC<{ bubble: EventBubble; onClick?: () => void }> = ({ 
  bubble, 
  onClick 
}) => {
  const meshRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  
  // Heartbeat animation
  useFrame((state) => {
    if (meshRef.current && bubble.isActive) {
      const time = state.clock.getElapsedTime();
      const heartbeat = 1 + Math.sin(time * 4 + bubble.pulseIntensity * 10) * 0.1 * bubble.pulseIntensity;
      meshRef.current.scale.setScalar(heartbeat);
      
      // Gentle floating motion (smaller amplitude to stay near floor)
      const floatY = Math.sin(time * 2 + bubble.position[0] * 0.01) * 0.5;
      meshRef.current.position.setY(bubble.position[1] + floatY);
    }
  });
  
  const bubbleColor = useMemo(() => new Color(bubble.color), [bubble.color]);
  
  return (
    <group>
      <mesh
        ref={meshRef}
        position={bubble.position}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
      <sphereGeometry args={[bubble.size, 16, 12]} />
      <meshLambertMaterial
        color={bubbleColor}
        transparent
        opacity={0.7}
        emissive={bubbleColor}
        emissiveIntensity={hovered ? 0.3 : (bubble.isActive ? 0.1 : 0)}
      />
      
      {/* Glow ring for high-activity bubbles */}
      {bubble.impactScore > 0.7 && (
        <mesh>
          <ringGeometry args={[bubble.size * 1.2, bubble.size * 1.4, 16]} />
          <meshBasicMaterial
            color={bubbleColor}
            transparent
            opacity={0.3}
            side={2}
          />
        </mesh>
      )}
      
      </mesh>
      <BubbleLabel bubble={bubble} position={bubble.position} />
    </group>
  );
};

// High-performance instanced version for many bubbles
const InstancedEventBubbles: React.FC<{ bubbles: EventBubble[] }> = ({ bubbles }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObject = new Object3D();
  const tempColor = new Color();
  
  // Create geometry once
  const geometry = useMemo(() => new SphereGeometry(1, 16, 12), []);
  const material = useMemo(() => new MeshLambertMaterial({
    transparent: true,
    opacity: 0.7
  }), []);
  
  // Update instances every frame
  useFrame((state) => {
    if (!meshRef.current) return;
    
    bubbles.forEach((bubble, i) => {
      const time = state.clock.getElapsedTime();
      
      // Position and scale
      tempObject.position.set(...bubble.position);
      
      // Heartbeat pulse animation
      const heartbeat = bubble.isActive 
        ? 1 + Math.sin(time * 4 + bubble.pulseIntensity * 10) * 0.15 * bubble.pulseIntensity
        : 0.8;
      
      // Floating motion (smaller amplitude to stay near floor)
      const floatY = Math.sin(time * 2 + bubble.position[0] * 0.01) * 0.5;
      tempObject.position.y = bubble.position[1] + floatY;
      
      tempObject.scale.setScalar(bubble.size * heartbeat);
      tempObject.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      
      // Set color
      tempColor.setHex(parseInt(bubble.color.replace('#', '0x')));
      meshRef.current!.setColorAt(i, tempColor);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });
  
  if (bubbles.length === 0) return null;
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, bubbles.length]}
      castShadow
    />
  );
};

const EventBubbles: React.FC<EventBubblesProps> = ({ bubbles }) => {
  const [selectedBubble, setSelectedBubble] = useState<EventBubble | null>(null);
  const focusedFloor = useTower3DStore(state => state.focusedFloor);
  
  // Filter bubbles based on focused floor
  const visibleBubbles = useMemo(() => {
    if (focusedFloor === null) {
      return bubbles; // Show all bubbles when no floor is focused
    }
    
    // Calculate which floor each bubble belongs to based on its Y position
    return bubbles.filter(bubble => {
      const bubbleFloor = Math.floor(bubble.position[1] / TOWER_CONFIG.FLOOR_HEIGHT);
      return bubbleFloor === focusedFloor;
    });
  }, [bubbles, focusedFloor]);
  
  // Use instanced rendering for performance when there are many bubbles
  const useInstancedRendering = visibleBubbles.length > 20;
  
  const handleBubbleClick = (bubble: EventBubble) => {
    setSelectedBubble(selectedBubble?.id === bubble.id ? null : bubble);
    console.log('Event bubble clicked:', bubble.title);
  };
  
  if (visibleBubbles.length === 0) return null;
  
  return (
    <group>
      {useInstancedRendering ? (
        <InstancedEventBubbles bubbles={visibleBubbles} />
      ) : (
        // Individual bubbles for better interaction when count is low
        visibleBubbles.map(bubble => (
          <SingleEventBubble
            key={bubble.id}
            bubble={bubble}
            onClick={() => handleBubbleClick(bubble)}
          />
        ))
      )}
      
      {/* Particle effects for very active bubbles */}
      {visibleBubbles
        .filter(b => b.impactScore > 0.8)
        .map(bubble => (
          <group key={`particles-${bubble.id}`} position={bubble.position}>
            {/* Energy particles */}
            {Array.from({ length: 5 }, (_, i) => (
              <mesh
                key={i}
                position={[
                  (Math.random() - 0.5) * bubble.size * 3,
                  (Math.random() - 0.5) * bubble.size * 3,
                  (Math.random() - 0.5) * bubble.size * 3
                ]}
              >
                <sphereGeometry args={[1, 4, 4]} />
                <meshBasicMaterial
                  color={bubble.color}
                  transparent
                  opacity={0.6}
                />
              </mesh>
            ))}
          </group>
        ))
      }
      
      {/* Connection lines for related events */}
      {visibleBubbles.length > 1 && (
        <group>
          {visibleBubbles.slice(0, -1).map((bubble, i) => {
            const nextBubble = visibleBubbles[i + 1];
            if (!nextBubble || bubble.eventType !== nextBubble.eventType) return null;
            
            const startPos = new Vector3(...bubble.position);
            const endPos = new Vector3(...nextBubble.position);
            const distance = startPos.distanceTo(endPos);
            
            // Only draw connections for nearby events
            if (distance > 100) return null;
            
            return (
              <line key={`connection-${bubble.id}-${nextBubble.id}`}>
                <bufferGeometry>
                  <bufferAttribute
                    args={[new Float32Array([
                      ...bubble.position,
                      ...nextBubble.position
                    ]), 3]}
                    attach="attributes-position"
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={bubble.color}
                  transparent
                  opacity={0.2}
                />
              </line>
            );
          })}
        </group>
      )}
    </group>
  );
};

export default EventBubbles;