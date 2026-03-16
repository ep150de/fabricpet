# FabricPet Enhancement Plan v3 - Post-Testing Feedback

## Executive Summary
Based on testing feedback, WebXR and Camera AR are broken due to ES module import issues. The leaderboard doesn't show data due to Nostr signing requirements. Battle challenges via Nostr don't work logically. This plan addresses all issues and proposes new features based on RP1 hackathon repos.

---

## 🔴 Critical Bug Fixes (Immediate)

### 1. WebXR Broken - ES Module Import Issue
**Root Cause**: `src/xr/XRInteractions.ts` uses `require('three')` which fails in ES modules
**Impact**: WebXR completely broken, hand tracking/gaze/ball physics don't work
**Fix**:
- Change `import type * as THREE from 'three'` to `import * as THREE from 'three'`
- Replace all `new (require('three') as any).Vector3(...)` with `new THREE.Vector3(...)`
- Fix 6 locations in the file (lines 54, 55, 158, 177, 179, 205)

### 2. Camera AR Not Working
**Root Cause**: Likely related to WebGL context issues and camera permission handling
**Fix**:
- Verify camera permission flow works correctly
- Add better error logging for camera initialization failures
- Ensure video element is properly attached to DOM before play()
- Add timeout handling for camera access requests

### 3. Remove Broken Battle Button from AR Mode
**Issue**: Battle button doesn't work in AR mode
**Fix**: Remove the battle button and associated state/logic from ARView.tsx
**Reason**: Battle mechanics should be implemented in a dedicated Battle screen, not AR

---

## 🟡 Core Functionality Fixes

### 4. Nostr Wallet Signing for Relay Publishing
**Issue**: Leaderboard doesn't show data because events aren't being signed properly
**Root Cause**: Publishing to Nostr relays requires cryptographic signing of events
**Current State**: 
- `src/nostr/identity.ts` has signing functions
- `src/nostr/petStorage.ts` uses `signEvent` from identity
- If identity doesn't have a valid secretKey, signing fails silently

**Fixes**:
- Add proper error handling when signing fails
- Show user-friendly message when Nostr identity isn't set up
- Verify identity is properly initialized with signing capability
- Add fallback: auto-generate identity if none exists

### 5. Leaderboard Data Structure Mismatch
**Issue**: Leaderboard queries for events with d-tag 'com.fabricpet.pet.state'
**Current State**: `src/nostr/leaderboard.ts` expects `data.pet` structure
**Fix**: Verify pet state save format matches what leaderboard expects

---

## 🟢 New Battle Mechanics (Replace Nostr Challenge)

### Current Problem
The "challenge player via nostr" mechanic doesn't work logically - it sends a request but doesn't establish a real battle session.

### Proposed New Battle System: "Arena Proximity Battles"

**Concept**: Battle other pets that are physically nearby in the RP1 spatial fabric

**How It Works**:
1. **Discovery**: When you enter RP1, your pet broadcasts its presence via MVMF protocol
2. **Proximity Detection**: Other pets within a certain radius appear as "battle ready"
3. **Challenge Initiation**: Tap/click on a nearby pet to send a battle request
4. **Battle Session**: If accepted, both pets enter a shared battle arena
5. **Real-time Combat**: Turn-based battles with live updates via MVMF
6. **Results**: Battle results saved to Nostr, XP awarded, stats updated

**Implementation Components**:
- **Pet Presence Broadcast**: Extend MVMF bridge to broadcast pet location/status
- **Proximity Matcher**: Service that finds nearby pets and enables challenges
- **Battle Session Manager**: Handles turn-based combat between two connected pets
- **Result Persistence**: Save battle results to Nostr with proper signing

### Alternative: "HoloBall Arena" (From holoball-arena repo)
The holoball-arena project describes a more immersive battle system:
1. **HoloBall Deployment**: Throw a HoloBall into space
2. **Arena Materialization**: Holographic arena forms around the ball
3. **Pet Emergence**: Your pet appears in the arena
4. **Spectator Mode**: Other users can watch the battle
5. **Biome Themes**: Different environments affect battle stats

**Integration Approach**:
- Import HoloBall arena concepts into FabricPet
- Use the existing battle engine with 3D visualization
- Add arena themes as unlockable content
- Implement spectator mode using MVMF protocol

---

## 🔵 Feature Enhancements

### 6. Smart NPC Integration (From smart-npc repo)
**What**: LLM-powered NPCs that can hear, think, and speak in RP1
**Integration Potential**:
- Make FabricPet an AI companion that can talk to users
- Use Deepgram for STT/TTS
- Use OpenAI GPT-4o for dialogue
- Pet responds to voice commands and questions
- Personality system already exists in FabricPet

