# FabricPet Phase 2 Plan: WebXR Fixes, Real-time Sharing, Battles & Theme Export

## 📊 Issues Identified from Testing

### Issue 1: WebXR Mode Not Loading VRM Models
**Root Cause**: `startWebXR` function in `ARView.tsx` only creates a simple sphere pet - doesn't check `pet.avatarId` or `pet.equippedOrdinal`

**Evidence**:
- Camera AR mode DOES load VRM models (lines 802-947)
- HomeView DOES load VRM models (lines 269-291)
- WebXR mode does NOT load VRM models (lines 138-151 - only sphere creation)

**Fix Required**: Add VRM loading logic to `startWebXR` similar to HomeView and camera AR mode

### Issue 2: Home Themes Not Exporting to RP1
**Root Cause**: `homeToMVMFModel` function exists but isn't being called when pushing to RP1

**Current State**:
- `MVMFHomeModel` interface exists with theme field
- `homeToMVMFModel` function exists (lines 84-99 in MVMFBridge.ts)
- `generateSceneJSON` doesn't include home theme data

**Fix Required**: Include home theme data in scene JSON generation

### Issue 3: Real-time Sharing Not Implemented
**User Request**: "Share in realtime with someone close by or in the same fabric"
**Preferred Method**: Both GPS and fabric-based discovery

**Implementation Needed**:
1. GPS-based proximity detection
2. Nostr-based state broadcasting
3. RP1 fabric-based presence detection

## 🎯 Implementation Plan

### Phase 1: Fix WebXR VRM Model Loading
**File**: `src/components/ARView.tsx` - `startWebXR` function

**Changes**:
1. After creating base scene, check for `pet.avatarId`
2. Load VRM model using `getAvatarById` and `loadVRMModel`
3. Replace sphere pet with VRM model
4. Handle `pet.equippedOrdinal` for 3D model loading
5. Add fallback to default kitten VRM

**Code Structure**:
```typescript
// In startWebXR function, after scene setup:
if (pet?.avatarId && !pet?.equippedOrdinal) {
  const avatar = await getAvatarById(pet.avatarId);
  if (avatar?.modelFileUrl) {
    const vrm = await loadVRMModel(avatar.modelFileUrl, scene);
    if (vrm?.scene) {
      // Hide sphere, show VRM model
      petMesh.visible = false;
      vrm.scene.position.set(0, 0.3, -1);
      scene.add(vrm.scene);
    }
  }
}
```

### Phase 2: Home Theme Export to RP1
**Files**: `src/rp1/SceneJSONGenerator.ts`, `src/rp1/MVMFBridge.ts`

**Changes**:
1. Add home theme data to scene JSON generation
2. Include theme colors and furniture in scene export
3. Add visual representation of home theme in RP1 scene

**Implementation**:
```typescript
// In generateSceneJSON function:
if (home) {
  children.push({
    sName: `${pet.name}'s Home (${home.theme})`,
    pTransform: {
      aPosition: [petPosition[0], 0, petPosition[2]],
      aRotation: [0, 0, 0, 1],
      aScale: [sceneSize, 0.1, sceneSize],
    },
    aBound: [sceneSize, 0.1, sceneSize],
    aChildren: [{
      sName: `Theme: ${home.theme}`,
      pResource: { sReference: `fabricpet://theme/${home.theme}` },
      // ... theme visual representation
    }]
  });
}
```

### Phase 3: Real-time Sharing Implementation
**User Request**: Both GPS and fabric-based discovery

**Files**: New `src/rp1/RealtimeSharing.ts`, `src/components/SocialView.tsx`

**Architecture**:
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GPS Location  │    │   Nostr Relays  │    │  RP1 Fabric     │
│   (Device)      │◄──►│   (Broadcast)   │◄──►│  (Presence)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Real-time Sharing Service                         │
│  - Broadcast pet position/state to Nostr                       │
│  - Subscribe to nearby pet updates                             │
│  - Sync with RP1 fabric via MVMF protocol                      │
│  - Handle discovery and presence                               │
└─────────────────────────────────────────────────────────────────┘
```

