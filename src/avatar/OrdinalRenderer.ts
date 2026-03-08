// ============================================
// Ordinal Renderer — Fetch inscription content and apply to 3D pet
// ============================================
//
// Multi-source content fetching (no single point of failure):
// 1. UniSat Open API (primary, requires API key)
// 2. Hiro API (free, no auth)
// 3. ordinals.com (last resort fallback)
// ============================================

const UNISAT_API_BASE = 'https://open-api.unisat.io/v1/indexer';
const HIRO_API_BASE = 'https://api.hiro.so/ordinals/v1';
const ORDINALS_CONTENT_BASE = 'https://ordinals.com/content';

// API key loaded from env (set VITE_UNISAT_API_KEY in .env)
function getUnisatApiKey(): string | null {
  try {
    return (import.meta as unknown as { env: Record<string, string> }).env?.VITE_UNISAT_API_KEY || null;
  } catch {
    return null;
  }
}

export interface InscriptionContent {
  blob: Blob;
  contentType: string;
  source: 'unisat-api' | 'hiro' | 'ordinals-com' | 'wallet';
}

/**
 * Fetch inscription content with multi-source fallback.
 * Tries: UniSat API → Hiro API → ordinals.com
 */
export async function fetchInscriptionContent(inscriptionId: string): Promise<InscriptionContent | null> {
  // Source 1: UniSat Open API
  const apiKey = getUnisatApiKey();
  if (apiKey) {
    try {
      const response = await fetch(
        `${UNISAT_API_BASE}/inscription/content/${inscriptionId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const blob = await response.blob();
        console.log('[OrdinalRenderer] Loaded from UniSat API');
        return { blob, contentType, source: 'unisat-api' };
      }
    } catch (e) {
      console.warn('[OrdinalRenderer] UniSat API failed:', e);
    }
  }

  // Source 2: Hiro API (free, no auth)
  try {
    const response = await fetch(
      `${HIRO_API_BASE}/inscriptions/${inscriptionId}/content`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (response.ok) {
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const blob = await response.blob();
      console.log('[OrdinalRenderer] Loaded from Hiro API');
      return { blob, contentType, source: 'hiro' };
    }
  } catch (e) {
    console.warn('[OrdinalRenderer] Hiro API failed:', e);
  }

  // Source 3: ordinals.com (fallback)
  try {
    const response = await fetch(
      `${ORDINALS_CONTENT_BASE}/${inscriptionId}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (response.ok) {
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const blob = await response.blob();
      console.log('[OrdinalRenderer] Loaded from ordinals.com');
      return { blob, contentType, source: 'ordinals-com' };
    }
  } catch (e) {
    console.warn('[OrdinalRenderer] ordinals.com failed:', e);
  }

  console.error('[OrdinalRenderer] All sources failed for inscription:', inscriptionId);
  return null;
}

/**
 * Determine the asset category from content type.
 */
export type AssetCategory = 'image' | '3d-model' | 'vrm' | 'video' | 'html' | 'unknown';

export function categorizeContentType(contentType: string): AssetCategory {
  const ct = contentType.toLowerCase();
  if (ct.startsWith('image/')) return 'image';
  if (ct.includes('gltf') || ct.includes('glb') || ct.includes('model/')) return '3d-model';
  if (ct.includes('vrm')) return 'vrm';
  if (ct.startsWith('video/')) return 'video';
  if (ct.includes('html') || ct.includes('svg')) return 'html';
  return 'unknown';
}

/**
 * Create a blob URL from inscription content for use in <img> tags or Three.js loaders.
 */
export function createBlobUrl(content: InscriptionContent): string {
  return URL.createObjectURL(content.blob);
}

/**
 * Load an inscription image as a Three.js texture and apply it to a mesh.
 * Works for image/png, image/jpeg, image/gif, image/webp.
 */
export async function applyImageTextureToMesh(
  content: InscriptionContent,
  mesh: unknown, // THREE.Mesh
  THREE: typeof import('three')
): Promise<boolean> {
  const category = categorizeContentType(content.contentType);
  if (category !== 'image') return false;

  try {
    const blobUrl = createBlobUrl(content);
    const textureLoader = new THREE.TextureLoader();

    return new Promise((resolve) => {
      textureLoader.load(
        blobUrl,
        (texture) => {
          // Configure texture for sphere wrapping
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;

          // Apply to mesh material
          const meshObj = mesh as InstanceType<typeof THREE.Mesh>;
          const material = meshObj.material as InstanceType<typeof THREE.MeshStandardMaterial>;
          material.map = texture;
          material.color.set(0xffffff); // Reset color so texture shows properly
          material.needsUpdate = true;

          console.log('[OrdinalRenderer] Image texture applied to pet mesh');
          resolve(true);
        },
        undefined,
        () => {
          console.warn('[OrdinalRenderer] Failed to load texture from blob');
          URL.revokeObjectURL(blobUrl);
          resolve(false);
        }
      );
    });
  } catch (e) {
    console.error('[OrdinalRenderer] Error applying texture:', e);
    return false;
  }
}

/**
 * Load a GLTF/GLB 3D model from inscription content.
 * Returns the loaded scene to replace the default pet mesh.
 */
export async function load3DModelFromContent(
  content: InscriptionContent,
  scene: unknown, // THREE.Scene
  THREE: typeof import('three')
): Promise<unknown | null> {
  const category = categorizeContentType(content.contentType);
  if (category !== '3d-model') return null;

  try {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const blobUrl = createBlobUrl(content);
    const loader = new GLTFLoader();

    return new Promise((resolve) => {
      loader.load(
        blobUrl,
        (gltf) => {
          const model = gltf.scene;
          // Scale to fit pet area
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 0.8 / maxDim; // Fit within ~0.8 units
          model.scale.setScalar(scale);
          model.position.set(0, 0.5, 0);

          (scene as InstanceType<typeof THREE.Scene>).add(model);
          console.log('[OrdinalRenderer] 3D model loaded from ordinal');
          URL.revokeObjectURL(blobUrl);
          resolve(model);
        },
        undefined,
        () => {
          console.warn('[OrdinalRenderer] Failed to load 3D model');
          URL.revokeObjectURL(blobUrl);
          resolve(null);
        }
      );
    });
  } catch (e) {
    console.error('[OrdinalRenderer] Error loading 3D model:', e);
    return null;
  }
}

/**
 * Get a preview image URL for an inscription.
 * For images, returns a blob URL directly.
 * For other types, returns null (use default emoji).
 */
export async function getInscriptionPreviewUrl(inscriptionId: string): Promise<string | null> {
  const content = await fetchInscriptionContent(inscriptionId);
  if (!content) return null;

  const category = categorizeContentType(content.contentType);
  if (category === 'image') {
    return createBlobUrl(content);
  }

  return null;
}
