// ============================================
// GLB Exporter — Export pet as .glb for RP1 Scene Assembler
// ============================================

import type { Pet } from '../types';
import { fetchInscriptionContent, categorizeContentType, createBlobUrl } from '../avatar/OrdinalRenderer';

const PET_COLORS: Record<string, number> = {
  fire: 0xff6b6b, water: 0x6bb5ff, earth: 0xa0d468,
  air: 0xc0e8ff, light: 0xfff176, dark: 0x9c6bff, neutral: 0xb19cd9,
};

/**
 * Generate a GLB blob of the pet model.
 */
export async function exportPetAsGLB(pet: Pet): Promise<Blob> {
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

  // Load ordinal texture if equipped
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

  const le = new THREE.Mesh(eyeGeo, eyeMat);
  le.position.set(-0.13, 0.6, 0.38);
  scene.add(le);
  const lp = new THREE.Mesh(pupilGeo, pupilMat);
  lp.position.set(-0.13, 0.6, 0.43);
  scene.add(lp);
  const re = new THREE.Mesh(eyeGeo, eyeMat);
  re.position.set(0.13, 0.6, 0.38);
  scene.add(re);
  const rp = new THREE.Mesh(pupilGeo, pupilMat);
  rp.position.set(0.13, 0.6, 0.43);
  scene.add(rp);

  // Blush
  const blushGeo = new THREE.SphereGeometry(0.06, 16, 16);
  blushGeo.scale(1.3, 0.7, 0.5);
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xff9a9e, transparent: true, opacity: 0.6 });
  const lb = new THREE.Mesh(blushGeo, blushMat);
  lb.position.set(-0.25, 0.48, 0.35);
  scene.add(lb);
  const rb = new THREE.Mesh(blushGeo.clone(), blushMat);
  rb.position.set(0.25, 0.48, 0.35);
  scene.add(rb);

  // Export
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(scene, { binary: true }) as ArrayBuffer;
  return new Blob([glb], { type: 'model/gltf-binary' });
}

/**
 * Download the pet GLB file.
 */
export async function downloadPetGLB(pet: Pet): Promise<void> {
  const blob = await exportPetAsGLB(pet);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pet.name.toLowerCase().replace(/\s+/g, '-')}-pet.glb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
