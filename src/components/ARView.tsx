// ============================================
// AR View — WebXR camera passthrough with pet overlay
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getStageEmoji } from '../engine/PetStateMachine';
import * as THREE from 'three';
import {
  sendMessage,
  getGreeting,
  loadChatHistory,
  saveChatHistory,
  checkLLMHealth,
} from '../llm/ChatEngine';
import type { ChatEntry } from '../llm/ChatEngine';
import { fetchInscriptionContent, categorizeContentType, load3DModelFromContent } from '../avatar/OrdinalRenderer';

type ARMode = 'camera' | 'webxr';

export function ARView() {
  const { pet } = useStore();
  const [arSupported, setArSupported] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [webxrActive, setWebxrActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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

       // Try with ideal settings first
       let stream: MediaStream;
       try {
         stream = await navigator.mediaDevices.getUserMedia({
           video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
         });
       } catch (e: any) {
         // Fallback to basic constraints if ideal settings fail
         if (e.name === 'OverconstrainedError') {
           console.log('[AR] Ideal camera constraints failed, trying basic settings...');
           stream = await navigator.mediaDevices.getUserMedia({
             video: { facingMode }
           });
         } else {
           throw e;
         }
       }

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
       let msg = '';
       if (e?.name === 'NotAllowedError') {
         msg = 'Camera access denied. Please allow camera permissions in your browser settings.';
       } else if (e?.name === 'NotFoundError') {
         msg = 'No camera found on this device. Please check if a camera is connected and not disabled in device settings.';
       } else if (e?.name === 'NotReadableError') {
         msg = 'Camera is in use by another app. Close other camera applications (like Zoom, Teams, or other browser tabs) and try again.';
       } else if (e?.name === 'AbortError') {
         msg = 'Camera was interrupted. Please try again.';
       } else if (e?.name === 'OverconstrainedError') {
         msg = 'Camera constraints could not be satisfied. Trying with default settings...';
         // Try again with less restrictive constraints
         try {
           setCameraReady(false);
           setError(null);
           const stream = await navigator.mediaDevices.getUserMedia({
             video: { facingMode }
           });
           
           streamRef.current = stream;
           
           if (videoRef.current) {
             videoRef.current.srcObject = stream;
             await videoRef.current.play();
             console.log('[AR] Camera playing successfully with fallback settings');
           }
           
           setCameraReady(true);
           setCameraActive(true);
           return; // Success with fallback
         } catch (fallbackError: any) {
           msg = `Camera error even with fallback settings: ${fallbackError?.message || 'Unknown error'}`;
         }
       } else {
         msg = `Camera error: ${e?.message || 'Unknown error'}`;
       }
       
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
     if (!cameraActive || !cameraReady || !containerRef.current) return;

     const container = containerRef.current;
     let cancelled = false;
     let loopAnimId: number;
     let renderer: THREE.WebGLRenderer | null = null;
     let canvas: HTMLCanvasElement | null = null;
     const geometries: THREE.BufferGeometry[] = [];
     const materials: THREE.Material[] = [];

     const initThreeJS = async () => {
       if (cancelled) return;

       const width = container.clientWidth;
       const height = container.clientHeight;
       if (width === 0 || height === 0) {
         loopAnimId = requestAnimationFrame(initThreeJS);
         return;
       }

       canvas = document.createElement('canvas');
       canvas.className = 'absolute inset-0 w-full h-full pointer-events-none';
       canvas.style.zIndex = '1';
       canvas.style.background = 'transparent';
       canvas.width = width * window.devicePixelRatio;
       canvas.height = height * window.devicePixelRatio;
       container.appendChild(canvas);

       try {
         renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: false });
       } catch (e) {
         console.error('[AR] WebGLRenderer failed to initialize:', e);
         setError('WebGL failed to initialize. Try closing other tabs or apps using the GPU.');
         return;
       }

        // Handle WebGL context lost/restored
        const handleContextLost = (e: Event) => {
          e.preventDefault();
          console.warn('[AR] WebGL context lost');
          setError('WebGL context lost — GPU may be overloaded. Trying to restore...');
          cancelled = true;
        };

        const handleContextRestored = () => {
          console.log('[AR] WebGL context restored');
          setError(null);
          cancelled = false;
          // Trigger re-initialization
          loopAnimId = requestAnimationFrame(initThreeJS);
        };

       canvas.addEventListener('webglcontextlost', handleContextLost);
       canvas.addEventListener('webglcontextrestored', handleContextRestored);

       // Cleanup event listeners on unmount
       const cleanupEventListeners = () => {
         if (canvas) {
           canvas.removeEventListener('webglcontextlost', handleContextLost);
           canvas.removeEventListener('webglcontextrestored', handleContextRestored);
         }
       };

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

       let petMesh: THREE.Mesh | null = null;
       let petGeo: THREE.BufferGeometry | null = null;
       let petMat: THREE.Material | null = null;

       // Check if we have an equipped ordinal that might be a 3D model
       if (pet?.equippedOrdinal) {
         try {
           const content = await fetchInscriptionContent(pet.equippedOrdinal);
           if (content) {
             const category = categorizeContentType(content.contentType);
             if (category === '3d-model') {
               // Load 3D model from ordinal
               const model = await load3DModelFromContent(content, scene, THREE);
               if (model) {
                 petMesh = model as THREE.Mesh;
                 // Find the mesh in the loaded model (assuming it's the main mesh)
                 if (petMesh && typeof petMesh === 'object' && 'children' in petMesh && Array.isArray(petMesh.children) && petMesh.children.length > 0) {
                   // Get the first mesh child
                   const firstMesh = petMesh.children.find(child => child && typeof child === 'object' && 'isMesh' in child && (child as any).isMesh) as THREE.Mesh | undefined;
                   if (firstMesh) {
                     petMesh = firstMesh;
                   }
                 }
               } else {
                 console.warn('[AR] Failed to load 3D model from ordinal, falling back to sphere');
                 // Fall back to sphere
                 const petColor = pet?.elementalType === 'fire' ? 0xff6b6b
                   : pet?.elementalType === 'water' ? 0x6bc5ff
                   : pet?.elementalType === 'earth' ? 0x6bff6b
                   : pet?.elementalType === 'air' ? 0xc5c5ff
                   : pet?.elementalType === 'light' ? 0xffff6b
                   : pet?.elementalType === 'dark' ? 0x9b6bff
                   : 0xffffff;
                 petGeo = new THREE.SphereGeometry(0.4, 16, 16);
                 petMat = new THREE.MeshToonMaterial({ color: petColor });
                 petMesh = new THREE.Mesh(petGeo, petMat);
                 petMesh.position.set(0, 0.5, 0);
                 geometries.push(petGeo);
                 materials.push(petMat);
               }
             } else {
               // Not a 3D model, use image or fall back to sphere
               const petColor = pet?.elementalType === 'fire' ? 0xff6b6b
                 : pet?.elementalType === 'water' ? 0x6bc5ff
                 : pet?.elementalType === 'earth' ? 0x6bff6b
                 : pet?.elementalType === 'air' ? 0xc5c5ff
                 : pet?.elementalType === 'light' ? 0xffff6b
                 : pet?.elementalType === 'dark' ? 0x9b6bff
                 : 0xffffff;
               petGeo = new THREE.SphereGeometry(0.4, 16, 16);
               petMat = new THREE.MeshToonMaterial({ color: petColor });
               petMesh = new THREE.Mesh(petGeo, petMat);
               petMesh.position.set(0, 0.5, 0);
               geometries.push(petGeo);
               materials.push(petMat);
             }
           } else {
             console.warn('[AR] Failed to fetch ordinal content, falling back to sphere');
             // Fall back to sphere
             const petColor = pet?.elementalType === 'fire' ? 0xff6b6b
               : pet?.elementalType === 'water' ? 0x6bc5ff
               : pet?.elementalType === 'earth' ? 0x6bff6b
               : pet?.elementalType === 'air' ? 0xc5c5ff
               : pet?.elementalType === 'light' ? 0xffff6b
               : pet?.elementalType === 'dark' ? 0x9b6bff
               : 0xffffff;
             petGeo = new THREE.SphereGeometry(0.4, 16, 16);
             petMat = new THREE.MeshToonMaterial({ color: petColor });
             petMesh = new THREE.Mesh(petGeo, petMat);
             petMesh.position.set(0, 0.5, 0);
             geometries.push(petGeo);
             materials.push(petMat);
           }
         } catch (error) {
           console.error('[AR] Error loading ordinal content:', error);
           // Fall back to sphere on error
           const petColor = pet?.elementalType === 'fire' ? 0xff6b6b
             : pet?.elementalType === 'water' ? 0x6bc5ff
             : pet?.elementalType === 'earth' ? 0x6bff6b
             : pet?.elementalType === 'air' ? 0xc5c5ff
             : pet?.elementalType === 'light' ? 0xffff6b
             : pet?.elementalType === 'dark' ? 0x9b6bff
             : 0xffffff;
           petGeo = new THREE.SphereGeometry(0.4, 16, 16);
           petMat = new THREE.MeshToonMaterial({ color: petColor });
           petMesh = new THREE.Mesh(petGeo, petMat);
           petMesh.position.set(0, 0.5, 0);
           geometries.push(petGeo);
           materials.push(petMat);
         }
       } else {
         // No equipped ordinal, use default sphere
         const petColor = pet?.elementalType === 'fire' ? 0xff6b6b
           : pet?.elementalType === 'water' ? 0x6bc5ff
           : pet?.elementalType === 'earth' ? 0x6bff6b
           : pet?.elementalType === 'air' ? 0xc5c5ff
           : pet?.elementalType === 'light' ? 0xffff6b
           : pet?.elementalType === 'dark' ? 0x9b6bff
           : 0xffffff;
         petGeo = new THREE.SphereGeometry(0.4, 16, 16);
         petMat = new THREE.MeshToonMaterial({ color: petColor });
         petMesh = new THREE.Mesh(petGeo, petMat);
         petMesh.position.set(0, 0.5, 0);
         geometries.push(petGeo);
         materials.push(petMat);
       }

       // Add pet to scene if we have a mesh
       if (petMesh) {
         scene.add(petMesh);
       }

       // Add eyes and other features only if we're using the default sphere
       if (petGeo && petMat) {
         // Only add detailed features for the default sphere pet
         const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
         const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
         const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
         leftEye.position.set(-0.12, 0.5, 0.3);
         scene.add(leftEye);
         const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
         rightEye.position.set(0.12, 0.5, 0.3);
         scene.add(rightEye);
         geometries.push(eyeGeo);
         materials.push(eyeMat);

         // Optional highlights - can be removed for even better performance
         const highlightGeo = new THREE.SphereGeometry(0.02, 4, 4);
         const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
         const lh = new THREE.Mesh(highlightGeo, highlightMat);
         lh.position.set(-0.09, 0.52, 0.35);
         scene.add(lh);
         const rh = new THREE.Mesh(highlightGeo, highlightMat);
         rh.position.set(0.09, 0.52, 0.35);
         scene.add(rh);
         geometries.push(highlightGeo);
         materials.push(highlightMat);

         const shadowGeo = new THREE.CircleGeometry(0.25, 16);
         const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
         const shadow = new THREE.Mesh(shadowGeo, shadowMat);
         shadow.rotation.x = -Math.PI / 2;
         shadow.position.y = 0.01;
         scene.add(shadow);
         geometries.push(shadowGeo);
         materials.push(shadowMat);
       }

       const animate = () => {
         if (cancelled) return;
         loopAnimId = requestAnimationFrame(animate);
         const t = Date.now() * 0.001;

         // Animate pet mesh if it exists
         if (petMesh) {
           // Bounce animation
           petMesh.position.y = 0.5 + Math.abs(Math.sin(t * 2)) * 0.15;
           
           // Squash/stretch
           const squash = 1 + Math.sin(t * 4) * 0.05;
           petMesh.scale.set(1 / squash, squash, 1 / squash);
         }

         // Animate eyes if they exist (only for default sphere)
         const leftEye = scene.getObjectByName('leftEye') as THREE.Mesh | undefined;
         const rightEye = scene.getObjectByName('rightEye') as THREE.Mesh | undefined;
         const lh = scene.getObjectByName('lh') as THREE.Mesh | undefined;
         const rh = scene.getObjectByName('rh') as THREE.Mesh | undefined;
         
         if (leftEye && rightEye && lh && rh) {
           leftEye.position.y = petMesh.position.y + 0.1;
           rightEye.position.y = petMesh.position.y + 0.1;
           lh.position.y = petMesh.position.y + 0.13;
           rh.position.y = petMesh.position.y + 0.13;
         }

         // Animate shadow if it exists
         const shadow = scene.getObjectByName('shadow') as THREE.Mesh | undefined;
         if (shadow) {
           shadow.scale.setScalar(1 - Math.abs(Math.sin(t * 2)) * 0.2);
         }

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
       if (canvas && canvas.parentNode) {
         canvas.parentNode.removeChild(canvas);
       }
       // Cleanup event listeners
       if (canvas) {
         canvas.removeEventListener('webglcontextlost', (e) => {});
         canvas.removeEventListener('webglcontextrestored', (e) => {});
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
       
       {/* LLM Chat Toggle Button */}
       <div className="mb-3">
         <button
           onClick={() => {
             // Simple toggle - in a real app we'd integrate with the chat system
             alert('LLM Chat Feature: Talk to your pet using local AI!\\n\\nThis would connect to Ollama or other LLM providers for real-time conversations with your pet in AR mode.');
           }}
           className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
         >
           💬 Chat with Your Pet (LLM)
         </button>
       </div>

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
