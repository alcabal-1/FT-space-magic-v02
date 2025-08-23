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
import type { EventBubble } from '../types/tower';
import { EVENT_COLORS } from '../types/tower';

interface EventBubblesProps {
  bubbles: EventBubble[];
}

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
      
      // Gentle floating motion
      const floatY = Math.sin(time * 2 + bubble.position[0] * 0.01) * 2;
      meshRef.current.position.setY(bubble.position[2] + floatY);
    }
  });
  
  const bubbleColor = useMemo(() => new Color(bubble.color), [bubble.color]);
  
  return (
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
        opacity={bubble.isActive ? 0.8 : 0.4}
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
      
      {/* Event info on hover */}
      {hovered && (
        <mesh position={[bubble.size + 20, 10, 0]}>
          <planeGeometry args={[60, 20]} />
          <meshBasicMaterial
            color="#1e293b"
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
    </mesh>
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
    opacity: 0.8
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
      
      // Floating motion
      const floatY = Math.sin(time * 2 + bubble.position[0] * 0.01) * 3;
      tempObject.position.y = bubble.position[2] + floatY;
      
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
  
  // Use instanced rendering for performance when there are many bubbles
  const useInstancedRendering = bubbles.length > 20;
  
  const handleBubbleClick = (bubble: EventBubble) => {
    setSelectedBubble(selectedBubble?.id === bubble.id ? null : bubble);
    console.log('Event bubble clicked:', bubble.title);
  };
  
  if (bubbles.length === 0) return null;
  
  return (
    <group>
      {useInstancedRendering ? (
        <InstancedEventBubbles bubbles={bubbles} />
      ) : (
        // Individual bubbles for better interaction when count is low
        bubbles.map(bubble => (
          <SingleEventBubble
            key={bubble.id}
            bubble={bubble}
            onClick={() => handleBubbleClick(bubble)}
          />
        ))
      )}
      
      {/* Particle effects for very active bubbles */}
      {bubbles
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
      {bubbles.length > 1 && (
        <group>
          {bubbles.slice(0, -1).map((bubble, i) => {
            const nextBubble = bubbles[i + 1];
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