// ============================================
// GLB Exporter — Export pet as .glb for RP1 Scene Assembler
// ============================================
// Supports: sphere pet, image-textured pet, and 3D ordinal GLB pet
// Mobile-friendly: uses Web Share API with fallback to new tab

import type { Pet, PetGlTFMetadata, GLTFExtensionData } from '../types';
import { fetchInscriptionContent, categorizeContentType, createBlobUrl } from '../avatar/OrdinalRenderer';

const PET_COLORS: Record<string, number> = {
  fire: 0xff6b6b, water: 0x6bb5ff, earth: 0xa0d468,
  air: 0xc0e8ff, light: 0xfff176, dark: 0x9c6bff, neutral: 0xb19cd9,
};

const GLTF_EXTRAS_KEY = 'fabricpet';
const GLTF_EXTENSION_NAME = 'EXT_fabric_pet';
const GLTF_METADATA_VERSION = '1.0';

// GLB constants
const GLB_MAGIC = 0x46546C67;
const GLB_CHUNK_JSON = 0x4E4F534A;
const GLB_CHUNK_BIN = 0x004E4942;

function buildPetMetadata(pet: Pet, ownerNpub?: string): PetGlTFMetadata {
  return {
    version: GLTF_METADATA_VERSION,
    petId: pet.id,
    name: pet.name,
    level: pet.level,
    stage: pet.stage,
    elementalType: pet.elementalType,
    battleStats: { ...pet.battleStats },
    moves: [...pet.moves],
    ownerNpub: ownerNpub || 'npub1unknown',
    rarity: (pet as any).lineage?.rarity,
    generation: (pet as any).lineage?.generation,
  };
}

function buildGLTFExtension(pet: Pet): GLTFExtensionData {
  return {
    petId: pet.id,
    name: pet.name,
    level: pet.level,
    elementalType: pet.elementalType,
    battleStats: { ...pet.battleStats },
  };
}

/**
 * Embed FabricPet metadata into a GLB ArrayBuffer.
 * GLB format:
 * - 12-byte header: magic (4) + version (4) + length (4)
 * - Chunk 0: JSON data (type 0x4E4F534A) + length (4) + data
 * - Chunk 1: Binary buffer (type 0x004E4942) + length (4) + data
 */
function embedMetadataInGLB(
  glb: Uint8Array,
  metadata: PetGlTFMetadata,
  extensionData: GLTFExtensionData
): Uint8Array {
  // Parse existing GLB to extract JSON chunk
  const dataView = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  
  // Read header
  const magic = dataView.getUint32(0, true);
  if (magic !== GLB_MAGIC) {
    console.warn('[GLBExporter] Invalid GLB magic number');
    return glb;
  }
  
  const version = dataView.getUint32(4, true);
  const glbLength = dataView.getUint32(8, true);
  
  // Read chunk 0 (JSON)
  const chunk0Length = dataView.getUint32(12, true);
  const chunk0Type = dataView.getUint32(16, true);
  
  if (chunk0Type !== GLB_CHUNK_JSON) {
    console.warn('[GLBExporter] First chunk is not JSON');
    return glb;
  }
  
  const jsonData = new Uint8Array(glb.buffer, glb.byteOffset + 20, chunk0Length);
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(jsonData);
  
  try {
    const gltf = JSON.parse(jsonString);
    
    // Add asset extras with FabricPet metadata
    gltf.asset = gltf.asset || {};
    gltf.asset.extras = gltf.asset.extras || {};
    gltf.asset.extras[GLTF_EXTRAS_KEY] = metadata;
    
    // Add the formal extension
    gltf.extensions = gltf.extensions || {};
    gltf.extensions[GLTF_EXTENSION_NAME] = extensionData;
    gltf.extensionsUsed = gltf.extensionsUsed || [];
    if (!gltf.extensionsUsed.includes(GLTF_EXTENSION_NAME)) {
      gltf.extensionsUsed.push(GLTF_EXTENSION_NAME);
    }
    
    // Re-encode to GLB
    const modifiedJsonString = JSON.stringify(gltf);
    const modifiedJsonBytes = new TextEncoder().encode(modifiedJsonString);
    
    // Pad JSON to 4-byte alignment
    const paddedJsonLength = Math.ceil(modifiedJsonBytes.length / 4) * 4;
    const padding = paddedJsonLength - modifiedJsonBytes.length;
    
    // Calculate new total length
    const binChunkStart = 20 + paddedJsonLength;
    const binChunkLength = glbLength - binChunkStart;
    
    // Total GLB size
    const newGlbLength = 12 + 8 + paddedJsonLength + (binChunkStart < glbLength ? 8 + binChunkLength : 0);
    
    // Create new GLB
    const newGlb = new Uint8Array(newGlbLength);
    const newDataView = new DataView(newGlb.buffer);
    
    // Header
    newDataView.setUint32(0, GLB_MAGIC, true);
    newDataView.setUint32(4, version, true);
    newDataView.setUint32(8, newGlbLength, true);
    
    // Chunk 0 (JSON)
    newDataView.setUint32(12, paddedJsonLength, true);
    newDataView.setUint32(16, GLB_CHUNK_JSON, true);
    newGlb.set(modifiedJsonBytes, 20);
    
    // Copy remaining chunks (binary buffer)
    if (binChunkStart < glbLength) {
      const binChunkHeaderOffset = binChunkStart;
      const binChunkDataOffset = binChunkStart + 8;
      
      newDataView.setUint32(binChunkStart, binChunkLength, true);
      newDataView.setUint32(binChunkStart + 4, GLB_CHUNK_BIN, true);
      newGlb.set(glb.subarray(binChunkDataOffset, binChunkDataOffset + binChunkLength), binChunkDataOffset);
    }
    
    return newGlb;
  } catch (e) {
    console.error('[GLBExporter] Failed to embed metadata:', e);
    return glb;
  }
}

