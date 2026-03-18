# HOT PUZZLE

## Current State
Sound effects exist via Web Audio API. No background music. Mute toggle only in game header.

## Requested Changes (Diff)

### Add
- useBackgroundMusic hook: procedurally generated looping music via Web Audio API
- Music persists across all screens (auth, dashboard, game board)
- localStorage key hotpuzzle_music for preference
- Floating music toggle button on all screens

### Modify
- App.tsx: mount useBackgroundMusic at top level

### Remove
- Nothing

## Implementation Plan
1. Create useBackgroundMusic.ts with looping melody scheduler
2. Add floating music toggle in App.tsx
3. Validate build
