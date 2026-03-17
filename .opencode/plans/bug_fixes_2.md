# FabricPet Bug Fixes & Enhancements Plan

## 🐛 Bug Fixes

### 1. Battle Mode Stuck After First Move
**Symptom**: HP changes but "Select Move" button doesn't reappear

**Root Cause**: The `isPlayerTurn` logic in `ARBattleVisualizer.tsx` (line 81) is:
```typescript
const isPlayerTurn = battleState.currentTurn % 2 === 1;
```

But the `executeTurn` function increments `currentTurn` by 1 for both player AND opponent moves. So after one complete turn:
- `currentTurn` becomes `2`
- `2 % 2 = 0` → `isPlayerTurn = false`
- The "Select Move" button disappears because it thinks it's the opponent's turn
- But the opponent's move was already executed automatically

**Fix**: Change the logic to check if the battle is active and no winner:
```typescript
const isPlayerTurn = battleState.status === 'active' && !battleState.winner;
```

### 2. Nostr Rate-Limiting Error
**Symptom**: "rate-limited: you are noting too much" from Damus relay

**Root Cause**: `relay.damus.io` is still in the relay list despite comment saying it was removed.

**Fix**: Remove `relay.damus.io` from `DEFAULT_RELAYS` in `constants.ts`

### 3. Avatar Rendering in Battle Mode
**Symptom**: Only health bars shown, not pet avatar

**Root Cause**: `ARBattleVisualizer` only shows health bars and move buttons, no 3D pet rendering.

**Fix**: Add 3D pet rendering to battle mode using the same VRM loading logic as HomeView/ARView

## 🚀 New Features & Enhancements

### Holoball Arena Integration
**User Request**: Integrate with holoball-arena project for battle arenas

**Research Findings**:
- Repository: https://github.com/sayree121/holoball-arena
- Currently empty (no code yet)
- Describes a vision for:
  - HoloBall system (Pokéball-like orbs)
  - Holodeck Arena Generator (7 biome themes)
  - 3D Battle Visualization
  - RP1 Spatial Fabric Native
  - Multiplayer & Social features
  - Bitcoin Ordinals integration

**Integration Approach**:
- Wait for holoball-arena to have actual code
- Consider adopting their biome themes for FabricPet arenas
- Use their battle visualization concepts for 3D battles
- Share battle results via MVMF protocol for cross-game compatibility

### Nostr Integration Improvements
**Current Issues**:
- Rate limiting from relays
- No battle result persistence
- Limited real-time updates

**Proposed Enhancements**:
1. **Rate Limiting**: Implement exponential backoff for relay connections
2. **Battle Persistence**: Store battle results in Nostr (kind 30078)
3. **Real-time Updates**: Subscribe to battle challenges via Nostr
4. **Leaderboard Caching**: Cache leaderboard data locally

### Avatar Selection Improvements
**Current Issues**:
- WebGL race condition causes white screen (FIXED)
- VRM loading is async and can fail silently

**Proposed Enhancements**:
1. **Progressive Loading**: Show loading indicator during VRM fetch
2. **Avatar Preview**: Show thumbnail before full model loads
3. **Local Caching**: Cache VRM models in IndexedDB
4. **Fallback Options**: Multiple fallback URLs for default models

### Battle System Enhancements
**Current Issues**:
- Battle mode only in ARView, not in other views
- No battle history or records
- Limited move set

**Proposed Enhancements**:
1. **Battle History**: Store past battles in local storage
2. **Move Unlocking**: Unlock new moves as pet levels up
3. **Elemental Bonuses**: Implement type advantage system
4. **Battle Animations**: Add attack/defense animations
5. **Spectator Mode**: Allow other users to watch battles

## 📋 Implementation Order

### Phase 1: Bug Fixes (Immediate)
1. Fix `isPlayerTurn` logic in ARBattleVisualizer.tsx
2. Remove `relay.damus.io` from DEFAULT_RELAYS
3. Test battle mode works end-to-end

### Phase 2: Avatar Rendering in Battle (Week 1)
1. Add 3D pet rendering to battle mode
2. Implement pet animations during battle
3. Add attack/defense visual effects

### Phase 3: Enhanced Battle System (Week 2)
1. Implement battle history storage
2. Add move unlocking system
3. Create elemental advantage system
4. Add battle animations

### Phase 4: Holoball Integration Research (Week 3)
1. Monitor holoball-arena repository for updates
2. Design integration points for biome themes
3. Plan battle visualization adoption
4. Consider cross-game compatibility

### Phase 5: UI/UX Improvements (Week 4)
1. Add loading indicators for avatar selection
2. Implement avatar preview thumbnails
3. Create battle replay viewer
4. Add battle statistics display

## 📁 Files to Modify

| File | Changes |
|------|---------|
| `src/battle/ARBattleVisualizer.tsx` | Fix `isPlayerTurn` logic |
| `src/utils/constants.ts` | Remove damus.io relay |
| `src/components/ARView.tsx` | Add 3D pet to battle mode |
| `src/battle/BattleEngine.ts` | Add battle history, move unlocking |

## 🎯 Success Criteria

1. **Battle Mode**: Player can select moves continuously until battle ends
2. **Nostr Integration**: No rate-limiting errors, battles persist
3. **Avatar Selection**: Works on PC Chrome without white screen
4. **WebXR**: Clear messaging about browser support
5. **Camera AR**: Continues to work as before

---
*Plan generated for FabricPet bug fixes and enhancements*
