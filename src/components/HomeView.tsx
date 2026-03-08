// ============================================
// Home View — Pet's spatial home environment
// ============================================

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { getStageEmoji, getMoodEmoji } from '../engine/PetStateMachine';
import { getOverallHealth } from '../engine/NeedsSystem';
import { HOME_THEMES, RP1_CONFIG } from '../utils/constants';
import { checkMSFHealth } from '../rp1/MVMFBridge';

export function HomeView() {
  const { pet, home, setHome, identity } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [msfOnline, setMsfOnline] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  if (!pet) return null;

  const currentTheme = HOME_THEMES.find(t => t.id === home.theme) || HOME_THEMES[0];
  const overallHealth = getOverallHealth(pet.needs);

  const handleThemeChange = (themeId: string) => {
    const theme = HOME_THEMES.find(t => t.id === themeId);
    if (theme && pet.level >= theme.unlockLevel) {
      setHome({ ...home, theme: themeId });
    }
  };

  const handleCheckMSF = async () => {
    setChecking(true);
    const online = await checkMSFHealth();
    setMsfOnline(online);
    setChecking(false);
  };

  // 3D Kawaii Home Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;
    let cleanup = false;

    (async () => {
      const THREE = await import('three');

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
      camera.position.set(0, 2.5, 5);
      camera.lookAt(0, 0.5, 0);

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
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

        renderer.render(scene, camera);
      }

      animate();
    })();

    return () => {
      cleanup = true;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [pet.elementalType]);

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
        </div>
        <div className="mt-2 text-xs text-gray-500">
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
