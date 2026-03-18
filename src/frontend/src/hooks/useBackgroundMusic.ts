import { useCallback, useEffect, useRef, useState } from "react";

let _sharedCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext {
  if (_sharedCtx) return _sharedCtx;
  _sharedCtx = new AudioContext();
  return _sharedCtx;
}

const MUSIC_KEY = "hotpuzzle_music";

// Upbeat pentatonic melody in Hz (C major pentatonic)
const MELODY: number[] = [
  523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25, 659.25,
  783.99, 1046.5, 880.0, 783.99, 659.25, 523.25,
];

// Bass pattern (root + fifth, 0 = rest)
const BASS: number[] = [
  130.81, 0, 196.0, 0, 146.83, 0, 220.0, 0, 130.81, 0, 196.0, 0, 174.61, 0,
  261.63, 0,
];

const NOTE_DURATION = 0.18;
const NOTE_GAP = 0.02;
const STEP_DURATION = NOTE_DURATION + NOTE_GAP;
const MELODY_GAIN = 0.09;
const BASS_GAIN = 0.07;
const LOOKAHEAD = 0.1;
const SCHEDULE_INTERVAL = 80;

export function useBackgroundMusic() {
  const [isMusicOn, setIsMusicOn] = useState(() => {
    try {
      const stored = localStorage.getItem(MUSIC_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const activeNodes = useRef<{ stop: (t: number) => void }[]>([]);
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const currentIndexRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const isMusicOnRef = useRef(isMusicOn);

  isMusicOnRef.current = isMusicOn;

  const scheduleNote = useCallback(
    (ctx: AudioContext, index: number, time: number) => {
      const melodyFreq = MELODY[index % MELODY.length];
      const bassFreq = BASS[index % BASS.length];

      // Melody note (triangle oscillator)
      const melodyOsc = ctx.createOscillator();
      const melodyGain = ctx.createGain();
      melodyOsc.type = "triangle";
      melodyOsc.frequency.setValueAtTime(melodyFreq, time);
      melodyGain.gain.setValueAtTime(0, time);
      melodyGain.gain.linearRampToValueAtTime(MELODY_GAIN, time + 0.01);
      melodyGain.gain.exponentialRampToValueAtTime(
        0.0001,
        time + NOTE_DURATION,
      );
      melodyOsc.connect(melodyGain);
      melodyGain.connect(ctx.destination);
      melodyOsc.start(time);
      melodyOsc.stop(time + NOTE_DURATION + 0.01);
      activeNodes.current.push({
        stop: (t) => {
          try {
            melodyOsc.stop(t);
          } catch {
            /**/
          }
        },
      });

      // Harmony (octave lower, sine)
      const harmOsc = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harmOsc.type = "sine";
      harmOsc.frequency.setValueAtTime(melodyFreq * 0.5, time);
      harmGain.gain.setValueAtTime(0, time);
      harmGain.gain.linearRampToValueAtTime(MELODY_GAIN * 0.4, time + 0.02);
      harmGain.gain.exponentialRampToValueAtTime(
        0.0001,
        time + NOTE_DURATION * 1.5,
      );
      harmOsc.connect(harmGain);
      harmGain.connect(ctx.destination);
      harmOsc.start(time);
      harmOsc.stop(time + NOTE_DURATION * 1.5 + 0.01);
      activeNodes.current.push({
        stop: (t) => {
          try {
            harmOsc.stop(t);
          } catch {
            /**/
          }
        },
      });

      // Bass note (if non-zero)
      if (bassFreq > 0) {
        const bassOsc = ctx.createOscillator();
        const bassGainNode = ctx.createGain();
        bassOsc.type = "sine";
        bassOsc.frequency.setValueAtTime(bassFreq, time);
        bassGainNode.gain.setValueAtTime(0, time);
        bassGainNode.gain.linearRampToValueAtTime(BASS_GAIN, time + 0.02);
        bassGainNode.gain.exponentialRampToValueAtTime(
          0.0001,
          time + NOTE_DURATION * 2,
        );
        bassOsc.connect(bassGainNode);
        bassGainNode.connect(ctx.destination);
        bassOsc.start(time);
        bassOsc.stop(time + NOTE_DURATION * 2 + 0.01);
        activeNodes.current.push({
          stop: (t) => {
            try {
              bassOsc.stop(t);
            } catch {
              /**/
            }
          },
        });
      }

      // Prune old nodes
      if (activeNodes.current.length > 60) {
        activeNodes.current = activeNodes.current.slice(-30);
      }
    },
    [],
  );

  const stopAllNodes = useCallback(() => {
    const ctx = _sharedCtx;
    const now = ctx ? ctx.currentTime : 0;
    for (const n of activeNodes.current) {
      n.stop(now);
    }
    activeNodes.current = [];
  }, []);

  const startScheduler = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    const ctx = getSharedAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    nextNoteTimeRef.current = ctx.currentTime + 0.1;

    const tick = () => {
      if (!isMusicOnRef.current) return;
      const ctx2 = getSharedAudioContext();
      if (ctx2.state === "suspended") ctx2.resume();
      const lookaheadTime = ctx2.currentTime + LOOKAHEAD;
      while (nextNoteTimeRef.current < lookaheadTime) {
        scheduleNote(ctx2, currentIndexRef.current, nextNoteTimeRef.current);
        currentIndexRef.current = (currentIndexRef.current + 1) % MELODY.length;
        nextNoteTimeRef.current += STEP_DURATION;
      }
    };

    schedulerRef.current = setInterval(tick, SCHEDULE_INTERVAL);
  }, [scheduleNote]);

  const stopScheduler = useCallback(() => {
    if (schedulerRef.current !== null) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    isRunningRef.current = false;
    stopAllNodes();
  }, [stopAllNodes]);

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

      if (!next) {
        stopScheduler();
      } else {
        startScheduler();
      }

      return next;
    });
  }, [startScheduler, stopScheduler]);

  useEffect(() => {
    return () => {
      stopScheduler();
    };
  }, [stopScheduler]);

  return { isMusicOn, toggleMusic };
}
