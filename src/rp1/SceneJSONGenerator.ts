// ============================================
// Scene JSON Generator — Dynamic RP1 scene from Bitcoin wallet
// ============================================
// Generates Scene Assembler JSON that references ordinal inscriptions
// directly via ordinals.com URLs. No manual re-publishing needed!
// ============================================

import type { Pet, OrdinalInscription, HomeState } from '../types';
import { ORDINALS_CONTENT_BASE, RP1_CONFIG, HOME_THEMES } from '../utils/constants';

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
  twObjectIx?: string;
  aAnnotation?: string;
}

export type SceneJSON = [SceneNode];

// wClass values: 1=ground/terrain, 2=architecture, 3=props/furniture, 4=character/pet, 5=ordinal content, 6=display panel
const WCLASS_GROUND = 1;
const WCLASS_ARCH = 2;
const WCLASS_PROP = 3;
const WCLASS_PET = 4;
const WCLASS_ORDINAL = 5;
const WCLASS_DISPLAY = 6;

function stableUUID(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const h = Math.abs(hash).toString(16).padStart(8, '0');
  return `${h}-${h.slice(0, 4)}-4${h.slice(0, 3)}-${((Math.abs(hash) >>> 8) & 0x3fff | 0x8000).toString(16).slice(0, 4)}-${Math.abs(hash).toString(16).padStart(12, '0').slice(0, 12)}`;
}

function petUUID(pet: Pet, key: string): string {
  return stableUUID(`${pet.id}:${pet.name}:${key}`);
}

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
    home?: HomeState;
  } = {}
): SceneJSON {
  const {
    sceneSize = 20,
    petPosition = [0, 0.5, 0],
    includeImages = false,
    home,
  } = options;

  const children: SceneNode[] = [];

  // 1. Add home theme environment if available
  if (home) {
    const theme = HOME_THEMES.find(t => t.id === home.theme) || HOME_THEMES[0];
    
    // Add ground plane with theme color
    const themeColors: Record<string, string> = {
      room: '#f5e6d3',
      garden: '#7cba3d',
      beach: '#f5deb3',
      castle: '#808080',
      space: '#1a1a2e',
    };
    const groundColor = themeColors[home.theme] || '#f5e6d3';
    
    children.push({
      sName: `${pet.name}'s Home (${theme.name})`,
      wClass: WCLASS_GROUND,
      twObjectIx: petUUID(pet, `ground:${home.theme}`),
      aAnnotation: `theme:${home.theme};color:${groundColor}`,
      pTransform: {
        aPosition: [0, 0, 0],
        aRotation: [0, 0, 0, 1],
        aScale: [sceneSize, 0.01, sceneSize],
      },
      aBound: [sceneSize, 0.01, sceneSize],
      aChildren: [
        {
          sName: `Theme: ${theme.name}`,
          wClass: WCLASS_GROUND,
          twObjectIx: petUUID(pet, `theme:${home.theme}`),
          pTransform: {
            aPosition: [0, 0, 0],
            aRotation: [0, 0, 0, 1],
            aScale: [1, 1, 1],
          },
          aBound: [sceneSize, 0.01, sceneSize],
          aChildren: [],
        }
      ],
    });

    // Add furniture items from home state
    if (home.furniture && home.furniture.length > 0) {
      home.furniture.forEach((item) => {
        children.push({
          sName: `${item.type}_${item.id}`,
          wClass: WCLASS_PROP,
          twObjectIx: petUUID(pet, `furniture:${item.id}`),
          pTransform: {
            aPosition: item.position,
            aRotation: [0, 0, 0, 1],
            aScale: [0.5, 0.5, 0.5],
          },
          aBound: [0.5, 0.5, 0.5],
          aChildren: [],
        });
      });
    }
  }

  // 2. Add the pet as the central object
  if (pet.equippedOrdinal) {
    children.push({
      sName: `${pet.name} (FabricPet)`,
      wClass: WCLASS_PET,
      twObjectIx: petUUID(pet, 'pet'),
      pResource: { sReference: getOrdinalContentUrl(pet.equippedOrdinal) },
      pTransform: {
        aPosition: petPosition,
        aRotation: [0, 0, 0, 1],
        aScale: [1, 1, 1],
      },
      aBound: [1, 1, 1],
      aChildren: [],
    });
  } else {
    const elementColors: Record<string, string> = {
      fire: '#ff6b6b',
      water: '#6bc5ff',
      earth: '#6bff6b',
      air: '#c5c5ff',
      light: '#ffff6b',
      dark: '#9b6bff',
      neutral: '#ffffff',
    };
    const petColor = elementColors[pet.elementalType] || '#ffffff';

    children.push({
      sName: `${pet.name} (FabricPet - Default)`,
      wClass: WCLASS_PET,
      twObjectIx: petUUID(pet, 'pet'),
      pTransform: {
        aPosition: petPosition,
        aRotation: [0, 0, 0, 1],
        aScale: [0.5, 0.5, 0.5],
      },
      aBound: [0.5, 0.5, 0.5],
      aChildren: [],
    });
  }

  // 2. Add 3D ordinal inscriptions from wallet
  const models = inscriptions.filter(is3DInscription);
  const radius = Math.max(3, models.length * 0.8); // Spread based on count

  models.forEach((inscription, i) => {
    if (inscription.id === pet.equippedOrdinal) return;

    const angle = (i / models.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    children.push({
      sName: inscription.id.slice(0, 12) + '...',
      wClass: WCLASS_ORDINAL,
      twObjectIx: petUUID(pet, `ordinal:${inscription.id}`),
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
        wClass: WCLASS_DISPLAY,
        twObjectIx: petUUID(pet, `image:${inscription.id}`),
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
      wClass: WCLASS_ARCH,
      twObjectIx: petUUID(pet, 'root'),
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
      wClass: WCLASS_ORDINAL,
      twObjectIx: stableUUID(`ordinal:${inscription.id}`),
      pTransform: {
        aPosition: [0, 0, 0],
        aRotation: [0, 0, 0, 1],
        aScale: [1, 1, 1],
      },
      aBound: [20, 20, 20],
      aChildren: [
        {
          sName: inscription.id.slice(0, 16),
          wClass: WCLASS_ORDINAL,
          twObjectIx: stableUUID(`ordinal-child:${inscription.id}`),
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
