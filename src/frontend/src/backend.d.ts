import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface LevelProgress {
    completed: boolean;
    bestScore: bigint;
}
export interface PlayerProfile {
    username: string;
    totalScore: bigint;
    currentLevel: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    getLevelConfig(level: bigint): Promise<{
        targetScore: bigint;
        gridSize: bigint;
    }>;
    getLevelProgress(_level: bigint): Promise<LevelProgress>;
    getPlayerProfile(): Promise<PlayerProfile>;
    getTopPlayers(): Promise<Array<PlayerProfile>>;
    isCallerAdmin(): Promise<boolean>;
    resetAllPlayerData(): Promise<void>;
    saveLevelProgress(level: bigint, progress: LevelProgress): Promise<void>;
    savePlayerProfile(profile: PlayerProfile): Promise<void>;
}
