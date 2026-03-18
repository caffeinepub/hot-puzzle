import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";

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

  // -------------- State --------------
  let playerStates = Map.empty<Principal, PlayerState>();

  // -------------- Player State --------------
  module PlayerState {
    public func compare(player1 : PlayerState, player2 : PlayerState) : Order.Order {
      Nat.compare(player2.profile.totalScore, player1.profile.totalScore);
    };
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // -------------- Public Methods --------------
  public query ({ caller }) func getPlayerProfile() : async PlayerProfile {
    // Only allow caller to view their own profile
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
    // No authorization needed - leaderboard is public for all users including guests
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
    // No authorization needed - level configuration is public for all users including guests
    if (level > 2000 or level == 0) {
      Runtime.trap("Invalid level");
    };
    let gridSize = 4 + (level - 1) / 500;
    let targetScore = 1000 + (level * 50);
    {
      gridSize;
      targetScore;
    };
  };

  // Only allow the caller to save and access their own profile
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
