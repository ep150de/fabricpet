# FabricPet Enhancement Plan

## Overview
Implement comprehensive enhancements across 8 sections, starting with Enhanced Nostr Integration.

---

## Section 2: Enhanced Nostr Integration

### 2.1 Pet-to-Pet Direct Messaging (NIP-17 Upgrade)

**Problem**: NIP-04 (currently used) is deprecated with known security issues. FabricPet uses NIP-04 for direct messages.

**Solution**: Upgrade to NIP-17 which uses NIP-44 encryption (more secure) and introduces sealed Direct Messages.

**Files to Modify**:
- `src/nostr/nostrUtils.ts` - Replace `nip04` with `nip44` (from nostr-tools)
- `src/nostr/nostrService.ts` - Update `sendDirectMessage()` to use NIP-17
- `src/store/useStore.ts` - Add `messages: DirectMessage[]` state

**New Types**:
```typescript
interface DirectMessage {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  read: boolean;
}
```

**UI Changes**:
- Add new `ChatView` for direct messaging
- Add unread message indicator in navigation
- Chat list showing recent conversations

---

### 2.2 Event Kind Standardization

**Problem**: D-tag naming is inconsistent (`com.fabricpet.*` vs `fabricpet-*`).

**Solution**: Standardize all d-tags to `fabricpet:v1:*` format for clarity.

**New D-Tag Schema**:
```typescript
export const NOSTR_D_TAGS = {
  PET_STATE: 'fabricpet:v1:pet',
  HOME_STATE: 'fabricpet:v1:home',
  BATTLE_LOG: 'fabricpet:v1:battle-log',
  BATTLE_CHALLENGE: 'fabricpet:v1:battle-challenge',
  LEADERBOARD: 'fabricpet:v1:leaderboard',
  GUESTBOOK: 'fabricpet:v1:guestbook',
  LINEAGE: 'fabricpet:v1:lineage',
  BREEDING: 'fabricpet:v1:breeding',
} as const;
```

**Migration Strategy**:
- When loading, check both old and new d-tags
- On save, use new d-tag format
- Old events remain readable (backward compatible)

---

### 2.3 Pet Lineage & Breeding Events

**Problem**: No way to track pet family trees or breed new pets.

**Solution**: Add new Nostr events for lineage tracking and breeding.

**New Types**:
```typescript
interface PetLineage {
  petId: string;
  parentIds: [string | null, string | null]; // [fatherId, motherId]
  generation: number;
  bloodline: string[]; // Array of ancestor pubkeys
  birthEvent: {
    timestamp: number;
    breedingEventId: string | null;
  };
}

interface BreedingOffer {
  id: string;
  offerer: string;
  matriarchId: string;  // Pet offering to breed
  patrilinealId: string; // Pet offering to breed
  status: 'offered' | 'accepted' | 'rejected' | 'completed';
  createdAt: number;
}
```

**New Nostr Events**:
- `kind 30078` with `d: fabricpet:v1:lineage.<petId>` for lineage records
- `kind 30078` with `d: fabricpet:v1:breeding` for breeding offers
- `kind 30078` with `d: fabricpet:v1:breeding-request` for breeding requests

**Breeding Mechanics**:
1. Player A creates breeding offer for Pet A
2. Player B creates breeding offer for Pet B
3. Both submit to Nostr, system matches compatible offers
4. Offspring inherits:
   - 50% average stats from parents (+ random variance)
   - Possible elemental type combination (fire + water = lava/fire/water)
   - Combined moveset (subset of parent moves)
5. Offspring minted as new pet on-chain or as new Nostr identity

**UI Changes**:
- Add "Breed" button in PetView
- Add "Lineage" tab showing family tree
- Add breeding marketplace in SocialView

---

## Section 3: glTF Pet Metadata Interoperability

### 3.1 Embed Pet Metadata in Exported glTF

**Current**: `GLBExporter.ts` exports geometry without pet data.

**New Schema**:
```json
{
  "asset": {
    "version": "2.0",
    "extras": {
      "fabricpet": {
        "version": "1.0",
        "petId": "uuid",
        "name": "Fluffy",
        "level": 15,
        "stage": "adult",
        "elementalType": "fire",
        "battleStats": { "hp": 75, "maxHp": 85, "atk": 22, "def": 18, "spd": 20, "special": 20 },
        "moves": ["ember", "fire-spin"],
        "ownerNpub": "npub1..."
      }
    }
  }
}
```

