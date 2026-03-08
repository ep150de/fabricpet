/**
 * Arena Generator
 * 
 * Procedurally generates holodeck-style battle arenas from biome definitions.
 * Creates the 3D geometry, materials, and effects for each arena.
 */

import * as THREE from 'three';
import type { BiomeDefinition, BiomeId, Vector3, ArenaData } from '../types/arenaTypes';
import { v4 as uuidv4 } from 'uuid';

// Import biome definitions
import biomeData from '../config/biome-definitions.json';

export interface ArenaGeometry {
  floor: THREE.Group;
  walls: THREE.Group;
  environment: THREE.Group;
  atmosphere: THREE.Group;
  grid: THREE.Group;
}

export class ArenaGenerator {
  private biomes: Map<BiomeId, BiomeDefinition>;

  constructor() {
    this.biomes = new Map();
    for (const biome of biomeData.biomes) {
      this.biomes.set(biome.id as BiomeId, biome as unknown as BiomeDefinition);
    }
  }

  /**
   * Get a biome definition by ID
   */
  getBiome(biomeId: BiomeId): BiomeDefinition | undefined {
    return this.biomes.get(biomeId);
  }

  /**
   * Get all available biomes
   */
  getAllBiomes(): BiomeDefinition[] {
    return Array.from(this.biomes.values());
  }

  /**
   * Select a random biome
   */
  getRandomBiome(): BiomeDefinition {
    const biomes = this.getAllBiomes();
    return biomes[Math.floor(Math.random() * biomes.length)];
  }

  /**
   * Select a biome that matches an element type
   */
  getBiomeForElement(elementType: string): BiomeDefinition {
    const matching = this.getAllBiomes().find(
      (b) => b.elementAffinity === elementType
    );
    return matching || this.getRandomBiome();
  }

  /**
   * Generate a complete arena
   */
  generateArena(
    biomeId: BiomeId,
    position: Vector3,
    radius: number = 15,
    wallHeight: number = 10
  ): { arenaData: ArenaData; geometry: ArenaGeometry } {
    const biome = this.biomes.get(biomeId);
    if (!biome) throw new Error(`Unknown biome: ${biomeId}`);

    const arenaData: ArenaData = {
      id: uuidv4(),
      status: 'dormant',
      biome,
      position: { ...position },
      radius,
      wallHeight,
      materializationProgress: 0,
      collapseProgress: 0,
      createdAt: Date.now(),
    };

    const geometry = this.buildGeometry(biome, radius, wallHeight);

    return { arenaData, geometry };
  }

  /**
   * Build all arena geometry
   */
  private buildGeometry(
    biome: BiomeDefinition,
    radius: number,
    wallHeight: number
  ): ArenaGeometry {
    return {
      floor: this.buildFloor(biome, radius),
      walls: this.buildWalls(biome, radius, wallHeight),
      environment: this.buildEnvironment(biome, radius, wallHeight),
      atmosphere: this.buildAtmosphere(biome, radius, wallHeight),
      grid: this.buildGrid(biome, radius),
    };
  }

  /**
   * Build the arena floor
   */
  private buildFloor(biome: BiomeDefinition, radius: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'arena-floor';

    // Base floor disc
    const floorGeometry = new THREE.CircleGeometry(radius, 64);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(biome.colors.ambient),
      roughness: 0.8,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // Biome-specific floor details
    this.addBiomeFloorDetails(group, biome, radius);

    return group;
  }

  /**
   * Build arena walls (energy barriers)
   */
  private buildWalls(
    biome: BiomeDefinition,
    radius: number,
    wallHeight: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'arena-walls';

    // Cylindrical energy barrier
    const wallGeometry = new THREE.CylinderGeometry(
      radius, radius, wallHeight, 64, 1, true
    );
    const wallMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(biome.colors.primary),
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.y = wallHeight / 2;
    group.add(wall);

    // Wall edge glow ring (top)
    const ringGeometry = new THREE.TorusGeometry(radius, 0.05, 8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(biome.colors.primary),
      transparent: true,
      opacity: 0.8,
    });
    const topRing = new THREE.Mesh(ringGeometry, ringMaterial);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = wallHeight;
    group.add(topRing);

    // Bottom ring
    const bottomRing = topRing.clone();
    bottomRing.position.y = 0;
    group.add(bottomRing);

