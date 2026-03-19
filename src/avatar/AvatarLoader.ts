// ============================================
// Avatar Loader — Load VRM avatars from Open Source Avatars
// ============================================

import type { OSAAvatar } from '../types';
import { OSA_AVATARS_URL } from '../utils/constants';

let avatarCache: OSAAvatar[] | null = null;

/**
 * Fetch the full list of avatars from the OSA repository.
 */
export async function fetchAvatarList(): Promise<OSAAvatar[]> {
  if (avatarCache) return avatarCache;

  try {
    const response = await fetch(OSA_AVATARS_URL);
    if (!response.ok) throw new Error('Failed to fetch avatar list');

    const data = await response.json();

    // Map the raw data to our OSAAvatar type
    const avatars: OSAAvatar[] = (Array.isArray(data) ? data : []).map((item: Record<string, unknown>) => ({
      id: (item.id as string) || '',
      name: (item.name as string) || 'Unknown Avatar',
      description: (item.description as string) || '',
      thumbnailUrl: (item.thumbnailUrl as string) || (item.thumbnail_url as string) || '',
      modelFileUrl: (item.modelFileUrl as string) || (item.model_file_url as string) || (item.vrmUrl as string) || '',
      format: (item.format as string) || 'vrm',
      polygonCount: (item.polygonCount as number) || (item.polygon_count as number) || 0,
      materialCount: (item.materialCount as number) || (item.material_count as number) || 0,
      license: (item.license as string) || 'CC-BY-4.0',
      creator: (item.creator as string) || 'Unknown',
      attributes: (item.attributes as Record<string, unknown>) || (item.metadata as Record<string, unknown>) || {},
    }));

    avatarCache = avatars;
    return avatars;
  } catch (error) {
    console.error('Failed to fetch OSA avatars:', error);
    return [];
  }
}

/**
 * Get a specific avatar by ID.
 */
export async function getAvatarById(id: string): Promise<OSAAvatar | null> {
  const avatars = await fetchAvatarList();
  return avatars.find(a => a.id === id) || null;
}

/**
 * Search avatars by name or description.
 */
export async function searchAvatars(query: string): Promise<OSAAvatar[]> {
  const avatars = await fetchAvatarList();
  const lowerQuery = query.toLowerCase();
  return avatars.filter(
    a => a.name.toLowerCase().includes(lowerQuery) ||
         a.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Load a VRM model into a Three.js scene.
 * Returns the VRM instance for animation control.
 */
export async function loadVRMModel(
  modelUrl: string,
  scene: THREE.Scene,
  timeoutMs = 15000,
): Promise<unknown> {
  // Dynamic imports for tree-shaking
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { VRMLoaderPlugin } = await import('@pixiv/three-vrm');

  const loadPromise = new Promise<unknown>((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.setCrossOrigin('anonymous');

    loader.load(
      modelUrl,
      (gltf) => {
        const vrm = (gltf as unknown as Record<string, Record<string, unknown>>).userData?.vrm;
        if (vrm) {
          const root = (vrm as Record<string, THREE.Object3D>).scene;
          root.rotation.y = Math.PI;
          scene.add(root);
          resolve(vrm);
        } else {
          scene.add(gltf.scene);
          resolve(gltf);
        }
      },
      undefined,
      (error) => {
        console.error(`[AvatarLoader] Failed to load VRM from ${modelUrl}:`, error);
        reject(error);
      }
    );
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`[AvatarLoader] VRM load timeout after ${timeoutMs}ms: ${modelUrl}`));
    }, timeoutMs);
  });

  return Promise.race([loadPromise, timeoutPromise]);
}

/**
 * Create a simple placeholder pet mesh for when no VRM is loaded.
 */
export async function createPlaceholderPet(scene: THREE.Scene): Promise<THREE.Mesh> {
  const THREE = await import('three');

  // Create a cute sphere-based pet
  const bodyGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x6366f1,
    roughness: 0.4,
    metalness: 0.1,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.5;

  // Eyes
  const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pupilGeometry = new THREE.SphereGeometry(0.04, 16, 16);
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.15, 0.6, 0.4);
  const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  leftPupil.position.set(-0.15, 0.6, 0.46);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.15, 0.6, 0.4);
  const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  rightPupil.position.set(0.15, 0.6, 0.46);

  // Mouth (smile)
  const smileGeometry = new THREE.TorusGeometry(0.08, 0.02, 8, 16, Math.PI);
  const smileMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b9d });
  const smile = new THREE.Mesh(smileGeometry, smileMaterial);
  smile.position.set(0, 0.42, 0.42);
  smile.rotation.x = Math.PI;

  // Group everything
  const petGroup = new THREE.Group();
  petGroup.add(body, leftEye, leftPupil, rightEye, rightPupil, smile);
  scene.add(petGroup);

  return body;
}

// Default kitten VRM URL (Chubby Tubbies Cat from Open Source Avatars)
// This is a cute, chubby cat avatar that works well as a default pet
const DEFAULT_KITTEN_VRM_URL = 'https://arweave.net/T1gkB95XKXAZl_VmU1ozg5Txm--o9nY0Nge3s8zNoBs';

/**
 * Load the default kitten VRM model.
 * This is a cute chubby cat avatar from Open Source Avatars.
 */
export async function loadDefaultKitten(scene: THREE.Scene): Promise<unknown> {
  try {
    console.log('[AvatarLoader] Loading default kitten VRM from:', DEFAULT_KITTEN_VRM_URL);
    return await loadVRMModel(DEFAULT_KITTEN_VRM_URL, scene);
  } catch (error) {
    console.warn('[AvatarLoader] Failed to load default kitten, using placeholder:', error);
    return createPlaceholderPet(scene);
  }
}

// Type import for THREE namespace
import type * as THREE from 'three';
