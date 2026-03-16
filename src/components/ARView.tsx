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
import { loadDefaultKitten } from '../avatar/AvatarLoader';
import { 
  detectGesture, 
  getReactionForGesture, 
  isLookingAtPet, 
  calculateThrowVelocity,
  updateBallPhysics,
  type GestureType,
  type XRPetReaction 
} from '../xr/XRInteractions';

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

    // Check WebXR support with better cross-browser compatibility and error handling
    useEffect(() => {
      // Standard check with proper error handling
      if ('xr' in navigator) {
        (navigator as any).xr.isSessionSupported('immersive-ar')
          .then((supported: boolean) => {
            setArSupported(supported);
          })
          .catch((error: any) => {
            console.warn('[AR] WebXR support check failed:', error);
            setArSupported(false);
          });
      } else {
        // Navigator doesn't have xr property at all
        setArSupported(false);
      }
    }, []);

   // WebXR immersive-ar session — works on Meta Quest, Meta glasses, and WebXR-capable mobile browsers
   const startWebXR = useCallback(async () => {
     // Check for WebXR support with fallback for browsers like Xverse
     let isWebXRAvailable = false;
     let webxrError = '';
     
     try {
       // Standard check
       if ('xr' in navigator) {
         const isSupported = await (navigator as any).xr.isSessionSupported('immersive-ar');
         if (isSupported) {
           isWebXRAvailable = true;
         } else {
           webxrError = 'WebXR immersive-ar mode not supported on this browser/device.';
         }
       } else {
         webxrError = 'WebXR not available in this browser.';
       }
     } catch (e: any) {
       webxrError = `WebXR support check failed: ${e?.message || 'Unknown error'}`;
     }

     if (!isWebXRAvailable) {
       setError(webxrError);
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
        if (!gl) { setError('WebGL not available for WebXR'); return; }

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

        // Ball for throwing interaction
        const ballGeo = new THREE.SphereGeometry(0.05, 16, 16);
        const ballMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.3 });
        const ball = new THREE.Mesh(ballGeo, ballMat);
        ball.position.set(0.5, 0.5, -0.5);
        ball.visible = false; // Hidden until thrown
        scene.add(ball);

        // Interaction state
        let handTrackingAvailable = false;
        let currentGesture: GestureType = 'none';
        let lastGesture: GestureType = 'none';
        let lastInteractionTime = 0;
        let petReaction: XRPetReaction | null = null;
        let reactionEndTime = 0;
        let ballInFlight = false;
        let ballVelocity = new THREE.Vector3();
        let previousHandPosition = new THREE.Vector3();
        let throwDetected = false;

        // Check for hand tracking support
        try {
          // Hand tracking is available if the session was created with it
          handTrackingAvailable = session.inputSources?.some(
            (inputSource: any) => inputSource.hand != null
          ) || false;
          console.log('[XR] Hand tracking available:', handTrackingAvailable);
        } catch (e) {
          console.log('[XR] Hand tracking check failed:', e);
        }

        // XR render loop with interactions
        let prevTime = performance.now();
        renderer.setAnimationLoop((time, frame) => {
          const t = time * 0.001;
          const deltaTime = (time - prevTime) / 1000;
          prevTime = time;

          // Get reference space for transforms
          const referenceSpace = renderer.xr.getReferenceSpace();
          
          // === GAZE INTERACTION ===
          // Get head position and direction from camera
          if (frame && referenceSpace) {
            const pose = frame.getViewerPose(referenceSpace);
            if (pose) {
              const headPos = new THREE.Vector3(
                pose.transform.position.x,
                pose.transform.position.y,
                pose.transform.position.z
              );
              
              // Get head direction from camera
              const headDir = new THREE.Vector3(0, 0, -1);
              headDir.applyQuaternion(new THREE.Quaternion(
                pose.transform.orientation.x,
                pose.transform.orientation.y,
                pose.transform.orientation.z,
                pose.transform.orientation.w
              ));
              
              // Check if looking at pet
              const lookingAtPet = isLookingAtPet(headPos, headDir, petMesh.position, 0.7);
              
              // If looking at pet, pet looks back
              if (lookingAtPet) {
                // Calculate direction to head
                const toHead = new THREE.Vector3()
                  .subVectors(headPos, petMesh.position)
                  .normalize();
                
                // Smoothly rotate pet to face user
                const targetAngle = Math.atan2(toHead.x, toHead.z);
                petMesh.rotation.y += (targetAngle - petMesh.rotation.y) * 0.05;
              }
            }
          }

          // === HAND TRACKING ===
          if (handTrackingAvailable && frame) {
            const inputSources = session.inputSources;
            
            for (const inputSource of inputSources) {
              if (inputSource.hand) {
                // Get hand joints
                const hand = inputSource.hand;
                
                // Detect gesture
                const gesture = detectGesture(hand);
                
                // Check for gesture change (with cooldown)
                const now = Date.now();
                if (gesture !== lastGesture && gesture !== 'none' && now - lastInteractionTime > 1000) {
                  currentGesture = gesture;
                  lastInteractionTime = now;
                  
                  // Get reaction for this gesture
                  petReaction = getReactionForGesture(gesture);
                  reactionEndTime = now + petReaction.duration;
                  
                  console.log('[XR] Gesture detected:', gesture, 'Reaction:', petReaction.animation);
                  
                  // Handle ball throw (pinch gesture releases ball)
                  if (gesture === 'pinch' && !ballInFlight) {
                    // Get hand position for throw
                    const wrist = hand.joints['wrist'];
                    if (wrist) {
                      const handPos = new THREE.Vector3(
                        wrist.position.x,
                        wrist.position.y,
                        wrist.position.z
                      );
                      
                      // Calculate throw velocity
                      if (previousHandPosition.length() > 0) {
                        ballVelocity = calculateThrowVelocity(handPos, previousHandPosition, deltaTime);
                        ball.position.copy(handPos);
                        ball.visible = true;
                        ballInFlight = true;
                        throwDetected = true;
                        console.log('[XR] Ball thrown!', ballVelocity);
                      }
                      
                      previousHandPosition.copy(handPos);
                    }
                  }
                }
                
                lastGesture = gesture;
                
                // Update hand position for throw calculation
                const wrist = hand.joints['wrist'];
                if (wrist) {
                  previousHandPosition.set(
                    wrist.position.x,
                    wrist.position.y,
                    wrist.position.z
                  );
                }
              }
            }
          }

          // === PET ANIMATION ===
          // Base bounce animation
          const bounceHeight = 0.06;
          const bounceSpeed = 2;
          petMesh.position.y = 0.3 + Math.abs(Math.sin(t * bounceSpeed)) * bounceHeight;
          
          // Apply pet reaction animations
          if (petReaction && Date.now() < reactionEndTime) {
            switch (petReaction.animation) {
              case 'wave':
                // Wave animation - side to side rotation
                petMesh.rotation.z = Math.sin(t * 8) * 0.3;
                break;
              case 'happy':
                // Happy jump - higher bounce
                petMesh.position.y += Math.abs(Math.sin(t * 6)) * 0.1;
                petMesh.scale.set(
                  1 + Math.sin(t * 8) * 0.1,
                  1 - Math.sin(t * 8) * 0.1,
                  1
                );
                break;
              case 'look':
                // Look animation - rotate to face user
                // Already handled in gaze section
                break;
              case 'play':
                // Play animation - spinning
                petMesh.rotation.y += deltaTime * 5;
                break;
              case 'hide':
                // Hide animation - shrink down
                petMesh.scale.setScalar(0.5 + Math.sin(t * 4) * 0.3);
                petMesh.position.y = 0.1;
                break;
            }
          } else {
            // Reset to idle animation
            petReaction = null;
            petMesh.rotation.z *= 0.9; // Smoothly return to upright
            petMesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
          }
          
          // Update eye positions
          leftEye.position.y = petMesh.position.y + 0.04;
          rightEye.position.y = petMesh.position.y + 0.04;
          
          // Squash/stretch
          const squash = 1 + Math.sin(t * 4) * 0.05;
          if (!petReaction) {
            petMesh.scale.set(1 / squash, squash, 1 / squash);
          }
          
          // Shadow
          shadow.scale.setScalar(1 - Math.abs(Math.sin(t * 2)) * 0.2);

          // === BALL PHYSICS ===
          if (ballInFlight) {
            const physics = updateBallPhysics(ball.position, ballVelocity, deltaTime);
            ball.position.copy(physics.position);
            ballVelocity.copy(physics.velocity);
            
            // Rotate ball while in flight
            ball.rotation.x += deltaTime * 10;
            ball.rotation.z += deltaTime * 5;
            
            // Check if ball stopped
            if (physics.grounded && ballVelocity.length() < 0.1) {
              ballInFlight = false;
              ball.visible = false;
              throwDetected = false;
              console.log('[XR] Ball stopped');
            }
            
            // Check if pet catches ball (within range)
            const distToPet = ball.position.distanceTo(petMesh.position);
            if (distToPet < 0.3 && ballInFlight) {
              // Pet "catches" ball
              ballInFlight = false;
              ball.visible = false;
              petReaction = { animation: 'happy', duration: 1000, sound: 'happy' };
              reactionEndTime = Date.now() + 1000;
              console.log('[XR] Pet caught the ball!');
            }
          }

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
          ballGeo.dispose();
          ballMat.dispose();
        });

        console.log('[AR] WebXR immersive-ar session started with interactions');
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

    // Enhanced camera passthrough with better error handling and user feedback
    const startCamera = useCallback(async () => {
      // Pre-check: verify camera availability
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setError('Camera API not available on this browser/device.');
        setCameraSupported(false);
        return;
      }

      try {
        setCameraReady(false);
        setError(null);
        console.log('[AR] Starting camera, facingMode:', facingMode);

        // Stop any existing stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }

        // Check camera permissions and availability first
        await checkCameraAvailability();

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
          
          // Wait for video metadata to load before playing
          await new Promise<void>((resolve, reject) => {
            if (!videoRef.current) {
              reject(new Error('Video element not found'));
              return;
            }
            
            // Set up event handlers
            const onLoadedMetadata = () => {
              console.log('[AR] Video metadata loaded');
              videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
              videoRef.current?.removeEventListener('error', onError);
              resolve();
            };
            
            const onError = (e: Event) => {
              console.error('[AR] Video error during metadata load:', e);
              videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
              videoRef.current?.removeEventListener('error', onError);
              reject(new Error('Failed to load video metadata'));
            };
            
            videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
            videoRef.current.addEventListener('error', onError);
            
            // Timeout in case metadata never loads
            setTimeout(() => {
              videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
              videoRef.current?.removeEventListener('error', onError);
              reject(new Error('Timeout waiting for video metadata'));
            }, 5000);
          });
          
          try {
            // Attempt to play - may fail due to autoplay policies
            await videoRef.current.play();
            console.log('[AR] Camera playing successfully');
            // Only set flags when video actually plays
            setCameraReady(true);
            setCameraActive(true);
          } catch (playError: any) {
            console.warn('[AR] Video play failed (may be autoplay policy):', playError.name);
            
            // Try to enable play on user interaction
            if (playError.name === 'NotAllowedError') {
              // Add click handler to container to trigger play
              const container = containerRef.current;
              if (container) {
                const playOnInteraction = async () => {
                  if (videoRef.current) {
                    try {
                      await videoRef.current.play();
                      console.log('[AR] Camera playing after user interaction');
                      // Set flags AFTER user interaction succeeds
                      setCameraReady(true);
                      setCameraActive(true);
                      setError(null);
                    } catch (e) {
                      console.error('[AR] Failed to play even after interaction:', e);
                      setError('Failed to start video. Please try again.');
                    }
                  }
                  container.removeEventListener('click', playOnInteraction);
                };
                container.addEventListener('click', playOnInteraction);
                // Show message to user - don't set camera flags yet!
                setError('Camera detected. Tap anywhere to start the video feed.');
                setCameraActive(true); // Allow UI to show, but cameraReady stays false until video plays
                return; // CRITICAL: Exit here, don't set cameraReady yet
              }
            } else {
              throw new Error(`Video element failed to play: ${playError.message}`);
            }
          }
        }
      } catch (e: any) {
        let msg = '';
        let userAction = '';

        if (e?.name === 'NotAllowedError') {
          msg = 'Camera access denied.';
          userAction = 'Please allow camera access when prompted by your browser.';
        } else if (e?.name === 'NotFoundError') {
          msg = 'No camera found on this device.';
          userAction = 'Please check that a camera is connected and not disabled in device settings.';
        } else if (e?.name === 'NotReadableError') {
          msg = 'Camera is in use by another application.';
          userAction = 'Close other apps that might be using the camera (Zoom, Teams, etc.) and try again.';
        } else if (e?.name === 'AbortError') {
          msg = 'Camera access was aborted.';
          userAction = 'Please try again.';
        } else if (e?.name === 'OverconstrainedError') {
          msg = 'Camera constraints could not be satisfied.';
          userAction = 'Trying with default settings...';
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
            userAction = 'Please try restarting your browser or device.';
          }
        } else if (e?.name === 'NotSupportedError' || e?.name === 'TypeError') {
          msg = 'Camera not supported on this browser/device.';
          userAction = 'Please try a different browser or device.';
        } else {
          msg = `Camera error: ${e?.message || 'Unknown error'}`;
          userAction = 'Please try again or restart your browser.';
        }

        setError(`${msg} ${userAction}`.trim());
        console.error('[AR] Camera error:', e?.name, e?.message);
      }
    }, [facingMode]);

    // Check camera permissions and availability
    const checkCameraAvailability = useCallback(async () => {
      // Check secure context (HTTPS required for camera)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error('Camera requires HTTPS. Please access this site via https://');
      }

      // Enumerate devices to check for cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          throw new Error('No camera found on this device. Please check if a camera is connected and not disabled in settings.');
        }
      } catch (enumError) {
        // If we can't enumerate devices, we'll still try to access camera and let getUserMedia fail with specific error
        console.warn('[AR] Could not enumerate devices:', enumError);
        // Continue - we'll get a more specific error from getUserMedia if needed
      }
    }, []);

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
          renderer = new THREE.WebGLRenderer({ 
            canvas, 
            alpha: true, 
            antialias: false, // Disable antialiasing to reduce GPU load
            premultipliedAlpha: false,
            powerPreference: 'low-power' // Use low-power GPU if available
          });
        } catch (e) {
          console.error('[AR] WebGLRenderer failed to initialize:', e);
          setError('WebGL failed to initialize. Try closing other tabs or apps using the GPU.');
          return;
        }

        // Track context loss/restoration state
        let contextLost = false;
        
        // Handle WebGL context lost/restored
        const handleContextLost = (e: Event) => {
          e.preventDefault();
          console.warn('[AR] WebGL context lost');
          setError('WebGL context lost — GPU may be overloaded. Trying to restore...');
          contextLost = true;
          cancelled = true;
        };

        const handleContextRestored = () => {
          console.log('[AR] WebGL context restored');
          setError(null);
          contextLost = false;
          cancelled = false;
          // Clean up old canvas before re-initialization
          if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
          }
          canvas = null;
          renderer = null;
          // Trigger re-initialization after a short delay
          setTimeout(() => {
            if (!cancelled && containerRef.current) {
              loopAnimId = requestAnimationFrame(initThreeJS);
            }
          }, 100);
        };

        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);

        // Store cleanup function for later use
        (canvas as any).__arCleanup = () => {
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

        let petMesh: THREE.Object3D | null = null;
        let petGeo: THREE.BufferGeometry | null = null;
        let petMat: THREE.Material | null = null;
        let isVRMModel = false;

        // Helper function to create a fallback sphere pet
        const createSpherePet = () => {
          const petColor = pet?.elementalType === 'fire' ? 0xff6b6b
            : pet?.elementalType === 'water' ? 0x6bc5ff
            : pet?.elementalType === 'earth' ? 0x6bff6b
            : pet?.elementalType === 'air' ? 0xc5c5ff
            : pet?.elementalType === 'light' ? 0xffff6b
            : pet?.elementalType === 'dark' ? 0x9b6bff
            : 0xffffff;
          petGeo = new THREE.SphereGeometry(0.4, 16, 16);
          petMat = new THREE.MeshToonMaterial({ color: petColor });
          const mesh = new THREE.Mesh(petGeo, petMat);
          mesh.position.set(0, 0.5, 0);
          geometries.push(petGeo);
          materials.push(petMat);
          return mesh;
        };

        // Helper function to create a fallback kitten VRM
        const createKittenVRM = async () => {
          try {
            const kitten = await loadDefaultKitten(scene);
            if (kitten && typeof kitten === 'object') {
              // Check if it's a VRM model or a THREE.Group
              if ('scene' in kitten) {
                // It's a VRM, return the scene
                return (kitten as any).scene as THREE.Object3D;
              } else {
                // It's already a THREE.Object3D
                return kitten as THREE.Object3D;
              }
            }
          } catch (error) {
            console.warn('[AR] Failed to load default kitten VRM:', error);
          }
          return null;
        };

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
                  petMesh = model as THREE.Object3D;
                  isVRMModel = true;
                } else {
                  console.warn('[AR] Failed to load 3D model from ordinal, falling back to default kitten');
                  // Fall back to default kitten VRM
                  petMesh = await createKittenVRM();
                  if (!petMesh) {
                    petMesh = createSpherePet();
                  } else {
                    isVRMModel = true;
                  }
                }
              } else if (category === 'vrm') {
                // Load VRM model directly
                console.log('[AR] Loading VRM ordinal');
                const kitten = await createKittenVRM();
                if (kitten) {
                  petMesh = kitten;
                  isVRMModel = true;
                } else {
                  petMesh = createSpherePet();
                }
              } else {
                // Not a 3D model, use default kitten
                console.log('[AR] Ordinal is not a 3D model, loading default kitten VRM');
                const kitten = await createKittenVRM();
                if (kitten) {
                  petMesh = kitten;
                  isVRMModel = true;
                } else {
                  petMesh = createSpherePet();
                }
              }
            } else {
              console.warn('[AR] Failed to fetch ordinal content, falling back to default kitten');
              const kitten = await createKittenVRM();
              if (kitten) {
                petMesh = kitten;
                isVRMModel = true;
              } else {
                petMesh = createSpherePet();
              }
            }
          } catch (error) {
            console.error('[AR] Error loading ordinal content:', error);
            // Fall back to default kitten on error
            const kitten = await createKittenVRM();
            if (kitten) {
              petMesh = kitten;
              isVRMModel = true;
            } else {
              petMesh = createSpherePet();
            }
          }
        } else {
          // No equipped ordinal, use default kitten VRM
          console.log('[AR] No ordinal equipped, loading default kitten VRM');
          const kitten = await createKittenVRM();
          if (kitten) {
            petMesh = kitten;
            isVRMModel = true;
          } else {
            petMesh = createSpherePet();
          }
        }

        // Add pet to scene if we have a mesh
        if (petMesh) {
          scene.add(petMesh);
        }

        // Add eyes and other features only if we're using the default sphere (not VRM)
        if (petGeo && petMat && !isVRMModel) {
          // Only add detailed features for the default sphere pet
          const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
          const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
          const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
          leftEye.position.set(-0.12, 0.5, 0.3);
          leftEye.name = 'leftEye';
          scene.add(leftEye);
          const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
          rightEye.position.set(0.12, 0.5, 0.3);
          rightEye.name = 'rightEye';
          scene.add(rightEye);
          geometries.push(eyeGeo);
          materials.push(eyeMat);

          // Optional highlights - can be removed for even better performance
          const highlightGeo = new THREE.SphereGeometry(0.02, 4, 4);
          const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const lh = new THREE.Mesh(highlightGeo, highlightMat);
          lh.position.set(-0.09, 0.52, 0.35);
          lh.name = 'lh';
          scene.add(lh);
          const rh = new THREE.Mesh(highlightGeo, highlightMat);
          rh.position.set(0.09, 0.52, 0.35);
          rh.name = 'rh';
          scene.add(rh);
          geometries.push(highlightGeo);
          materials.push(highlightMat);

          const shadowGeo = new THREE.CircleGeometry(0.25, 16);
          const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
          const shadow = new THREE.Mesh(shadowGeo, shadowMat);
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.y = 0.01;
          shadow.name = 'shadow';
          scene.add(shadow);
          geometries.push(shadowGeo);
          materials.push(shadowMat);
        } else if (isVRMModel) {
          // Add a shadow for VRM models
          const shadowGeo = new THREE.CircleGeometry(0.25, 16);
          const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
          const shadow = new THREE.Mesh(shadowGeo, shadowMat);
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.y = 0.01;
          shadow.name = 'shadow';
          scene.add(shadow);
          geometries.push(shadowGeo);
          materials.push(shadowMat);
        }

        // Interaction state
        let isInteracting = false;
        let lastInteractionTime = 0;
        const interactionCooldown = 1000; // 1 second cooldown between interactions

        // Handle touch/click interactions
        const handleInteraction = (eventType: string) => {
          const now = Date.now();
          if (now - lastInteractionTime < interactionCooldown) return;
          lastInteractionTime = now;
          
          isInteracting = true;
          
          // Trigger pet reaction based on interaction type
          if (petMesh) {
            // Scale up briefly for tap/click
            petMesh.scale.set(1.2, 1.2, 1.2);
            setTimeout(() => {
              petMesh.scale.set(1, 1, 1);
            }, 200);
          }
          
          // Reset interaction flag after a short delay
          setTimeout(() => {
            isInteracting = false;
          }, 500);
        };

        // Add event listeners for interaction
        if (canvas) {
          canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            handleInteraction('tap');
          });
          
          canvas.addEventListener('pointerup', (e) => {
            e.preventDefault();
          });
          
          // Add double tap detection
          let lastTap = 0;
          canvas.addEventListener('pointerdown', (e) => {
            const now = Date.now();
            if (now - lastTap < 300) { // Double tap within 300ms
              handleInteraction('doubleTap');
              e.preventDefault();
            }
            lastTap = now;
          });
        }

        const animate = () => {
          if (cancelled) return;
          loopAnimId = requestAnimationFrame(animate);
          const t = Date.now() * 0.001;

          // Animate pet mesh if it exists
          if (petMesh) {
            // Bounce animation
            petMesh.position.y = 0.5 + Math.abs(Math.sin(t * 2)) * 0.15;
            
            // Add interaction-based scaling
            if (isInteracting) {
              // Pulse effect when interacting
              const pulseScale = 1 + Math.sin(t * 10) * 0.1;
              petMesh.scale.set(pulseScale, pulseScale, pulseScale);
            } else {
              // Normal squash/stretch when not interacting
              const squash = 1 + Math.sin(t * 4) * 0.05;
              petMesh.scale.set(1 / squash, squash, 1 / squash);
            }
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
       
       // Use stored cleanup function if available
       if (canvas && (canvas as any).__arCleanup) {
         (canvas as any).__arCleanup();
       }
       
       if (renderer) {
         renderer.dispose();
         renderer.forceContextLoss();
         renderer = null;
       }
       if (canvas && canvas.parentNode) {
         canvas.parentNode.removeChild(canvas);
       }
       canvas = null;
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
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-red-400 flex-1">
                {error.startsWith('Camera access denied.') ? '🔒 Camera Permission Required' : 
                 error.startsWith('No camera found') ? '📷 Camera Not Detected' : 
                 error.startsWith('Camera is in use') ? '📹 Camera In Use' : 
                 error.startsWith('Camera was interrupted') ? '⏸️ Camera Interrupted' : 
                 error.startsWith('Camera constraints') ? '⚙️ Camera Settings Issue' : 
                 error.startsWith('Camera error') ? '❌ Camera Error' : 
                 error.startsWith('WebGL failed') ? '🎨 Graphics Error' : 
                 error.startsWith('WebGL context lost') ? '🔄 Graphics Context Lost' : 
                 error.startsWith('Camera requires HTTPS') ? '🔒 Secure Connection Required' : 
                 error.startsWith('Camera API not available') ? '📷 Camera API Unavailable' : 
                 error.startsWith('WebXR not supported') ? '🥽 WebXR Not Available' : 
                 error.startsWith('WebXR not available') ? '🥽 WebXR Not Available' : 
                 error.startsWith('WebXR support check failed') ? '🥽 WebXR Check Failed' : 
                 error.startsWith('WebXR error') ? '🥽 WebXR Session Error' : 
                 '⚠️ Error'}
              </p>
              <button
                onClick={() => {
                  // Clear error after 3 seconds or allow manual clearing
                  setTimeout(() => setError(null), 3000);
                }}
                className="text-red-300 hover:text-red-200 text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-red-300 mb-2">{error}</p>
            {/* Add helpful suggestions based on error type */}
            {error.startsWith('Camera access denied.') && (
              <div className="text-xs text-red-200 bg-red-500/5 px-2 py-1 rounded mb-2">
                💡 Tap the camera icon in your browser's address bar to allow access
              </div>
            )}
            {error.startsWith('No camera found') && (
              <div className="text-xs text-red-200 bg-red-500/5 px-2 py-1 rounded mb-2">
                💡 Check camera connections and device settings
              </div>
            )}
            {error.startsWith('Camera is in use') && (
              <div className="text-xs text-red-200 bg-red-500/5 px-2 py-1 rounded mb-2">
                💡 Close other apps using the camera and try again
              </div>
            )}
            {error.startsWith('Camera was interrupted') && (
              <div className="text-xs text-red-200 bg-red-500/5 px-2 py-1 rounded mb-2">
                💡 Try again - the interruption may have been temporary
              </div>
            )}
            {error.startsWith('Camera constraints') && (
              <div className="text-xs text-red-200 bg-red-500/5 px-2 py-1 rounded mb-2">
                💡 The app will automatically try with simpler settings
              </div>
            )}
            {error.startsWith('Camera requires HTTPS') && (
              <div className="text-xs text-red-200 bg-red-500/5 px-2 py-1 rounded mb-2">
                💡 Please reload the page using https://
              </div>
            )}
            {(error.startsWith('WebXR not supported') || 
              error.startsWith('WebXR not available') || 
              error.startsWith('WebXR support check failed') || 
              error.startsWith('WebXR error')) && (
              <div className="text-xs text-red-200 bg-red-500/5 px-2 py-1 rounded mb-2">
                💡 WebXR works on Meta Quest, Meta glasses, and compatible browsers
              </div>
            )}
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

            {/* Battle feature removed from AR mode - use Battle tab instead */}

            <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 text-center">
              <div className="text-5xl mb-2">{getStageEmoji(pet.stage)}</div>
              <p className="text-sm text-gray-400">
                {pet.name} is ready to explore the real world!
              </p>
              <p className="text-xs text-gray-600 mt-1">
                📸 Camera AR overlays your pet on the camera feed.
                {arSupported ? ' 🥽 WebXR works on Meta Quest, Meta glasses, and XR browsers!' : ''}
              </p>
              {!arSupported && !('xr' in navigator) && (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-400">
                    ⚠️ WebXR not available in this browser
                  </p>
                  <p className="text-xs text-yellow-500 mt-1">
                    Try Chrome on Android, Safari on iOS, or Meta Quest Browser
                  </p>
                </div>
              )}
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
