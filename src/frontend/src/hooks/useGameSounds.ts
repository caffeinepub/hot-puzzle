import { useCallback, useState } from "react";

export type SoundName =
  | "tile_select"
  | "tile_swap"
  | "no_match"
  | "match"
  | "chain"
  | "level_win"
  | "game_over"
  | "button_click"
  | "level_select"
  | "shuffle";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// Marimba-like tone: sine + harmonics with fast attack, wooden decay
function playMarimba(
  ctx: AudioContext,
  freq: number,
  duration: number,
  gain: number,
  startTime = 0,
) {
  const now = ctx.currentTime + startTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(gain, now + 0.004);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  // Fundamental
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(freq, now);
  const g1 = ctx.createGain();
  g1.gain.value = 1.0;
  osc1.connect(g1);
  g1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + duration + 0.02);

  // 2nd harmonic (marimba overtone)
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 3.97, now);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.35, now);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.3);
  osc2.connect(g2);
  g2.connect(masterGain);
  osc2.start(now);
  osc2.stop(now + duration * 0.3 + 0.01);

  // 3rd harmonic (brightness)
  const osc3 = ctx.createOscillator();
  osc3.type = "sine";
  osc3.frequency.setValueAtTime(freq * 9.96, now);
  const g3 = ctx.createGain();
  g3.gain.setValueAtTime(0.1, now);
  g3.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.12);
  osc3.connect(g3);
  g3.connect(masterGain);
  osc3.start(now);
  osc3.stop(now + duration * 0.12 + 0.01);
}

// Piano-like tone: sine + inharmonic partials + quick decay
function playPiano(
  ctx: AudioContext,
  freq: number,
  duration: number,
  gain: number,
  startTime = 0,
) {
  const now = ctx.currentTime + startTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(gain, now + 0.003);
  masterGain.gain.setValueAtTime(gain * 0.7, now + 0.05);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const harmonics = [1, 2, 3, 4, 5, 6];
  const harmonicGains = [1.0, 0.5, 0.25, 0.12, 0.06, 0.03];

  harmonics.forEach((h, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * h, now);
    const g = ctx.createGain();
    g.gain.value = harmonicGains[i];
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  });
}

// Xylophone-like: bright attack, fast decay
function playXylophone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  gain: number,
  startTime = 0,
) {
  const now = ctx.currentTime + startTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(gain, now + 0.003);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  [1, 2.756, 5.404].forEach((ratio, i) => {
    const g = [1.0, 0.4, 0.15][i];
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * ratio, now);
    const gainNode = ctx.createGain();
    gainNode.gain.value = g;
    osc.connect(gainNode);
    gainNode.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  });
}

const SOUND_PLAYERS: Record<
  SoundName,
  (ctx: AudioContext, chainLevel?: number) => void
> = {
  tile_select: (ctx) => {
    playXylophone(ctx, 880, 0.12, 0.22);
  },
  tile_swap: (ctx) => {
    playXylophone(ctx, 659, 0.08, 0.18);
    playXylophone(ctx, 880, 0.08, 0.18, 0.06);
  },
  no_match: (ctx) => {
    playMarimba(ctx, 196, 0.35, 0.3);
    playMarimba(ctx, 164.81, 0.35, 0.2, 0.12);
  },
  match: (ctx) => {
    // C major chord on marimba
    const chord = [523.25, 659.25, 783.99];
    chord.forEach((freq, i) => {
      playMarimba(ctx, freq, 0.5, 0.35, i * 0.05);
    });
  },
  chain: (ctx, chainLevel = 1) => {
    // Rising piano chord per chain level
    const baseFreqs = [523.25, 659.25, 783.99, 1046.5];
    const offset = (chainLevel - 1) * 2;
    baseFreqs.forEach((freq, i) => {
      const f = freq * 2 ** (offset / 12);
      playPiano(ctx, f, 0.6, 0.3, i * 0.04);
    });
  },
  level_win: (ctx) => {
    // Triumphant marimba fanfare
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    melody.forEach((freq, i) => {
      playMarimba(ctx, freq, 0.5, 0.4, i * 0.14);
    });
    // Add piano chord underneath
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      playPiano(ctx, freq, 1.2, 0.2, 0.6 + i * 0.05);
    });
  },
  game_over: (ctx) => {
    // Descending piano notes
    const melody = [392, 349.23, 329.63, 261.63, 196];
    melody.forEach((freq, i) => {
      playPiano(ctx, freq, 0.6, 0.3, i * 0.18);
    });
  },
  button_click: (ctx) => {
    playXylophone(ctx, 1046.5, 0.08, 0.15);
  },
  level_select: (ctx) => {
    playXylophone(ctx, 880, 0.06, 0.18);
    playXylophone(ctx, 1046.5, 0.06, 0.15, 0.07);
  },
  shuffle: (ctx) => {
    // Quick ascending xylophone run
    [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((freq, i) => {
      playXylophone(ctx, freq, 0.12, 0.2, i * 0.045);
    });
  },
};

const MUTE_KEY = "hotpuzzle_muted";

export function useGameSounds() {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const play = useCallback(
    (sound: SoundName, chainLevel?: number) => {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (ctx.state === "suspended") {
          ctx.resume().then(() => {
            SOUND_PLAYERS[sound](ctx, chainLevel);
          });
        } else {
          SOUND_PLAYERS[sound](ctx, chainLevel);
        }
      } catch {
        // Audio not available
      }
    },
    [isMuted],
  );

  const toggle = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_KEY, String(next));
      } catch {
        /**/
      }
      return next;
    });
  }, []);

  return { play, toggle, isMuted };
}
