import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // -------------- Types --------------
  type LevelProgress = {
    bestScore : Nat;
    completed : Bool;
  };

  type PlayerProfile = {
    username : Text;
    currentLevel : Nat;
    totalScore : Nat;
  };

  type PlayerState = {
    profile : PlayerProfile;
    levelProgress : Map.Map<Nat, LevelProgress>;
  };

  type MatchStatus = { #waiting; #playing; #finished };

  type MatchPlayer = {
    name : Text;
    score : Nat;
    moves : Nat;
    missedTurns : Nat;
    lastMoveTime : Int; // nanoseconds
    finished : Bool;
  };

  type MatchRoom = {
    id : Text;
    level : Nat;
    status : MatchStatus;
    player1 : MatchPlayer;
    player2 : ?MatchPlayer;
    createdAt : Int;
  };

  type MatchRoomView = {
    id : Text;
    level : Nat;
    status : Text;
    player1 : MatchPlayer;
    player2 : ?MatchPlayer;
    createdAt : Int;
  };

  // -------------- State --------------
  let playerStates = Map.empty<Principal, PlayerState>();
  let matchRooms = Map.empty<Text, MatchRoom>();
  var roomCounter : Nat = 1000;

  // -------------- Player State helpers --------------
  module PlayerStateM {
    public func compare(p1 : PlayerState, p2 : PlayerState) : Order.Order {
      Nat.compare(p2.profile.totalScore, p1.profile.totalScore);
    };
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // -------------- Utility --------------
  func matchStatusToText(s : MatchStatus) : Text {
    switch s {
      case (#waiting) "waiting";
      case (#playing) "playing";
      case (#finished) "finished";
    };
  };

  func roomToView(room : MatchRoom) : MatchRoomView {
    {
      id = room.id;
      level = room.level;
      status = matchStatusToText(room.status);
      player1 = room.player1;
      player2 = room.player2;
      createdAt = room.createdAt;
    };
  };

  func generateRoomCode() : Text {
    roomCounter += 1;
    roomCounter.toText();
  };

  // -------------- Match Room Public Methods --------------

  public shared func createRoom(playerName : Text, level : Nat) : async Text {
    if (level == 0 or level > 2000) Runtime.trap("Invalid level");
    let code = generateRoomCode();
    let now = Time.now();
    let player1 : MatchPlayer = {
      name = playerName;
      score = 0;
      moves = 0;
      missedTurns = 0;
      lastMoveTime = now;
      finished = false;
    };
    let room : MatchRoom = {
      id = code;
      level;
      status = #waiting;
      player1;
      player2 = null;
      createdAt = now;
    };
    matchRooms.add(code, room);
    code;
  };

  public shared func joinRoom(roomId : Text, playerName : Text) : async MatchRoomView {
    switch (matchRooms.get(roomId)) {
      case (null) Runtime.trap("Room not found");
      case (?room) {
        switch (room.status) {
          case (#waiting) {};
          case (_) Runtime.trap("Room is not open for joining");
        };
        let now = Time.now();
        let player2 : MatchPlayer = {
          name = playerName;
          score = 0;
          moves = 0;
          missedTurns = 0;
          lastMoveTime = now;
          finished = false;
        };
        let updated : MatchRoom = {
          room with
          status = #playing;
          player2 = ?player2;
        };
        matchRooms.add(roomId, updated);
        roomToView(updated);
      };
    };
  };

  public query func getRoom(roomId : Text) : async MatchRoomView {
    switch (matchRooms.get(roomId)) {
      case (null) Runtime.trap("Room not found");
      case (?room) roomToView(room);
    };
  };

  public query func listOpenRooms() : async [MatchRoomView] {
    let all = matchRooms.values().toArray();
    let open = all.filter(func(r : MatchRoom) : Bool {
      switch (r.status) { case (#waiting) true; case (_) false };
    });
    open.map(roomToView);
  };

  // playerIndex: 1 or 2
  public shared func updatePlayerState(
    roomId : Text,
    playerIndex : Nat,
    score : Nat,
    moves : Nat,
    finished : Bool,
  ) : async MatchRoomView {
    switch (matchRooms.get(roomId)) {
      case (null) Runtime.trap("Room not found");
      case (?room) {
        let now = Time.now();
        let moveTimeLimitNs : Int = 30_000_000_000; // 30 seconds

        if (playerIndex == 1) {
          let elapsed = now - room.player1.lastMoveTime;
          let missed = if (elapsed > moveTimeLimitNs) { room.player1.missedTurns + 1 } else { room.player1.missedTurns };
          let updatedP1 : MatchPlayer = {
            room.player1 with
            score;
            moves;
            finished;
            missedTurns = missed;
            lastMoveTime = now;
          };
          let updated : MatchRoom = { room with player1 = updatedP1 };
          let finalRoom = checkFinished(updated);
          matchRooms.add(roomId, finalRoom);
          roomToView(finalRoom);
        } else if (playerIndex == 2) {
          switch (room.player2) {
            case (null) Runtime.trap("Player 2 has not joined");
            case (?p2) {
              let elapsed = now - p2.lastMoveTime;
              let missed = if (elapsed > moveTimeLimitNs) { p2.missedTurns + 1 } else { p2.missedTurns };
              let updatedP2 : MatchPlayer = {
                p2 with
                score;
                moves;
                finished;
                missedTurns = missed;
                lastMoveTime = now;
              };
              let updated : MatchRoom = { room with player2 = ?updatedP2 };
              let finalRoom = checkFinished(updated);
              matchRooms.add(roomId, finalRoom);
              roomToView(finalRoom);
            };
          };
        } else {
          Runtime.trap("Invalid player index");
        };
      };
    };
  };

  public shared func forfeitRoom(roomId : Text, playerIndex : Nat) : async MatchRoomView {
    switch (matchRooms.get(roomId)) {
      case (null) Runtime.trap("Room not found");
      case (?room) {
        let now = Time.now();
        if (playerIndex == 1) {
          let updatedP1 : MatchPlayer = { room.player1 with finished = true; lastMoveTime = now };
          let updated : MatchRoom = { room with player1 = updatedP1 };
          let finalRoom = checkFinished(updated);
          matchRooms.add(roomId, finalRoom);
          roomToView(finalRoom);
        } else {
          switch (room.player2) {
            case (null) Runtime.trap("Player 2 not in room");
            case (?p2) {
              let updatedP2 : MatchPlayer = { p2 with finished = true; lastMoveTime = now };
              let updated : MatchRoom = { room with player2 = ?updatedP2 };
              let finalRoom = checkFinished(updated);
              matchRooms.add(roomId, finalRoom);
              roomToView(finalRoom);
            };
          };
        };
      };
    };
  };

  func checkFinished(room : MatchRoom) : MatchRoom {
    switch (room.player2) {
      case (null) room;
      case (?p2) {
        if (room.player1.finished and p2.finished) {
          { room with status = #finished };
        } else {
          room;
        };
      };
    };
  };

  // -------------- Single-player methods (unchanged) --------------

  public query ({ caller }) func getPlayerProfile() : async PlayerProfile {
    switch (playerStates.get(caller)) {
      case (null) { Runtime.trap("This user is not registered") };
      case (?playerState) { playerState.profile };
    };
  };

  public query ({ caller }) func getLevelProgress(_level : Nat) : async LevelProgress {
    switch (playerStates.get(caller)) {
      case (null) { Runtime.trap("This user is not registered") };
      case (?playerState) {
        switch (playerState.levelProgress.get(_level)) {
          case (null) { Runtime.trap("Level progress not found") };
          case (?progress) { progress };
        };
      };
    };
  };

  public query func getTopPlayers() : async [PlayerProfile] {
    let profiles = playerStates.values().toArray();
    let sorted = profiles.sort();
    Array.tabulate(
      Nat.min(10, sorted.size()),
      func(i) { sorted[i].profile },
    );
  };

  public shared ({ caller }) func resetAllPlayerData() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can reset data");
    };
    playerStates.clear();
  };

  public query func getLevelConfig(level : Nat) : async {
    gridSize : Nat;
    targetScore : Nat;
  } {
    if (level > 2000 or level == 0) {
      Runtime.trap("Invalid level");
    };
    let gridSize = 4 + (level - 1) / 500;
    let targetScore = 1000 + (level * 50);
    { gridSize; targetScore };
  };

  public shared ({ caller }) func savePlayerProfile(profile : PlayerProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    let levels = Map.empty<Nat, LevelProgress>();
    playerStates.add(caller, { profile; levelProgress = levels });
  };

  public shared ({ caller }) func saveLevelProgress(level : Nat, progress : LevelProgress) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save level progress");
    };
    switch (playerStates.get(caller)) {
      case (null) { Runtime.trap("This user is not registered") };
      case (?playerState) {
        let existing = playerState.levelProgress.get(level);
        let bestScore = switch (existing) {
          case (null) { progress.bestScore };
          case (?existingProgress) { Nat.max(existingProgress.bestScore, progress.bestScore) };
        };
        playerState.levelProgress.add(level, { progress with bestScore });
        let updatedProfile = {
          playerState.profile with
          totalScore = calculateTotalScore(playerState.levelProgress);
        };
        playerStates.add(caller, {
          profile = updatedProfile;
          levelProgress = playerState.levelProgress;
        });
      };
    };
  };

  func calculateTotalScore(levels : Map.Map<Nat, LevelProgress>) : Nat {
    var total = 0;
    for ((_, progress) in levels.entries()) {
      total += progress.bestScore;
    };
    total;
  };
};
