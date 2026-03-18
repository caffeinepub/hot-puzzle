import { Button } from "@/components/ui/button";
import { Flame, Loader2, Trophy } from "lucide-react";
import { useGameSounds } from "../hooks/useGameSounds";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useTopPlayers } from "../hooks/useQueries";

const DECORATIVE_FRUITS = [
  { emoji: "🍎", top: "10%", left: "5%", size: "3rem", delay: "0s" },
  { emoji: "🍊", top: "25%", left: "2%", size: "2.5rem", delay: "0.5s" },
  { emoji: "🍇", top: "60%", left: "4%", size: "3.5rem", delay: "1s" },
  { emoji: "🍌", top: "80%", left: "3%", size: "2.5rem", delay: "1.5s" },
  { emoji: "🍓", top: "10%", right: "5%", size: "2.5rem", delay: "0.3s" },
  { emoji: "🍉", top: "30%", right: "2%", size: "3rem", delay: "0.8s" },
  { emoji: "🍍", top: "65%", right: "4%", size: "3.5rem", delay: "1.3s" },
  { emoji: "🍒", top: "85%", right: "3%", size: "2.5rem", delay: "1.8s" },
];

const PREVIEW_FRUITS = ["🍎", "🍊", "🍇", "🍌", "🍓", "🍉"];

export default function AuthScreen() {
  const { login, isLoggingIn } = useInternetIdentity();
  const { data: topPlayers } = useTopPlayers();
  const { play } = useGameSounds();

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4 relative overflow-hidden">
      {DECORATIVE_FRUITS.map((f) => (
        <div
          key={f.emoji}
          className="fixed pointer-events-none select-none"
          style={{
            top: f.top,
            left: f.left,
            right: (f as { right?: string }).right,
            fontSize: f.size,
            animationDelay: f.delay,
            animation: `float 3s ease-in-out ${f.delay} infinite`,
          }}
        >
          {f.emoji}
        </div>
      ))}

      <div className="game-card neon-border w-full max-w-md p-8 text-center z-10 mt-8">
        <div className="mb-2">
          <img
            src="/assets/generated/hot-puzzle-logo.dim_600x200.png"
            alt="HOT PUZZLE"
            className="w-full max-w-xs mx-auto"
          />
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <Flame className="text-orange-400 w-6 h-6" />
          <p className="text-foreground/70 text-sm font-medium tracking-widest uppercase">
            Match fruits. Beat levels. Become the champion.
          </p>
          <Flame className="text-orange-400 w-6 h-6" />
        </div>

        <div className="flex justify-center gap-3 my-6">
          {PREVIEW_FRUITS.map((fruit, i) => (
            <span
              key={fruit}
              className="text-2xl"
              style={{
                animation: `float 2.5s ease-in-out ${i * 0.3}s infinite`,
              }}
            >
              {fruit}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="game-card p-3 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">2000</div>
            <div className="text-xs text-muted-foreground">Levels</div>
          </div>
          <div className="game-card p-3 rounded-lg">
            <div className="text-2xl font-bold text-orange-400">8</div>
            <div className="text-xs text-muted-foreground">Fruits</div>
          </div>
          <div className="game-card p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">3D</div>
            <div className="text-xs text-muted-foreground">Style</div>
          </div>
        </div>

        <Button
          data-ocid="auth.primary_button"
          onClick={() => {
            play("button_click");
            login();
          }}
          disabled={isLoggingIn}
          className="w-full py-6 text-lg font-bold pulse-glow"
          style={{
            background: "linear-gradient(135deg, #ff6a00, #ee0979)",
            border: "none",
            color: "#fff",
            fontSize: "1.1rem",
            letterSpacing: "0.05em",
          }}
        >
          {isLoggingIn ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            "🔥 Sign Up / Login"
          )}
        </Button>

        <p className="text-muted-foreground text-xs mt-4">
          Secured by Internet Identity • No passwords needed
        </p>
      </div>

      {topPlayers && topPlayers.length > 0 && (
        <div className="game-card w-full max-w-md mt-6 p-6 z-10">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="text-yellow-400 w-5 h-5" />
            <h3 className="text-lg font-bold text-yellow-400">Top Champions</h3>
          </div>
          <div className="space-y-2">
            {topPlayers.slice(0, 10).map((player, i) => (
              <div
                key={player.username || `anon-${i}`}
                data-ocid={`auth.item.${i + 1}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{
                  background:
                    i === 0
                      ? "rgba(255,200,0,0.15)"
                      : i === 1
                        ? "rgba(192,192,192,0.1)"
                        : i === 2
                          ? "rgba(180,100,0,0.1)"
                          : "rgba(255,255,255,0.04)",
                  border:
                    i < 3
                      ? `1px solid ${
                          i === 0
                            ? "rgba(255,200,0,0.4)"
                            : i === 1
                              ? "rgba(192,192,192,0.3)"
                              : "rgba(180,100,0,0.3)"
                        }`
                      : "1px solid transparent",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg w-8">
                    {i === 0
                      ? "🥇"
                      : i === 1
                        ? "🥈"
                        : i === 2
                          ? "🥉"
                          : `#${i + 1}`}
                  </span>
                  <span className="text-foreground font-medium">
                    {player.username || "Anonymous"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-bold">
                    {Number(player.totalScore).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Lvl {Number(player.currentLevel)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-8 text-center text-xs text-muted-foreground z-10">
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
