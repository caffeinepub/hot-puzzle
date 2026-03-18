# HOT PUZZLE

## Current State
New project with authorization component selected.

## Requested Changes (Diff)

### Add
- Sign up / login dashboard with user registration and authentication
- 3D-style fruit puzzle game with tile-matching mechanics
- Level system from 1 to 2000 with progressive difficulty
- Red-purple gradient background theme throughout
- Score tracking per level and overall high scores
- Level selection screen showing unlocked/locked levels
- Game board: grid of 3D fruit tiles that players match/swap to solve puzzles
- Fruits: apple, orange, grape, banana, strawberry, watermelon, pineapple, cherry
- Each level increases grid size and complexity
- Player progress persistence (levels unlocked, high scores)
- Game over and level complete screens

### Modify
- Nothing existing to modify.

### Remove
- Nothing to remove.

## Implementation Plan
1. Backend: User profiles, player progress (current level, max level unlocked, scores per level), leaderboard
2. Authorization: sign up, login, logout using built-in auth component
3. Frontend: Auth screens (sign up / login), home/dashboard, level select, game board (3D CSS), win/lose modals
4. Game logic: fruit grid generation, match-3 mechanics, level difficulty scaling (grid size, required moves, time limits)
5. 3D style: CSS 3D transforms on fruit tiles, perspective, depth shadows, neon glow effects
6. Red-purple gradient background across all screens
