// ============================================
// WebXR Session Manager — Immersive AR for Meta Quest / Android
// ============================================

import * as THREE from 'three';

export interface WebXRState {
  supported: boolean;
  active: boolean;
  hitTestReady: boolean;
  petPlaced: boolean;
  petPosition: THREE.Vector3;
  petAnchor: unknown | null;
}

/**
 * Check if WebXR immersive-ar is supported on this device.
 */
export async function checkWebXRSupport(): Promise<boolean> {
  if (!('xr' in navigator)) return false;
  try {
    return await (navigator as any).xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

/**
 * Create and manage a WebXR immersive-ar session with hit-testing.
 * Returns a controller object for managing the session lifecycle.
 */
export function createWebXRController(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  onHitTest: (position: THREE.Vector3, rotation: THREE.Quaternion) => void,
  onSessionEnd: () => void
) {
  let xrSession: XRSession | null = null;
  let hitTestSource: XRHitTestSource | null = null;
  let referenceSpace: XRReferenceSpace | null = null;
  let viewerSpace: XRReferenceSpace | null = null;
  const hitMatrix = new THREE.Matrix4();
  const hitPosition = new THREE.Vector3();
  const hitQuaternion = new THREE.Quaternion();

  // Reticle (placement indicator)
  const reticleGeo = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
  const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.7 });
  const reticle = new THREE.Mesh(reticleGeo, reticleMat);
  reticle.visible = false;
  reticle.matrixAutoUpdate = false;
  scene.add(reticle);

  async function start(): Promise<boolean> {
    try {
      const xr = (navigator as any).xr;
      if (!xr) return false;

      xrSession = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor'],
        optionalFeatures: ['anchors', 'hand-tracking'],
      });

      renderer.xr.enabled = true;
      await renderer.xr.setSession(xrSession as any);

      referenceSpace = await xrSession!.requestReferenceSpace('local-floor');
      viewerSpace = await xrSession!.requestReferenceSpace('viewer');

      // Set up hit test source
      hitTestSource = await (xrSession as any).requestHitTestSource({
        space: viewerSpace,
      });

      // Handle session end
      xrSession!.addEventListener('end', () => {
        cleanup();
        onSessionEnd();
      });

      // Handle select (tap to place)
      xrSession!.addEventListener('select', () => {
        if (reticle.visible) {
          onHitTest(hitPosition.clone(), hitQuaternion.clone());
        }
      });

      return true;
    } catch (e) {
      console.error('[WebXR] Failed to start session:', e);
      return false;
    }
  }

  function onFrame(_time: number, frame: XRFrame) {
    if (!hitTestSource || !referenceSpace) return;

    const hitTestResults = frame.getHitTestResults(hitTestSource);

    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(referenceSpace);

      if (pose) {
        reticle.visible = true;
        hitMatrix.fromArray(pose.transform.matrix);
        reticle.matrix.copy(hitMatrix);
        hitPosition.setFromMatrixPosition(hitMatrix);
        hitQuaternion.setFromRotationMatrix(hitMatrix);
      }
    } else {
      reticle.visible = false;
    }
  }

  function cleanup() {
    if (hitTestSource) {
      hitTestSource.cancel();
      hitTestSource = null;
    }
    reticle.visible = false;
    scene.remove(reticle);
    renderer.xr.enabled = false;
    xrSession = null;
    referenceSpace = null;
    viewerSpace = null;
  }

  async function stop() {
    if (xrSession) {
      await xrSession.end();
    }
    cleanup();
  }

  return {
    start,
    stop,
    onFrame,
    get isActive() { return xrSession !== null; },
    get reticle() { return reticle; },
  };
}

/**
 * Create a cute 3D pet mesh for AR placement.
 */
export function createPetMesh(elementalType: string): THREE.Group {
  const group = new THREE.Group();

  const petColor = elementalType === 'fire' ? 0xff6b6b
    : elementalType === 'water' ? 0x6bc5ff
    : elementalType === 'earth' ? 0x6bff6b
    : elementalType === 'air' ? 0xc5c5ff
    : elementalType === 'light' ? 0xffff6b
    : elementalType === 'dark' ? 0x9b6bff
    : 0xffffff;

  // Body
  const bodyGeo = new THREE.SphereGeometry(0.15, 32, 32);
  const bodyMat = new THREE.MeshStandardMaterial({ color: petColor, roughness: 0.3, metalness: 0.1 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.15;
  body.castShadow = true;
  group.add(body);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.03, 16, 16);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.05, 0.18, 0.13);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.05, 0.18, 0.13);
  group.add(rightEye);

  // Eye highlights
  const hlGeo = new THREE.SphereGeometry(0.012, 8, 8);
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lh = new THREE.Mesh(hlGeo, hlMat);
  lh.position.set(-0.04, 0.19, 0.15);
  group.add(lh);
  const rh = new THREE.Mesh(hlGeo, hlMat);
  rh.position.set(0.06, 0.19, 0.15);
  group.add(rh);

  // Shadow
  const shadowGeo = new THREE.CircleGeometry(0.12, 32);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  group.add(shadow);

  return group;
}
