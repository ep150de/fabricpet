// ============================================
// GLB Exporter — Export pet as .glb for RP1 Scene Assembler
// ============================================
// Supports: sphere pet, image-textured pet, and 3D ordinal GLB pet
// Mobile-friendly: uses Web Share API with fallback to new tab

import type { Pet } from '../types';
import { fetchInscriptionContent, categorizeContentType, createBlobUrl } from '../avatar/OrdinalRenderer';

const PET_COLORS: Record<string, number> = {
  fire: 0xff6b6b, water: 0x6bb5ff, earth: 0xa0d468,
  air: 0xc0e8ff, light: 0xfff176, dark: 0x9c6bff, neutral: 0xb19cd9,
};

/**
 * Generate a GLB blob of the pet model.
 * If the equipped ordinal is a 3D GLB file, exports that directly.
 * If it's an image, wraps it as a texture on the sphere.
 * Otherwise, exports the colored sphere pet.
 */
export async function exportPetAsGLB(pet: Pet): Promise<Blob> {
  // Check if equipped ordinal is a 3D model — if so, return it directly
  if (pet.equippedOrdinal) {
    try {
      const content = await fetchInscriptionContent(pet.equippedOrdinal);
      if (content) {
        const category = categorizeContentType(content.contentType);
        if (category === '3d-model') {
          // Return the raw GLB data directly from the ordinal
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

  // Export
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(scene, { binary: true }) as ArrayBuffer;
  return new Blob([glb], { type: 'model/gltf-binary' });
}

/**
 * Download the pet GLB file — mobile-friendly with multiple fallbacks.
 */
export async function downloadPetGLB(pet: Pet): Promise<void> {
  const blob = await exportPetAsGLB(pet);
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
