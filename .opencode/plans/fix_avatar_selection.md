# Fix Plan: Avatar Selection Integration

## Problem Analysis

The AvatarPicker component successfully displays and allows selection of avatars, but selecting an avatar does not actually change the pet's model. This is because:

1. **handleAvatarSelect** in HomeView.tsx only shows a notification and closes the picker
2. **No state update** - the pet's `avatarId` field is never updated
3. **No model loading** - even if `avatarId` is set, the 3D scene doesn't load the VRM model
4. **No persistence** - the selection isn't saved to localStorage or Nostr

## Root Cause

Looking at the code:
- `AvatarPicker.tsx` calls `onSelect(avatar)` when an avatar is clicked
- `HomeView.tsx` receives this in `handleAvatarSelect` but only shows a notification
- The `Pet` interface has an `avatarId` field that could store the selected avatar ID
- The 3D scene only creates a sphere pet and loads ordinals - it doesn't check `avatarId`

## Solution

### Phase 1: Update Avatar Selection Handler
**File:** `src/components/HomeView.tsx`

Update `handleAvatarSelect` to:
1. Update pet state with `avatarId`
2. Save to localStorage
3. Trigger VRM model loading in 3D scene

### Phase 2: Load VRM Model in HomeView 3D Scene
**File:** `src/components/HomeView.tsx`

Modify the 3D scene useEffect to:
1. Check if `pet.avatarId` is set
2. Fetch VRM model URL from OSA Gallery using `pet.avatarId`
3. Load VRM model using `loadVRMModel` from AvatarLoader
4. Replace sphere pet with VRM model
5. Handle fallback to sphere if VRM fails to load

### Phase 3: Load VRM Model in ARView
**File:** `src/components/ARView.tsx`

Modify the pet initialization in ARView to:
1. Check if `pet.avatarId` is set
2. Fetch and load VRM model if available
3. Fall back to sphere or ordinal if VRM fails

### Phase 4: Persistence
**File:** `src/store/useStore.ts` or `src/store/localStorage.ts`

1. Save `avatarId` when pet state is saved
2. Load `avatarId` when pet state is restored
3. Ensure `avatarId` is included in pet state persistence

## Implementation Details

### 1. Update Avatar Selection in HomeView.tsx

```typescript
const handleAvatarSelect = async (avatar: OSAAvatar) => {
  if (!pet) return;
  
  try {
    // Update pet state with avatarId
    const updatedPet = { ...pet, avatarId: avatar.id };
    setPet(updatedPet);
    
    // Save to localStorage for persistence
    saveLocalPet(updatedPet);
    
    // Show success notification
    setNotification({ message: `Avatar set: ${avatar.name}`, emoji: '🎭' });
    setShowAvatarPicker(false);
    
    // Trigger 3D scene refresh (handled by useEffect dependency on pet)
  } catch (error) {
    console.error('[HomeView] Failed to set avatar:', error);
    setNotification({ message: 'Failed to set avatar', emoji: '❌' });
  }
  
  setTimeout(() => setNotification(null), 2000);
};
```

### 2. Load VRM Model in HomeView 3D Scene

```typescript
// Inside the 3D scene useEffect, after creating the sphere pet:
let petMesh: THREE.Object3D = petBody;

// Load VRM model if avatarId is set
if (pet.avatarId) {
  try {
    // Fetch avatar from OSA Gallery
    const avatar = await getAvatarById(pet.avatarId);
    if (avatar && avatar.modelFileUrl) {
      // Load VRM model
      const vrmModel = await loadVRMModel(avatar.modelFileUrl, scene);
      if (vrmModel && vrmModel.scene) {
        // Replace sphere with VRM model
        scene.remove(petBody);
        petMesh = vrmModel.scene;
        petMesh.position.set(0, 0, 0); // Adjust position as needed
        scene.add(petMesh);
      }
    }
  } catch (error) {
    console.warn('[HomeView] Failed to load VRM model, using sphere:', error);
    // Continue with sphere pet
  }
}
```

### 3. Update Local Storage Persistence

**File:** `src/store/localStorage.ts`

Ensure `avatarId` is included when saving/loading pet state:

```typescript
// In saveLocalPet function - ensure avatarId is saved
export function saveLocalPet(pet: Pet): void {
  // ... existing code
  const data = {
    pet: {
      ...pet,
      avatarId: pet.avatarId || null, // Ensure avatarId is included
    },
    timestamp: Date.now(),
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}
```

## Testing Plan

1. **Test Avatar Selection**: 
   - Select avatar in HomeView
   - Verify `pet.avatarId` is updated in store
   - Verify notification shows success

2. **Test VRM Loading**:
   - Select a VRM avatar
   - Verify 3D model loads in HomeView scene
   - Verify fallback to sphere if VRM fails

3. **Test Persistence**:
   - Select avatar and refresh page
   - Verify avatar selection is preserved
   - Verify 3D model loads correctly on refresh

4. **Test AR Mode**:
   - Equip VRM avatar in HomeView
   - Switch to AR mode
   - Verify VRM model appears in AR instead of sphere

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/HomeView.tsx` | Update handleAvatarSelect, modify 3D scene to load VRM |
| `src/components/ARView.tsx` | Add VRM model loading support |
| `src/avatar/AvatarLoader.ts` | Add getAvatarById function (already exists) |
| `src/store/localStorage.ts` | Ensure avatarId persistence |

## Success Criteria

1. Selecting an avatar in HomeView updates pet's avatarId
2. 3D scene in HomeView displays selected VRM model
3. Selection persists across page refreshes
4. AR mode also displays selected VRM model
5. Fallback to sphere if VRM loading fails

---
*Plan created for fixing avatar selection integration*
