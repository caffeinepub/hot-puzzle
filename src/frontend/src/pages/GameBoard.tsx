import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useLevelConfig,
  usePlayerProfile,
  useSaveLevelProgress,
  useSavePlayerProfile,
} from "../hooks/useQueries";
import {
  FRUITS,
  FRUIT_BG,
  FRUIT_SHADOW,
  findMatchGroups,
  generateGrid,
  getGridSize,
  getLocalTargetScore,
  getMaxMoves,
  hasValidSwap,
  processAllMatches,
} from "../utils/gameLogic";

interface GameBoardProps {
  level: number;
  onBack: () => void;
  onNextLevel: (next: number) => void;
}

type GameState = "playing" | "won" | "lost" | "saving";

interface TileData {
  tileKey: string;
  rowIdx: number;
  colIdx: number;
  fruit: number;
}

function FruitTile({
  fruit,
  isSelected,
  isClearing,
  onClick,
  size,
}: {
  fruit: number;
  isSelected: boolean;
  isClearing: boolean;
  onClick: () => void;
  size: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      aria-label={`${FRUITS[fruit]} fruit tile`}
      aria-pressed={isSelected}
      style={{
        width: size,
        height: size,
        perspective: "500px",
        cursor: "pointer",
        flexShrink: 0,
        background: "none",
        border: "none",
        padding: 0,
      }}
    >
      <div
        className={isClearing ? "clearing" : ""}
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(145deg, ${FRUIT_BG[fruit]}, ${FRUIT_SHADOW[fruit]})`,
          borderRadius: Math.max(6, size * 0.15),
          transform: "rotateX(15deg)",
          transformOrigin: "center bottom",
          boxShadow: isSelected
            ? `0 0 16px rgba(255,200,0,0.9), 0 0 30px rgba(255,106,0,0.6), 0 ${Math.round(size * 0.1)}px 0 ${FRUIT_SHADOW[fruit]}, 0 ${Math.round(size * 0.14)}px 12px rgba(0,0,0,0.5)`
            : `0 ${Math.round(size * 0.1)}px 0 ${FRUIT_SHADOW[fruit]}, 0 ${Math.round(size * 0.14)}px 12px rgba(0,0,0,0.5)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.52,
          position: "relative",
          overflow: "hidden",
          transition: "box-shadow 0.15s ease, transform 0.15s ease",
          border: isSelected
            ? "2px solid rgba(255,220,0,0.9)"
            : "1px solid rgba(255,255,255,0.15)",
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "45%",
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.38), rgba(255,255,255,0))",
            borderRadius: `${Math.max(6, size * 0.15)}px ${Math.max(6, size * 0.15)}px 0 0`,
            pointerEvents: "none",
          }}
        />
        <span style={{ position: "relative", zIndex: 1 }}>{FRUITS[fruit]}</span>
      </div>
    </button>
  );
}