**Features**:
1. **GPS Proximity Detection**:
   - Share GPS coordinates via Nostr (opt-in)
   - Discover pets within configurable radius (100m default)
   - Visual indicator for nearby pets

2. **Nostr Broadcasting**:
   - Publish pet position to Nostr relays (kind 30078)
   - Subscribe to nearby pet updates
   - Real-time state synchronization

3. **RP1 Fabric Integration**:
   - Detect when users are in same RP1 fabric (cid)
   - Show pets of users in same fabric
   - Enable direct interaction between co-located pets

**Data Structure**:
```typescript
interface PetPosition {
  petId: string;
  pubkey: string;
  lat: number;
  lng: number;
  fabricCid?: number;
  timestamp: number;
  petState: {
    name: string;
    level: number;
    stage: string;
  };
}
```

### Phase 4: Turn-based Battle Support in AR/XR
**User Request**: Turn-based with visuals in AR/WebXR modes

**Files**: New `src/battle/ARBattleVisualizer.tsx`, modify `src/components/ARView.tsx`

**Features**:
1. **Visual Battle Effects**:
   - Attack animations (projectiles, melee swings)
   - Damage numbers floating up
   - Health bar overlay
   - Elemental effects based on pet type

2. **Turn-based Interface**:
   - Move selection UI overlay
   - Turn indicator
   - Battle log
   - Win/loss display

3. **XR Integration**:
   - Battle arena overlay in AR space
   - 3D battle effects
   - Spatial audio for attacks
   - Hand tracking for move selection

### Phase 5: WebXR Improvements
**Current Issues**:
- Black screen on some devices
- Poor performance on mobile
- Limited interaction methods

**Improvements**:
1. **Performance Optimization**:
   - Reduce polygon count for XR rendering
   - Implement level-of-detail (LOD) system
   - Add frame rate throttling
   - Optimize shader complexity

2. **Better Interaction**:
   - Hand tracking for pet interaction
   - Gaze-based selection
   - Voice commands for battle
   - Gesture recognition

3. **Cross-platform Compatibility**:
   - Fallback for browsers without WebXR
   - Progressive enhancement approach
   - Better error messages for unsupported devices

## 📁 Implementation Files

| File | Changes |
|------|---------|
| `src/components/ARView.tsx` | Fix WebXR VRM loading, add battle UI |
| `src/rp1/SceneJSONGenerator.ts` | Add home theme data to scene export |
| `src/rp1/MVMFBridge.ts` | Update scene push with theme data |
| `src/rp1/RealtimeSharing.ts` | New: Real-time sharing service |
| `src/components/SocialView.tsx` | Add real-time pet discovery |
| `src/battle/ARBattleVisualizer.tsx` | New: Battle effects in AR/XR |
| `src/xr/XRInteractions.ts` | Add battle interaction support |

## 🎯 Success Criteria

1. **WebXR VRM Loading**: Selected VRM avatar appears in WebXR mode
2. **Theme Export**: Home themes visible in RP1 world scene
3. **Real-time Sharing**: Users see nearby pets automatically
4. **AR Battles**: Turn-based battles with visual effects in AR/XR
5. **Performance**: Smooth 30+ fps in WebXR on supported devices

## 🚀 Implementation Priority

### High Priority (Week 1)
1. Fix WebXR VRM model loading
2. Implement real-time sharing foundation (Nostr broadcasting)

### Medium Priority (Week 2)
1. Home theme export to RP1
2. Basic battle visualization in AR/XR
3. GPS proximity detection

### Low Priority (Week 3+)
1. Advanced battle effects
2. WebXR performance optimization
3. Voice command integration

---
*Phase 2 Plan - FabricPet Enhancement*
