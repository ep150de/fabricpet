// ============================================
// XR Interactions — Hand tracking, gaze, physics for WebXR
// ============================================
// Provides interactive features for WebXR mode:
// - Hand tracking with gesture recognition (wave, point, thumbs up, fist)
// - Gaze interaction (pet follows user's look direction)
// - Spatial audio (pet sounds from pet location)
// - Physics-based ball throwing
// ============================================

import type * as THREE from 'three';

export interface XRInteractionState {
  // Hand tracking
  handTrackingAvailable: boolean;
  leftHandPosition: THREE.Vector3 | null;
  rightHandPosition: THREE.Vector3 | null;
  currentGesture: GestureType | null;
  
  // Gaze
  headPosition: THREE.Vector3;
  headDirection: THREE.Vector3;
  isLookingAtPet: boolean;
  
  // Interaction
  isInteracting: boolean;
  lastInteractionTime: number;
  
  // Ball physics
  ballInFlight: boolean;
  ballVelocity: THREE.Vector3 | null;
}

export type GestureType = 'wave' | 'point' | 'thumbsUp' | 'fist' | 'open' | 'pinch' | 'none';

export interface XRPetReaction {
  animation: 'wave' | 'happy' | 'look' | 'play' | 'hide' | 'idle';
  duration: number;
  sound?: string;
}

// Cooldown between interactions (ms)
const INTERACTION_COOLDOWN = 1000;

/**
 * Initialize XR interaction state
 */
export function createXRInteractionState(): XRInteractionState {
  return {
    handTrackingAvailable: false,
    leftHandPosition: null,
    rightHandPosition: null,
    currentGesture: null,
    headPosition: new (require('three') as any).Vector3(0, 1.6, 0),
    headDirection: new (require('three') as any).Vector3(0, 0, -1),
    isLookingAtPet: false,
    isInteracting: false,
    lastInteractionTime: 0,
    ballInFlight: false,
    ballVelocity: null,
  };
}

/**
 * Detect hand gesture from joint positions
 * Simplified gesture detection based on finger positions
 */
export function detectGesture(hand: any): GestureType {
  if (!hand || !hand.joints) return 'none';
  
  try {
    // Get key joint positions
    const wrist = hand.joints['wrist'];
    const thumbTip = hand.joints['thumb-tip'];
    const indexTip = hand.joints['index-finger-tip'];
    const middleTip = hand.joints['middle-finger-tip'];
    const ringTip = hand.joints['ring-finger-tip'];
    const littleTip = hand.joints['little-finger-tip'];
    
    const indexMcp = hand.joints['index-finger-metacarpal'];
    const middleMcp = hand.joints['middle-finger-metacarpal'];
    
    if (!wrist || !thumbTip || !indexTip) return 'none';
    
    // Calculate finger extensions (simplified)
    const indexExtended = indexTip.position.y > indexMcp?.position.y;
    const middleExtended = middleTip?.position.y > middleMcp?.position.y;
    const allExtended = indexExtended && middleExtended;
    
    // Fist: all fingers closed
    if (!indexExtended && !middleExtended) {
      return 'fist';
    }
    
    // Point: only index extended
    if (indexExtended && !middleExtended) {
      return 'point';
    }
    
    // Open hand: all fingers extended
    if (allExtended) {
      return 'open';
    }
    
    // Thumbs up: thumb up, others closed (simplified check)
    if (thumbTip.position.y > wrist.position.y + 0.1 && !indexExtended) {
      return 'thumbsUp';
    }
    
    // Pinch: thumb and index close together
    const thumbIndexDist = Math.sqrt(
      Math.pow(thumbTip.position.x - indexTip.position.x, 2) +
      Math.pow(thumbTip.position.y - indexTip.position.y, 2) +
      Math.pow(thumbTip.position.z - indexTip.position.z, 2)
    );
    if (thumbIndexDist < 0.03) {
      return 'pinch';
    }
    
    return 'none';
  } catch {
    return 'none';
  }
}

/**
 * Get pet reaction based on gesture
 */
export function getReactionForGesture(gesture: GestureType): XRPetReaction {
  switch (gesture) {
    case 'wave':
      return { animation: 'wave', duration: 1000, sound: 'happy' };
    case 'thumbsUp':
      return { animation: 'happy', duration: 1500, sound: 'happy' };
    case 'point':
      return { animation: 'look', duration: 800 };
    case 'fist':
      return { animation: 'hide', duration: 1000, sound: 'scared' };
    case 'open':
      return { animation: 'happy', duration: 1000, sound: 'happy' };
    case 'pinch':
      return { animation: 'play', duration: 1200, sound: 'excited' };
    default:
      return { animation: 'idle', duration: 0 };
  }
}

/**
 * Check if user is looking at pet
 */
export function isLookingAtPet(
  headPosition: THREE.Vector3,
  headDirection: THREE.Vector3,
  petPosition: THREE.Vector3,
  threshold: number = 0.8
): boolean {
  // Calculate direction from head to pet
  const toPet = new (require('three') as any).Vector3()
    .subVectors(petPosition, headPosition)
    .normalize();
  
  // Dot product with head direction
  const dot = headDirection.dot(toPet);
  
  // If dot product > threshold, user is looking at pet
  return dot > threshold;
}

/**
 * Calculate ball throw velocity from hand movement
 */
export function calculateThrowVelocity(
  handPosition: THREE.Vector3,
  prevHandPosition: THREE.Vector3,
  deltaTime: number
): THREE.Vector3 {
  if (deltaTime <= 0) return new (require('three') as any).Vector3();
  
  const velocity = new (require('three') as any).Vector3()
    .subVectors(handPosition, prevHandPosition)
    .divideScalar(deltaTime);
  
  // Clamp velocity to reasonable values
  const maxSpeed = 10; // m/s
  if (velocity.length() > maxSpeed) {
    velocity.normalize().multiplyScalar(maxSpeed);
  }
  
  return velocity;
}

/**
 * Update ball physics (simple projectile motion)
 */
export function updateBallPhysics(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  deltaTime: number,
  gravity: number = 9.8
): { position: THREE.Vector3; velocity: THREE.Vector3; grounded: boolean } {
  // Apply gravity
  velocity.y -= gravity * deltaTime;
  
  // Update position
  const newPosition = new (require('three') as any).Vector3()
    .copy(position)
    .add(velocity.clone().multiplyScalar(deltaTime));
  
  // Check ground collision (y = 0)
  let grounded = false;
  if (newPosition.y <= 0.1) {
    newPosition.y = 0.1;
    velocity.y = -velocity.y * 0.6; // Bounce with damping
    velocity.x *= 0.8; // Friction
    velocity.z *= 0.8;
    grounded = true;
    
    // Stop if velocity is very low
    if (Math.abs(velocity.y) < 0.1) {
      velocity.y = 0;
    }
  }
  
  return { position: newPosition, velocity, grounded };
}

/**
 * Play spatial audio for pet
 */
export function playSpatialAudio(
  audioContext: AudioContext,
  type: 'happy' | 'scared' | 'excited' | 'idle',
  position: THREE.Vector3,
  listenerPosition: THREE.Vector3
): void {
  // This would integrate with Web Audio API for spatial audio
  // For now, we'll use console logging as a placeholder
  console.log(`[XRAudio] Playing ${type} sound at position:`, position);
  
  // In a full implementation, this would:
  // 1. Create an AudioBufferSourceNode
  // 2. Create a PannerNode for 3D positioning
  // 3. Set position based on pet location
  // 4. Play the sound
}
