import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Music2, VolumeX } from "lucide-react";
import { useState } from "react";
import { useBackgroundMusic } from "./hooks/useBackgroundMusic";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import AuthScreen from "./pages/AuthScreen";
import Dashboard from "./pages/Dashboard";
import GameBoard from "./pages/GameBoard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { identity, isInitializing } = useInternetIdentity();
  const [playingLevel, setPlayingLevel] = useState<number | null>(null);
  const { isMusicOn, toggleMusic } = useBackgroundMusic();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 float-anim">🔥</div>
          <p className="fire-title text-2xl">HOT PUZZLE</p>
          <p className="text-muted-foreground mt-2 animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!identity ? (
        <AuthScreen />
      ) : playingLevel !== null ? (
        <GameBoard
          level={playingLevel}
          onBack={() => setPlayingLevel(null)}
          onNextLevel={(next) => setPlayingLevel(next)}
        />
      ) : (
        <Dashboard onPlayLevel={setPlayingLevel} />
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
