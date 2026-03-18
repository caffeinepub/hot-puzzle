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
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useGameSounds } from "../hooks/useGameSounds";
import {
  FRUITS,
  FRUIT_BG,
  FRUIT_SHADOW,
  findMatchGroups,
  generateGrid,
  getGridSize,
  getLocalTargetScore,
  getMatchedCells,
  getMaxMoves,
  hasValidSwap,
  processAllMatches,
} from "../utils/gameLogic";

interface GameBoardProps {
  level: number;
  onBack: () => void;
  onNextLevel: (next: number) => void;
}

type GameState = "playing" | "won" | "lost";

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
          transform: isSelected
            ? "rotateX(15deg) scale(1.08)"
            : "rotateX(15deg) scale(1)",
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
          transition: "box-shadow 0.15s ease, transform 0.18s ease",
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function GameBoard({
  level,
  onBack,
  onNextLevel,
}: GameBoardProps) {
  const { play, toggle, isMuted } = useGameSounds();

  const gridSize = useMemo(() => getGridSize(level), [level]);
  const targetScore = useMemo(
    () => getLocalTargetScore(level, gridSize),
    [level, gridSize],
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevGameState, setPrevGameState] = useState<GameState>("playing");

  const tileSize = useMemo(() => {
    const maxWidth = Math.min(
      520,
      typeof window !== "undefined" ? window.innerWidth * 0.9 : 520,
    );
    const gaps = 4 * (gridSize - 1);
    return Math.floor((maxWidth - gaps) / gridSize);
  }, [gridSize]);

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
      setPrevGameState("playing");
      setSelected(null);
      setClearingCells(new Set());
      setIsAnimating(false);
    }
  }, [gridSize, maxMoves]);

  // Play sounds on game state transitions
  useEffect(() => {
    if (gameState === prevGameState) return;
    if (gameState === "won") play("level_win");
    if (gameState === "lost") play("game_over");
    setPrevGameState(gameState);
  }, [gameState, prevGameState, play]);

  // Save level progress to localStorage
  useEffect(() => {
    if (gameState === "won") {
      try {
        const saved =
          Number(localStorage.getItem("hotpuzzle_level") || "1") || 1;
        if (level >= saved) {
          localStorage.setItem("hotpuzzle_level", String(level + 1));
        }
      } catch {
        /**/
      }
    }
  }, [gameState, level]);

  useEffect(() => {
    if (gameState !== "playing") return;
    if (score >= targetScore) {
      const stars =
        score >= targetScore * 3 ? 3 : score >= targetScore * 1.5 ? 2 : 1;
      setStarsEarned(stars);
      setGameState("won");
    } else if (moves <= 0) {
      setGameState("lost");
    }
  }, [score, moves, targetScore, gameState]);

  const handleTileClick = useCallback(
    (row: number, col: number) => {
      if (gameState !== "playing" || isAnimating) return;

      if (!selected) {
        play("tile_select");
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
        play("tile_select");
        setSelected([row, col]);
        return;
      }

      play("tile_swap");
      setIsAnimating(true);
      setSelected(null);

      const swappedGrid = grid.map((r) => [...r]);
      [swappedGrid[sr][sc], swappedGrid[row][col]] = [
        swappedGrid[row][col],
        swappedGrid[sr][sc],
      ];
      setGrid(swappedGrid);

      (async () => {
        await sleep(150);

        const groups = findMatchGroups(swappedGrid);

        if (groups.length === 0) {
          play("no_match");
          setShakeGrid(true);
          await sleep(400);
          setShakeGrid(false);
          const revertedGrid = swappedGrid.map((r) => [...r]);
          [revertedGrid[sr][sc], revertedGrid[row][col]] = [
            revertedGrid[row][col],
            revertedGrid[sr][sc],
          ];
          setGrid(revertedGrid);
          setIsAnimating(false);
          return;
        }

        play("match");
        const matchedCells = getMatchedCells(groups);
        setClearingCells(new Set(matchedCells));

        await sleep(350);

        const result = processAllMatches(swappedGrid);
        const initialMatchScore = groups.reduce(
          (acc, g) => acc + g.length * 10,
          0,
        );
        if (result.scoreGained > initialMatchScore * 1.5) {
          const chainLevel = Math.min(
            4,
            Math.floor(result.scoreGained / (initialMatchScore * 1.5)),
          );
          play("chain", chainLevel);
        }

        setClearingCells(new Set());
        setGrid(result.grid);
        setScore((prev) => prev + result.scoreGained);
        setMoves((prev) => prev - 1);

        await sleep(100);
        if (!hasValidSwap(result.grid)) {
          play("shuffle");
          toast.info("No moves left — shuffling grid! 🔀");
          setGrid(generateGrid(gridSize));
        }

        setIsAnimating(false);
      })();
    },
    [gameState, isAnimating, selected, grid, gridSize, play],
  );

  const handleRestart = () => {
    setGrid(generateGrid(gridSize));
    setScore(0);
    setMoves(maxMoves);
    setGameState("playing");
    setPrevGameState("playing");
    setSelected(null);
    setClearingCells(new Set());
    setIsAnimating(false);
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
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-yellow-400 text-sm font-bold">
                {score.toLocaleString()} pts
              </div>
              <div className="text-xs text-muted-foreground">
                Target: {targetScore.toLocaleString()}
              </div>
            </div>
            <Button
              data-ocid="game.toggle"
              variant="ghost"
              size="sm"
              onClick={toggle}
              className="text-muted-foreground hover:text-foreground"
              aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
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
          style={{
            perspective: "1000px",
            display: "inline-block",
            cursor: isAnimating ? "wait" : "default",
          }}
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
          {isAnimating
            ? "✨ Matching fruits..."
            : selected
              ? "✨ Now click an adjacent fruit to swap!"
              : "👆 Click a fruit to select it, then click an adjacent fruit to swap"}
        </p>

        <Button
          data-ocid="game.secondary_button"
          variant="ghost"
          size="sm"
          onClick={handleRestart}
          disabled={isAnimating}
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Restart Level
        </Button>
      </main>

      {/* Win Modal */}
      <Dialog open={gameState === "won"} onOpenChange={() => {}}>
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
                {level >= 2000 ? "🏆 Champion!" : "Next Level →"}
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
