// ============================================
// RP1 Compatibility Layer — Rubidium/Sneeze Support
// ============================================
// Provides feature detection and compatibility for RP1's new
// architecture framework (Rubidium engine, Sneeze browser, OMB standards).
// 
// Sneeze (github.com/MetaversalCorp/Sneeze) is a C++ open metaverse
// browser engine that renders RP1 content using:
// - ANARI (Khronos rendering API)
// - OpenXR (XR device access)
// - fastgltf (GLB model loading)
// - SPIR-V (shader validation)
// - RMAP (realtime spatial networking)
// - MVMF (Metaverse Standards Forum protocol)
//
// This module ensures FabricPet's exports are compatible with Sneeze's
// loading pipeline and supports the latest RP1 spatial fabric standards.
// ============================================

import { RP1_CONFIG } from '../utils/constants';

// --- RP1 Framework Version Detection ---

export type RP1Framework = 'legacy' | 'rubidium' | 'sneeze' | 'unknown';

export interface RP1Capabilities {
  framework: RP1Framework;
  version: string;
  supportsSceneAssemblerV2: boolean;
  supportsMVMFv2: boolean;
  supportsANARIRendering: boolean;
  supportsOpenXR: boolean;
  supportsFastGLTF: boolean;
  supportsRMAP: boolean;
  supportsSpatialAudio: boolean;
  supportsHandTracking: boolean;
  supportsEyeTracking: boolean;
}

// Default capabilities (legacy RP1)
const DEFAULT_CAPABILITIES: RP1Capabilities = {
  framework: 'legacy',
  version: '1.0',
  supportsSceneAssemblerV2: false,
  supportsMVMFv2: false,
  supportsANARIRendering: false,
  supportsOpenXR: false,
  supportsFastGLTF: false,
  supportsRMAP: false,
  supportsSpatialAudio: true,
  supportsHandTracking: false,
  supportsEyeTracking: false,
};

// --- Feature Detection ---

/**
 * Detect which RP1 framework is available
 */
