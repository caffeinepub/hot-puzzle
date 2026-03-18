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

// Module-level singleton AudioContext
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  type: OscillatorType,
  freqStart: number,
  freqEnd: number,
  duration: number,
  gain: number,
  startTime = 0,
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.type = type;
  const now = ctx.currentTime + startTime;
  osc.frequency.setValueAtTime(freqStart, now);
  osc.frequency.linearRampToValueAtTime(freqEnd, now + duration);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain, now + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.start(now);
  osc.stop(now + duration + 0.01);
}

function playNoise(
  ctx: AudioContext,
  duration: number,
  gain: number,
  filterFreqStart: number,
  filterFreqEnd: number,
  startTime = 0,
) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // fade out
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  const now = ctx.currentTime + startTime;
  filter.frequency.setValueAtTime(filterFreqStart, now);
  filter.frequency.linearRampToValueAtTime(filterFreqEnd, now + duration);
  filter.Q.value = 1.5;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(now);
}

const SOUND_PLAYERS: Record<
  SoundName,
  (ctx: AudioContext, chainLevel?: number) => void
> = {
  tile_select: (ctx) => {
    playTone(ctx, "sine", 600, 800, 0.08, 0.3);
  },
  tile_swap: (ctx) => {
    playTone(ctx, "square", 300, 600, 0.12, 0.2);
  },
  no_match: (ctx) => {
    playTone(ctx, "sawtooth", 200, 100, 0.25, 0.4);
  },
  match: (ctx) => {
    const chord = [523, 659, 784];
    chord.forEach((freq, i) => {
      playTone(ctx, "sine", freq, freq * 1.02, 0.06, 0.4, i * 0.04);
    });
  },
  chain: (ctx, chainLevel = 1) => {
    const base = 200 * chainLevel;
    const chord = [523 + base, 659 + base, 784 + base];
    chord.forEach((freq, i) => {
      playTone(ctx, "sine", freq, freq * 1.03, 0.07, 0.5, i * 0.04);
    });
  },
  level_win: (ctx) => {
    const melody = [523, 659, 784, 1047];
    melody.forEach((freq, i) => {
      playTone(ctx, "sine", freq, freq * 1.01, 0.14, 0.5, i * 0.15);
    });
  },
  game_over: (ctx) => {
    const melody = [392, 330, 262, 196];
    melody.forEach((freq, i) => {
      playTone(ctx, "sine", freq, freq * 0.99, 0.18, 0.4, i * 0.2);
    });
  },
  button_click: (ctx) => {
    playTone(ctx, "sine", 400, 400, 0.06, 0.15);
  },
  level_select: (ctx) => {
    playTone(ctx, "sine", 550, 620, 0.05, 0.2);
  },
  shuffle: (ctx) => {
    playNoise(ctx, 0.3, 0.3, 800, 200);
    playTone(ctx, "sine", 300, 600, 0.15, 0.15, 0.05);
    playTone(ctx, "sine", 600, 300, 0.15, 0.1, 0.15);
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
        // Audio not available — silently ignore
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
        // ignore
      }
      return next;
    });
  }, []);

  return { play, toggle, isMuted };
}
