# Fix Plan: Simplify Leaderboard and Fix Signing Issues

## Problem Analysis

### Issue 1: Leaderboard Not Showing Data
**Root Cause**: The current implementation has multiple points of failure:
1. `identity.secretKey` must exist to sign events → Pet state not saved to Nostr
2. Relays must accept the events → May fail silently
3. `battleRecord` must be populated → New pets have empty records
4. Complex data structure → Easy to have mismatches

### Issue 2: Signing Required
**Current Flow**:
1. App generates local identity with `generateNewIdentity()` (has secretKey)
2. OR uses NIP-07 extension (identity.secretKey = null)
3. OR loads stored identity from localStorage (has secretKey)

**Problem**: If user skips identity generation or uses extension without proper permissions, signing fails.

### Issue 3: Complex Data Structure
**Current Leaderboard Query**:
- Queries kind 30078 with d-tag `com.fabricpet.pet.state`
- Expects `data.pet.battleRecord.wins/losses/draws`
- New pets have `battleRecord: { wins: 0, losses: 0, draws: 0 }`

## Simplified Solution

### 1. Simplified Leaderboard Based on Pet Stats
Instead of complex battle records, use simpler metrics:
- **Primary**: Pet level (higher = better)
- **Secondary**: Total XP earned
- **Tertiary**: Days since creation (longevity)
- **Bonus**: Win/loss ratio (if available)

### 2. Improved Signing Flow
- Auto-generate identity if none exists
- Better error handling for signing failures
- Clear UI guidance for users without signing capability

### 3. Local Fallback Leaderboard
- Cache pet states locally
- Show local leaderboard even if Nostr fails
- Sync when signing becomes available

## Implementation Details

### 1. Simplified LeaderboardEntry Type
```typescript
export interface LeaderboardEntry {
  pubkey: string;
  petName: string;
  petLevel: number;
  xp: number;
  elementalType: string;
  createdAt: number;
  lastSeen: number;
  score: number; // Computed score for ranking
  wins?: number; // Optional
  losses?: number; // Optional
}
```

### 2. Scoring System
```typescript
// Score calculation (higher = better)
const calculateScore = (entry: LeaderboardEntry): number => {
  let score = 0;
  
  // Level is most important (0-100 points)
  score += entry.petLevel * 2;
  
  // XP bonus (0-50 points)
  score += Math.min(entry.xp / 100, 50);
  
  // Longevity bonus (0-30 points, 1 point per day)
  const daysSinceCreation = (Date.now() - entry.createdAt) / (1000 * 60 * 60 * 24);
  score += Math.min(daysSinceCreation, 30);
  
  // Win rate bonus (0-20 points)
  const totalBattles = (entry.wins || 0) + (entry.losses || 0);
  if (totalBattles > 0) {
    const winRate = (entry.wins || 0) / totalBattles;
    score += winRate * 20;
  }
  
  return Math.round(score);
};
```

### 3. Enhanced Leaderboard Display
```typescript
// Show more metrics
- Pet level with XP progress bar
- Score calculation breakdown
- Win/loss record (if available)
- Days active
- Elemental type with icon
```

### 4. Auto-Identity Generation
```typescript
// In App.tsx initialization:
if (!id) {
  // Generate local identity with signing capability
  id = generateNewIdentity();
  console.log('[Init] Generated new identity for signing');
}
```

### 5. Force Save Enhancement
```typescript
// Better error messages
const handleForceSave = async () => {
  if (!identity.secretKey) {
    setError('Cannot sign events - no signing key available');
    return;
  }
  
  try {
    const ok = await savePetState(identity, pet);
    if (ok) {
      // Reload leaderboard
      const data = await fetchLeaderboard();
      setEntries(data);
    } else {
      setError('Failed to save - relays may be down');
    }
  } catch (e) {
    setError(`Save failed: ${e.message}`);
  }
};
```

### 6. Local Leaderboard Cache
```typescript
// Cache in localStorage
const LOCAL_LEADERBOARD_KEY = 'fabricpet_leaderboard';

const saveLocalLeaderboard = (entries: LeaderboardEntry[]) => {
  localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(entries));
};

const loadLocalLeaderboard = (): LeaderboardEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_LEADERBOARD_KEY) || '[]');
  } catch {
    return [];
  }
};
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/nostr/leaderboard.ts` | Simplify scoring, add local cache |
| `src/nostr/petStorage.ts` | Better error handling for signing |
| `src/App.tsx` | Auto-generate identity, better save logic |
| `src/components/SocialView.tsx` | Clearer signing guidance |
| `src/types/index.ts` | Update LeaderboardEntry type |

## Success Criteria

1. **Leaderboard shows data** - Even with empty battleRecord
2. **Signing works automatically** - Users don't need to manually configure
3. **Clear error messages** - Users understand why something fails
4. **Fallback works** - Local cache shows data even if Nostr fails
5. **Simplified metrics** - Easy to understand ranking system

---
*Plan created for simplifying leaderboard and fixing signing issues*