/**
 * Generate a GLB blob of the pet model.
 * If the equipped ordinal is a 3D GLB file, exports that directly.
 * If it's an image, wraps it as a texture on the sphere.
 * Otherwise, exports the colored sphere pet.
 * 
 * Includes FabricPet metadata in glTF extras and EXT_fabric_pet extension.
 */
export async function exportPetAsGLB(pet: Pet, ownerNpub?: string): Promise<Blob> {
  const metadata = buildPetMetadata(pet, ownerNpub);

  // Check if equipped ordinal is a 3D model — if so, return it directly
  if (pet.equippedOrdinal) {
    try {
      const content = await fetchInscriptionContent(pet.equippedOrdinal);
      if (content) {
        const category = categorizeContentType(content.contentType);
        if (category === '3d-model') {
          console.log('[GLBExporter] Exporting 3D ordinal inscription as GLB');
          return new Blob([content.blob], { type: 'model/gltf-binary' });
        }
      }
    } catch (e) {
      console.warn('[GLBExporter] Failed to check ordinal type:', e);
    }
  }

  // Otherwise, build the sphere pet scene
  const THREE = await import('three');
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');

  const scene = new THREE.Scene();

  // Pet body
  const bodyGeo = new THREE.SphereGeometry(0.45, 32, 32);
  const color = PET_COLORS[pet.elementalType] || 0xb19cd9;
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.5, 0);
  scene.add(body);

  // Load ordinal image texture if equipped
  if (pet.equippedOrdinal) {
    try {
      const content = await fetchInscriptionContent(pet.equippedOrdinal);
      if (content && categorizeContentType(content.contentType) === 'image') {
        const url = createBlobUrl(content);
        const tex = await new Promise<InstanceType<typeof THREE.Texture>>((resolve, reject) => {
          new THREE.TextureLoader().load(url, resolve, undefined, reject);
        });
        tex.colorSpace = THREE.SRGBColorSpace;
        bodyMat.map = tex;
        bodyMat.color.set(0xffffff);
        bodyMat.needsUpdate = true;
      }
    } catch (e) {
      console.warn('[GLBExporter] Could not load ordinal texture:', e);
    }
  }

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.07, 16, 16);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pupilGeo = new THREE.SphereGeometry(0.04, 16, 16);
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.13, 0.6, 0.38);
    scene.add(eye);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(side * 0.13, 0.6, 0.43);
    scene.add(pupil);
  }

  // Blush
  const blushGeo = new THREE.SphereGeometry(0.06, 16, 16);
  blushGeo.scale(1.3, 0.7, 0.5);
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xff9a9e, transparent: true, opacity: 0.6 });
  for (const side of [-1, 1]) {
    const blush = new THREE.Mesh(side === 1 ? blushGeo.clone() : blushGeo, blushMat);
    blush.position.set(side * 0.25, 0.48, 0.35);
    scene.add(blush);
  }

  // Add FabricPet metadata to scene extras
  // The GLTFExporter will include scene.userData.extras if available
  scene.userData.extras = {
    [GLTF_EXTRAS_KEY]: metadata,
  };

  // Export
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(scene, { binary: true }) as ArrayBuffer;
  
  // Wrap with proper GLB structure including extension
  const wrappedGlb = embedMetadataInGLB(new Uint8Array(glb), metadata, buildGLTFExtension(pet));
  
  return new Blob([wrappedGlb.buffer as ArrayBuffer], { type: 'model/gltf-binary' });
}

/**
 * Download the pet GLB file — mobile-friendly with multiple fallbacks.
 */
export async function downloadPetGLB(pet: Pet, ownerNpub?: string): Promise<void> {
  const blob = await exportPetAsGLB(pet, ownerNpub);
  const filename = `${pet.name.toLowerCase().replace(/\s+/g, '-')}-pet.glb`;

  // Method 1: Web Share API (best for mobile)
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: 'model/gltf-binary' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${pet.name} - FabricPet GLB`,
          text: 'My FabricPet 3D model for RP1',
          files: [file],
        });
        return;
      }
    } catch (e) {
      // User cancelled or share failed — fall through
      if ((e as Error).name === 'AbortError') return;
      console.warn('[GLBExporter] Web Share failed:', e);
    }
  }

  // Method 2: Open blob in new tab (works on most mobile browsers)
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank');
  if (opened) {
    // Give the browser time to start the download, then clean up
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }

  // Method 3: Classic <a> download (desktop fallback)
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
