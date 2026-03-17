# FabricPet Critical Bug Fixes Plan

## 🐛 Issues Identified from Testing

### 1. WebGL Race Condition (PC Chrome) - CRITICAL
**Symptom**: White screen when changing avatars, error "Cannot read properties of null (reading 'precision')"

**Root Cause**: HomeView.tsx reuses the same canvas element across effect invocations. When `pet.avatarId` changes:
1. Old effect cleanup runs `renderer.forceContextLoss()` → invalidates WebGL context
2. New effect creates new WebGLRenderer on SAME canvas
3. Old renderer's forceContextLoss() destroys context that new renderer is trying to use
4. New renderer's WebGL context becomes null
5. Three.js crashes accessing `gl.precision` on null context

**Why Camera AR Works**: ARView.tsx creates a NEW canvas element each time (line 805), giving each renderer its own isolated WebGL context. HomeView reuses the same canvas ref.

**Fix Required**: Create fresh canvas element instead of reusing canvasRef.current

### 2. Battle Mode Not Functional - CRITICAL
**Symptom**: Battle UI shows but moves don't work, avatar doesn't render

**Root Cause**: The `onMoveSelect` callback in ARView.tsx only logs to console:
```typescript
onMoveSelect={(moveId) => {
  console.log('[AR] Move selected:', moveId);
  // In a real implementation, this would send the move to the battle engine
}}
```

**Fix Required**:
- Connect move selection to `executeTurn` function from BattleEngine
- Update battle state when moves are selected
- Render pet avatar in battle mode

### 3. Xverse Browser WebXR Limitation - DOCUMENTATION
**Symptom**: No WebXR option in Xverse browser

**Root Cause**: Xverse is a crypto wallet browser that doesn't expose `navigator.xr` API. This is a known limitation.

**Fix Required**: 
- Add informative message for Xverse users
- Suggest using Chrome or Meta Quest Browser for WebXR

### 4. Avatar Selection on Mobile Works After Refresh
**Symptom**: Avatar selection shows wrong avatar initially, but correct after refresh

**Root Cause**: Same WebGL race condition as #1, but less severe on mobile due to different GPU context handling

## 📋 Implementation Plan

### Phase 1: Fix WebGL Race Condition (HomeView.tsx)
1. Create fresh canvas element instead of reusing canvasRef.current
2. Add WebGL context loss/restoration handling
3. Add proper canvas cleanup (remove from DOM)
4. Add early exit checks after async operations
5. Check renderer validity before rendering

### Phase 2: Fix Battle Mode (ARView.tsx & ARBattleVisualizer.tsx)
1. Connect `onMoveSelect` to `executeTurn` function
2. Update battle state when moves are selected
3. Implement opponent AI for turn resolution
4. Render pet avatar in battle mode
5. Add battle start/end handlers

### Phase 3: Improve WebXR Detection (ARView.tsx)
1. Check for both immersive-ar and immersive-vr
2. Add informative messages for Xverse users
3. Show appropriate UI based on detected capabilities

### Phase 4: Add Avatar Persistence (HomeView.tsx)
1. Ensure avatarId is saved to pet state
2. Refresh 3D scene when avatar changes
3. Show loading indicator during VRM model fetch

## 📁 Files to Modify

| File | Changes |
|------|---------|
| `src/components/HomeView.tsx` | Fix WebGL race condition, add canvas creation |
| `src/components/ARView.tsx` | Connect battle moves, improve WebXR detection |
| `src/battle/ARBattleVisualizer.tsx` | Add pet avatar rendering, connect to battle state |

## 🎯 Success Criteria

1. **Avatar Selection**: Works on PC Chrome without white screen
2. **Battle Mode**: Moves actually affect HP, avatar shows in battle
3. **WebXR**: Button shows on supported browsers with appropriate messaging
4. **Camera AR**: Continues to work as before

---
*Priority: Critical - Fixes user-facing functionality*

*Note: The user also indicated interest in holoball-arena integration and Xverse browser limitations. These are noted as future enhancements.*
