import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LevelProgress, PlayerProfile } from "../backend";
import { useActor } from "./useActor";

export function usePlayerProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<PlayerProfile>({
    queryKey: ["playerProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getPlayerProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTopPlayers() {
  const { actor, isFetching } = useActor();
  return useQuery<PlayerProfile[]>({
    queryKey: ["topPlayers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTopPlayers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useLevelConfig(level: number) {
  const { actor, isFetching } = useActor();
  return useQuery<{ targetScore: bigint; gridSize: bigint }>({
    queryKey: ["levelConfig", level],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getLevelConfig(BigInt(level));
    },
    enabled: !!actor && !isFetching && level > 0,
  });
}

export function useLevelProgress(level: number, enabled = true) {
  const { actor, isFetching } = useActor();
  return useQuery<LevelProgress>({
    queryKey: ["levelProgress", level],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getLevelProgress(BigInt(level));
    },
    enabled: !!actor && !isFetching && level > 0 && enabled,
  });
}

export function useSavePlayerProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: PlayerProfile) => {
      if (!actor) throw new Error("No actor");
      return actor.savePlayerProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["topPlayers"] });
    },
  });
}

export function useSaveLevelProgress() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      level,
      progress,
    }: { level: number; progress: LevelProgress }) => {
      if (!actor) throw new Error("No actor");
      return actor.saveLevelProgress(BigInt(level), progress);
    },
    onSuccess: (_data, { level }) => {
      queryClient.invalidateQueries({ queryKey: ["levelProgress", level] });
    },
  });
}
