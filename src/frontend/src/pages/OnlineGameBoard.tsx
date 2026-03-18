import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Loader2, Trophy, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
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

const MOVE_TIME_LIMIT = 30;

export interface OnlineGameBoardProps {
  roomId: string;
  playerName: string;
  playerIndex: number;
  level: number;
  onBack: () => void;
}

interface MatchPlayer {
  name: string;
  score: bigint;
  moves: bigint;
  missedTurns: bigint;
  lastMoveTime: bigint;
  finished: boolean;
}

interface MatchRoomView {
  id: string;
  level: number;
  status: string;
  player1: MatchPlayer;
  player2: MatchPlayer | null;
  createdAt: bigint;
}

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

export default function OnlineGameBoard({
  roomId,
  playerName,
  playerIndex,
  level,
  onBack,
}: OnlineGameBoardProps) {
  const { actor } = useActor();
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
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());
  const [shakeGrid, setShakeGrid] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [localFinished, setLocalFinished] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(MOVE_TIME_LIMIT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Opponent state
  const [opponentName, setOpponentName] = useState("");
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentMoves, setOpponentMoves] = useState(maxMoves);
  const [opponentFinished, setOpponentFinished] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const tileSize = useMemo(() => {
    const maxWidth = Math.min(
      480,
      typeof window !== "undefined" ? window.innerWidth * 0.88 : 480,
    );
    const gaps = 4 * (gridSize - 1);
    return Math.floor((maxWidth - gaps) / gridSize);
  }, [gridSize]);

  // Initialize grid
  useEffect(() => {
    if (gridSize > 0) {
      setGrid(generateGrid(gridSize));
      setScore(0);
      setMoves(maxMoves);
      setLocalFinished(false);
      setSelected(null);
      setClearingCells(new Set());
      setIsAnimating(false);
      setTimeLeft(MOVE_TIME_LIMIT);
    }
  }, [gridSize, maxMoves]);

  // Timer countdown
  const resetTimer = useCallback(() => {
    setTimeLeft(MOVE_TIME_LIMIT);
  }, []);

  useEffect(() => {
    if (localFinished) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up — forfeit the move
          toast.warning("⏰ Time's up! Move skipped.", { duration: 2000 });
          setSelected(null);
          setMoves((m) => {
            const newMoves = Math.max(0, m - 1);
            if (newMoves <= 0) {
              setLocalFinished(true);
            }
            return newMoves;
          });
          return MOVE_TIME_LIMIT;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [localFinished]);

  // Poll room state
  useEffect(() => {
    if (!actor) return;
    const poll = async () => {
      try {
        const room = (await (actor as any).getRoom(roomId)) as MatchRoomView;
        if (!room) return;

        const opponent = playerIndex === 1 ? room.player2 : room.player1;
        if (opponent) {
          setOpponentName(opponent.name);
          setOpponentScore(Number(opponent.score));
          setOpponentMoves(Number(opponent.moves));
          setOpponentFinished(opponent.finished);
        }
        if (room.status === "finished") {
          setShowResults(true);
        }
      } catch {
        // ignore
      }
    };
    poll();
    pollRef.current = setInterval(poll, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [actor, roomId, playerIndex]);

  // When local player finishes
  useEffect(() => {
    if (!localFinished || !actor) return;
    (async () => {
      try {
        await (actor as any).updatePlayerState(
          roomId,
          playerIndex,
          score,
          0,
          true,
        );
      } catch {
        // ignore
      }
    })();
  }, [localFinished, actor, roomId, playerIndex, score]);

  // Check if both finished
  useEffect(() => {
    if (localFinished && opponentFinished) {
      setShowResults(true);
    }
  }, [localFinished, opponentFinished]);

  const handleTileClick = useCallback(
    (row: number, col: number) => {
      if (localFinished || isAnimating) return;

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
        setClearingCells(new Set());
        setGrid(result.grid);

        let newScore = 0;
        let newMoves = 0;
        let finished = false;

        setScore((prev) => {
          newScore = prev + result.scoreGained;
          return newScore;
        });
        setMoves((prev) => {
          newMoves = prev - 1;
          finished = newMoves <= 0 || newScore >= targetScore;
          return newMoves;
        });

        // Reset timer on successful move
        resetTimer();

        // Update backend
        if (actor) {
          try {
            await (actor as any).updatePlayerState(
              roomId,
              playerIndex,
              newScore,
              newMoves,
              finished,
            );
          } catch {
            // ignore
          }
        }

        if (finished) setLocalFinished(true);

        await sleep(100);
        if (!hasValidSwap(result.grid)) {
          play("shuffle");
          toast.info("No moves — shuffling! 🔀");
          setGrid(generateGrid(gridSize));
        }

        setIsAnimating(false);
      })();
    },
    [
      localFinished,
      isAnimating,
      selected,
      grid,
      gridSize,
      play,
      actor,
      roomId,
      playerIndex,
      targetScore,
      resetTimer,
    ],
  );

  const handleBack = async () => {
    if (actor && !localFinished) {
      try {
        await (actor as any).forfeitRoom(roomId, playerIndex);
      } catch {
        // ignore
      }
    }
    onBack();
  };

  const timerColor =
    timeLeft > 15 ? "#4ade80" : timeLeft > 8 ? "#facc15" : "#f87171";

  const isMe = true;
  const scorePercent = Math.min(100, Math.round((score / targetScore) * 100));

  if (grid.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-400 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Online Battle...</p>
        </div>
      </div>
    );
  }

  const isWinner = score > opponentScore;
  const isTie = score === opponentScore;

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
            data-ocid="online_game.secondary_button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-orange-400 hover:text-orange-300"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Leave
          </Button>
          <div className="fire-title text-lg font-bold text-center">
            LEVEL {level} — ONLINE ⚔️
          </div>
          <Button
            data-ocid="online_game.toggle"
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="text-muted-foreground hover:text-foreground"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      <main className="w-full max-w-2xl mx-auto px-4 py-4 flex flex-col items-center gap-4">
        {/* Move Timer */}
        {!localFinished && (
          <div className="w-full flex items-center justify-center gap-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Move Timer
            </span>
            <div
              className="font-mono font-bold text-3xl"
              style={{
                color: timerColor,
                textShadow: `0 0 12px ${timerColor}`,
                minWidth: "2ch",
                textAlign: "center",
              }}
            >
              {timeLeft}
            </div>
            <span className="text-xs text-muted-foreground">sec</span>
          </div>
        )}

        {/* Score Panels */}
        <div className="w-full grid grid-cols-2 gap-3">
          {/* You */}
          <div
            data-ocid="online_game.panel"
            className="game-card p-3"
            style={{
              border: isMe
                ? "1px solid rgba(255,106,0,0.6)"
                : "1px solid rgba(255,255,255,0.1)",
              boxShadow: isMe ? "0 0 16px rgba(255,106,0,0.2)" : "none",
            }}
          >
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
              YOU
            </div>
            <div className="font-bold text-white truncate text-sm">
              {playerName}
            </div>
            <div className="text-yellow-400 font-bold text-xl">
              {score.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Moves: {moves}</div>
            {localFinished && (
              <div className="text-xs text-green-400 mt-1">✓ Finished</div>
            )}
          </div>

          {/* Opponent */}
          <div
            data-ocid="online_game.panel"
            className="game-card p-3"
            style={{
              border: "1px solid rgba(147,51,234,0.4)",
              opacity: opponentName ? 1 : 0.5,
            }}
          >
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
              OPPONENT
            </div>
            {opponentName ? (
              <>
                <div className="font-bold text-white truncate text-sm">
                  {opponentName}
                </div>
                <div className="text-purple-400 font-bold text-xl">
                  {opponentScore.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Moves: {opponentMoves}
                </div>
                {opponentFinished && (
                  <div className="text-xs text-green-400 mt-1">✓ Finished</div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Waiting...
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Your Progress</span>
            <span>{scorePercent}%</span>
          </div>
          <Progress
            value={scorePercent}
            className="h-2"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
        </div>

        {/* Game Board */}
        {localFinished ? (
          <div
            className="game-card p-8 text-center w-full"
            data-ocid="online_game.panel"
          >
            <div className="text-4xl mb-3">✅</div>
            <div className="fire-title text-2xl mb-2">YOUR MOVES ARE DONE!</div>
            <p className="text-muted-foreground">
              Waiting for opponent to finish...
            </p>
            {opponentFinished && (
              <p className="text-green-400 text-sm mt-2">
                Opponent finished too! Calculating results...
              </p>
            )}
          </div>
        ) : (
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
                  isClearing={clearingCells.has(
                    `${tile.rowIdx},${tile.colIdx}`,
                  )}
                  onClick={() => handleTileClick(tile.rowIdx, tile.colIdx)}
                  size={tileSize}
                />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {localFinished
            ? "⏳ Waiting for results..."
            : isAnimating
              ? "✨ Matching fruits..."
              : selected
                ? "✨ Click an adjacent fruit to swap!"
                : "👆 Click a fruit to select, then click adjacent to swap"}
        </p>
      </main>

      {/* Results Modal */}
      <Dialog open={showResults} onOpenChange={() => {}}>
        <DialogContent
          data-ocid="online_game.dialog"
          className="game-card border-0 text-center max-w-sm"
          style={{
            background: "rgba(5,0,20,0.97)",
            border: `1px solid ${
              isTie
                ? "rgba(255,200,0,0.5)"
                : isWinner
                  ? "rgba(255,106,0,0.6)"
                  : "rgba(147,51,234,0.5)"
            }`,
          }}
        >
          <DialogHeader>
            <DialogTitle className="fire-title text-3xl text-center">
              {isTie
                ? "IT'S A TIE! 🤝"
                : isWinner
                  ? "YOU WIN! 🏆"
                  : "YOU LOSE! 💔"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-5xl mb-4">
              {isTie ? "🤝" : isWinner ? "🥇" : "🥈"}
            </div>

            {/* Score comparison */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(255,106,0,0.1)",
                  border: `2px solid ${isWinner || isTie ? "rgba(255,106,0,0.5)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <div className="text-xs text-muted-foreground mb-1">YOU</div>
                <div className="font-bold text-sm text-white truncate">
                  {playerName}
                </div>
                <div className="text-2xl font-bold text-yellow-400">
                  {score.toLocaleString()}
                </div>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(147,51,234,0.1)",
                  border: `2px solid ${!isWinner || isTie ? "rgba(147,51,234,0.5)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  OPPONENT
                </div>
                <div className="font-bold text-sm text-white truncate">
                  {opponentName || "?"}
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  {opponentScore.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-6">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>
                Target was{" "}
                <strong className="text-white">
                  {targetScore.toLocaleString()}
                </strong>{" "}
                points
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                data-ocid="online_game.cancel_button"
                variant="ghost"
                onClick={onBack}
                className="border border-muted"
              >
                Dashboard
              </Button>
              <Button
                data-ocid="online_game.confirm_button"
                onClick={onBack}
                className="font-bold"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  border: "none",
                  color: "#fff",
                }}
              >
                Play Again ⚔️
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
