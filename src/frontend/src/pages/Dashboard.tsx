import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  LogOut,
  Play,
  Star,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useGameSounds } from "../hooks/useGameSounds";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  usePlayerProfile,
  useSavePlayerProfile,
  useTopPlayers,
} from "../hooks/useQueries";

const LEVELS_PER_PAGE = 50;
const TOTAL_LEVELS = 2000;

const PAGE_BUTTONS = [1, 2, 3, "...", 39, 40] as const;

interface DashboardProps {
  onPlayLevel: (level: number) => void;
}

export default function Dashboard({ onPlayLevel }: DashboardProps) {
  const { clear } = useInternetIdentity();
  const { data: profile, isLoading: profileLoading } = usePlayerProfile();
  const { data: topPlayers } = useTopPlayers();
  const saveProfile = useSavePlayerProfile();
  const { play, toggle, isMuted } = useGameSounds();

  const [page, setPage] = useState(1);
  const [usernameInput, setUsernameInput] = useState("");
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);

  const currentLevel = profile ? Number(profile.currentLevel) || 1 : 1;
  const totalScore = profile ? Number(profile.totalScore) : 0;
  const username = profile?.username || "";
  const needsUsername = profile && !profile.username;
  const totalPages = Math.ceil(TOTAL_LEVELS / LEVELS_PER_PAGE);
  const startLevel = (page - 1) * LEVELS_PER_PAGE + 1;
  const levels = Array.from(
    { length: Math.min(LEVELS_PER_PAGE, TOTAL_LEVELS - startLevel + 1) },
    (_, i) => startLevel + i,
  );

  const handleSetUsername = async () => {
    if (!usernameInput.trim()) return;
    try {
      await saveProfile.mutateAsync({
        username: usernameInput.trim(),
        totalScore: BigInt(totalScore),
        currentLevel: BigInt(currentLevel),
      });
      setShowUsernameDialog(false);
      toast.success("Username saved!");
    } catch {
      toast.error("Failed to save username");
    }
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
            {profileLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
            ) : (
              <>
                <div className="text-right">
                  <div className="text-sm font-bold text-yellow-400">
                    {username || (
                      <button
                        type="button"
                        onClick={() => setShowUsernameDialog(true)}
                        className="text-orange-400 hover:text-orange-300 underline"
                      >
                        Set username
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ⭐ {totalScore.toLocaleString()} pts
                  </div>
                </div>
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
              </>
            )}
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
            <Button
              data-ocid="dashboard.secondary_button"
              variant="ghost"
              size="sm"
              onClick={clear}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div>
            <div className="mb-6">
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
                      onClick={() => {
                        if (status !== "locked") {
                          play("level_select");
                          onPlayLevel(level);
                        }
                      }}
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
                Leaderboard
              </h3>
            </div>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2 pr-2">
                {topPlayers && topPlayers.length > 0 ? (
                  topPlayers.slice(0, 10).map((player, i) => (
                    <div
                      key={player.username || `player-${i}`}
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
                          {player.username || "Anon"}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-yellow-400 text-xs font-bold">
                          {Number(player.totalScore).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Lvl {Number(player.currentLevel)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    data-ocid="dashboard.empty_state"
                    className="text-center text-muted-foreground py-8"
                  >
                    <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No champions yet</p>
                    <p className="text-xs mt-1">Be the first!</p>
                  </div>
                )}
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

      <Dialog
        open={!!(needsUsername || showUsernameDialog)}
        onOpenChange={setShowUsernameDialog}
      >
        <DialogContent
          data-ocid="dashboard.dialog"
          className="game-card border-0"
          style={{
            background: "rgba(10,0,30,0.95)",
            border: "1px solid rgba(255,106,0,0.4)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="fire-title text-2xl text-center">
              Choose Your Name
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-center text-muted-foreground text-sm">
              Pick a username to appear on the leaderboard
            </p>
            <Input
              data-ocid="dashboard.input"
              placeholder="Enter your username..."
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetUsername()}
              maxLength={20}
              className="text-center text-lg"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,106,0,0.3)",
                color: "#fff",
              }}
            />
            <Button
              data-ocid="dashboard.submit_button"
              onClick={handleSetUsername}
              disabled={!usernameInput.trim() || saveProfile.isPending}
              className="w-full py-5 font-bold"
              style={{
                background: "linear-gradient(135deg, #ff6a00, #ee0979)",
                border: "none",
                color: "#fff",
              }}
            >
              {saveProfile.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save & Play!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