**Implementation**:
- Create `src/ai/SpeechService.ts` for STT/TTS
- Integrate with existing personality system
- Add voice UI controls to AR/XR mode
- Pet speaks responses in spatial audio

### 7. USD Exchange Integration (From usd-exchange repo)
**What**: Import 3D models from USD files into RP1 metaverse
**Integration Potential**:
- Allow users to import custom 3D pet models from USD files
- Support more 3D formats beyond GLB/GLTF
- Enable artists to create custom pet skins/models
- Pipeline: USD → MSF Map Service → RP1

**Implementation**:
- Add USD file upload/processing
- Convert USD to glTF for browser compatibility
- Allow users to select imported models as pet appearances

### 8. Room/Fabric Progression System
**Current**: Each pet lives in one fabric
**Proposed**: Multiple rooms/fabrics that unlock with pet progression
- **Room Types**: Home, Garden, Battle Arena, Social Hub, etc.
- **Unlock Conditions**: Level up, complete quests, earn achievements
- **Scene Switching**: Seamlessly transition between rooms
- **Persistent State**: Each room remembers pet's position/items

### 9. QR Code Scanning Fix
**Issue**: QR codes don't work symmetrically
**Fix**: 
- Ensure QR codes contain proper deep links
- Add camera-based QR scanning capability
- Test bidirectional QR code generation/scanning

---

## 📋 Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. Fix XRInteractions.ts ES module imports → Restore WebXR
2. Fix camera AR initialization and permissions
3. Remove broken battle button from AR mode
4. Fix Nostr identity signing for relay publishing

### Phase 2: Core Functionality (Week 2)
1. Verify leaderboard data flow end-to-end
2. Add proper error messages for Nostr connectivity issues
3. Test auto-save and manual save to Nostr relays
4. Fix QR code bidirectional scanning

### Phase 3: Battle System Redesign (Week 3-4)
1. Implement proximity-based battle discovery
2. Create battle session manager for real-time combat
3. Add 3D battle visualization (based on holoball-arena concepts)
4. Implement spectator mode

### Phase 4: Smart NPC Integration (Week 5-6)
1. Add speech-to-text service (Deepgram)
2. Add text-to-speech service (Deepgram Aura-2)
3. Integrate with existing personality system
4. Add voice UI controls to AR/XR mode

### Phase 5: Advanced Features (Week 7+)
1. USD file import for custom pet models
2. Room/fabric progression system
3. HoloBall arena integration
4. Tournament bracket system

---

## 🔍 Testing Strategy

### WebXR Testing
- Test on Meta Quest browser
- Test on Chrome mobile with WebXR flag enabled
- Verify hand tracking detection works
- Test gaze interaction and ball throwing

### Nostr Integration Testing
- Test with fresh account (no identity)
- Test with existing Nostr extension (nos2x, Alby)
- Verify event signing works
- Test relay publishing and retrieval

### Battle System Testing
- Test proximity detection with multiple users
- Test battle session creation and turn management
- Test result persistence to Nostr
- Test spectator mode

---

## 📁 Key Files to Modify

| File | Changes |
|------|---------|
| `src/xr/XRInteractions.ts` | Fix ES module imports, remove require() calls |
| `src/components/ARView.tsx` | Remove battle button, fix camera initialization |
| `src/nostr/identity.ts` | Ensure proper signing capability |
| `src/nostr/petStorage.ts` | Add better error handling for signing failures |
| `src/nostr/leaderboard.ts` | Verify data structure compatibility |
| `src/components/SocialView.tsx` | Improve leaderboard display and error messages |
| `src/rp1/MVMFBridge.ts` | Add proximity broadcasting for battle discovery |
| New: `src/battle/ProximityMatcher.ts` | Find nearby pets for battles |
| New: `src/battle/BattleSession.ts` | Manage real-time battle sessions |
| New: `src/ai/SpeechService.ts` | STT/TTS integration for Smart NPC |

---

## 🎯 Success Criteria

1. **WebXR**: Works on Meta Quest and Chrome mobile with hand tracking
2. **Camera AR**: Works on all supported browsers with proper permission flow
3. **Leaderboard**: Shows real pet data from Nostr relays
4. **Battles**: Users can discover and battle nearby pets in RP1
5. **Voice**: Pet can respond to voice commands and speak responses
6. **Sharing**: One-click sharing works reliably to RP1 metaverse

---

*Generated: March 2026*
*Version: 3.0 - Post-Testing Feedback*
