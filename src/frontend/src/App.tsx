import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Music2, VolumeX } from "lucide-react";
import { useState } from "react";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic";
import Dashboard from "./pages/Dashboard";
import GameBoard from "./pages/GameBoard";
import OnlineGameBoard from "./pages/OnlineGameBoard";
import OnlineLobby from "./pages/OnlineLobby";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type Screen = "dashboard" | "game" | "online-lobby" | "online-game";

interface OnlineGameState {
  roomId: string;
  playerName: string;
  playerIndex: number;
  level: number;
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [playingLevel, setPlayingLevel] = useState<number | null>(null);
  const [onlineGameState, setOnlineGameState] =
    useState<OnlineGameState | null>(null);
  const { isMusicOn, toggleMusic } = useBackgroundMusic();

  const handleJoinGame = (
    roomId: string,
    playerName: string,
    playerIndex: number,
    level: number,
  ) => {
    setOnlineGameState({ roomId, playerName, playerIndex, level });
    setScreen("online-game");
  };

  return (
    <>
      {screen === "game" && playingLevel !== null ? (
        <GameBoard
          level={playingLevel}
          onBack={() => setScreen("dashboard")}
          onNextLevel={(next) => setPlayingLevel(next)}
        />
      ) : screen === "online-lobby" ? (
        <OnlineLobby
          onBack={() => setScreen("dashboard")}
          onJoinGame={handleJoinGame}
        />
      ) : screen === "online-game" && onlineGameState ? (
        <OnlineGameBoard
          roomId={onlineGameState.roomId}
          playerName={onlineGameState.playerName}
          playerIndex={onlineGameState.playerIndex}
          level={onlineGameState.level}
          onBack={() => setScreen("online-lobby")}
        />
      ) : (
        <Dashboard
          onPlayLevel={(level) => {
            setPlayingLevel(level);
            setScreen("game");
          }}
          onPlayOnline={() => setScreen("online-lobby")}
        />
      )}

      {/* Floating music toggle button */}
      <button
        type="button"
        data-ocid="music.toggle"
        onClick={toggleMusic}
        title={isMusicOn ? "Mute music" : "Play music"}
        style={{
          position: "fixed",
          bottom: "1.25rem",
          right: "1.25rem",
          zIndex: 50,
          width: "2.75rem",
          height: "2.75rem",
          borderRadius: "0.5rem",
          background: "rgba(10,0,30,0.85)",
          border: "1.5px solid #f97316",
          color: isMusicOn ? "#f97316" : "#6b7280",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: isMusicOn ? "0 0 10px rgba(249,115,22,0.35)" : "none",
          transition: "all 0.2s ease",
        }}
      >
        {isMusicOn ? <Music2 size={18} /> : <VolumeX size={18} />}
      </button>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
