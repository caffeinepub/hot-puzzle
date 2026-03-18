import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Play,
  Star,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import { useGameSounds } from "../hooks/useGameSounds";

const LEVELS_PER_PAGE = 50;
const TOTAL_LEVELS = 2000;

const PAGE_BUTTONS = [1, 2, 3, "...", 39, 40] as const;

interface DashboardProps {
  onPlayLevel: (level: number) => void;
  onPlayOnline: () => void;
}

export default function Dashboard({
  onPlayLevel,
  onPlayOnline,
}: DashboardProps) {
  const { play, toggle, isMuted } = useGameSounds();

  const [page, setPage] = useState(1);
  const [currentLevel, _setCurrentLevel] = useState(() => {
    try {
      return Number(localStorage.getItem("hotpuzzle_level") || "1") || 1;
    } catch {
      return 1;
    }
  });

  const totalPages = Math.ceil(TOTAL_LEVELS / LEVELS_PER_PAGE);
  const startLevel = (page - 1) * LEVELS_PER_PAGE + 1;
  const levels = Array.from(
    { length: Math.min(LEVELS_PER_PAGE, TOTAL_LEVELS - startLevel + 1) },
    (_, i) => startLevel + i,
  );

  const handlePlayLevel = (level: number) => {
    if (level > currentLevel) return;
    play("level_select");
    onPlayLevel(level);
  };

  const getLevelStatus = (level: number) => {
    if (level < currentLevel) return "completed";
    if (level === currentLevel) return "current";
    return "locked";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-20"
        style={{
          background: "rgba(10,0,30,0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,106,0,0.3)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <img
            src="/assets/generated/hot-puzzle-logo.dim_600x200.png"
            alt="HOT PUZZLE"
            className="h-10 object-contain"
          />

          <div className="flex items-center gap-4">
            <Badge
              className="text-xs"
              style={{
                background: "rgba(255,106,0,0.2)",
                color: "#ff6a00",
                border: "1px solid rgba(255,106,0,0.4)",
              }}
            >
              Lvl {currentLevel}
            </Badge>
            <Button
              data-ocid="dashboard.toggle"
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div>
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                data-ocid="dashboard.primary_button"
                onClick={() => {
                  play("button_click");
                  onPlayLevel(currentLevel);
                }}
                className="w-full py-6 text-xl font-bold pulse-glow"
                style={{
                  background: "linear-gradient(135deg, #ff6a00, #ee0979)",
                  border: "none",
                  color: "#fff",
                }}
              >
                <Play className="w-6 h-6 mr-2" />
                CONTINUE — Level {currentLevel}
              </Button>

              <Button
                data-ocid="dashboard.secondary_button"
                onClick={() => {
                  play("button_click");
                  onPlayOnline();
                }}
                className="w-full py-6 text-xl font-bold"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  border: "1px solid rgba(168,85,247,0.4)",
                  color: "#fff",
                  boxShadow: "0 0 20px rgba(124,58,237,0.3)",
                }}
              >
                <Swords className="w-6 h-6 mr-2" />
                PLAY ONLINE ⚔️
              </Button>
            </div>

            <div className="game-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: "#ffc800" }}>
                  Select Level
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <span className="text-xs">
                    ({startLevel}–
                    {Math.min(startLevel + LEVELS_PER_PAGE - 1, TOTAL_LEVELS)})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-10 gap-1.5 mb-4">
                {levels.map((level) => {
                  const status = getLevelStatus(level);
                  const posInPage = level % LEVELS_PER_PAGE || LEVELS_PER_PAGE;
                  return (
                    <button
                      type="button"
                      key={level}
                      data-ocid={`dashboard.item.${posInPage}`}
                      onClick={() => handlePlayLevel(level)}
                      className={`level-cell ${status} flex flex-col items-center justify-center p-1 aspect-square`}
                    >
                      <span
                        className="text-xs font-bold leading-none"
                        style={{
                          color:
                            status === "locked"
                              ? "#666"
                              : status === "current"
                                ? "#ffc800"
                                : "#7eff7e",
                        }}
                      >
                        {level}
                      </span>
                      <span className="text-xs mt-0.5">
                        {status === "locked" ? (
                          <Lock className="w-2.5 h-2.5 text-gray-500" />
                        ) : status === "completed" ? (
                          <Star className="w-2.5 h-2.5 text-green-400 fill-green-400" />
                        ) : (
                          <span className="text-yellow-400 text-xs">▶</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  data-ocid="dashboard.pagination_prev"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-orange-400 hover:text-orange-300 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>

                <div className="flex gap-1">
                  {PAGE_BUTTONS.map((p) => {
                    if (p === "...")
                      return (
                        <span
                          key="ellipsis"
                          className="text-muted-foreground px-1"
                        >
                          ...
                        </span>
                      );
                    const pageNum = p as number;
                    return (
                      <button
                        type="button"
                        key={`page-${pageNum}`}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                          page === pageNum
                            ? "text-black"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        style={
                          page === pageNum
                            ? { background: "#ff6a00" }
                            : { background: "rgba(255,255,255,0.05)" }
                        }
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <Button
                  data-ocid="dashboard.pagination_next"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-orange-400 hover:text-orange-300 disabled:opacity-30"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>

          <aside className="game-card p-4 h-fit lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="text-yellow-400 w-5 h-5" />
              <h3 className="text-base font-bold text-yellow-400">
                Top Scores
              </h3>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-2">
                {[
                  { name: "FruitMaster", score: 98420, level: 142 },
                  { name: "PuzzleKing", score: 87110, level: 118 },
                  { name: "StarCrusher", score: 74300, level: 95 },
                  { name: "MatchWizard", score: 61880, level: 77 },
                  { name: "CandyAce", score: 53200, level: 64 },
                  { name: "BlastQueen", score: 44750, level: 52 },
                  { name: "TileHero", score: 37640, level: 43 },
                  { name: "ComboChamp", score: 29900, level: 35 },
                  { name: "SwapStar", score: 22100, level: 27 },
                  { name: "NewPlayer", score: 14500, level: 18 },
                ].map((player, i) => (
                  <div
                    key={player.name}
                    data-ocid={`dashboard.item.${i + 1}`}
                    className="flex items-center justify-between px-2 py-2 rounded-lg"
                    style={{
                      background:
                        i === 0
                          ? "rgba(255,200,0,0.15)"
                          : i === 1
                            ? "rgba(192,192,192,0.1)"
                            : i === 2
                              ? "rgba(180,100,0,0.1)"
                              : "rgba(255,255,255,0.04)",
                      border: `1px solid ${
                        i === 0
                          ? "rgba(255,200,0,0.3)"
                          : i === 1
                            ? "rgba(192,192,192,0.2)"
                            : i === 2
                              ? "rgba(180,100,0,0.2)"
                              : "transparent"
                      }`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm w-6 text-center">
                        {i === 0
                          ? "🥇"
                          : i === 1
                            ? "🥈"
                            : i === 2
                              ? "🥉"
                              : `${i + 1}`}
                      </span>
                      <span className="text-sm text-foreground truncate max-w-[90px]">
                        {player.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-yellow-400 text-xs font-bold">
                        {player.score.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Lvl {player.level}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </main>

      <footer className="text-center text-xs text-muted-foreground py-4">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
