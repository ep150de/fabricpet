# FabricPet Fix Plan - Complete Implementation Guide

## 🔴 Critical Issues to Fix

### 1. WebXR Broken - ES Module Import Issue
**File:** `src/xr/XRInteractions.ts`
**Problem:** Uses `require('three')` which fails in ES modules
**Fix:** 
```typescript
// Change from:
import type * as THREE from 'three';
// To:
import * as THREE from 'three';

// Replace all instances of:
new (require('three') as any).Vector3(...)
// With:
new THREE.Vector3(...)
```

### 2. Camera AR Not Working
**File:** `src/components/ARView.tsx`
**Fixes:**
- Add better error logging for camera initialization failures
- Add timeout handling for camera access requests
- Ensure video element is properly attached to DOM before play()
- Add detailed error messages for different failure modes

### 3. Remove Broken Battle Button from AR Mode
**File:** `src/components/ARView.tsx`
**Fix:** Remove the battle button and associated state/logic

### 4. Nostr Signing Issues
**Files:** `src/nostr/identity.ts`, `src/nostr/petStorage.ts`
**Problem:** Events aren't being signed properly for relay publishing
**Fixes:**
- Add proper error handling when signing fails
- Show user-friendly message when Nostr identity isn't set up
- Verify identity is properly initialized with signing capability
- Add fallback: auto-generate identity if none exists

### 5. Leaderboard Data Structure
**File:** `src/nostr/leaderboard.ts`
**Problem:** Expects `data.pet` structure but state might be different
**Fix:** Verify pet state save format matches what leaderboard expects

## 🟢 New Features

### 6. Default Kitten VRM Avatar
**Files:** `src/avatar/AvatarLoader.ts`, `src/components/HomeView.tsx`
**Changes:**
- Add `loadDefaultKitten()` function using Open Source Avatars
- Use Chubby Tubbies Cat VRM from Arweave as default
- Replace sphere placeholder with VRM kitten when no ordinal equipped
- Bundle VRM file in public folder for offline support

### 7. Preserve Ordinal Integration
**Files:** `src/avatar/OrdinalRenderer.ts`, `src/components/HomeView.tsx`
**Ensure:**
- Bitcoin ordinal images work as pet skins
- Bitcoin ordinal 3D GLB files replace default pet model
- Xverse and UniSat wallet integration remains intact

### 8. Enhanced XR Interactions
**File:** `src/components/ARView.tsx`
**Add:**
- Hand tracking gesture recognition
- Gaze interaction (pet follows user's gaze)
- Ball throwing physics
- Proper WebXR session management

### 9. Smart NPC Integration (Future)
**Concept:** Make FabricPet an AI companion using smart-npc patterns
- Voice interaction via Deepgram STT/TTS
- LLM-powered dialogue using OpenAI
- Spatial audio for pet responses
- Integration with existing personality system

## 📋 Implementation Order

1. Fix XRInteractions.ts ES module imports (WebXR)
2. Fix camera AR initialization and permissions
3. Remove broken battle button from AR mode
4. Fix Nostr signing for relay publishing
5. Verify leaderboard data flow end-to-end
6. Add default kitten VRM avatar
7. Preserve ordinal/wallet integration
8. Add enhanced XR interactions

## 🔍 Testing Strategy

- WebXR: Test on Meta Quest, Chrome mobile
- Camera AR: Test on Chrome, Safari, Firefox
- Nostr: Test with fresh account, existing extension
- VRM: Test default kitten loading, ordinal GLB replacement

---
*Plan created for implementation*
