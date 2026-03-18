import { useCallback, useEffect, useRef, useState } from "react";

let _sharedCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext {
  if (_sharedCtx) return _sharedCtx;
  _sharedCtx = new AudioContext();
  return _sharedCtx;
}

const MUSIC_KEY = "hotpuzzle_music";

// Piano note frequencies (C major scale + octave extensions)
const C4 = 261.63;
const _D4 = 293.66;
const _E4 = 329.63;
const F4 = 349.23;
const G4 = 392.0;
const A4 = 440.0;
const B4 = 493.88;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const G5 = 783.99;
const _A5 = 880.0;
const C3 = 130.81;
const G3 = 196.0;
const F3 = 174.61;
const A3 = 220.0;

// Uplifting melody — two-bar phrase
const MELODY: number[] = [
  C5,
  E5,
  G5,
  E5,
  C5,
  D5,
  E5,
  D5,
  C5,
  G4,
  A4,
  B4,
  C5,
  E5,
  D5,
  C5,
];

// Bass / accompaniment (0 = rest)
const BASS: number[] = [C3, 0, G3, 0, A3, 0, F3, 0, C3, 0, G3, 0, F3, 0, G3, 0];

// Mid-range pad notes
const PAD: number[] = [C4, 0, G4, 0, A4, 0, F4, 0, C4, 0, G4, 0, F4, 0, G4, 0];

const NOTE_DURATION = 0.22;
const NOTE_GAP = 0.03;
const STEP_DURATION = NOTE_DURATION + NOTE_GAP;
const LOOKAHEAD = 0.15;
const SCHEDULE_INTERVAL = 80;

// Professional piano-like synthesis
function schedulePianoNote(
  ctx: AudioContext,
  freq: number,
  time: number,
  gain: number,
  duration: number,
) {
  if (freq <= 0) return;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0, time);
  master.gain.linearRampToValueAtTime(gain, time + 0.005);
  master.gain.setValueAtTime(gain * 0.75, time + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  // Fundamental + harmonics for piano timbre
  const harmonics = [1, 2, 3, 4, 5];
  const hGains = [1.0, 0.45, 0.2, 0.08, 0.03];

  harmonics.forEach((h, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * h, time);
    const g = ctx.createGain();
    g.gain.value = hGains[i];
    osc.connect(g);
    g.connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  });

  // Soft attack transient (slight inharmonic click)
  const click = ctx.createOscillator();
  click.type = "triangle";
  click.frequency.setValueAtTime(freq * 7.1, time);
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(gain * 0.15, time);
  cg.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
  click.connect(cg);
  cg.connect(master);
  click.start(time);
  click.stop(time + 0.03);
}

// Warm pad / string-like tone for mid accompaniment
function schedulePadNote(
  ctx: AudioContext,
  freq: number,
  time: number,
  gain: number,
  duration: number,
) {
  if (freq <= 0) return;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0, time);
  master.gain.linearRampToValueAtTime(gain, time + 0.05);
  master.gain.exponentialRampToValueAtTime(0.0001, time + duration * 1.4);

  [1, 2, 3].forEach((h, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    // Slight detuning for warmth
    osc.frequency.setValueAtTime(freq * h * (1 + (i === 1 ? 0.003 : 0)), time);
    const g = ctx.createGain();
    g.gain.value = [0.6, 0.25, 0.1][i];
    osc.connect(g);
    g.connect(master);
    osc.start(time);
    osc.stop(time + duration * 1.4 + 0.02);
  });
}

export function useBackgroundMusic() {
  const [isMusicOn, setIsMusicOn] = useState(() => {
    try {
      const stored = localStorage.getItem(MUSIC_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const currentIndexRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const isMusicOnRef = useRef(isMusicOn);
  isMusicOnRef.current = isMusicOn;

  const scheduleUpcoming = useCallback((ctx: AudioContext) => {
    const lookaheadTime = ctx.currentTime + LOOKAHEAD;
    while (nextNoteTimeRef.current < lookaheadTime) {
      const i = currentIndexRef.current % MELODY.length;
      const t = nextNoteTimeRef.current;

      // Melody — piano
      schedulePianoNote(ctx, MELODY[i], t, 0.08, NOTE_DURATION * 1.1);

      // Bass — piano (low, quiet)
      schedulePianoNote(ctx, BASS[i], t, 0.055, NOTE_DURATION * 1.8);

      // Pad (every 2 steps)
      if (i % 2 === 0) {
        schedulePadNote(ctx, PAD[i], t, 0.04, NOTE_DURATION * 2.2);
      }

      currentIndexRef.current++;
      nextNoteTimeRef.current += STEP_DURATION;
    }
  }, []);

  const startScheduler = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    const ctx = getSharedAudioContext();
    if (ctx.state === "suspended") ctx.resume();
    nextNoteTimeRef.current = ctx.currentTime + 0.1;
    schedulerRef.current = setInterval(() => {
      if (!isMusicOnRef.current) return;
      const c = getSharedAudioContext();
      if (c.state === "suspended") c.resume();
      scheduleUpcoming(c);
    }, SCHEDULE_INTERVAL);
  }, [scheduleUpcoming]);

  const stopScheduler = useCallback(() => {
    if (schedulerRef.current !== null) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    isRunningRef.current = false;
  }, []);

  // Start on first user gesture
  useEffect(() => {
    if (!isMusicOn) return;
    const handleGesture = () => {
      startScheduler();
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("keydown", handleGesture);
      window.removeEventListener("touchstart", handleGesture);
    };
    window.addEventListener("click", handleGesture);
    window.addEventListener("keydown", handleGesture);
    window.addEventListener("touchstart", handleGesture);
    return () => {
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("keydown", handleGesture);
      window.removeEventListener("touchstart", handleGesture);
    };
  }, [isMusicOn, startScheduler]);

  const toggleMusic = useCallback(() => {
    setIsMusicOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUSIC_KEY, String(next));
      } catch {
        /**/
      }
      if (!next) stopScheduler();
      else startScheduler();
      return next;
    });
  }, [startScheduler, stopScheduler]);

  useEffect(() => () => stopScheduler(), [stopScheduler]);

  return { isMusicOn, toggleMusic };
}
