# FabricPet 2.0 - Comprehensive Enhancement Plan

## Overview
This plan addresses critical issues with RP1 integration, camera AR mode, leaderboard functionality, XR interactivity, and introduces a new UI 2.0 design system.

---

## 🔴 Critical Issues to Fix

### 1. Pet Not Appearing in RP1 World

**Root Cause Analysis:**
- MSF service (Railway deployment) appears to be returning 404s on scene endpoints
- Deep link opens generic RP1 without scene data (`enter.rp1.com?start_cid=104` hardcoded instead of using `RP1_CONFIG.fabricUrl`)
- No equipped ordinal = no pet in scene JSON
- Auto-sync failures are silent (no user notification)

**Fixes Required:**

**A. Fix Deep Link URL** (`src/rp1/RP1ShareButton.tsx`)
- Replace hardcoded `https://enter.rp1.com?start_cid=104` with `RP1_CONFIG.fabricUrl`
- Add scene data as URL parameter if possible
- Show success/error feedback when opening RP1

**B. Add Fallback for No Ordinal Equipped** (`src/rp1/SceneJSONGenerator.ts`)
- Generate default 3D pet model URL when no ordinal is equipped
- Use a hosted glTF model as default pet representation
- Add warning UI when no ordinal is equipped

**C. Improve Auto-Sync Feedback** (`src/rp1/SceneSync.ts`)
- Show notification when sync succeeds/fails
- Save scene JSON to localStorage as fallback
- Add manual "Force Sync" button with clear status

**D. Consider Client-Side Scene Delivery**
- Explore passing scene JSON directly via URL parameter or postMessage
- Bypass MSF service entirely for immediate availability

### 2. Camera AR Mode Not Working

**Root Cause Analysis:**
- `cameraReady` and `cameraActive` flags set before video actually plays
- Three.js overlay initializes prematurely over unplayed video
- WebGL context lost due to multiple competing contexts (HomeView + ARView)
- Video element may show black frame when `play()` is blocked by autoplay policies

**Fixes Required:**

**A. Fix Flag Timing** (`src/components/ARView.tsx` - startCamera)
```javascript
// Only set cameraReady/cameraActive AFTER video actually plays
if (playError.name === 'NotAllowedError') {
  // Don't set flags here - wait for user interaction
  setError('Camera ready. Tap to start video.');
  return; // Exit early, don't set flags
}
```

**B. Fix Autoplay Fallback**
```javascript
const playOnInteraction = async () => {
  if (videoRef.current) {
    await videoRef.current.play();
    // NOW set flags after successful play
    setCameraReady(true);
    setCameraActive(true);
  }
};
```

**C. Ensure HomeView WebGL Cleanup** (`src/components/HomeView.tsx`)
```javascript
return () => {
  cleanup = true;
  cancelAnimationFrame(animationId);
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss(); // Add this line
  }
};
```

**D. Add Explicit Video Styling**
```html
<video style={{ display: 'block', width: '100%', height: '100%' }} />
```

### 3. Leaderboard Not Functioning

**Root Cause Analysis:**
- Most likely: No pet data available on Nostr relays yet
- Auto-save runs every 2 minutes - new users won't appear immediately
- Relay connectivity issues possible
- Data structure mismatch between save and fetch

**Fixes Required:**

**A. Add Diagnostic Logging**
- Log each step of leaderboard fetch process
- Show relay connection status in UI
- Display last successful sync time

**B. Improve Error Messages**
- Distinguish between "no data" and "connection failed"
- Show relay-specific error details
- Add troubleshooting suggestions

**C. Add Manual Refresh with Progress**
- Show loading indicator with relay count
- Display partial results as they arrive
- Cache results in localStorage for offline viewing

**D. Verify Data Structure**
- Ensure pet state save format matches leaderboard fetch expectations
- Add data validation/migration if needed

---

## 🟡 Feature Enhancements

### 4. XR Mode Interactivity

**Current State:**
- WebXR mode works on Chrome mobile and Quest headsets
- Basic bounce animation only
- No user interaction possible

**Planned Enhancements:**

**A. Hand Tracking Support**
- Already requested in session: `optionalFeatures: ['hand-tracking']`
- Add hand gesture recognition for:
  - **Wave**: Pet waves back
  - **Point**: Pet looks at pointed direction
  - **Thumbs up**: Pet shows happy reaction
  - **Fist**: Pet plays dead or hides

**B. Gaze Interaction**
- Detect where user is looking
- Pet follows user's gaze
- Eye contact triggers special animations

**C. Spatial Audio**
- Add pet sounds that come from pet's location
- Different sounds for different moods/actions
- Volume changes based on distance

**D. Physics Interaction**
- Ball that user can "throw" for pet to chase
- Pet follows user movement in space
- Collision with virtual objects

**E. Multi-user Presence**
- Show other users' pets in XR space
- Proximity-based interactions
- Battle challenges via spatial proximity

### 5. Holoball Arena Integration (Future Phase)

**From holoball-arena README:**
- HoloBall deployment system (throw ball → arena materializes)
- 7 biome themes with elemental affinity
- 3D battle visualization with move animations
- Spectator mode for nearby users
- Tournament bracket system

**Integration Points:**
- Extend existing battle engine with 3D visualization
- Add HoloBall inventory to pet view
- Implement arena materialization effects
- Add spatial server for RP1 fabric

---

## 🎨 UI 2.0 Redesign: Modern Retro Matrix Terminal

