import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
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

  if (!identity) {
    return <AuthScreen />;
  }

  if (playingLevel !== null) {
    return (
      <GameBoard
        level={playingLevel}
        onBack={() => setPlayingLevel(null)}
        onNextLevel={(next) => setPlayingLevel(next)}
      />
    );
  }

  return <Dashboard onPlayLevel={setPlayingLevel} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
