/**
 * VFX Helpers
 * 
 * Utility functions for creating visual effects in the arena.
 */

import * as THREE from 'three';
import type { Vector3, ParticleConfig } from '../types/arenaTypes';

/**
 * Create a particle burst at a position
 */
export function createParticleBurst(
  position: Vector3,
  config: ParticleConfig
): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(config.count * 3);
  const velocities = new Float32Array(config.count * 3);

  for (let i = 0; i < config.count; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = config.speed * (0.5 + Math.random() * 0.5);

    velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
    velocities[i * 3 + 1] = Math.cos(phi) * speed;
    velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

  const color = Array.isArray(config.color) ? config.color[0] : config.color;
  const material = new THREE.PointsMaterial({
    color: new THREE.Color(color),
    size: config.size,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

/**
 * Create a holographic grid plane
 */
export function createHolographicGrid(
  radius: number,
  color: string,
  cellSize: number = 1.0
): THREE.Group {
  const group = new THREE.Group();
  const gridColor = new THREE.Color(color);

  const divisions = Math.floor(radius * 2 / cellSize);
  const gridHelper = new THREE.GridHelper(
    radius * 2,
    divisions,
    gridColor,
    gridColor
  );
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.2;
  group.add(gridHelper);

  return group;
}

/**
 * Create an energy beam effect
 */
export function createEnergyBeam(
  start: Vector3,
  height: number,
  color: string,
  radius: number = 0.1
): THREE.Group {
  const group = new THREE.Group();

  // Outer beam
  const outerGeometry = new THREE.CylinderGeometry(radius, radius * 3, height, 16, 1, true);
  const outerMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const outer = new THREE.Mesh(outerGeometry, outerMaterial);
  outer.position.set(start.x, start.y + height / 2, start.z);
  group.add(outer);

  // Inner core
  const innerGeometry = new THREE.CylinderGeometry(radius * 0.3, radius, height, 8, 1, true);
  const innerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
  });
  const inner = new THREE.Mesh(innerGeometry, innerMaterial);
  inner.position.set(start.x, start.y + height / 2, start.z);
  group.add(inner);

  return group;
}

/**
 * Create a pulsing ring effect
 */
export function createPulsingRing(
  position: Vector3,
  color: string,
  maxRadius: number = 5
): THREE.Mesh {
  const geometry = new THREE.RingGeometry(0.1, 0.2, 64);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.set(position.x, position.y + 0.05, position.z);
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

/**
 * Lerp between two colors
 */
export function lerpColor(
  color1: string,
  color2: string,
  t: number
): THREE.Color {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, t);
}

/**
 * Dispose of a Three.js object and its children
 */
export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
    if (child instanceof THREE.Points) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
    if (child instanceof THREE.Line) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  });
}