### Design Philosophy
- **Modern Retro Crossover**: 80s/90s computing aesthetics with modern UX
- **Matrix Terminal UI**: Green-on-black, monospace fonts, scanlines, glitch effects
- **Maintain Functionality**: All existing features preserved

### Visual Elements

**Color Palette:**
```
Primary Green:    #00ff00 (Matrix green)
Secondary Green:  #00cc00 (Darker matrix)
Accent Green:     #33ff33 (Bright highlights)
Background:       #0a0a0a (Near black)
Surface:          #111111 (Dark gray)
Text Primary:     #00ff00 (Matrix green)
Text Secondary:   #008800 (Dim green)
Warning:          #ffcc00 (Amber)
Error:            #ff3333 (Red)
Success:          #33ff33 (Bright green)
```

**Typography:**
```
Primary Font:     'Fira Code', 'JetBrains Mono', 'Courier New', monospace
Fallback:         'Consolas', 'Monaco', monospace
```

**Visual Effects:**
- Scanline overlay (CSS animation)
- CRT screen curvature (subtle border-radius)
- Phosphor glow on text (text-shadow)
- Glitch animations on hover
- Matrix rain background (optional, performant)
- Terminal cursor blink animations
- Retro button styles (raised/pressed states)

### Component Redesigns

**1. Navigation Bar:**
- Terminal-style tabs with `_` prefix (e.g., `_home`, `_pet`)
- Green text on dark background
- Hover shows command prompt style
- Active tab has blinking cursor

**2. Cards/Containers:**
- Terminal window chrome (title bar with dots)
- Monospace text throughout
- ASCII-art borders or decorations
- Subtle scanline effect

**3. Buttons:**
- Terminal command style: `> Battle` or `[ Battle ]`
- Green text, dark background
- Hover: brighter green with glow
- Pressed: inverted colors

**4. Status Bars:**
- ASCII progress bars: `[████████░░░░] 67%`
- Terminal-style labels
- Color changes based on status

**5. Pet Display:**
- Terminal window showing pet stats
- ASCII art pet representation option
- 3D pet in terminal "viewport"
- Status output like system monitor

**6. Chat/LLM:**
- Terminal chat interface
- Typing effect for responses
- Command history navigation
- Prompt character: `> ` or `$ `

### Implementation Approach
- Update Tailwind config with new color palette
- Add global CSS for scanline/terminal effects
- Create new component variants with terminal styling
- Maintain accessibility with proper contrast ratios
- Keep responsive design for mobile

---

## 📋 Implementation Priority

### Phase 1: Critical Fixes (Immediate)
1. Fix camera AR mode flag timing issue
2. Fix RP1 deep link URL to use config
3. Add fallback for pets without equipped ordinals
4. Improve leaderboard error messages and diagnostics

### Phase 2: Core Functionality (Week 1)
1. Add auto-sync feedback notifications
2. Implement scene JSON fallback to localStorage
3. Add manual "Force Sync" button
4. Improve XR mode with basic hand tracking gestures

### Phase 3: Enhanced Interactivity (Week 2)
1. Add gaze tracking for XR mode
2. Implement spatial audio for pets
3. Add physics-based interactions (ball throwing)
4. Enhance battle visualization in XR

### Phase 4: UI 2.0 Redesign (Week 3-4)
1. Design new color palette and typography
2. Implement terminal-style components
3. Add scanline/CRT effects
4. Create new navigation and card styles
5. Update all views with new theme

### Phase 5: Holoball Integration (Future)
1. Integrate holoball-arena as dependency
2. Add HoloBall inventory system
3. Implement arena materialization
4. Add spectator mode

---

## 🧪 Testing Strategy

### Camera AR Testing
- Test on Chrome, Firefox, Safari (mobile & desktop)
- Test on Xverse browser
- Test on Meta Quest browser
- Verify video plays before 3D overlay initializes
- Check WebGL context recovery

### RP1 Integration Testing
- Test with and without equipped ordinals
- Verify deep link opens correct RP1 scene
- Test auto-sync with simulated MSF downtime
- Verify clipboard fallback works

### Leaderboard Testing
- Test with fresh account (no data)
- Test with multiple pets on relays
- Test relay connectivity failures
- Verify data structure parsing

### XR Mode Testing
- Test hand tracking on Quest
- Test gaze interaction
- Test spatial audio
- Test multi-user presence

---

## 📁 Files to Modify

| File | Changes |
|------|---------|
| `src/components/ARView.tsx` | Fix camera flags, improve XR interactivity |
| `src/rp1/RP1ShareButton.tsx` | Fix deep link URL, add sync feedback |
| `src/rp1/SceneJSONGenerator.ts` | Add fallback for no ordinal |
| `src/rp1/SceneSync.ts` | Add notifications, localStorage fallback |
| `src/components/SocialView.tsx` | Improve leaderboard diagnostics |
| `src/components/HomeView.tsx` | Ensure WebGL cleanup, UI 2.0 |
| `src/index.css` | New terminal theme styles |
| `tailwind.config.js` | New color palette |
| `src/components/Navigation.tsx` | Terminal-style tabs |
| All component files | UI 2.0 styling updates |

---

## 🎯 Success Criteria

1. **Camera AR**: Works on at least Chrome, Safari, and one mobile browser
2. **RP1 World**: Pet appears automatically when entering RP1
3. **Leaderboard**: Shows real data from Nostr relays with clear error messages
4. **XR Interactivity**: Users can interact with pet via hand gestures
5. **UI 2.0**: All views use consistent terminal/matrix theme
6. **Holoball**: Foundation ready for arena integration

---

*Generated: March 2026*
*FabricPet Version: 2.0 Planning*
