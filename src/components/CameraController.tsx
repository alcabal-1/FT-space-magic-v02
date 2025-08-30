/**
 * CameraController: Cinematic camera movements and glass elevator UX
 * Layer 3: Professional camera work that feels like a movie
 */

import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3, Spherical } from 'three';
import { useTower3DStore } from '../stores/tower3DStore';
import { TOWER_CONFIG } from '../types/tower';
import * as THREE from 'three';

interface CameraTarget {
  position: Vector3;
  target: Vector3;
  transitionDuration: number;
  easeFunction: (t: number) => number;
}

// Smooth easing functions for cinematic movement
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const easeInOutQuart = (t: number): number => {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
};

const CameraController: React.FC = () => {
  const { camera, scene } = useThree();
  const controlsRef = useRef<any>(null);
  const animationRef = useRef<{
    startTime: number;
    startPosition: Vector3;
    startTarget: Vector3;
    targetPosition: Vector3;
    targetLookAt: Vector3;
    duration: number;
    easeFunction: (t: number) => number;
    isAnimating: boolean;
  }>({
    startTime: 0,
    startPosition: new Vector3(),
    startTarget: new Vector3(),
    targetPosition: new Vector3(),
    targetLookAt: new Vector3(),
    duration: 0,
    easeFunction: easeInOutCubic,
    isAnimating: false
  });
  
  const { focusedFloor, cameraMode, floors } = useTower3DStore();
  
  // Calculate optimal camera positions
  const calculateCameraPositions = (floorIndex: number | null) => {
    if (floorIndex === null) {
      // Overview position - show entire tower
      return {
        position: new Vector3(600, 800, 600),
        target: new Vector3(0, TOWER_CONFIG.TOTAL_FLOORS * TOWER_CONFIG.FLOOR_HEIGHT / 2, 0)
      };
    } else {
      // Focused position - dolly zoom to specific floor
      const floorHeight = floorIndex * TOWER_CONFIG.FLOOR_HEIGHT;
      const floor = floors[floorIndex];
      
      if (floor) {
        const floorCenterX = (floor.boundingBox.maxX + floor.boundingBox.minX) / 2;
        const floorCenterY = (floor.boundingBox.maxY + floor.boundingBox.minY) / 2;
        
        return {
          position: new Vector3(floorCenterX + 400, floorHeight + 200, floorCenterY + 400),
          target: new Vector3(floorCenterX, floorHeight, floorCenterY)
        };
      }
    }
    
    // Fallback
    return {
      position: new Vector3(400, 400, 400),
      target: new Vector3(0, 0, 0)
    };
  };
  
  // Smooth camera animation
  const animateCameraTo = (
    targetPosition: Vector3, 
    targetLookAt: Vector3, 
    duration: number = TOWER_CONFIG.ANIMATION_DURATION,
    easeFunction: (t: number) => number = easeInOutCubic
  ) => {
    const anim = animationRef.current;
    
    anim.startTime = Date.now();
    anim.startPosition.copy(camera.position);
    anim.startTarget.copy(controlsRef.current?.target || new Vector3(0, 0, 0));
    anim.targetPosition.copy(targetPosition);
    anim.targetLookAt.copy(targetLookAt);
    anim.duration = duration * 1000; // Convert to milliseconds
    anim.easeFunction = easeFunction;
    anim.isAnimating = true;
    
    // Disable controls during animation
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
  };
  
  // Handle focus changes (disabled auto-animation for user control)
  // useEffect(() => {
  //   const { position, target } = calculateCameraPositions(focusedFloor);
  //   
  //   if (focusedFloor === null) {
  //     // Smooth transition to overview
  //     animateCameraTo(position, target, 2.0, easeInOutQuart);
  //   } else {
  //     // Cinematic dolly zoom to floor
  //     animateCameraTo(position, target, 1.5, easeInOutCubic);
  //   }
  // }, [focusedFloor, floors]);
  
  // Animation loop
  useFrame((state, delta) => {
    const anim = animationRef.current;
    
    if (anim.isAnimating) {
      const elapsed = Date.now() - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);
      const easedT = anim.easeFunction(t);
      
      // Interpolate camera position
      camera.position.lerpVectors(anim.startPosition, anim.targetPosition, easedT);
      
      // Interpolate camera target
      if (controlsRef.current) {
        const currentTarget = new Vector3().lerpVectors(anim.startTarget, anim.targetLookAt, easedT);
        controlsRef.current.target.copy(currentTarget);
        controlsRef.current.update();
      }
      
      // Animation complete
      if (t >= 1) {
        anim.isAnimating = false;
        
        // Re-enable controls
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
      }
    }
    // Orbital drift disabled - user has full camera control
  });
  
  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      enableDamping={true}
      dampingFactor={0.05}
      minDistance={100}
      maxDistance={1500}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2}
      target={[0, TOWER_CONFIG.TOTAL_FLOORS * TOWER_CONFIG.FLOOR_HEIGHT / 2, 0]}
      // Smooth momentum
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      panSpeed={0.8}
    />
  );
};

export default CameraController;