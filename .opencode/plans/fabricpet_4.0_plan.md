# FabricPet Enhancement Plan v4 - WebXR, RP1 Integration & UI Refresh

## 📊 Current State Analysis

### WebXR Status
- ✅ Works on Chrome Android (second test device)
- ❌ Xverse browser doesn't expose `navigator.xr` properly
- ❌ No interaction capabilities in current WebXR mode

### Camera AR Status
- ❌ Camera AR never worked properly
- Recommendation: Deprecate in favor of WebXR-only approach

### RP1 Integration Status
- ✅ Scene JSON generation works
- ✅ Deep link to RP1 works
- ❌ Manual publishing required (user wants automatic)
- ❌ No real-time sharing between users

### UI Theme Status
- Current: Green terminal theme (#00ff00)
- Requested: Cyan terminal theme (#00ffff)

## 🎯 Implementation Plan

### Phase 1: Fix Xverse Browser WebXR Detection

**Problem**: Xverse browser doesn't expose `navigator.xr`, so WebXR button doesn't show.

**Solution**: Add browser detection and graceful degradation:
```typescript
// Detect Xverse browser
const isXverse = /Xverse/i.test(navigator.userAgent);

// Show appropriate message for Xverse users
if (isXverse) {
  // WebXR not available in Xverse - show alternative
  // Use Camera AR as fallback or show RP1 browser link
}
```

**Files to modify**:
- `src/components/ARView.tsx` - Add Xverse detection
- Show informative message when WebXR unavailable
- Provide link to RP1 browser for avatar viewing

### Phase 2: Add Pet Interaction in WebXR Mode

**Current interactions** (from XRInteractions.ts):
- Hand tracking gesture recognition (wave, point, thumbs up, fist)
- Gaze interaction (pet follows user's look direction)  
- Ball throwing physics
- Spatial audio integration points

**Additional interactions to add**:
1. **Voice commands** - Use Web Speech API for voice commands
2. **Proximity reactions** - Pet reacts when user gets closer
3. **Hand gestures** - More refined gesture recognition
4. **Head tracking** - Pet follows user's head movement more naturally

**Implementation approach**:
- Extend XRInteractions.ts with new interaction types
- Add visual feedback for detected gestures
- Create pet response system with animations

### Phase 3: Open Avatar Protocol in RP1 Universe

**Current avatar system**:
- VRM support via `@pixiv/three-vrm`
- Open Source Avatars integration
- Default kitten VRM model

**RP1 integration approach**:
1. **Object injection** - Use MVMF protocol to inject avatar objects into RP1 fabric
2. **Scene persistence** - Save avatar state to Nostr, load on RP1 entry
3. **Real-time updates** - Use Nostr relays for live avatar position/state updates
4. **Proximity sharing** - Share avatar with nearby users automatically

**Technical implementation**:
- Convert VRM models to glTF for RP1 compatibility
- Use `pResource.sReference` for model URLs in Scene Assembler JSON
- Implement real-time position broadcasting via Nostr
- Add proximity detection for automatic sharing

### Phase 4: Real-Time Avatar Sharing

**User request**: "Share in realtime with someone close by or in the same fabric"

**Implementation approach**:
1. **Nostr position broadcasting** - Publish pet position/state to Nostr relays
2. **Proximity detection** - Subscribe to nearby avatars' position updates
3. **Automatic discovery** - Show nearby pets without manual sharing
4. **Battle invitations** - Send battle requests to nearby pets

**Technical details**:
- Use custom Nostr event kind (30078) for position updates
- Include GPS coordinates or RP1 spatial coordinates
- Implement subscription filters for nearby avatars
- Add visual indicators for discovered pets

### Phase 5: Cyan Terminal Theme

**Change from green to cyan**:
```css
:root {
  --terminal-green: #00ffff;      /* Cyan */
  --terminal-green-dim: #00cccc;  /* Darker cyan */
  --terminal-green-bright: #33ffff; /* Bright cyan */
}
```

**Files to update**:
- `src/index.css` - Update color variables
- `tailwind.config.js` - Update theme colors
- All components using green text/backgrounds

### Phase 6: Deprecate Camera AR Mode

**Reason**: Camera AR never worked properly, WebXR is the future.

**Actions**:
1. Remove Camera AR button from UI
2. Keep WebXR as primary AR experience
3. Show informative message for browsers without WebXR
4. Provide fallback to RP1 browser for avatar viewing

**Files to modify**:
- `src/components/ARView.tsx` - Remove Camera AR code
- Keep only WebXR functionality
- Add clear messaging for unsupported browsers

### Phase 7: OSA Gallery Avatar Picker Integration

**Goal**: Allow users to browse and select avatars from the Open Source Avatars Gallery (4260+ VRM avatars).

**OSA Gallery API**:
- Base URL: `https://raw.githubusercontent.com/ToxSam/open-source-avatars/main/data/`
- Projects list: `projects.json` (contains `avatar_data_file` for each collection)
- Avatar data: `{project.avatar_data_file}` (contains individual avatars with `model_file_url`)
- Format: VRM files hosted on Arweave/IPFS

**Integration approach**:
1. **New component**: `src/components/AvatarPicker.tsx` - Browse and preview avatars
2. **API integration**: Fetch from OSA Gallery API to get avatar list
3. **Preview system**: Show 3D previews of avatars before selection
4. **Direct VRM loading**: Load selected VRM as pet avatar
5. **Fallback system**: Use OSA avatars when no Bitcoin ordinal is equipped

**Implementation**:
```typescript
// Avatar Picker Component
const AvatarPicker = () => {
  const [collections, setCollections] = useState<OSACollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [avatars, setAvatars] = useState<OSAAvatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<OSAAvatar | null>(null);

  // Fetch collections on mount
  useEffect(() => {
    fetchCollections().then(setCollections);
  }, []);

  // Fetch avatars when collection selected
  useEffect(() => {
    if (selectedCollection) {
      fetchCollectionAvatars(selectedCollection).then(setAvatars);
    }
  }, [selectedCollection]);

  return (
    <div className="avatar-picker">
      {/* Collection selector */}
      {/* Avatar grid with previews */}
      {/* Apply button */}
    </div>
  );
};
```

**Files to create/modify**:
- `src/components/AvatarPicker.tsx` - New component for browsing avatars
- `src/avatar/AvatarLoader.ts` - Add OSA Gallery fetch functions
- `src/components/HomeView.tsx` - Add avatar picker access
- `src/components/PetView.tsx` - Show current avatar source

### Phase 8: Battle Feature Removal from AR Mode

**Issue**: Battle button still shows in AR mode despite previous fix.

**Solution**: Verify the fix was applied correctly and remove battle-related code from AR mode completely.

**Files to verify**:
- `src/components/ARView.tsx` - Remove battle button and related state

## 📁 Implementation Details

### WebXR Enhancement (`src/components/ARView.tsx`)
```typescript
// Add browser detection
const detectWebXRSupport = () => {
  const isXverse = /Xverse/i.test(navigator.userAgent);
  const isChrome = /Chrome/i.test(navigator.userAgent);
  
  if ('xr' in navigator) {
    return 'full'; // Full WebXR support
  } else if (isXverse) {
    return 'xverse'; // Xverse browser - limited/no WebXR
  } else if (isChrome && /Android/i.test(navigator.userAgent)) {
    return 'chrome-android'; // Chrome Android - should work
  }
  return 'none';
};

// Show appropriate UI based on support level
```

### Pet Interaction System (`src/xr/PetInteraction.ts`)
```typescript
// Voice command recognition
const startVoiceRecognition = () => {
  const recognition = new (window as any).SpeechRecognition();
  recognition.continuous = true;
  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    handleVoiceCommand(transcript.toLowerCase());
  };
  recognition.start();
};

// Handle voice commands
const handleVoiceCommand = (command: string) => {
  if (command.includes('hello') || command.includes('hi')) {
    triggerPetReaction('wave');
  } else if (command.includes('sit')) {
    triggerPetReaction('sit');
  } else if (command.includes('play')) {
    triggerPetReaction('play');
  }
};
```

### RP1 Avatar Injection (`src/rp1/AvatarInjector.ts`)
```typescript
// Inject avatar into RP1 fabric
const injectAvatarToFabric = async (vrmModel: VRM, fabricUrl: string) => {
  // Convert VRM to glTF
  const gltf = await convertVRMToGLTF(vrmModel);
  
  // Upload to permanent storage (Arweave/IPFS)
  const modelUrl = await uploadToPermanentStorage(gltf);
  
  // Generate Scene Assembler JSON
  const sceneJSON = generateSceneJSON(pet, inscriptions, {
    modelUrl: modelUrl,
    includeImages: true,
  });
  
  // Push to RP1 via MSF or directly to fabric
  await pushToRP1Fabric(fabricUrl, sceneJSON);
};
```

### Real-Time Sharing (`src/rp1/RealtimeSharing.ts`)
```typescript
// Broadcast pet position to nearby users
const broadcastPosition = (position: THREE.Vector3) => {
  const event = {
    kind: 30078, // Custom event kind
    tags: [
      ['d', `pet-position:${pet.id}`],
      ['p', pubkey],
      ['t', 'position-broadcast']
    ],
    content: JSON.stringify({
      petId: pet.id,
      position: { x: position.x, y: position.y, z: position.z },
      timestamp: Date.now(),
    }),
  };
  publishToNostr(event);
};

// Subscribe to nearby pet positions
const subscribeToNearbyPets = () => {
  const filter = {
    kinds: [30078],
    '#t': ['position-broadcast'],
    since: Math.floor(Date.now() / 1000) - 60, // Last minute
  };
  subscribeToNostr(filter, handleNearbyPetUpdate);
};
```

## 📋 Implementation Priority

### High Priority (Week 1)
1. Fix Xverse browser WebXR detection
2. Add pet interaction in WebXR mode (hand gestures)
3. Implement cyan terminal theme
4. Remove battle button from AR mode

### Medium Priority (Week 2)
1. Add OSA Gallery avatar picker integration
2. Implement real-time avatar sharing via Nostr
3. Add voice commands for pet interaction

### Low Priority (Week 3+)
1. Full Open Avatar Protocol integration with RP1
2. Advanced gesture recognition
3. Battle integration in WebXR mode

## 🚀 Future Roadmap

### UniSat API Key Integration
- Add optional UniSat API key support for enhanced Bitcoin ordinals features
- Users can provide their own API key for better rate limits and features
- Keep current ordinals functionality working without API key
- Add to settings UI with clear explanation of benefits

### Holoball Arena Integration
- Integrate with holoball-arena project for battle arenas
- Support 7 biome themes with elemental affinity
- Add spectator mode for nearby users
- Implement tournament bracket system

### Smart NPC Integration
- Make FabricPet an AI companion using smart-npc patterns
- Voice interaction via Deepgram STT/TTS
- LLM-powered dialogue using OpenAI
- Spatial audio for pet responses

## 🎯 Success Criteria

1. **WebXR**: Works on Chrome Android, shows appropriate message on Xverse
2. **Interactions**: Pet responds to hand gestures and voice commands
3. **Sharing**: Users can see each other's pets in same RP1 fabric
4. **Theme**: Cyan terminal theme throughout the app
5. **Performance**: Smooth 60fps in WebXR mode
6. **Avatar Picker**: Users can browse and select from OSA Gallery avatars

---
*Plan generated for FabricPet enhancement v4*