    // Vertical energy lines
    const lineCount = 16;
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x, wallHeight, z),
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(biome.colors.grid),
        transparent: true,
        opacity: 0.4,
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      group.add(line);
    }

    return group;
  }

  /**
   * Build the holographic grid overlay
   */
  private buildGrid(biome: BiomeDefinition, radius: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'arena-grid';

    const gridColor = new THREE.Color(biome.colors.grid);
    const cellSize = 1.0;

    // Radial grid lines
    const ringCount = Math.floor(radius / cellSize);
    for (let i = 1; i <= ringCount; i++) {
      const ringRadius = i * cellSize;
      const ringGeometry = new THREE.RingGeometry(
        ringRadius - 0.01, ringRadius + 0.01, 64
      );
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: gridColor,
        transparent: true,
        opacity: 0.2 * (1 - i / ringCount), // Fade toward edges
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01; // Slightly above floor
      group.add(ring);
    }

    // Radial spoke lines
    const spokeCount = 12;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      const endX = Math.cos(angle) * radius;
      const endZ = Math.sin(angle) * radius;

      const spokeGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.01, 0),
        new THREE.Vector3(endX, 0.01, endZ),
      ]);
      const spokeMaterial = new THREE.LineBasicMaterial({
        color: gridColor,
        transparent: true,
        opacity: 0.15,
      });
      const spoke = new THREE.Line(spokeGeometry, spokeMaterial);
      group.add(spoke);
    }

    return group;
  }

  /**
   * Build biome-specific environment elements
   */
  private buildEnvironment(
    biome: BiomeDefinition,
    radius: number,
    wallHeight: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'arena-environment';

    // Add biome-specific decorations
    switch (biome.id) {
      case 'cyber_grid':
        this.addCyberGridEnvironment(group, biome, radius, wallHeight);
        break;
      case 'volcanic_forge':
        this.addVolcanicEnvironment(group, biome, radius, wallHeight);
        break;
      case 'deep_ocean':
        this.addOceanEnvironment(group, biome, radius, wallHeight);
        break;
      case 'crystal_cavern':
        this.addCrystalEnvironment(group, biome, radius, wallHeight);
        break;
      case 'void_nexus':
        this.addVoidEnvironment(group, biome, radius, wallHeight);
        break;
      case 'sky_temple':
        this.addSkyTempleEnvironment(group, biome, radius, wallHeight);
        break;
      case 'overgrown_ruins':
        this.addRuinsEnvironment(group, biome, radius, wallHeight);
        break;
    }

    return group;
  }

  /**
   * Build atmosphere (sky dome, ambient particles, lighting)
   */
  private buildAtmosphere(
    biome: BiomeDefinition,
    radius: number,
    wallHeight: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'arena-atmosphere';

    // Sky dome
    const skyGeometry = new THREE.SphereGeometry(radius * 2, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(biome.colors.sky),
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.8,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.position.y = wallHeight / 2;
    group.add(sky);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(
      new THREE.Color(biome.colors.ambient),
      0.5
    );
    group.add(ambientLight);

    // Directional light
    const dirLight = new THREE.DirectionalLight(
      new THREE.Color(biome.colors.primary),
      0.8
    );
    dirLight.position.set(5, wallHeight, 5);
    dirLight.castShadow = true;
    group.add(dirLight);

    // Ambient particles
    const particleCount = Math.floor(200 * biome.effects.particleDensity);
    if (particleCount > 0) {
      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        positions[i * 3] = Math.cos(angle) * r;
        positions[i * 3 + 1] = Math.random() * wallHeight;
        positions[i * 3 + 2] = Math.sin(angle) * r;
      }
      particleGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );

      const particleMaterial = new THREE.PointsMaterial({
        color: new THREE.Color(biome.colors.secondary),
        size: 0.05,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      });

      const particles = new THREE.Points(particleGeometry, particleMaterial);
      group.add(particles);
    }

    return group;
  }

  // ---- Biome-Specific Environment Builders ----

  private addBiomeFloorDetails(
    group: THREE.Group,
    biome: BiomeDefinition,
    radius: number
  ): void {
    // Center platform marker
    const centerGeometry = new THREE.RingGeometry(0.8, 1.0, 32);
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(biome.colors.primary),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.02;
    group.add(center);

    // Battle position markers (two sides)
    for (const side of [-1, 1]) {
      const markerGeometry = new THREE.CircleGeometry(0.5, 32);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(biome.colors.secondary),
        transparent: true,
        opacity: 0.3,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(side * radius * 0.4, 0.02, 0);
      group.add(marker);
    }
  }

  private addCyberGridEnvironment(
    group: THREE.Group,
    biome: BiomeDefinition,
    radius: number,
    wallHeight: number
  ): void {
    // Data stream columns
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * radius * 0.7;
      const z = Math.sin(angle) * radius * 0.7;

      const columnGeometry = new THREE.BoxGeometry(0.1, wallHeight * 0.8, 0.1);
      const columnMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(biome.colors.primary),
        transparent: true,
        opacity: 0.3,
      });
      const column = new THREE.Mesh(columnGeometry, columnMaterial);
      column.position.set(x, wallHeight * 0.4, z);
      group.add(column);
    }
  }

  private addVolcanicEnvironment(
    group: THREE.Group,
    biome: BiomeDefinition,
    radius: number,
    wallHeight: number
  ): void {
    // Obsidian pillars
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
      const r = radius * (0.5 + Math.random() * 0.3);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const height = 1 + Math.random() * 3;

      const pillarGeometry = new THREE.ConeGeometry(0.3, height, 6);
      const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.9,
        metalness: 0.1,
      });
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.set(x, height / 2, z);
      group.add(pillar);
    }
  }

  private addOceanEnvironment(
    group: THREE.Group,
    biome: BiomeDefinition,
    radius: number,
    wallHeight: number
  ): void {
    // Coral formations
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.3 + Math.random() * 0.5);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const coralGeometry = new THREE.SphereGeometry(
        0.2 + Math.random() * 0.3, 8, 8
      );
      const coralMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(biome.colors.secondary),
        emissive: new THREE.Color(biome.colors.secondary),
        emissiveIntensity: 0.3,
      });
      const coral = new THREE.Mesh(coralGeometry, coralMaterial);
      coral.position.set(x, 0.2, z);
      coral.scale.y = 1.5 + Math.random();
      group.add(coral);
    }
  }

  private addCrystalEnvironment(
    group: THREE.Group,
    biome: BiomeDefinition,
    radius: number,
    wallHeight: number
  ): void {
    // Crystal formations
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.4 + Math.random() * 0.4);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const height = 0.5 + Math.random() * 2;

      const crystalGeometry = new THREE.OctahedronGeometry(0.2 + Math.random() * 0.2);
      const crystalMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(biome.colors.primary),
        transparent: true,
        opacity: 0.7,
        roughness: 0.05,
        metalness: 0.1,
        clearcoat: 1.0,
      });
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      crystal.position.set(x, height / 2, z);
      crystal.scale.y = height;
      crystal.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI,
        Math.random() * 0.3
      );
      group.add(crystal);
    }
  }

  private addVoidEnvironment(
    group: THREE.Group,
    biome: BiomeDefinition,
    radius: number,
    wallHeight: number
  ): void {
    // Floating debris
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.2 + Math.random() * 0.6);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = 1 + Math.random() * (wallHeight - 2);

      const debrisGeometry = new THREE.IcosahedronGeometry(
        0.1 + Math.random() * 0.2, 0
      );
      const debrisMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        emissive: new THREE.Color(biome.colors.primary),
        emissiveIntensity: 0.2,
      });
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      debris.position.set(x, y, z);
      group.add(debris);
    }
  }

  private addSkyTempleEnvironment(
    group: THREE.Group,
    biome: BiomeDefinition,
    radius: number,
    wallHeight: number
  ): void {
    // Temple pillars
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(angle) * radius * 0.6;
      const z = Math.sin(angle) * radius * 0.6;

      const pillarGeometry = new THREE.CylinderGeometry(0.2, 0.25, wallHeight * 0.7, 8);
      const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0xddcc88,
        roughness: 0.6,
        metalness: 0.3,
      });
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.set(x, wallHeight * 0.35, z);
      group.add(pillar);
    }
  }

  private addRuinsEnvironment(
    group: THREE.Group,
    biome: BiomeDefinition,
    radius: number,
    wallHeight: number
  ): void {
    // Broken stone blocks
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.3 + Math.random() * 0.5);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const blockGeometry = new THREE.BoxGeometry(
        0.3 + Math.random() * 0.5,
        0.2 + Math.random() * 0.8,
        0.3 + Math.random() * 0.5
      );
      const blockMaterial = new THREE.MeshStandardMaterial({
        color: 0x555544,
        roughness: 0.9,
      });
      const block = new THREE.Mesh(blockGeometry, blockMaterial);
      block.position.set(x, 0.2, z);
      block.rotation.y = Math.random() * Math.PI;
      group.add(block);
    }

    // Bioluminescent vine points
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * Math.random();
      const vineGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const vineMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(biome.colors.primary),
        transparent: true,
        opacity: 0.8,
      });
      const vine = new THREE.Mesh(vineGeometry, vineMaterial);
      vine.position.set(
        Math.cos(angle) * r,
        Math.random() * 2,
        Math.sin(angle) * r
      );
      group.add(vine);
    }
  }
}
