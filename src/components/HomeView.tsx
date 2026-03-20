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

// Module-level storage for theme meshes (so animation loop can access them)
let themeMeshes: any[] = [];
let themeParticles: any[] = [];
let roomBall: any = null;

function clearThemeMeshes(scene: any) {
  themeMeshes.forEach(m => { try { scene.remove(m); } catch {} });
  themeMeshes = [];
  themeParticles = [];
}

function buildThemeEnvironment(scene: any, themeId: string, THREE: typeof import('three')) {
  clearThemeMeshes(scene);

  const tag = (mesh: any) => { mesh.userData.themeMesh = true; themeMeshes.push(mesh); return mesh; };
  const tagParticle = (mesh: any) => { mesh.userData.themeMesh = true; themeParticles.push(mesh); themeMeshes.push(mesh); return mesh; };

  if (themeId === 'garden') {
    // Grass floor
    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x7cba3d, roughness: 0.9 });
    const floor = tag(new THREE.Mesh(floorGeo, floorMat));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Hedge back wall
    for (let i = 0; i < 6; i++) {
      const hGeo = new THREE.BoxGeometry(0.8, 1.2 + Math.random() * 0.4, 0.3);
      const hMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
      const hedge = tag(new THREE.Mesh(hGeo, hMat));
      hedge.position.set(-2.4 + i * 0.9, 0.6, -2.8);
      scene.add(hedge);
    }

    // Fence side walls
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 4; i++) {
        const pGeo = new THREE.BoxGeometry(1.2, 0.6, 0.1);
        const pMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 });
        const plank = tag(new THREE.Mesh(pGeo, pMat));
        plank.position.set(side * 2.9, 0.3, -1.5 + i * 1.0);
        scene.add(plank);
      }
    }

    // Flowers
    const flowerColors = [0xff69b4, 0xffd700, 0xff4500, 0xffa500, 0x9932cc];
    const flowerPositions = [[-1.5, -1.5], [1.2, -0.8], [-0.5, 1.5], [2.0, 1.0], [-2.0, 0.5]];
    flowerPositions.forEach(([fx, fz], i) => {
      const geo = new THREE.SphereGeometry(0.12, 8, 8);
      const mat = new THREE.MeshStandardMaterial({ color: flowerColors[i], roughness: 0.5 });
      const flower = tag(new THREE.Mesh(geo, mat));
      flower.position.set(fx, 0.12, fz);
      scene.add(flower);
      // Stem
      const sGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4);
      const sMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
      const stem = tag(new THREE.Mesh(sGeo, sMat));
      stem.position.set(fx, 0.05, fz);
      scene.add(stem);
    });

    // Bushes
    [[-2.2, -1.0], [2.2, 1.5]].forEach(([bx, bz]) => {
      const geo = new THREE.SphereGeometry(0.35, 8, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.8 });
      const bush = tag(new THREE.Mesh(geo, mat));
      bush.position.set(bx, 0.35, bz);
      scene.add(bush);
    });

    // Butterflies
    const butterflyColors = [0xff69b4, 0xffd700, 0x87ceeb];
    butterflyColors.forEach((color, i) => {
      const geo = new THREE.SphereGeometry(0.05, 6, 6);
      geo.scale(1.5, 1, 0.3);
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, transparent: true, opacity: 0.9 });
      const butterfly = tagParticle(new THREE.Mesh(geo, mat));
      butterfly.position.set(-1 + i * 1.0, 1.2 + i * 0.3, -0.5 + i * 0.3);
      butterfly.userData.baseY = butterfly.position.y;
      butterfly.userData.baseX = butterfly.position.x;
      butterfly.userData.baseZ = butterfly.position.z;
      butterfly.userData.speed = 0.4 + Math.random() * 0.3;
      butterfly.userData.phase = Math.random() * Math.PI * 2;
      butterfly.userData.isButterfly = true;
      scene.add(butterfly);
    });

  } else if (themeId === 'beach') {
    // Sand floor
    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.95 });
    const floor = tag(new THREE.Mesh(floorGeo, floorMat));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Sky backdrop
    const skyGeo = new THREE.PlaneGeometry(7, 4);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
    const sky = tag(new THREE.Mesh(skyGeo, skyMat));
    sky.position.set(0, 2, -3.5);
    scene.add(sky);

    // Sun
    const sunGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const sunMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 1 });
    const sun = tag(new THREE.Mesh(sunGeo, sunMat));
    sun.position.set(2.2, 2.5, -3.0);
    scene.add(sun);

    // Palm trees
    [[-2.3, -1.5], [2.3, 0.5]].forEach(([px, pz]) => {
      const tGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.2, 8);
      const tMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
      const trunk = tag(new THREE.Mesh(tGeo, tMat));
      trunk.position.set(px, 0.6, pz);
      scene.add(trunk);
      const fGeo = new THREE.SphereGeometry(0.4, 8, 8);
      fGeo.scale(1, 0.4, 1);
      const fMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
      const fronds = tag(new THREE.Mesh(fGeo, fMat));
      fronds.position.set(px, 1.4, pz);
      scene.add(fronds);
    });

    // Umbrella
    const uPoleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
    const uPoleMat = new THREE.MeshStandardMaterial({ color: 0xd4a574 });
    const uPole = tag(new THREE.Mesh(uPoleGeo, uPoleMat));
    uPole.position.set(-1.5, 0.6, -1.5);
    scene.add(uPole);
    const uTopGeo = new THREE.ConeGeometry(0.6, 0.3, 8);
    const uTopMat = new THREE.MeshStandardMaterial({ color: 0xff4500 });
    const uTop = tag(new THREE.Mesh(uTopGeo, uTopMat));
    uTop.position.set(-1.5, 1.25, -1.5);
    scene.add(uTop);

    // Shells
    [[0.5, 1.8], [1.0, 2.2], [-0.5, 2.0], [1.5, 1.5]].forEach(([sx, sz]) => {
      const sGeo = new THREE.TorusGeometry(0.08, 0.03, 8, 12);
      const sMat = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.6 });
      const shell = tag(new THREE.Mesh(sGeo, sMat));
      shell.rotation.x = Math.PI / 2;
      shell.position.set(sx, 0.03, sz);
      scene.add(shell);
    });

    // Starfish
    const sfGeo = new THREE.OctahedronGeometry(0.12);
    const sfMat = new THREE.MeshStandardMaterial({ color: 0xff6347, roughness: 0.6 });
    const starfish = tag(new THREE.Mesh(sfGeo, sfMat));
    starfish.rotation.z = Math.PI / 4;
    starfish.position.set(-1.0, 0.06, 1.8);
    scene.add(starfish);

  } else if (themeId === 'castle') {
    // Stone floor
    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.95 });
    const floor = tag(new THREE.Mesh(floorGeo, floorMat));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Back wall with battlements
    for (let i = 0; i < 7; i++) {
      const bGeo = new THREE.BoxGeometry(0.7, 0.6, 0.3);
      const bMat = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 });
      const battlement = tag(new THREE.Mesh(bGeo, bMat));
      battlement.position.set(-2.1 + i * 0.7, 1.8, -2.8);
      scene.add(battlement);
    }
    const wGeo = new THREE.BoxGeometry(6, 1.5, 0.3);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 });
    const wall = tag(new THREE.Mesh(wGeo, wMat));
    wall.position.set(0, 0.75, -2.8);
    scene.add(wall);

    // Stone pillars
    [[-2.3, -1.0], [-2.3, 1.0], [2.3, -1.0], [2.3, 1.0]].forEach(([px, pz]) => {
      const pGeo = new THREE.CylinderGeometry(0.15, 0.18, 2.5, 8);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 });
      const pillar = tag(new THREE.Mesh(pGeo, pMat));
      pillar.position.set(px, 1.25, pz);
      scene.add(pillar);
    });

    // Throne
    const tSeatGeo = new THREE.BoxGeometry(0.8, 0.2, 0.6);
    const tMat = new THREE.MeshStandardMaterial({ color: 0x4a0080, roughness: 0.6 });
    const tSeat = tag(new THREE.Mesh(tSeatGeo, tMat));
    tSeat.position.set(-1.8, 0.4, -2.2);
    scene.add(tSeat);
    const tBackGeo = new THREE.BoxGeometry(0.8, 1.0, 0.1);
    const tBack = tag(new THREE.Mesh(tBackGeo, tMat));
    tBack.position.set(-1.8, 0.9, -2.45);
    scene.add(tBack);

    // Torches
    [[1.8, 0.8, -2.5], [1.8, 0.8, -1.5]].forEach(([tx, ty, tz]) => {
      const torchGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
      const torchMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
      const torch = tag(new THREE.Mesh(torchGeo, torchMat));
      torch.position.set(tx, ty, tz);
      scene.add(torch);
      const flameGeo = new THREE.SphereGeometry(0.08, 8, 8);
      flameGeo.scale(1, 1.5, 1);
      const flameMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 1, transparent: true, opacity: 0.9 });
      const flame = tag(new THREE.Mesh(flameGeo, flameMat));
      flame.position.set(tx, ty + 0.35, tz);
      flame.userData.isFlame = true;
      scene.add(flame);
    });

    // Treasure chest
    const chestGeo = new THREE.BoxGeometry(0.5, 0.35, 0.3);
    const chestMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 });
    const chest = tag(new THREE.Mesh(chestGeo, chestMat));
    chest.position.set(1.5, 0.175, 1.5);
    scene.add(chest);

    // Flag
    const flagPoleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6);
    const flagPole = tag(new THREE.Mesh(flagPoleGeo, new THREE.MeshStandardMaterial({ color: 0x696969 })));
    flagPole.position.set(-1.8, 1.5, -2.5);
    scene.add(flagPole);
    const flagGeo = new THREE.PlaneGeometry(0.4, 0.25);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.3 });
    const flag = tag(new THREE.Mesh(flagGeo, flagMat));
    flag.position.set(-1.6, 1.9, -2.5);
    scene.add(flag);

  } else if (themeId === 'space') {
    // Metal floor
    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.5 });
    const floor = tag(new THREE.Mesh(floorGeo, floorMat));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Space backdrop
    const spaceGeo = new THREE.PlaneGeometry(7, 4);
    const spaceMat = new THREE.MeshBasicMaterial({ color: 0x0a0a1a });
    const space = tag(new THREE.Mesh(spaceGeo, spaceMat));
    space.position.set(0, 2, -3.5);
    scene.add(space);

    // Twinkling stars backdrop
    for (let i = 0; i < 25; i++) {
      const sGeo = new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 4, 4);
      const sMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8, transparent: true, opacity: 0.5 + Math.random() * 0.5 });
      const star = tagParticle(new THREE.Mesh(sGeo, sMat));
      star.position.set((Math.random() - 0.5) * 6.5, Math.random() * 3.5 + 0.5, -3.4);
      star.userData.isTwinkleStar = true;
      star.userData.baseOpacity = 0.3 + Math.random() * 0.7;
      star.userData.twinkleSpeed = 0.5 + Math.random() * 2;
      star.userData.twinklePhase = Math.random() * Math.PI * 2;
      scene.add(star);
    }

    // Metal walls
    [[-3, 0], [3, 0]].forEach(([wx, wz]) => {
      const wallG = new THREE.BoxGeometry(0.1, 2.5, 6);
      const wallM = new THREE.MeshStandardMaterial({ color: 0x2a2a3e, roughness: 0.3, metalness: 0.5 });
      const wall = tag(new THREE.Mesh(wallG, wallM));
      wall.position.set(wx, 1.25, wz);
      scene.add(wall);
    });

    // Control panel
    const cpGeo = new THREE.BoxGeometry(0.8, 0.6, 0.1);
    const cpMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.5 });
    const cp = tag(new THREE.Mesh(cpGeo, cpMat));
    cp.position.set(-2.0, 0.8, -2.5);
    scene.add(cp);
    [0xff00ff, 0x00ffff, 0x00ff00, 0xffff00].forEach((color, i) => {
      const iGeo = new THREE.SphereGeometry(0.05, 6, 6);
      const iMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 });
      const ind = tag(new THREE.Mesh(iGeo, iMat));
      ind.position.set(-2.28 + (i % 2) * 0.25, 0.9 - Math.floor(i / 2) * 0.25, -2.44);
      scene.add(ind);
    });

    // Satellite dish
    const dGeo = new THREE.SphereGeometry(0.3, 8, 8);
    dGeo.scale(1, 0.4, 1);
    const dMat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.5, metalness: 0.6 });
    const dish = tag(new THREE.Mesh(dGeo, dMat));
    dish.position.set(2.0, 1.2, -2.2);
    scene.add(dish);
    const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
    const arm = tag(new THREE.Mesh(armGeo, dMat.clone()));
    arm.rotation.z = Math.PI / 4;
    arm.position.set(1.8, 1.0, -2.0);
    scene.add(arm);

    // Airlock door
    const doorGeo = new THREE.BoxGeometry(0.5, 0.8, 0.1);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4e, roughness: 0.3, metalness: 0.7 });
    const door = tag(new THREE.Mesh(doorGeo, doorMat));
    door.position.set(0, 0.4, -2.9);
    scene.add(door);
    [[0.1, 0.2, 0xff0000], [0.1, -0.2, 0x00ff00]].forEach(([dx, dy, color]) => {
      const lGeo = new THREE.SphereGeometry(0.05, 6, 6);
      const lMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 });
      const light = tag(new THREE.Mesh(lGeo, lMat));
      light.position.set(0.22 + dx, dy, -2.84);
      scene.add(light);
    });

    // Floating space stars
    for (let i = 0; i < 15; i++) {
      const sGeo = new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 4, 4);
      const sMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6, transparent: true, opacity: 0.7 });
      const star = tagParticle(new THREE.Mesh(sGeo, sMat));
      star.position.set((Math.random() - 0.5) * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 4);
      star.userData.baseY = star.position.y;
      star.userData.isTwinkleStar = true;
      star.userData.baseOpacity = 0.3 + Math.random() * 0.7;
      star.userData.twinkleSpeed = 0.5 + Math.random() * 2;
      star.userData.twinklePhase = Math.random() * Math.PI * 2;
      scene.add(star);
    }

  } else {
    // === Default: Cozy Room ===
    // Floor
    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xf5e6d3, roughness: 0.8 });
    const floor = tag(new THREE.Mesh(floorGeo, floorMat));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Back wall
    const wallGeo = new THREE.BoxGeometry(6, 3, 0.1);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xffe4e1, roughness: 0.9 });
    const backWall = tag(new THREE.Mesh(wallGeo, wallMat));
    backWall.position.set(0, 1.5, -3);
    scene.add(backWall);

    // Side walls
    const sideWallGeo = new THREE.BoxGeometry(0.1, 3, 6);
    const leftWall = tag(new THREE.Mesh(sideWallGeo, wallMat.clone()));
    leftWall.position.set(-3, 1.5, 0);
    ((leftWall.material as unknown as Record<string, unknown>).color as { set: (c: number) => void }).set(0xffd1dc);
    scene.add(leftWall);

    const rightWall = tag(new THREE.Mesh(sideWallGeo, wallMat.clone()));
    rightWall.position.set(3, 1.5, 0);
    ((rightWall.material as unknown as Record<string, unknown>).color as { set: (c: number) => void }).set(0xffd1dc);
    scene.add(rightWall);

    // Bed
    const bedGeo = new THREE.BoxGeometry(1.4, 0.3, 0.9, 4, 4, 4);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0xb19cd9, roughness: 0.6 });
    const bed = tag(new THREE.Mesh(bedGeo, bedMat));
    bed.position.set(-1.8, 0.15, -2);
    scene.add(bed);

    const pillowGeo = new THREE.SphereGeometry(0.25, 16, 16);
    pillowGeo.scale(1.2, 0.6, 1);
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffc0cb });
    const pillow = tag(new THREE.Mesh(pillowGeo, pillowMat));
    pillow.position.set(-1.8, 0.35, -2.2);
    scene.add(pillow);

    // Food bowl
    const bowlGeo = new THREE.CylinderGeometry(0.25, 0.18, 0.15, 16);
    const bowlMat = new THREE.MeshStandardMaterial({ color: 0xff9a9e, roughness: 0.4, metalness: 0.2 });
    const bowl = tag(new THREE.Mesh(bowlGeo, bowlMat));
    bowl.position.set(1.8, 0.075, -1.5);
    scene.add(bowl);

    const foodGeo = new THREE.SphereGeometry(0.18, 16, 16);
    foodGeo.scale(1, 0.3, 1);
    const foodMat = new THREE.MeshStandardMaterial({ color: 0xffa07a });
    const food = tag(new THREE.Mesh(foodGeo, foodMat));
    food.position.set(1.8, 0.15, -1.5);
    scene.add(food);

    // Water bowl
    const waterBowl = tag(new THREE.Mesh(bowlGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x87ceeb, roughness: 0.3, metalness: 0.3 })));
    waterBowl.position.set(2.2, 0.075, -1.0);
    scene.add(waterBowl);

    // Toy ball
    const ballGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.3 });
    roomBall = tag(new THREE.Mesh(ballGeo, ballMat));
    roomBall.position.set(0.8, 0.15, 0.5);
    scene.add(roomBall);

    // Plant
    const potGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8);
    const potMat = new THREE.MeshStandardMaterial({ color: 0xd4a574 });
    const pot = tag(new THREE.Mesh(potGeo, potMat));
    pot.position.set(-2.3, 0.15, 0.5);
    scene.add(pot);

    const leafGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x98d8a0 });
    const leaves = tag(new THREE.Mesh(leafGeo, leafMat));
    leaves.position.set(-2.3, 0.5, 0.5);
    scene.add(leaves);
  }
}

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
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;
    let cleanup = false;
    let renderer: any = null;
    let scene: any = null;
    let contextLost = false;

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

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    (async () => {
      const THREE = await import('three');

      scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
      camera.position.set(0, 2.5, 5);
      camera.lookAt(0, 0.5, 0);

      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      } catch (e) {
        console.error('[HomeView] WebGLRenderer failed to initialize:', e);
        return;
      }
      if (cleanup) return;

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

      // Build theme-specific environment (floor, walls, decorations)
      buildThemeEnvironment(scene, home.theme, THREE);

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
            const avatar = await getAvatarById(pet.avatarId);
            if (cleanup) return;
            if (avatar?.modelFileUrl) {
              const vrmModel = await loadVRMModel(avatar.modelFileUrl, scene);
              if (cleanup) return;
              if ((vrmModel as any)?.scene) {
                petBody.visible = false;
                const vrmScene = (vrmModel as any).scene;
                vrmScene.position.set(0, 0, 0);
                vrmScene.scale.set(0.5, 0.5, 0.5);
                scene.add(vrmScene);
                console.log('[HomeView] VRM model loaded successfully');
              }
            }
          } catch (error) {
            console.warn('[HomeView] Failed to load VRM model, using sphere:', error);
          }
        }

        // --- Load ordinal inscription as texture/model ---
        if (pet.equippedOrdinal) {
          try {
            const content = await fetchInscriptionContent(pet.equippedOrdinal);
            if (cleanup || !content) return;
            const category = categorizeContentType(content.contentType);
            if (category === 'image') {
              await applyImageTextureToMesh(content, petBody, THREE);
            } else if (category === '3d-model') {
              petBody.visible = false;
              await load3DModelFromContent(content, scene, THREE);
            }
          } catch (e) {
            console.warn('[HomeView] Ordinal load failed:', e);
          }
        }

        // --- Eyes ---
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

        // --- Blush cheeks ---
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

          petBody.position.y = 0.8 + Math.sin(t * 2) * 0.08;
          leftEye.position.y = 0.9 + Math.sin(t * 2) * 0.08;
          leftPupil.position.y = 0.9 + Math.sin(t * 2) * 0.08;
          rightEye.position.y = 0.9 + Math.sin(t * 2) * 0.08;
          rightPupil.position.y = 0.9 + Math.sin(t * 2) * 0.08;
          leftBlush.position.y = 0.78 + Math.sin(t * 2) * 0.08;
          rightBlush.position.y = 0.78 + Math.sin(t * 2) * 0.08;

          petBody.rotation.y = Math.sin(t * 0.5) * 0.2;
          if (roomBall) {
            roomBall.position.x = 0.8 + Math.sin(t * 0.8) * 0.3;
            roomBall.rotation.z = t * 2;
          }

          // Animate theme particles (butterflies, twinkling stars)
          for (const p of themeParticles) {
            if (p.userData.isButterfly) {
              p.position.x = p.userData.baseX + Math.sin(t * p.userData.speed + p.userData.phase) * 0.5;
              p.position.y = p.userData.baseY + Math.sin(t * p.userData.speed * 1.5 + p.userData.phase) * 0.3;
              p.rotation.y = t * 2;
            } else if (p.userData.isTwinkleStar) {
              const mat = p.material as any;
              if (mat?.opacity !== undefined) {
                mat.opacity = p.userData.baseOpacity * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * p.userData.twinkleSpeed + p.userData.twinklePhase)));
              }
            }
          }

          for (const p of particles) {
            const ud = p.userData as { baseY: number; speed: number; offset: number };
            p.position.y = ud.baseY + Math.sin(t * ud.speed + ud.offset) * 0.3;
            p.rotation.y = t * 0.5;
          }

          camera.position.x = Math.sin(t * 0.15) * 0.3;

          if (renderer) renderer.render(scene, camera);
        }

        animate();
      })().catch((e) => {
        console.error('[HomeView] initScene failed:', e);
      });

    return () => {
      cleanup = true;
      if (animationId) cancelAnimationFrame(animationId);

      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      if (renderer) {
        try {
          renderer.dispose();
          renderer.forceContextLoss();
        } catch (e) {
          console.warn('[HomeView] Error disposing renderer:', e);
        }
        renderer = null;
      }

      scene = null;
    };
  }, [pet.elementalType, pet.equippedOrdinal, pet.avatarId, home.theme]);

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
