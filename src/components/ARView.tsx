// ============================================
// AR View — WebXR camera passthrough with pet overlay
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getStageEmoji } from '../engine/PetStateMachine';
import * as THREE from 'three';

type ARMode = 'camera' | 'webxr';

export function ARView() {
  const { pet } = useStore();
  const [arSupported, setArSupported] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [webxrActive, setWebxrActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const xrSessionRef = useRef<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraInfo, setCameraInfo] = useState<string>('');

  // Pre-flight camera support check
  useEffect(() => {
    // Check secure context (HTTPS required for camera)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setCameraSupported(false);
      setError('Camera requires HTTPS. Please access this site via https://');
      return;
    }
    // Check mediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraSupported(false);
      setError('Camera API not available on this browser/device.');
      return;
    }
    setCameraSupported(true);
  }, []);

  // Check WebXR support
  useEffect(() => {
    if ('xr' in navigator) {
      (navigator as any).xr?.isSessionSupported?.('immersive-ar').then((supported: boolean) => {
        setArSupported(supported);
      }).catch(() => setArSupported(false));
    }
  }, []);

  // WebXR immersive-ar session — works on Meta Quest, Meta glasses, and WebXR-capable mobile browsers
  const startWebXR = useCallback(async () => {
    if (!('xr' in navigator)) {
      setError('WebXR not supported on this browser.');
      return;
    }

    try {
      setError(null);
      const xr = (navigator as any).xr;
      const session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hit-test', 'hand-tracking'],
      });

      xrSessionRef.current = session;
      setWebxrActive(true);

      // Create WebXR-compatible renderer
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', { xrCompatible: true }) || canvas.getContext('webgl', { xrCompatible: true });
      if (!gl) { setError('WebGL not available'); return; }

      const renderer = new THREE.WebGLRenderer({ canvas, context: gl as any, alpha: true, antialias: true });
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local-floor');
      await renderer.xr.setSession(session);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 100);

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(2, 3, 2);
      scene.add(dirLight);

      // Pet sphere
      const petColor = pet?.elementalType === 'fire' ? 0xff6b6b
        : pet?.elementalType === 'water' ? 0x6bc5ff
        : pet?.elementalType === 'earth' ? 0x6bff6b
        : pet?.elementalType === 'air' ? 0xc5c5ff
        : pet?.elementalType === 'light' ? 0xffff6b
        : pet?.elementalType === 'dark' ? 0x9b6bff
        : 0xffffff;

      const petGeo = new THREE.SphereGeometry(0.15, 32, 32);
      const petMat = new THREE.MeshToonMaterial({ color: petColor });
      const petMesh = new THREE.Mesh(petGeo, petMat);
      petMesh.position.set(0, 0.3, -1); // 1 meter in front, 30cm above floor
      scene.add(petMesh);

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.03, 16, 16);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.06, 0.34, -0.86);
      scene.add(leftEye);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.06, 0.34, -0.86);
      scene.add(rightEye);

      // Shadow
      const shadowGeo = new THREE.CircleGeometry(0.12, 32);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0, 0.01, -1);
      scene.add(shadow);

      // XR render loop
      renderer.setAnimationLoop((_time, frame) => {
        const t = Date.now() * 0.001;
        // Bounce
        petMesh.position.y = 0.3 + Math.abs(Math.sin(t * 2)) * 0.06;
        leftEye.position.y = petMesh.position.y + 0.04;
        rightEye.position.y = petMesh.position.y + 0.04;
        // Squash/stretch
        const squash = 1 + Math.sin(t * 4) * 0.05;
        petMesh.scale.set(1 / squash, squash, 1 / squash);
        shadow.scale.setScalar(1 - Math.abs(Math.sin(t * 2)) * 0.2);

        renderer.render(scene, camera);
      });

      // Cleanup on session end
      session.addEventListener('end', () => {
        setWebxrActive(false);
        xrSessionRef.current = null;
        renderer.setAnimationLoop(null);
        renderer.dispose();
        petGeo.dispose();
        petMat.dispose();
        eyeGeo.dispose();
        eyeMat.dispose();
        shadowGeo.dispose();
        shadowMat.dispose();
      });

      console.log('[AR] WebXR immersive-ar session started');
    } catch (e: any) {
      setError(`WebXR error: ${e?.message || 'Failed to start session'}`);
      console.error('[AR] WebXR error:', e);
      setWebxrActive(false);
    }
  }, [pet]);

  const stopWebXR = useCallback(() => {
    if (xrSessionRef.current) {
      xrSessionRef.current.end();
      xrSessionRef.current = null;
    }
    setWebxrActive(false);
  }, []);

  // Camera passthrough — uses same simple pattern as QR scanner (proven to work)
  const startCamera = useCallback(async () => {
    try {
      setCameraReady(false);
      setError(null);
      console.log('[AR] Starting camera, facingMode:', facingMode);

      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      // Simple getUserMedia → srcObject → play() — same as QR scanner
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;

      // Show camera info
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        setCameraInfo(`${settings.width}×${settings.height} • ${track.label}`);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('[AR] Camera playing successfully');
      }

      // Both flags set AFTER play() succeeds — this triggers the 3D overlay
      setCameraReady(true);
      setCameraActive(true);
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permissions in your browser settings.'
        : e?.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : e?.name === 'NotReadableError'
        ? 'Camera is in use by another app. Close other camera apps and try again.'
        : e?.name === 'AbortError'
        ? 'Camera was interrupted. Please try again.'
        : `Camera error: ${e?.message || 'Unknown error'}`;
      setError(msg);
      console.error('[AR] Camera error:', e?.name, e?.message);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // 3D pet overlay on camera — only init AFTER camera is ready (video playing)
  useEffect(() => {
    if (!cameraActive || !cameraReady || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    let cancelled = false;
    let loopAnimId: number;
    let renderer: THREE.WebGLRenderer | null = null;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const initThreeJS = () => {
      if (cancelled) return;

      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) {
        loopAnimId = requestAnimationFrame(initThreeJS);
        return;
      }

      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;

      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: false });
      } catch (e) {
        console.error('[AR] WebGLRenderer failed to initialize:', e);
        setError('WebGL failed to initialize. Try closing other tabs or apps using the GPU.');
        return;
      }

      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        console.warn('[AR] WebGL context lost');
        setError('WebGL context lost — GPU may be overloaded. Try again.');
      });

      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
      cam.position.set(0, 1, 3);
      cam.lookAt(0, 0.5, 0);

      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(2, 3, 2);
      scene.add(dirLight);

      const petColor = pet?.elementalType === 'fire' ? 0xff6b6b
        : pet?.elementalType === 'water' ? 0x6bc5ff
        : pet?.elementalType === 'earth' ? 0x6bff6b
        : pet?.elementalType === 'air' ? 0xc5c5ff
        : pet?.elementalType === 'light' ? 0xffff6b
        : pet?.elementalType === 'dark' ? 0x9b6bff
        : 0xffffff;

      const petGeo = new THREE.SphereGeometry(0.4, 32, 32);
      const petMat = new THREE.MeshToonMaterial({ color: petColor });
      const petMesh = new THREE.Mesh(petGeo, petMat);
      petMesh.position.set(0, 0.5, 0);
      scene.add(petMesh);
      geometries.push(petGeo);
      materials.push(petMat);

      const eyeGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.15, 0.6, 0.35);
      scene.add(leftEye);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.15, 0.6, 0.35);
      scene.add(rightEye);
      geometries.push(eyeGeo);
      materials.push(eyeMat);

      const highlightGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lh = new THREE.Mesh(highlightGeo, highlightMat);
      lh.position.set(-0.12, 0.63, 0.4);
      scene.add(lh);
      const rh = new THREE.Mesh(highlightGeo, highlightMat);
      rh.position.set(0.18, 0.63, 0.4);
      scene.add(rh);
      geometries.push(highlightGeo);
      materials.push(highlightMat);

      const shadowGeo = new THREE.CircleGeometry(0.3, 32);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.01;
      scene.add(shadow);
      geometries.push(shadowGeo);
      materials.push(shadowMat);

      const animate = () => {
        if (cancelled) return;
        loopAnimId = requestAnimationFrame(animate);
        const t = Date.now() * 0.001;

        petMesh.position.y = 0.5 + Math.abs(Math.sin(t * 2)) * 0.15;
        leftEye.position.y = petMesh.position.y + 0.1;
        rightEye.position.y = petMesh.position.y + 0.1;
        lh.position.y = petMesh.position.y + 0.13;
        rh.position.y = petMesh.position.y + 0.13;

        const squash = 1 + Math.sin(t * 4) * 0.05;
        petMesh.scale.set(1 / squash, squash, 1 / squash);
        shadow.scale.setScalar(1 - Math.abs(Math.sin(t * 2)) * 0.2);

        if (renderer) renderer.render(scene, cam);
      };
      animate();
    };

    // Start on next frame to ensure layout is ready
    loopAnimId = requestAnimationFrame(initThreeJS);

    return () => {
      cancelled = true;
      cancelAnimationFrame(loopAnimId);
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
      }
    };
  }, [cameraActive, cameraReady, pet]);

  // Switch camera (front/back)
  const switchCamera = useCallback(async () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    if (cameraActive) {
      // Restart camera with new facing mode
      stopCamera();
      setTimeout(() => {
        startCamera();
      }, 300);
    }
  }, [facingMode, cameraActive, stopCamera, startCamera]);

  if (!pet) return null;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">📸 AR Mode</h2>
        <p className="text-gray-400 text-sm mt-1">See your pet in the real world!</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!cameraActive ? (
        <div className="space-y-3">
          <button
            onClick={startCamera}
            disabled={!cameraSupported}
            className={`w-full font-semibold py-4 rounded-xl transition-all ${
              cameraSupported
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {cameraSupported ? '📸 Start Camera AR' : '📸 Camera Not Available'}
          </button>

          {arSupported && !webxrActive && (
            <button
              onClick={startWebXR}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold py-4 rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all active:scale-98"
            >
              🥽 WebXR Immersive AR (Quest / Glasses)
            </button>
          )}

          {webxrActive && (
            <div className="bg-gradient-to-r from-cyan-900/30 to-teal-900/30 rounded-xl p-4 border border-cyan-500/30 text-center">
              <div className="text-4xl mb-2 animate-pulse">🥽</div>
              <p className="text-sm text-cyan-300 font-semibold">WebXR Session Active!</p>
              <p className="text-xs text-gray-400 mt-1">
                {pet.name} is floating in your space. Look around!
              </p>
              <button
                onClick={stopWebXR}
                className="mt-3 bg-red-500/80 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-all"
              >
                ✕ End XR Session
              </button>
            </div>
          )}

          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 text-center">
            <div className="text-5xl mb-2">{getStageEmoji(pet.stage)}</div>
            <p className="text-sm text-gray-400">
              {pet.name} is ready to explore the real world!
            </p>
            <p className="text-xs text-gray-600 mt-1">
              📸 Camera AR overlays your pet on the camera feed.
              {arSupported ? ' 🥽 WebXR works on Meta Quest, Meta glasses, and XR browsers!' : ''}
            </p>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="relative rounded-2xl overflow-hidden border border-gray-800" style={{ height: '400px' }}>
          {/* Camera feed — z-index 0 */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 0 }}
          />

          {/* Loading indicator while camera initializes */}
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80" style={{ zIndex: 5 }}>
              <div className="text-center">
                <div className="text-4xl animate-bounce mb-2">📸</div>
                <p className="text-gray-400 text-sm">Starting camera...</p>
              </div>
            </div>
          )}

          {/* 3D pet overlay — z-index 1, transparent background */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1, background: 'transparent' }}
          />

          {/* Pet info overlay — z-index 2 */}
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1" style={{ zIndex: 2 }}>
            <span className="text-sm text-white font-semibold">
              {getStageEmoji(pet.stage)} {pet.name}
            </span>
          </div>

          {/* Camera info — z-index 2 */}
          {cameraInfo && (
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1" style={{ zIndex: 2 }}>
              <span className="text-xs text-gray-400">{cameraInfo}</span>
            </div>
          )}

          {/* Camera switch button — z-index 2 */}
          <button
            onClick={switchCamera}
            className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white font-bold px-3 py-2 rounded-lg transition-all text-sm"
            style={{ zIndex: 2 }}
          >
            🔄 {facingMode === 'environment' ? 'Front' : 'Back'}
          </button>

          {/* Stop button — z-index 2 */}
          <button
            onClick={stopCamera}
            className="absolute bottom-3 right-3 bg-red-500/80 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg transition-all text-sm"
            style={{ zIndex: 2 }}
          >
            ✕ Stop AR
          </button>
        </div>
      )}
    </div>
  );
}