export default function GameBoard({
  level,
  onBack,
  onNextLevel,
}: GameBoardProps) {
  const { data: profile } = usePlayerProfile();
  const { data: levelConfig } = useLevelConfig(level);
  const saveProfile = useSavePlayerProfile();
  const saveLevelProgress = useSaveLevelProgress();

  const gridSize = useMemo(
    () => (levelConfig ? Number(levelConfig.gridSize) : getGridSize(level)),
    [levelConfig, level],
  );
  const targetScore = useMemo(
    () =>
      levelConfig
        ? Number(levelConfig.targetScore)
        : getLocalTargetScore(level, gridSize),
    [levelConfig, level, gridSize],
  );
  const maxMoves = getMaxMoves(level);

  const [grid, setGrid] = useState<number[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(maxMoves);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());
  const [shakeGrid, setShakeGrid] = useState(false);
  const [starsEarned, setStarsEarned] = useState(0);

  const tileSize = useMemo(() => {
    const maxWidth = Math.min(
      520,
      typeof window !== "undefined" ? window.innerWidth * 0.9 : 520,
    );
    const gaps = 4 * (gridSize - 1);
    return Math.floor((maxWidth - gaps) / gridSize);
  }, [gridSize]);

  // Flat tile list with stable keys (position-based, not map index)
  const flatTiles = useMemo<TileData[]>(() => {
    const tiles: TileData[] = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
        tiles.push({
          tileKey: `r${r}c${c}`,
          rowIdx: r,
          colIdx: c,
          fruit: grid[r][c],
        });
      }
    }
    return tiles;
  }, [grid]);

  useEffect(() => {
    if (gridSize > 0) {
      setGrid(generateGrid(gridSize));
      setScore(0);
      setMoves(maxMoves);
      setGameState("playing");
      setSelected(null);
      setClearingCells(new Set());
    }
  }, [gridSize, maxMoves]);

  const handleSaveProgress = useCallback(
    async (completed: boolean, finalScore: number) => {
      if (!profile) return;
      setGameState("saving");
      try {
        const newLevel =
          completed && level >= Number(profile.currentLevel)
            ? level + 1
            : Number(profile.currentLevel);
        const newTotal =
          Number(profile.totalScore) + (completed ? finalScore : 0);

        await Promise.all([
          saveLevelProgress.mutateAsync({
            level,
            progress: { completed, bestScore: BigInt(finalScore) },
          }),
          completed
            ? saveProfile.mutateAsync({
                username: profile.username,
                totalScore: BigInt(newTotal),
                currentLevel: BigInt(newLevel),
              })
            : Promise.resolve(),
        ]);
      } catch {
        toast.error("Failed to save progress");
      } finally {
        setGameState(completed ? "won" : "lost");
      }
    },
    [profile, level, saveLevelProgress, saveProfile],
  );

  useEffect(() => {
    if (gameState !== "playing") return;
    if (score >= targetScore) {
      const stars =
        score >= targetScore * 3 ? 3 : score >= targetScore * 1.5 ? 2 : 1;
      setStarsEarned(stars);
      handleSaveProgress(true, score);
    } else if (moves <= 0) {
      setGameState("lost");
    }
  }, [score, moves, targetScore, gameState, handleSaveProgress]);

  const handleTileClick = useCallback(
    (row: number, col: number) => {
      if (gameState !== "playing" || clearingCells.size > 0) return;

      if (!selected) {
        setSelected([row, col]);
        return;
      }

      const [sr, sc] = selected;

      if (sr === row && sc === col) {
        setSelected(null);
        return;
      }

      const isAdjacent =
        (Math.abs(sr - row) === 1 && sc === col) ||
        (Math.abs(sc - col) === 1 && sr === row);

      if (!isAdjacent) {
        setSelected([row, col]);
        return;
      }

      setSelected(null);

      const newGrid = grid.map((r) => [...r]);
      [newGrid[sr][sc], newGrid[row][col]] = [
        newGrid[row][col],
        newGrid[sr][sc],
      ];

      const groups = findMatchGroups(newGrid);
      if (groups.length === 0) {
        setShakeGrid(true);
        setTimeout(() => setShakeGrid(false), 400);
        return;
      }

      const result = processAllMatches(newGrid);
      setGrid(result.grid);
      setScore((prev) => prev + result.scoreGained);
      setMoves((prev) => prev - 1);

      setTimeout(() => {
        if (!hasValidSwap(result.grid)) {
          toast.info("No moves left — shuffling grid! 🔀");
          setGrid(generateGrid(gridSize));
        }
      }, 100);
    },
    [gameState, clearingCells, selected, grid, gridSize],
  );

  const handleRestart = () => {
    setGrid(generateGrid(gridSize));
    setScore(0);
    setMoves(maxMoves);
    setGameState("playing");
    setSelected(null);
    setClearingCells(new Set());
  };

  const scorePercent = Math.min(100, Math.round((score / targetScore) * 100));

  if (grid.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-400 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Level {level}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center">
      <header
        className="w-full sticky top-0 z-20"
        style={{
          background: "rgba(10,0,30,0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,106,0,0.3)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            data-ocid="game.secondary_button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-orange-400 hover:text-orange-300"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <div className="fire-title text-xl font-bold">LEVEL {level}</div>
          <div className="text-right">
            <div className="text-yellow-400 text-sm font-bold">
              {score.toLocaleString()} pts
            </div>
            <div className="text-xs text-muted-foreground">
              Target: {targetScore.toLocaleString()}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-2xl mx-auto px-4 py-4 flex flex-col items-center gap-4">
        <div className="w-full grid grid-cols-3 gap-3">
          <div className="game-card p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Moves</span>
            </div>
            <div
              className="text-2xl font-bold"
              style={{
                color:
                  moves <= 5 ? "#ff4444" : moves <= 10 ? "#ffaa00" : "#7eff7e",
              }}
            >
              {moves}
            </div>
          </div>
          <div className="game-card p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Score</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {score.toLocaleString()}
            </div>
          </div>
          <div className="game-card p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Target</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {targetScore.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{scorePercent}%</span>
          </div>
          <Progress
            value={scorePercent}
            className="h-3"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
        </div>

        <div
          className={shakeGrid ? "shake" : ""}
          style={{ perspective: "1000px", display: "inline-block" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridSize}, ${tileSize}px)`,
              gap: "4px",
              padding: "12px",
              background: "rgba(0,0,0,0.4)",
              borderRadius: "16px",
              border: "1px solid rgba(255,106,0,0.25)",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(100,0,200,0.2)",
            }}
          >
            {flatTiles.map((tile) => (
              <FruitTile
                key={tile.tileKey}
                fruit={tile.fruit}
                isSelected={
                  selected !== null &&
                  selected[0] === tile.rowIdx &&
                  selected[1] === tile.colIdx
                }
                isClearing={clearingCells.has(`${tile.rowIdx},${tile.colIdx}`)}
                onClick={() => handleTileClick(tile.rowIdx, tile.colIdx)}
                size={tileSize}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {selected
            ? "✨ Now click an adjacent fruit to swap!"
            : "👆 Click a fruit to select it, then click an adjacent fruit to swap"}
        </p>

        <Button
          data-ocid="game.secondary_button"
          variant="ghost"
          size="sm"
          onClick={handleRestart}
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Restart Level
        </Button>
      </main>

      {/* Win Modal */}
      <Dialog
        open={gameState === "won" || gameState === "saving"}
        onOpenChange={() => {}}
      >
        <DialogContent
          data-ocid="game.dialog"
          className="game-card border-0 text-center max-w-sm"
          style={{
            background: "rgba(5,0,20,0.97)",
            border: "1px solid rgba(255,200,0,0.5)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="fire-title text-3xl text-center">
              LEVEL COMPLETE!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={s <= starsEarned ? "star-pop" : "opacity-25"}
                  style={{
                    fontSize: "2.5rem",
                    animationDelay: `${(s - 1) * 0.15}s`,
                    display: "inline-block",
                  }}
                >
                  ⭐
                </span>
              ))}
            </div>
            <div className="text-4xl font-bold text-yellow-400 mb-1">
              {score.toLocaleString()}
            </div>
            <div className="text-muted-foreground text-sm mb-6">
              points earned
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                data-ocid="game.cancel_button"
                variant="ghost"
                onClick={onBack}
                className="border border-muted"
              >
                Dashboard
              </Button>
              <Button
                data-ocid="game.confirm_button"
                onClick={() => onNextLevel(level + 1)}
                disabled={level >= 2000}
                className="font-bold"
                style={{
                  background: "linear-gradient(135deg, #ff6a00, #ee0979)",
                  border: "none",
                  color: "#fff",
                }}
              >
                {gameState === "saving" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : level >= 2000 ? (
                  "🏆 Champion!"
                ) : (
                  "Next Level →"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lose Modal */}
      <Dialog open={gameState === "lost"} onOpenChange={() => {}}>
        <DialogContent
          data-ocid="game.modal"
          className="game-card border-0 text-center max-w-sm"
          style={{
            background: "rgba(20,0,0,0.97)",
            border: "1px solid rgba(255,60,60,0.4)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-red-400 text-center">
              Game Over 💔
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-6xl mb-4">😢</div>
            <p className="text-muted-foreground mb-2">
              You scored{" "}
              <span className="text-yellow-400 font-bold">
                {score.toLocaleString()}
              </span>{" "}
              points
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              Target was {targetScore.toLocaleString()} points
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                data-ocid="game.cancel_button"
                variant="ghost"
                onClick={onBack}
                className="border border-muted"
              >
                Dashboard
              </Button>
              <Button
                data-ocid="game.confirm_button"
                onClick={handleRestart}
                className="font-bold"
                style={{
                  background: "linear-gradient(135deg, #ff6a00, #ee0979)",
                  border: "none",
                  color: "#fff",
                }}
              >
                <RefreshCw className="w-4 h-4 mr-1" /> Try Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
