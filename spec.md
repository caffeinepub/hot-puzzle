# HOT PUZZLE — Online Multiplayer

## Current State
Single-player match-3 game with 2000 levels, no login required. Players select a level, play on a local board, and progress through levels. Score and level are stored in localStorage.

## Requested Changes (Diff)

### Add
- **Online Play mode** accessible from the Dashboard (new "Play Online" button)
- **Online Lobby screen**: enter your name, create a room (get a room code) or join a room by code
- **Multiplayer game board**: both players play the same level simultaneously on their own board
- **Per-move countdown timer** (30 seconds): each player must make a move before the timer expires or they lose that turn (move is skipped)
- **Live opponent panel**: shows opponent name, score, and move count, updated every 2 seconds via polling
- **Match result screen**: shows winner (higher score when all moves exhausted or one player forfeits)
- **Backend match room system**: create/join rooms, sync player state, enforce match lifecycle

### Modify
- Dashboard: add a prominent "Play Online" button alongside the existing single-player flow
- App.tsx: add routing for `online-lobby` and `online-game` screens

### Remove
- Nothing removed

## Implementation Plan
1. Backend: add match room types and state — MatchRoom (id, level, player1/2 name+score+moves+lastMoveTime, status), methods: createRoom, joinRoom, getRoom, updatePlayerState, listOpenRooms
2. Backend: timer enforcement — if a player's lastMoveTime is > 30s old when they submit a move, reject or skip; track missed turns
3. Frontend: OnlineLobby page — name input, create room (shows room code), join room (enter code), list open rooms
4. Frontend: OnlineGameBoard page — wraps existing game logic but syncs score+moves to backend after every successful match; polls opponent state every 2s; shows countdown timer that resets on each move
5. Frontend: App.tsx routing for new screens
6. Dashboard: "Play Online" button
