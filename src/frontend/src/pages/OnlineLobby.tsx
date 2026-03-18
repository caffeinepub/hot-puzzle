import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Copy,
  Loader2,
  RefreshCw,
  Swords,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";

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

interface OnlineLobbyProps {
  onBack: () => void;
  onJoinGame: (
    roomId: string,
    playerName: string,
    playerIndex: number,
    level: number,
  ) => void;
}

export default function OnlineLobby({ onBack, onJoinGame }: OnlineLobbyProps) {
  const { actor } = useActor();

  // Create room state
  const [createName, setCreateName] = useState("");
  const [createLevel, setCreateLevel] = useState(1);
  const [roomCode, setRoomCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [waiting, setWaiting] = useState(false);

  // Join room state
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Open rooms
  const [openRooms, setOpenRooms] = useState<MatchRoomView[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOpenRooms = useCallback(async () => {
    if (!actor) return;
    try {
      setLoadingRooms(true);
      const rooms = await (actor as any).listOpenRooms();
      setOpenRooms(rooms || []);
    } catch {
      // ignore
    } finally {
      setLoadingRooms(false);
    }
  }, [actor]);

  useEffect(() => {
    fetchOpenRooms();
    const interval = setInterval(fetchOpenRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchOpenRooms]);

  // Poll for room status after creating
  useEffect(() => {
    if (!waiting || !roomCode || !actor) return;
    pollRef.current = setInterval(async () => {
      try {
        const room = (await (actor as any).getRoom(roomCode)) as MatchRoomView;
        if (room && room.status === "playing") {
          clearInterval(pollRef.current!);
          setWaiting(false);
          onJoinGame(room.id, createName, 1, room.level);
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [waiting, roomCode, actor, createName, onJoinGame]);

  const handleCreate = async () => {
    if (!actor || !createName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    try {
      setCreating(true);
      const code = (await (actor as any).createRoom(
        createName.trim(),
        createLevel,
      )) as string;
      setRoomCode(code);
      setWaiting(true);
      toast.success("Room created! Share the code with your opponent.");
    } catch {
      toast.error("Failed to create room. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (code?: string, quickJoinName?: string) => {
    const targetCode = code ?? joinCode.trim();
    const targetName = quickJoinName ?? joinName.trim();
    if (!actor || !targetName) {
      toast.error("Please enter your name");
      return;
    }
    if (!targetCode) {
      toast.error("Please enter a room code");
      return;
    }
    try {
      setJoining(true);
      const room = (await (actor as any).joinRoom(
        targetCode,
        targetName,
      )) as MatchRoomView;
      if (room) {
        onJoinGame(room.id, targetName, 2, room.level);
      }
    } catch {
      toast.error("Could not join room. Check the code and try again.");
    } finally {
      setJoining(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("Room code copied!");
  };

  const handleCancelWait = () => {
    setWaiting(false);
    setRoomCode("");
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
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            data-ocid="lobby.secondary_button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-orange-400 hover:text-orange-300"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="fire-title text-2xl font-bold flex items-center gap-2">
            <Swords className="w-6 h-6" /> ONLINE BATTLE
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Room */}
          <div
            className="game-card p-6"
            style={{ border: "1px solid rgba(255,106,0,0.4)" }}
          >
            <h2
              className="text-xl font-bold mb-5 flex items-center gap-2"
              style={{ color: "#ff6a00" }}
            >
              <span className="text-2xl">🏟️</span> Create Room
            </h2>

            {!waiting ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Your Name
                  </p>
                  <Input
                    data-ocid="lobby.input"
                    placeholder="Enter your name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    maxLength={20}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,106,0,0.3)",
                      color: "#fff",
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Level (1–2000)
                  </p>
                  <Input
                    placeholder="Level"
                    type="number"
                    min={1}
                    max={2000}
                    value={createLevel}
                    onChange={(e) =>
                      setCreateLevel(
                        Math.max(
                          1,
                          Math.min(2000, Number(e.target.value) || 1),
                        ),
                      )
                    }
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,106,0,0.3)",
                      color: "#fff",
                    }}
                  />
                </div>
                <Button
                  data-ocid="lobby.primary_button"
                  onClick={handleCreate}
                  disabled={creating || !createName.trim()}
                  className="w-full font-bold py-5"
                  style={{
                    background: "linear-gradient(135deg, #ff6a00, #ee0979)",
                    border: "none",
                    color: "#fff",
                  }}
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Swords className="w-4 h-4 mr-2" />
                  )}
                  {creating ? "Creating..." : "Create Room"}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-5">
                <p className="text-muted-foreground text-sm">
                  Share this code with your opponent:
                </p>
                <div
                  className="rounded-xl p-4 mx-auto"
                  style={{
                    background: "rgba(255,106,0,0.1)",
                    border: "2px solid rgba(255,106,0,0.5)",
                  }}
                >
                  <div
                    className="font-mono text-4xl font-bold tracking-widest"
                    style={{ color: "#ff6a00", letterSpacing: "0.2em" }}
                  >
                    {roomCode}
                  </div>
                </div>
                <Button
                  data-ocid="lobby.secondary_button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  className="text-orange-400 hover:text-orange-300"
                >
                  <Copy className="w-4 h-4 mr-1" /> Copy Code
                </Button>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                  <span>Waiting for opponent...</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ask your opponent to join with this code on the Join Room
                  panel.
                </p>
                <Button
                  data-ocid="lobby.cancel_button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelWait}
                  className="text-muted-foreground hover:text-red-400"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Join Room */}
          <div
            className="game-card p-6"
            style={{ border: "1px solid rgba(147,51,234,0.4)" }}
          >
            <h2
              className="text-xl font-bold mb-5 flex items-center gap-2"
              style={{ color: "#a855f7" }}
            >
              <span className="text-2xl">🎮</span> Join Room
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Name</p>
                <Input
                  data-ocid="lobby.input"
                  placeholder="Enter your name"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={20}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(147,51,234,0.3)",
                    color: "#fff",
                  }}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Room Code</p>
                <Input
                  data-ocid="lobby.input"
                  placeholder="Enter room code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(147,51,234,0.3)",
                    color: "#fff",
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                  }}
                />
              </div>
              <Button
                data-ocid="lobby.submit_button"
                onClick={() => handleJoin()}
                disabled={joining || !joinName.trim() || !joinCode.trim()}
                className="w-full font-bold py-5"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  border: "none",
                  color: "#fff",
                }}
              >
                {joining ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                {joining ? "Joining..." : "Join Room"}
              </Button>
            </div>

            {/* Open Rooms */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Open Rooms
                </h3>
                <Button
                  data-ocid="lobby.secondary_button"
                  variant="ghost"
                  size="sm"
                  onClick={fetchOpenRooms}
                  className="text-muted-foreground hover:text-purple-400 h-6 px-2"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${loadingRooms ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>

              {openRooms.length === 0 ? (
                <div
                  data-ocid="lobby.empty_state"
                  className="text-center py-6 text-muted-foreground text-sm rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px dashed rgba(255,255,255,0.1)",
                  }}
                >
                  No open rooms yet
                </div>
              ) : (
                <div className="space-y-2">
                  {openRooms.slice(0, 5).map((room, i) => (
                    <button
                      type="button"
                      key={room.id}
                      data-ocid={`lobby.item.${i + 1}`}
                      onClick={() => {
                        if (!joinName.trim()) {
                          toast.error("Enter your name first");
                          return;
                        }
                        handleJoin(room.id, joinName);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg transition-all hover:scale-[1.01]"
                      style={{
                        background: "rgba(147,51,234,0.1)",
                        border: "1px solid rgba(147,51,234,0.3)",
                        cursor: "pointer",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">
                          {room.player1.name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(255,106,0,0.2)",
                            color: "#ff6a00",
                            border: "1px solid rgba(255,106,0,0.3)",
                          }}
                        >
                          Lvl {room.level}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Click to quick-join this room
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* How it works */}
        <div
          className="mt-6 game-card p-5"
          style={{ border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <h3 className="text-sm font-bold text-yellow-400 mb-3">
            ⚔️ How Online Battle Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-lg">1️⃣</span>
              <span>
                Create a room and share the code with your opponent — or join an
                open room
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">2️⃣</span>
              <span>
                Both players play the SAME level simultaneously. You each have{" "}
                <strong className="text-white">30 seconds</strong> per move
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">3️⃣</span>
              <span>
                The player with the{" "}
                <strong className="text-white">highest score</strong> when both
                finish wins the battle!
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
