# FabricPet Critical Fixes & Enhancement Plan

## 📊 Current State Analysis

### MSF Service (mvserver-production-4e6c.up.railway.app)
**Status**: Non-functional API endpoints

The MSF service is a **Scene Assembler web UI**, not an API server. The endpoints `/api/scene/json` and `/api/scene/update` return **404 Not Found** because they don't exist on this server. The service is designed for manual scene editing through a web interface, not for programmatic scene pushing.

**Current Error**:
```
POST https://mvserver-production-4e6c.up.railway.app/api/scene/json 404 (Not Found)
```

**Root Cause**: The code assumes the MSF service has REST API endpoints, but it only has a web UI.

### Camera AR Mode
**Status**: Completely broken

**Root Cause**: React ref timing issue - the video element doesn't render because `cameraActive` is `false` when `startCamera()` tries to access `videoRef.current`. The stream is obtained but never attached to any element.

**Current Flow**:
1. `setCameraReady(false)` - state update (queued)
2. `getUserMedia()` - gets stream successfully
3. `if (videoRef.current)` - **FAILS**: video element doesn't exist yet
4. Stream is stored in `streamRef.current` but never used

### WebXR Detection
**Status**: Broken on Chrome

**Root Cause**: Timeout mechanism was removed. `navigator.xr.isSessionSupported('immersive-ar')` can hang indefinitely in Chrome, causing the WebXR button to never appear.

### Nostr Relays
**Status**: Rate-limited

**Current Issues**:
- `relay.damus.io`: Rate-limited ("you are noting too much")
- `relay.nostr.band`: WebSocket connection failed
- `relay.f7z.io`: WebSocket connection failed

### Avatar Selection
**Status**: Selection not persisting after refresh

**Root Cause**: `pet.avatarId` is not included in the `updatePet` call's dependency array, so changes may not persist properly across sessions.

### 3D Scene Rendering
**Status**: Using deprecated `THREE.Clock`

**Current Warning**:
```
THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.
```

## 🎯 Implementation Plan

### Phase 1: Fix MSF Service Integration
**Issue**: API endpoints don't exist on MSF service

**Solution**: 
1. Remove reliance on non-existent API endpoints
2. Use clipboard-based scene sharing as primary method
3. Add direct fabric URL parameter passing for RP1 browser
4. Implement fallback to manual scene JSON pasting

**Implementation**:
- Update `MVMFBridge.ts` to remove 404-causing API calls
- Enhance clipboard sharing with better formatting
- Add QR code generation for scene JSON
- Add deep link with scene JSON parameter

### Phase 2: Fix Camera AR Mode
**Issue**: Video element ref timing

**Solution**:
1. Set `cameraActive(true)` BEFORE accessing `videoRef.current`
2. Use `useEffect` to attach stream when `cameraActive` changes
3. Add explicit wait for video element availability
4. Improve error messages for camera failures

**Implementation**:
```typescript
// New camera initialization flow:
1. getUserMedia() - get stream
2. setCameraActive(true) - trigger video element render
3. useEffect watching cameraActive - attach stream when video appears
4. video.play() - start playback
5. setCameraReady(true) - trigger 3D overlay
```

### Phase 3: Fix WebXR Detection
**Issue**: Missing timeout mechanism

**Solution**:
1. Restore timeout mechanism for `isSessionSupported()` check
2. Add optional chaining back to `xr?.isSessionSupported?.()`
3. Add better error messages for different failure modes
4. Support for both `immersive-ar` and `immersive-vr`

### Phase 4: Fix Avatar Selection Persistence
**Issue**: avatarId not in dependency array

**Solution**:
1. Add `pet.avatarId` to HomeView's 3D scene dependency array
2. Ensure VRM model loading failures don't silently fall back
3. Add visual feedback when avatar changes
4. Include avatarId in Nostr pet state sync

### Phase 5: Fix Nostr Relay Issues
**Issue**: Rate limiting and connection failures

**Solution**:
1. Remove `relay.damus.io` from default relays (rate-limited)
2. Add relay fallback mechanism with exponential backoff
3. Cache relay connection status locally
4. Add relay health monitoring

### Phase 6: Fix THREE.js Deprecation
**Issue**: `THREE.Clock` deprecated

**Solution**:
1. Replace `new THREE.Clock()` with `new THREE.Timer()`
2. Update animation loop to use `timer.getDelta()`
3. Maintain backward compatibility with existing code

## 📁 Files to Modify

| File | Changes |
|------|---------|
| `src/rp1/MVMFBridge.ts` | Remove 404-causing API calls, enhance clipboard sharing |
| `src/components/ARView.tsx` | Fix camera AR, restore WebXR timeout |
| `src/components/HomeView.tsx` | Fix avatar persistence, add VRM dependency |
| `src/utils/constants.ts` | Update relay list, remove rate-limited relays |
| `src/nostr/relayManager.ts` | Add relay health monitoring, fallback mechanism |
| `src/three/**/*.ts` | Replace Clock with Timer |

## 🧪 Testing Checklist

- [ ] Camera AR works on Chrome, Firefox, Safari
- [ ] WebXR button shows on supported browsers
- [ ] Avatar selection persists across refreshes
- [ ] Scene JSON copies to clipboard successfully
- [ ] No 404 errors in console
- [ ] No rate-limiting errors from Nostr relays
- [ ] No THREE.js deprecation warnings

## 🚀 Success Criteria

1. **MSF Integration**: No 404 errors, scene JSON available via clipboard
2. **Camera AR**: Video element displays camera feed, 3D overlay works
3. **WebXR**: Button shows on supported browsers, works on Quest/Chrome
4. **Avatar Persistence**: Selection persists across page refreshes
5. **Nostr Relays**: No rate-limiting, stable connections
6. **THREE.js**: No deprecation warnings

---
*Generated: March 2026*
*Priority: Critical - Fixes multiple broken features*