**Files to Modify**:
- `src/rp1/GLBExporter.ts` - Add pet metadata to glTF extras
- `src/types/index.ts` - Add `PetGlTFMetadata` interface

---

### 3.2 glTF Extension for Formal Namespace

**Create `EXT_fabric_pet` extension** for formal namespacing:
```json
{
  "extensions": {
    "EXT_fabric_pet": {
      "petId": "uuid",
      "name": "Fluffy",
      "level": 15,
      "elementalType": "fire",
      "battleStats": { ... }
    }
  },
  "extensionsUsed": ["EXT_fabric_pet"]
}
```

---

## Section 4: Bitcoin/Ordinal Enhancements

### 4.1 Pet Ordinal Minting

**New Feature**: Inscribe pet as Bitcoin ordinal (soul-bound token).

**Flow**:
1. User completes pet care journey (reaches adult stage)
2. "Mint as Ordinal" button appears
3. System creates commemorative image/GLB of pet
4. User confirms via Bitcoin wallet
5. Pet inscribed as ordinal with pet metadata in inscription

**Files to Modify**:
- `src/wallet/OrdinalMinter.ts` - New file
- `src/components/WalletView.tsx` - Add minting UI

---

### 4.2 Trait Migration Sync

**Problem**: Equipping ordinals changes appearance but not traits stored in Nostr.

**Solution**: When equipping ordinal, prompt to sync traits back to Nostr.

---

## Section 5: Offline/PWA Support

### 5.1 Service Worker

**Add**: Workbox-based service worker for offline capability.

**Caching Strategy**:
- App shell: Cache first
- VRM models: Stale-while-revalidate
- Nostr data: Network first with cache fallback

### 5.2 IndexedDB Caching

**Add**: Cache VRM models, recent Nostr events, pet state locally.

---

## Section 6: Performance Optimizations

### 6.1 Code Splitting

**Problem**: 1.2MB main chunk.

**Solution**: Configure Vite `manualChunks`:
- `three-vrm`: Separate chunk
- `nostr-tools`: Separate chunk
- Route-based splitting

### 6.2 Lazy Load Three.js

**Solution**: Load 3D engine only when entering 3D views (HomeView, ARView, ArenaView).

---

## Section 7: Multiplayer Shared Spaces

### 7.1 WebRTC via Nostr

**New Feature**: Watch battles live or co-view pets.

**Flow**:
1. Publish "watching" event to Nostr
2. Use NIP-47 (websocket-based DM) or simple WebRTC signaling
3. Peers connect and share state

### 7.2 RP1 Integration Expansion

Already partially done. Expand to:
- More biome themes from holoball-arena
- Shared pet animations

---

## Section 8: Internationalization (i18n)

### 8.1 i18n Framework

**Add**: `react-i18next` framework.

**Translation Keys**:
```
{
  "pet": { "feed": "Feed", "play": "Play", ... },
  "battle": { "attack": "Attack", "defend": "Defend", ... },
  "social": { "leaderboard": "Leaderboard", ... }
}
```

---

## Implementation Order

1. **Section 2.1**: NIP-17 DM upgrade (high impact, fixes security)
2. **Section 2.2**: D-tag standardization (foundation)
3. **Section 2.3**: Lineage/breeding (fun new feature)
4. **Section 3**: glTF metadata (interoperability)
5. **Section 4**: Ordinal enhancements
6. **Section 6**: Performance (always ongoing)
7. **Section 5**: PWA (quality of life)
8. **Section 7**: Multiplayer
9. **Section 8**: i18n

---

## Breeding Clarification Needed

Before implementing Section 2.3, I need your input:

1. **Stat Inheritance**: Should offspring stats be:
   - Pure averages of parents?
   - A + B/2 + random bonus?
   - Based on some rarity/legendary system?

2. **Elemental Combinations**: How should elementals combine?
   - fire + water = steam/lava?
   - fire + fire = stronger fire?
   - Any combination allowed?

3. **Breeding Cost**: Should breeding cost:
   - In-game currency (XP)?
   - Real Bitcoin sats?
   - Nothing (free)?

4. **Lineage Display**: Simple tree view showing parents, or full family tree?