export async function detectRP1Framework(): Promise<RP1Capabilities> {
  const capabilities = { ...DEFAULT_CAPABILITIES };

  try {
    // Check MSF service health and version
    const response = await fetch(`${RP1_CONFIG.msfServiceUrl}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      
      // Check for version indicators in response
      if (data) {
        if (data.framework === 'rubidium' || data.framework === 'sneeze') {
          capabilities.framework = data.framework;
          capabilities.version = data.version || '2.0';
          capabilities.supportsSceneAssemblerV2 = true;
          capabilities.supportsMVMFv2 = true;
          capabilities.supportsANARIRendering = true;
          capabilities.supportsOpenXR = true;
          capabilities.supportsFastGLTF = true;
          capabilities.supportsRMAP = true;
          capabilities.supportsHandTracking = true;
          capabilities.supportsEyeTracking = data.eyeTracking || false;
        } else if (data.version) {
          capabilities.version = data.version;
        }
      }

      // Check for Sneeze-specific headers
      const serverHeader = response.headers.get('X-Server');
      if (serverHeader?.toLowerCase().includes('sneeze')) {
        capabilities.framework = 'sneeze';
        capabilities.version = '2.0';
        capabilities.supportsSceneAssemblerV2 = true;
        capabilities.supportsMVMFv2 = true;
        capabilities.supportsANARIRendering = true;
        capabilities.supportsOpenXR = true;
        capabilities.supportsFastGLTF = true;
        capabilities.supportsRMAP = true;
        capabilities.supportsHandTracking = true;
      }

      // Check for Rubidium-specific headers
      const rubidiumHeader = response.headers.get('X-Rubidium');
      if (rubidiumHeader) {
        capabilities.framework = 'rubidium';
        capabilities.version = rubidiumHeader;
        capabilities.supportsSceneAssemblerV2 = true;
        capabilities.supportsMVMFv2 = true;
        capabilities.supportsANARIRendering = true;
        capabilities.supportsOpenXR = true;
        capabilities.supportsFastGLTF = true;
        capabilities.supportsRMAP = true;
        capabilities.supportsHandTracking = true;
      }
    }
  } catch (error) {
    console.warn('[RP1 Compat] Feature detection failed:', error);
  }

  // Check browser capabilities
  if (typeof navigator !== 'undefined') {
    // Check for WebXR hand tracking
    if (navigator.xr) {
      try {
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        if (supported) {
          capabilities.supportsOpenXR = true;
        }
      } catch {
        // ignore
      }
    }

    // Check for WebXR hand tracking
    if (navigator.xr) {
      try {
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        if (supported) {
          // Check for hand tracking
          const session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hand-tracking'],
          }).catch(() => null);
          if (session) {
            capabilities.supportsHandTracking = true;
            session.end();
          }
        }
      } catch {
        // Hand tracking not supported
      }
    }
  }

  console.log('[RP1 Compat] Detected framework:', capabilities.framework, 'version:', capabilities.version);
  return capabilities;
}

// --- Sneeze-Compatible GLB Export ---

/**
 * Validate GLB for Sneeze compatibility
 * Sneeze uses fastgltf which has specific requirements:
 * - GLB must have proper header
 * - Binary chunk must be aligned
 * - Materials must use standard PBR
 */
export function validateGLBForSneeze(glbData: ArrayBuffer): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check GLB header
  const header = new Uint32Array(glbData.slice(0, 12));
  if (header[0] !== 0x46546C67) { // 'glTF' magic
    errors.push('Invalid GLB magic number');
  }
  if (header[1] !== 2) {
    errors.push(`Unsupported GLB version: ${header[1]}`);
  }

  // Check for minimum size
  if (glbData.byteLength < 20) {
    errors.push('GLB file too small');
  }

  // Check alignment (fastgltf requires 4-byte alignment)
  if (glbData.byteLength % 4 !== 0) {
    warnings.push('GLB size not 4-byte aligned - may cause issues with fastgltf');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// --- Scene Assembler V2 Types ---

export interface SceneNodeV2 {
  sName: string;
  pResource?: { sReference: string; sMimeType?: string };
  pTransform: {
    aPosition: [number, number, number];
    aRotation: [number, number, number, number];
    aScale: [number, number, number];
  };
  aBound: [number, number, number];
  aChildren: SceneNodeV2[];
  wClass?: number;
  twObjectIx?: string;
  aAnnotation?: string;
  // V2 additions for Sneeze compatibility
  sComponent?: string; // Component type for Sneeze
  aPhysics?: {
    bEnabled: boolean;
    fMass: number;
    fFriction: number;
    fRestitution: number;
  };
  aAudio?: {
    sReference: string;
    fVolume: number;
    bLoop: boolean;
    fRolloff: number;
  };
  aInteraction?: {
    bGrabbable: boolean;
    bThrowable: boolean;
    sAction: string;
  };
}

export interface SceneJSONV2 {
  version: '2.0';
  framework: 'sneeze' | 'rubidium' | 'legacy';
  metadata: {
    generator: string;
    timestamp: number;
    fabricCid: number;
  };
  scene: SceneNodeV2[];
}

// --- MVMF V2 Model Definitions ---

export interface MVMFPetModelV2 {
  modelType: 'com.fabricpet.pet';
  version: 2;
  framework: RP1Framework;
  data: {
    name: string;
    level: number;
    stage: string;
    mood: string;
    elementalType: string;
    battleStats: Record<string, number>;
    position: [number, number, number];
    rotation: [number, number, number, number];
    animation: string;
    equippedOrdinal: string | null;
    accessories: Array<{ id: string; slot: string }>;
    // V2 additions
    velocity?: [number, number, number];
    health?: number;
    energy?: number;
    lastUpdate: number;
  };
}

export interface MVMFHomeModelV2 {
  modelType: 'com.fabricpet.home';
  version: 2;
  framework: RP1Framework;
  data: {
    theme: string;
    furniture: Array<{
      id: string;
      type: string;
      position: [number, number, number];
      rotation?: [number, number, number, number];
      scale?: [number, number, number];
    }>;
    visitorsAllowed: boolean;
    activeVisitors: string[];
    // V2 additions
    lighting?: {
      ambient: string;
      directional: string;
      point: Array<{ position: [number, number, number]; color: string; intensity: number }>;
    };
    audioZones?: Array<{ name: string; type: string; reverb: number; rolloff: number }>;
  };
}

// --- Compatibility Helpers ---

/**
 * Check if the current RP1 environment supports a specific feature
 */
export function supportsFeature(capabilities: RP1Capabilities, feature: keyof RP1Capabilities): boolean {
  return capabilities[feature] === true;
}

/**
 * Get the appropriate scene JSON format version based on capabilities
 */
export function getSceneJSONVersion(capabilities: RP1Capabilities): '1.0' | '2.0' {
  return capabilities.supportsSceneAssemblerV2 ? '2.0' : '1.0';
}

/**
 * Get the appropriate MVMF model version based on capabilities
 */
export function getMVMFVersion(capabilities: RP1Capabilities): 1 | 2 {
  return capabilities.supportsMVMFv2 ? 2 : 1;
}

/**
 * Convert a v1 scene node to v2
 */
export function upgradeSceneNodeV1toV2(node: import('./SceneJSONGenerator').SceneNode): SceneNodeV2 {
  return {
    sName: node.sName,
    pResource: node.pResource,
    pTransform: node.pTransform,
    aBound: node.aBound,
    aChildren: node.aChildren.map(upgradeSceneNodeV1toV2),
    wClass: node.wClass,
    twObjectIx: node.twObjectIx,
    aAnnotation: node.aAnnotation,
    sComponent: node.wClass ? `wclass_${node.wClass}` : undefined,
  };
}

/**
 * Get RP1 fabric entry URL for the current framework
 */
export function getRP1EntryUrl(capabilities: RP1Capabilities, action?: string, params?: Record<string, string>): string {
  const baseUrl = RP1_CONFIG.fabricUrl;
  
  if (capabilities.framework === 'sneeze' || capabilities.framework === 'rubidium') {
    // New framework entry URL format
    const url = new URL(baseUrl);
    if (action) {
      url.searchParams.set('action', action);
    }
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }
  
  // Legacy format
  if (action) {
    return `${baseUrl}&rp1_action=${action}${params ? '&' + new URLSearchParams(params).toString() : ''}`;
  }
  return baseUrl;
}

// SceneNodeV2 is already exported as an interface above
