// ============================================
// Home View — Pet's spatial home environment
// ============================================

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { getStageEmoji, getMoodEmoji } from '../engine/PetStateMachine';
import { getOverallHealth } from '../engine/NeedsSystem';
import { HOME_THEMES, RP1_CONFIG } from '../utils/constants';
import { checkMSFHealth, pushSceneJSON, copySceneJSONToClipboard } from '../rp1/MVMFBridge';
import { downloadPetGLB } from '../rp1/GLBExporter';
import { generateSceneJSON } from '../rp1/SceneJSONGenerator';
import { forceSyncScene } from '../rp1/SceneSync';
import { fetchInscriptionContent, applyImageTextureToMesh, categorizeContentType, load3DModelFromContent } from '../avatar/OrdinalRenderer';
import { fetchAvatarList, getAvatarById, loadVRMModel } from '../avatar/AvatarLoader';
import { saveLocalPet } from '../store/localStorage';
import { QRCodeGenerator } from './QRCodeGenerator';
import { AvatarPicker } from './AvatarPicker';
import type { OSAAvatar } from '../types';

type HomeTheme = {
  id: string;
  name: string;
  emoji: string;
  unlockLevel: number;
};

export function HomeView() {
  const { pet, home, setHome, identity, wallet, setNotification } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [msfOnline, setMsfOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<'success' | 'copied' | 'error' | null>(null);
  const [newThemeUnlocked, setNewThemeUnlocked] = useState<HomeTheme | null>(null);
  const [quickSyncing, setQuickSyncing] = useState(false);
  const [quickSyncResult, setQuickSyncResult] = useState<'success' | 'error' | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  if (!pet) return null;

  const currentTheme = HOME_THEMES.find(t => t.id === home.theme) || HOME_THEMES[0];
  const overallHealth = getOverallHealth(pet.needs);

  // Check for newly unlocked themes when pet levels up
  useEffect(() => {
    // Find all themes that are now unlocked but weren't previously
    const newlyUnlocked = HOME_THEMES.filter(theme => 
      pet.level >= theme.unlockLevel && 
      theme.id !== home.theme
    );
    
    // If we found newly unlocked themes and haven't already notified about one
    if (newlyUnlocked.length > 0 && !newThemeUnlocked) {
      // Sort by unlock level to get the highest level newly unlocked theme
      const highestNewTheme = newlyUnlocked.reduce((prev, current) => 
        prev.unlockLevel > current.unlockLevel ? prev : current
      );
      setNewThemeUnlocked(highestNewTheme);
    }
  }, [pet.level, home.theme]);

  const handleThemeChange = (themeId: string) => {
    const theme = HOME_THEMES.find(t => t.id === themeId);
    if (theme && pet.level >= theme.unlockLevel) {
      setHome({ ...home, theme: themeId });
      // Clear the notification when user manually changes theme
      setNewThemeUnlocked(null);
    }
  };

  const handleCheckMSF = async () => {
    setChecking(true);
    const online = await checkMSFHealth();
    setMsfOnline(online);
    setChecking(false);
  };

  const handleQuickSync = async () => {
    if (!wallet.connected || wallet.inscriptions.length === 0) {
      setQuickSyncResult('error');
      setNotification({ message: 'Connect wallet with ordinals first', emoji: '⚠️' });
      setTimeout(() => setQuickSyncResult(null), 3000);
      return;
    }

    setQuickSyncing(true);
    setQuickSyncResult(null);
    setNotification({ message: 'Syncing scene to RP1...', emoji: '🔄' });

    try {
      const success = await forceSyncScene(pet, wallet.inscriptions, home);
      if (success) {
        setQuickSyncResult('success');
        setNotification({ message: 'Scene synced to RP1!', emoji: '✅' });
      } else {
        setQuickSyncResult('error');
        setNotification({ message: 'Sync failed - try copying manually', emoji: '⚠️' });
      }
    } catch {
      setQuickSyncResult('error');
      setNotification({ message: 'Sync error - check connection', emoji: '❌' });
    }

    setQuickSyncing(false);
    setTimeout(() => {
      setQuickSyncResult(null);
      setNotification(null);
    }, 3000);
  };

  const handleAvatarSelect = async (avatar: OSAAvatar) => {
    if (!pet) return;
    
    try {
      // Update pet state with avatarId
      const updatedPet = { ...pet, avatarId: avatar.id };
      
      // Update the pet in the store
      useStore.getState().setPet(updatedPet);
      
      // Save to localStorage for persistence
      saveLocalPet(updatedPet);
      
      // Show success notification
      setNotification({ message: `Avatar set: ${avatar.name}`, emoji: '🎭' });
      setShowAvatarPicker(false);
      
      // Trigger 3D scene refresh by updating state
      // The 3D scene useEffect depends on pet state, so it will refresh automatically
      
    } catch (error) {
      console.error('[HomeView] Failed to set avatar:', error);
      setNotification({ message: 'Failed to set avatar', emoji: '❌' });
    }
    
    setTimeout(() => setNotification(null), 2000);
  };

  // 3D Kawaii Home Scene
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    let animationId: number;
    let cleanup = false;
    let renderer: any = null;
    let scene: any = null;
    let canvas: HTMLCanvasElement | null = null;
    let contextLost = false;

    // Event handlers for WebGL context - defined outside async function for cleanup
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[HomeView] WebGL context lost');
      contextLost = true;
      cleanup = true;
    };

    const handleContextRestored = () => {
      console.log('[HomeView] WebGL context restored');
      contextLost = false;
    };

    (async () => {
      const THREE = await import('three');

      // CRITICAL: Create a NEW canvas element instead of reusing the same one
      // This prevents WebGL context invalidation when effect re-runs
      canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.appendChild(canvas);

      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);

      scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
      camera.position.set(0, 2.5, 5);
      camera.lookAt(0, 0.5, 0);

      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      } catch (e) {
        console.error('[HomeView] WebGLRenderer failed to initialize:', e);
        return; // Bail out if WebGL is not available
      }
      if (cleanup) return; // Check cleanup after renderer creation
      
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x0f0f23, 1);

      // Pastel ambient light
      const ambientLight = new THREE.AmbientLight(0xffc0cb, 0.6);
      scene.add(ambientLight);

      // Warm point light
      const pointLight = new THREE.PointLight(0xffd700, 1.2, 10);
      pointLight.position.set(2, 3, 2);
      scene.add(pointLight);

      // Soft directional light
      const dirLight = new THREE.DirectionalLight(0xe0e0ff, 0.5);
      dirLight.position.set(-2, 4, 1);
      scene.add(dirLight);

      // --- Floor (pastel checkerboard) ---
      const floorGeo = new THREE.PlaneGeometry(6, 6);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0xf5e6d3, roughness: 0.8 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);

      // --- Back wall (rounded look via box) ---
      const wallGeo = new THREE.BoxGeometry(6, 3, 0.1);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xffe4e1, roughness: 0.9 });
      const backWall = new THREE.Mesh(wallGeo, wallMat);
      backWall.position.set(0, 1.5, -3);
      scene.add(backWall);

      // Side walls
      const sideWallGeo = new THREE.BoxGeometry(0.1, 3, 6);
      const leftWall = new THREE.Mesh(sideWallGeo, wallMat.clone());
      leftWall.position.set(-3, 1.5, 0);
      ((leftWall.material as unknown as Record<string, unknown>).color as { set: (c: number) => void }).set(0xffd1dc);
      scene.add(leftWall);

      const rightWall = new THREE.Mesh(sideWallGeo, wallMat.clone());
      rightWall.position.set(3, 1.5, 0);
      ((rightWall.material as unknown as Record<string, unknown>).color as { set: (c: number) => void }).set(0xffd1dc);
      scene.add(rightWall);

      // --- Cute Bed (rounded box + pillow) ---
      const bedGeo = new THREE.BoxGeometry(1.4, 0.3, 0.9, 4, 4, 4);
      const bedMat = new THREE.MeshStandardMaterial({ color: 0xb19cd9, roughness: 0.6 });
      const bed = new THREE.Mesh(bedGeo, bedMat);
      bed.position.set(-1.8, 0.15, -2);
      scene.add(bed);

      const pillowGeo = new THREE.SphereGeometry(0.25, 16, 16);
      pillowGeo.scale(1.2, 0.6, 1);
      const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffc0cb });
      const pillow = new THREE.Mesh(pillowGeo, pillowMat);
      pillow.position.set(-1.8, 0.35, -2.2);
      scene.add(pillow);

      // --- Food Bowl ---
      const bowlGeo = new THREE.CylinderGeometry(0.25, 0.18, 0.15, 16);
      const bowlMat = new THREE.MeshStandardMaterial({ color: 0xff9a9e, roughness: 0.4, metalness: 0.2 });
      const bowl = new THREE.Mesh(bowlGeo, bowlMat);
      bowl.position.set(1.8, 0.075, -1.5);
      scene.add(bowl);

      // Food in bowl
      const foodGeo = new THREE.SphereGeometry(0.18, 16, 16);
      foodGeo.scale(1, 0.3, 1);
      const foodMat = new THREE.MeshStandardMaterial({ color: 0xffa07a });
      const food = new THREE.Mesh(foodGeo, foodMat);
      food.position.set(1.8, 0.15, -1.5);
      scene.add(food);

      // --- Water Bowl ---
      const waterBowl = new THREE.Mesh(bowlGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x87ceeb, roughness: 0.3, metalness: 0.3 }));
      waterBowl.position.set(2.2, 0.075, -1.0);
      scene.add(waterBowl);

      // --- Toy Ball ---
      const ballGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const ballMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.3 });
      const ball = new THREE.Mesh(ballGeo, ballMat);
      ball.position.set(0.8, 0.15, 0.5);
      scene.add(ball);

      // --- Plant ---
      const potGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8);
      const potMat = new THREE.MeshStandardMaterial({ color: 0xd4a574 });
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.set(-2.3, 0.15, 0.5);
      scene.add(pot);

      const leafGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x98d8a0 });
      const leaves = new THREE.Mesh(leafGeo, leafMat);
      leaves.position.set(-2.3, 0.5, 0.5);
      scene.add(leaves);

      // --- Pet (cute bouncing sphere) ---
      const petBodyGeo = new THREE.SphereGeometry(0.45, 32, 32);
      const petColors: Record<string, number> = {
        fire: 0xff6b6b, water: 0x6bb5ff, earth: 0xa0d468,
        air: 0xc0e8ff, light: 0xfff176, dark: 0x9c6bff, neutral: 0xb19cd9,
      };
      const petColor = petColors[pet.elementalType] || 0xb19cd9;
      const petBodyMat = new THREE.MeshStandardMaterial({ color: petColor, roughness: 0.3, metalness: 0.1 });
      const petBody = new THREE.Mesh(petBodyGeo, petBodyMat);
      petBody.position.set(0, 0.8, 0);
      scene.add(petBody);

      // --- Load VRM model if avatarId is set ---
      if (pet.avatarId && !pet.equippedOrdinal) {
        try {
          // Fetch avatar from OSA Gallery
          const avatar = await getAvatarById(pet.avatarId);
          if (cleanup) return; // CRITICAL: Check if effect was cleaned up
          if (avatar && avatar.modelFileUrl) {
            // Load VRM model
            const vrmModel = await loadVRMModel(avatar.modelFileUrl, scene);
            if (cleanup) return; // CRITICAL: Check if effect was cleaned up
            if (vrmModel && (vrmModel as any).scene) {
              // Hide default sphere, add VRM model
              petBody.visible = false;
              const vrmScene = (vrmModel as any).scene;
              vrmScene.position.set(0, 0, 0); // Adjust position as needed
              vrmScene.scale.set(0.5, 0.5, 0.5); // Scale down to fit in the scene
              scene.add(vrmScene);
              console.log('[HomeView] VRM model loaded successfully');
            }
          }
        } catch (error) {
          console.warn('[HomeView] Failed to load VRM model, using sphere:', error);
          // Continue with sphere pet
        }
      }

      // --- Load ordinal inscription as texture/model (overrides VRM if equipped) ---
      if (pet.equippedOrdinal) {
        fetchInscriptionContent(pet.equippedOrdinal).then(async (content) => {
          if (!content || cleanup) return;
          const category = categorizeContentType(content.contentType);
          if (category === 'image') {
            await applyImageTextureToMesh(content, petBody, THREE);
          } else if (category === '3d-model') {
            // Hide default sphere, load 3D model instead
            petBody.visible = false;
            await load3DModelFromContent(content, scene, THREE);
          }
        }).catch((e) => console.warn('[HomeView] Ordinal load failed:', e));
      }

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.07, 16, 16);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const pupilGeo = new THREE.SphereGeometry(0.04, 16, 16);
      const pupilMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.13, 0.9, 0.38);
      scene.add(leftEye);
      const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
      leftPupil.position.set(-0.13, 0.9, 0.43);
      scene.add(leftPupil);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.13, 0.9, 0.38);
      scene.add(rightEye);
      const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
      rightPupil.position.set(0.13, 0.9, 0.43);
      scene.add(rightPupil);

      // Blush cheeks
      const blushGeo = new THREE.SphereGeometry(0.06, 16, 16);
      blushGeo.scale(1.3, 0.7, 0.5);
      const blushMat = new THREE.MeshStandardMaterial({ color: 0xff9a9e, transparent: true, opacity: 0.6 });
      const leftBlush = new THREE.Mesh(blushGeo, blushMat);
      leftBlush.position.set(-0.25, 0.78, 0.35);
      scene.add(leftBlush);
      const rightBlush = new THREE.Mesh(blushGeo.clone(), blushMat);
      rightBlush.position.set(0.25, 0.78, 0.35);
      scene.add(rightBlush);

      // --- Floating hearts/stars ---
      const particles: InstanceType<typeof THREE.Mesh>[] = [];
      const particleShapes = ['heart', 'star'];
      for (let i = 0; i < 8; i++) {
        const shape = particleShapes[i % 2];
        const geo = shape === 'heart'
          ? new THREE.SphereGeometry(0.04, 8, 8)
          : new THREE.OctahedronGeometry(0.04);
        const mat = new THREE.MeshStandardMaterial({
          color: shape === 'heart' ? 0xff6b9d : 0xffd700,
          emissive: shape === 'heart' ? 0xff6b9d : 0xffd700,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.7,
        });
        const particle = new THREE.Mesh(geo, mat);
        particle.position.set(
          (Math.random() - 0.5) * 4,
          1 + Math.random() * 2,
          (Math.random() - 0.5) * 4
        );
        particle.userData = { baseY: particle.position.y, speed: 0.3 + Math.random() * 0.5, offset: Math.random() * Math.PI * 2 };
        scene.add(particle);
        particles.push(particle);
      }

      // --- Animation Loop ---
      const clock = new THREE.Clock();

      function animate() {
        if (cleanup) return;
        animationId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        // Pet bounce
        petBody.position.y = 0.8 + Math.sin(t * 2) * 0.08;
        leftEye.position.y = 0.9 + Math.sin(t * 2) * 0.08;
        leftPupil.position.y = 0.9 + Math.sin(t * 2) * 0.08;
        rightEye.position.y = 0.9 + Math.sin(t * 2) * 0.08;
        rightPupil.position.y = 0.9 + Math.sin(t * 2) * 0.08;
        leftBlush.position.y = 0.78 + Math.sin(t * 2) * 0.08;
        rightBlush.position.y = 0.78 + Math.sin(t * 2) * 0.08;

        // Pet gentle rotation
        petBody.rotation.y = Math.sin(t * 0.5) * 0.2;

        // Ball roll
        ball.position.x = 0.8 + Math.sin(t * 0.8) * 0.3;
        ball.rotation.z = t * 2;

        // Floating particles
        for (const p of particles) {
          const ud = p.userData as { baseY: number; speed: number; offset: number };
          p.position.y = ud.baseY + Math.sin(t * ud.speed + ud.offset) * 0.3;
          p.rotation.y = t * 0.5;
        }

        // Gentle camera sway
        camera.position.x = Math.sin(t * 0.15) * 0.3;

        if (renderer) renderer.render(scene, camera);
      }

      animate();
    })();

    return () => {
      cleanup = true;
      if (animationId) cancelAnimationFrame(animationId);
      
      // Remove WebGL context event listeners
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      }
      
      // Dispose of WebGL renderer and release context
      if (renderer) {
        try {
          renderer.dispose();
          renderer.forceContextLoss();
        } catch (e) {
          console.warn('[HomeView] Error disposing renderer:', e);
        }
        renderer = null;
      }
      
      // Remove canvas from DOM
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvas = null;
      
      // Clear scene reference
      scene = null;
    };
  }, [pet.elementalType, pet.equippedOrdinal, pet.avatarId]);

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Home Header */}
      <div className="bg-[#1a1a2e] rounded-2xl p-6 mb-4 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {currentTheme.emoji} {pet.name}'s Home
            </h2>
            <p className="text-sm text-gray-400">{currentTheme.name}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl">{getStageEmoji(pet.stage)}</div>
            <div className="text-xs text-gray-400">{getMoodEmoji(pet.mood)} {pet.mood}</div>
          </div>
        </div>

        {/* 3D Kawaii Home Scene */}
        <div className="relative rounded-xl overflow-hidden border border-gray-700">
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: '280px' }}
          />
          {/* Health overlay */}
          <div className="absolute top-2 right-2 bg-black/50 rounded-full px-2 py-1 text-xs text-white">
            ❤️ {overallHealth}%
          </div>
          <div className="absolute bottom-2 left-2 bg-black/50 rounded-full px-2 py-1 text-xs text-gray-300">
            🎮 3D Home
          </div>
        </div>
      </div>

      {/* 🌐 Enter RP1 World — Big CTA */}
      <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-2xl p-5 mb-4 border border-indigo-500/30">
        <h3 className="text-lg font-bold text-white mb-2">🌐 RP1 Spatial Fabric</h3>
        <p className="text-sm text-gray-300 mb-3">
          Visit your pet's home in the RP1 metaverse! Walk around in 3D, meet other pets, and explore the spatial fabric.
        </p>
        <div className="flex gap-2">
          <a
            href={RP1_CONFIG.fabricUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 px-4 rounded-xl text-center transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/25"
          >
            🚀 Enter RP1 World
          </a>
          <a
            href={RP1_CONFIG.petsPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-semibold py-3 px-4 rounded-xl text-center transition-all border border-purple-500/30"
          >
            🐾 Portal
          </a>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleCheckMSF}
            disabled={checking}
            className="text-xs text-gray-400 hover:text-gray-300 underline"
          >
            {checking ? '⏳ Checking...' : '🔍 Check MSF Service'}
          </button>
          {msfOnline !== null && (
            <span className={`text-xs ${msfOnline ? 'text-green-400' : 'text-yellow-400'}`}>
              {msfOnline ? '✅ MSF Online' : '⚠️ MSF Offline'}
            </span>
          )}
          <button
            onClick={handleQuickSync}
            disabled={quickSyncing || !wallet.connected}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline ml-auto"
          >
            {quickSyncing ? '📡 Syncing...' : '⚡ Quick Sync'}
          </button>
          {quickSyncResult && (
            <span className={`text-xs ${quickSyncResult === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {quickSyncResult === 'success' ? '✅' : '❌'}
            </span>
          )}
        </div>
        {/* Push Bitcoin Assets to RP1 */}
        <div className="mt-3 space-y-2">
          <button
            onClick={async () => {
              setPushing(true);
              setPushResult(null);
              try {
                const sceneJSON = generateSceneJSON(pet, wallet.inscriptions, {
                  includeImages: true,
                  home: home,
                });
                const pushed = await pushSceneJSON(sceneJSON);
                if (pushed) {
                  setPushResult('success');
                } else {
                  // MSF offline or failed — auto-copy to clipboard
                  const copied = await copySceneJSONToClipboard(sceneJSON);
                  setPushResult(copied ? 'copied' : 'error');
                }
              } catch {
                // Timeout or network error — try clipboard
                try {
                  const sceneJSON = generateSceneJSON(pet, wallet.inscriptions, {
                    includeImages: true,
                    home: home,
                  });
                  const copied = await copySceneJSONToClipboard(sceneJSON);
                  setPushResult(copied ? 'copied' : 'error');
                } catch {
                  setPushResult('error');
                }
              }
              setPushing(false);
              setTimeout(() => setPushResult(null), 8000);
            }}
            disabled={pushing}
            className={`w-full font-semibold py-3 rounded-xl transition-all text-sm ${
              pushResult === 'success'
                ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                : pushResult === 'copied'
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                : pushResult === 'error'
                ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600'
            }`}
          >
            {pushing ? '📡 Checking MSF & pushing... (max 13s)' :
             pushResult === 'success' ? '✅ Scene Updated in RP1!' :
             pushResult === 'copied' ? '📋 MSF offline — Scene JSON Copied! Paste in Scene Assembler' :
             pushResult === 'error' ? '❌ Push Failed — Try copying manually' :
             `🌐 Push All Bitcoin Assets to RP1 (${wallet.inscriptions.length} items)`}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => downloadPetGLB(pet)}
              className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold py-2 px-3 rounded-lg border border-emerald-500/30 transition-all"
            >
              📦 Export .GLB
            </button>
            <a
              href={`${RP1_CONFIG.msfServiceUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold py-2 px-3 rounded-lg border border-amber-500/30 transition-all text-center"
            >
              🛠️ Scene Assembler
            </a>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Push your Bitcoin wallet's 3D ordinals directly into RP1 — no re-publishing needed!
        </p>
        <div className="mt-1 text-xs text-gray-500">
          📍 Portland, OR · CID: {RP1_CONFIG.startCid} · {RP1_CONFIG.lat.toFixed(4)}°N, {Math.abs(RP1_CONFIG.lon).toFixed(4)}°W
        </div>
      </div>

       {/* Theme Selector */}
       <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4 border border-gray-800">
         <h3 className="text-sm font-semibold text-gray-300 mb-3">🎨 Home Theme</h3>
         <div className="grid grid-cols-5 gap-2">
           {HOME_THEMES.map((theme) => {
             const unlocked = pet.level >= theme.unlockLevel;
             const active = home.theme === theme.id;
             return (
               <button
                 key={theme.id}
                 onClick={() => handleThemeChange(theme.id)}
                 disabled={!unlocked}
                 className={`p-2 rounded-lg text-center transition-all ${
                   active
                     ? 'bg-indigo-500/20 border border-indigo-500'
                     : unlocked
                     ? 'bg-[#0f0f23] border border-gray-700 hover:border-gray-500'
                     : 'bg-[#0f0f23] border border-gray-800 opacity-40'
                 }`}
               >
                 <div className="text-xl">{unlocked ? theme.emoji : '🔒'}</div>
                 <div className="text-xs text-gray-400 mt-1">{theme.name}</div>
                 {!unlocked && (
                   <div className="text-xs text-gray-600">Lv.{theme.unlockLevel}</div>
                 )}
               </button>
             );
           })}
         </div>
       </div>

       {/* New Theme Unlocked Notification */}
       {newThemeUnlocked && (
         <div className="mt-4 p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl border border-indigo-300/50">
           <div className="flex items-center justify-between mb-3">
             <h3 className="text-lg font-bold text-white">
               🎉 New Theme Unlocked!
             </h3>
             <button
               onClick={() => setNewThemeUnlocked(null)}
               className="text-white hover:text-gray-200 text-xs"
             >
               ✕
             </button>
           </div>
           <div className="text-center">
             <div className="text-6xl mb-2">{newThemeUnlocked.emoji}</div>
             <p className="text-xl font-bold text-white">
               {newThemeUnlocked.name}
             </p>
             <p className="text-sm text-gray-200">
               Unlocked at level {newThemeUnlocked.unlockLevel}
             </p>
             <button
               onClick={() => {
                 handleThemeChange(newThemeUnlocked.id);
                 setNewThemeUnlocked(null);
               }}
               className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg"
             >
               Use This Theme Now
               {newThemeUnlocked.id === home.theme ? ' (Already Active)' : ''}
             </button>
           </div>
         </div>
       )}

      {/* Guestbook */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">📖 Guestbook</h3>
        {home.guestbook.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No visitors yet. Enter the RP1 world to meet other pet owners!
          </p>
        ) : (
          <div className="space-y-2">
            {home.guestbook.slice(-5).reverse().map((entry, i) => (
              <div key={i} className="bg-[#0f0f23] rounded-lg p-2 text-sm">
                <span className="text-indigo-400">{entry.visitor.slice(0, 8)}...</span>
                <span className="text-gray-400"> — {entry.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pet QR Code */}
      {identity && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">📱 Pet QR Code</h3>
          <p className="text-xs text-gray-500 mb-3">
            Share this QR code with friends so they can add {pet.name} to their roster
          </p>
          <div className="flex justify-center">
            <QRCodeGenerator npub={identity.npub} petName={pet.name} size={180} />
          </div>
        </div>
      )}

      {/* OSA Avatar Picker */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300">🎭 Change Pet Avatar</h3>
          <button
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline"
          >
            {showAvatarPicker ? 'Close' : 'Browse OSA Gallery'}
          </button>
        </div>
        {showAvatarPicker ? (
          <AvatarPicker onSelect={handleAvatarSelect} />
        ) : (
          <p className="text-xs text-gray-500">
            Browse 4260+ free VRM avatars from the Open Source Avatars Gallery.
            <br />
            Note: Bitcoin ordinal 3D models take priority when equipped.
          </p>
        )}
      </div>

      {/* Nostr Identity */}
      {identity && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">📡 Nostr Identity</h3>
          <div className="text-xs text-gray-500 font-mono break-all">
            {identity.npub}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Your pet state is stored on Nostr relays. You own your data!
          </p>
        </div>
      )}
    </div>
  );
}
