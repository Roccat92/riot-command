// SimDriver: moi khung hinh chay SimulationLoop (buoc co dinh) va day anh chup HUD toi store ~4 lan/giay.
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useGameStore } from '../state/GameState';
import { simLoop } from '../sim/SimulationLoop';
import { playSfx } from '../ui/sfx';

export const perf = { frames: 0, frameMs: 0, maxMs: 0, fps: 0, window: [] as number[], gl: null as unknown, jsMs: 0 };

export function SimDriver() {
  const accRef = useRef(0);
  useFrame((state, dt) => {
    perf.gl = state.gl;
    const t0 = performance.now();
    simLoop.advance(dt);
    const ev = simLoop.world.events;
    for (let i = 0; i < ev.length && i < 8; i++) playSfx(ev[i].type);
    ev.length = 0;
    perf.jsMs += (performance.now() - t0 - perf.jsMs) * 0.05;
    // do hieu nang (cua so truot 120 khung)
    const ms = dt * 1000;
    perf.frames++;
    perf.window.push(ms);
    if (perf.window.length > 120) perf.window.shift();
    perf.frameMs = perf.window.reduce((a, b) => a + b, 0) / perf.window.length;
    perf.maxMs = Math.max(...perf.window);
    perf.fps = 1000 / perf.frameMs;
    accRef.current += dt;
    const st = useGameStore.getState();
    if (accRef.current > 0.25) {
      accRef.current = 0;
      if (st.phase === 'playing') st.publish();
    }
    if (st.phase === 'playing' && simLoop.world.status !== 'playing') {
      st.publish();
      st.finish();
    }
  });
  return null;
}
