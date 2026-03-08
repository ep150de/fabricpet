// ============================================
// Scene JSON Generator — Dynamic RP1 scene from Bitcoin wallet
// ============================================
// Generates Scene Assembler JSON that references ordinal inscriptions
// directly via ordinals.com URLs. No manual re-publishing needed!
// ============================================

import type { Pet, OrdinalInscription } from '../types';
import { ORDINALS_CONTENT_BASE, RP1_CONFIG } from '../utils/constants';

// Scene Assembler JSON types
export interface SceneTransform {
  aPosition: [number, number, number];
  aRotation: [number, number, number, number]; // quaternion xyzw
  aScale: [number, number, number];
}

export interface SceneNode {
  sName: string;
  pResource?: { sReference: string };
  pTransform: SceneTransform;
  aBound: [number, number, number];
  aChildren: SceneNode[];
  wClass?: number;
}

export type SceneJSON = [SceneNode];

// Content types that are 3D models
const MODEL_TYPES = ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];

/**
 * Check if an inscription is a 3D model based on content type.
 */
export function is3DInscription(inscription: OrdinalInscription): boolean {
  const ct = (inscription.contentType || '').toLowerCase();
  return MODEL_TYPES.some(t => ct.includes(t)) || ct.includes('gltf') || ct.includes('glb');
}

/**
 * Check if an inscription is an image.
 */
export function isImageInscription(inscription: OrdinalInscription): boolean {
  const ct = (inscription.contentType || '').toLowerCase();
  return IMAGE_TYPES.some(t => ct.includes(t));
}

/**
 * Get the ordinals.com content URL for an inscription.
 * This URL serves the raw content and can be used as pResource.sReference.
 */
export function getOrdinalContentUrl(inscriptionId: string): string {
  return `${ORDINALS_CONTENT_BASE}/${inscriptionId}`;
}

/**
 * Generate a complete Scene Assembler JSON from the user's pet and wallet inscriptions.
 * 
 * Layout:
 * - Pet model at center (0, 0, 0)
 * - 3D ordinal inscriptions arranged in a circle around the pet
 * - Image inscriptions displayed as floating panels
 */
export function generateSceneJSON(
  pet: Pet,
  inscriptions: OrdinalInscription[],
  options: {
    sceneSize?: number;
    petPosition?: [number, number, number];
    includeImages?: boolean;
  } = {}
): SceneJSON {
  const {
    sceneSize = 20,
    petPosition = [0, 0.5, 0],
    includeImages = false,
  } = options;

  const children: SceneNode[] = [];

  // 1. Add the pet as the central object
  if (pet.equippedOrdinal) {
    // If pet has an equipped ordinal, use it directly
    children.push({
      sName: `${pet.name} (FabricPet)`,
      pResource: { sReference: getOrdinalContentUrl(pet.equippedOrdinal) },
      pTransform: {
        aPosition: petPosition,
        aRotation: [0, 0, 0, 1],
        aScale: [1, 1, 1],
      },
      aBound: [1, 1, 1],
      aChildren: [],
    });
  }

  // 2. Add 3D ordinal inscriptions from wallet
  const models = inscriptions.filter(is3DInscription);
  const radius = Math.max(3, models.length * 0.8); // Spread based on count

  models.forEach((inscription, i) => {
    // Skip the equipped one (already placed as pet)
    if (inscription.id === pet.equippedOrdinal) return;

    const angle = (i / models.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    children.push({
      sName: inscription.id.slice(0, 12) + '...',
      pResource: { sReference: getOrdinalContentUrl(inscription.id) },
      pTransform: {
        aPosition: [x, 0.5, z],
        aRotation: [0, 0, 0, 1],
        aScale: [1, 1, 1],
      },
      aBound: [1, 1, 1],
      aChildren: [],
    });
  });

  // 3. Optionally add image inscriptions as display objects
  if (includeImages) {
    const images = inscriptions.filter(isImageInscription);
    const imgRadius = radius + 2;

    images.forEach((inscription, i) => {
      if (inscription.id === pet.equippedOrdinal) return;

      const angle = (i / Math.max(images.length, 1)) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(angle) * imgRadius;
      const z = Math.sin(angle) * imgRadius;

      // Images need a display surface — reference the ordinal URL
      // The RP1 browser may render these as textured planes
      children.push({
        sName: `img-${inscription.id.slice(0, 8)}`,
        pResource: { sReference: getOrdinalContentUrl(inscription.id) },
        pTransform: {
          aPosition: [x, 1.5, z],
          aRotation: [0, 0, 0, 1],
          aScale: [0.5, 0.5, 0.01],
        },
        aBound: [0.5, 0.5, 0.01],
        aChildren: [],
      });
    });
  }

  // Build the root scene
  const scene: SceneJSON = [
    {
      sName: `${pet.name}'s FabricPet World`,
      pTransform: {
        aPosition: [0, 0, 0],
        aRotation: [0, 0, 0, 1],
        aScale: [1, 1, 1],
      },
      aBound: [sceneSize, sceneSize, sceneSize],
      aChildren: children,
    },
  ];

  return scene;
}

/**
 * Generate scene JSON and return as a formatted string.
 */
export function generateSceneJSONString(
  pet: Pet,
  inscriptions: OrdinalInscription[],
  options?: Parameters<typeof generateSceneJSON>[2]
): string {
  const scene = generateSceneJSON(pet, inscriptions, options);
  return JSON.stringify(scene, null, 2);
}

/**
 * Generate a single-object scene JSON for one inscription.
 * Useful for the "Add to RP1" per-inscription button.
 */
export function generateSingleObjectJSON(
  inscription: OrdinalInscription,
  position: [number, number, number] = [0, 0.5, 0]
): SceneJSON {
  return [
    {
      sName: `Ordinal ${inscription.id.slice(0, 12)}`,
      pTransform: {
        aPosition: [0, 0, 0],
        aRotation: [0, 0, 0, 1],
        aScale: [1, 1, 1],
      },
      aBound: [20, 20, 20],
      aChildren: [
        {
          sName: inscription.id.slice(0, 16),
          pResource: { sReference: getOrdinalContentUrl(inscription.id) },
          pTransform: {
            aPosition: position,
            aRotation: [0, 0, 0, 1],
            aScale: [1, 1, 1],
          },
          aBound: [1, 1, 1],
          aChildren: [],
        },
      ],
    },
  ];
}
