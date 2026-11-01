// Bot chien thuat dung de can bang va kiem thu (khong dung trong game that).
import { createWorld, initialAssign } from './GameWorld';
import { KIND_MOLOTOV, triggerDodge } from './ProjectileSystem';
import { orderMove, setFormation, setOrder } from './SquadController';
import { STEP, stepWorld } from './SimulationLoop';
import { MVP_CONFIG, RIOTER, isAlive, isThreatState, type World, type WorldConfig } from './types';

export type Bot = (w: World) => void;

function hostiles(w: World) {
  return w.units.filter((u) => u.team === RIOTER && isAlive(u) && isThreatState(u.state));
}

/** Tien thang: tat ca squad Advance ngay lap tuc va tiep tuc dui theo. */
export const naiveAdvance: Bot = (w) => {
  if (w.time < 3) return;
  for (const s of w.squads) if (s.aliveCount > 0 && s.order !== 'ADVANCE' && s.order !== 'MOVE') setOrder(w, s, 'ADVANCE');
};

/** Tien thang nhung biet ne molotov va dung doi hinh khien (COMPACT) khi bi nem. */
export const advanceDodge: Bot = (w) => {
  naiveAdvance(w);
  for (const p of w.projectiles) {
    if (!p.active || p.kind !== KIND_MOLOTOV || p.dur - p.t < 0.35) continue;
    for (const s of w.squads) if (s.alertT <= 0 && Math.hypot(p.tx - s.cx, p.tz - s.cz) < 7) triggerDodge(w, s);
  }
  for (const s of w.squads) setFormation(w, s, 'LINE');
};

const pulseState = new WeakMap<World, { rest: boolean }>();
/** Tien theo nhip: tien khi con suc, dung HOLD de hoi suc, dung COMPACT va ne molotov. */
export const pulse: Bot = (w) => {
  let st = pulseState.get(w);
  if (!st) {
    st = { rest: false };
    pulseState.set(w, st);
  }
  const alive = w.squads.filter((s) => s.aliveCount > 0);
  const avg = alive.reduce((a, s) => a + s.stamina, 0) / Math.max(1, alive.length);
  if (avg < 30) st.rest = true;
  if (avg > 78) st.rest = false;
  for (const p of w.projectiles) {
    if (!p.active || p.kind !== KIND_MOLOTOV || p.dur - p.t < 0.35) continue;
    for (const s of w.squads) if (s.alertT <= 0 && Math.hypot(p.tx - s.cx, p.tz - s.cz) < 7) triggerDodge(w, s);
  }
  if (w.time < 3) return;
  for (const s of alive) {
    setFormation(w, s, 'COMPACT');
    if (st.rest) {
      if (s.order !== 'HOLD') setOrder(w, s, 'HOLD');
    } else if (s.order !== 'ADVANCE' && s.order !== 'MOVE') setOrder(w, s, 'ADVANCE');
  }
};

/** Chi giu vi tri, doi hinh 2 hang, khong lam gi them. */
export const holdOnly: Bot = (w) => {
  if (w.time > 1) return;
  for (const s of w.squads) {
    setFormation(w, s, 'DOUBLE_LINE');
    setOrder(w, s, 'HOLD');
  }
};

interface MixedState {
  next: number;
  mode: string[];
}
const state = new WeakMap<World, MixedState>();

/**
 * Chien thuat hon hop (dung de can bang): ne molotov, tien thang khi co ke dich nong trong 22 m,
 * con khi chua co ai nong thi di xoa diu nhom gan nhat dang con binh tinh.
 */
export const mixedBot: Bot = (w) => {
  let st = state.get(w);
  if (!st) {
    st = { next: 0, mode: [] };
    state.set(w, st);
  }
  for (const p of w.projectiles) {
    if (!p.active || p.kind !== KIND_MOLOTOV || p.dur - p.t < 0.35) continue;
    for (const s of w.squads) if (s.alertT <= 0 && Math.hypot(p.tx - s.cx, p.tz - s.cz) < 7) triggerDodge(w, s);
  }
  if (w.time < st.next || w.time < 2) return;
  st.next = w.time + 1.5;
  const hot = hostiles(w);
  for (const s of w.squads) {
    if (s.aliveCount <= 0) continue;
    const nearHot = hot.some((u) => Math.hypot(u.x - s.cx, u.z - s.cz) < 22);
    setFormation(w, s, 'LINE');
    if (nearHot || hot.length > 12) {
      if (s.order !== 'ADVANCE') setOrder(w, s, 'ADVANCE');
      st.mode[s.id] = 'push';
      continue;
    }
    // chua ai nong gan day: tim nhom con binh tinh gan nhat de xoa diu
    let best: (typeof w.groups)[number] | null = null;
    let bd = 1e9;
    for (const g of w.groups) {
      const alive = g.unitIds.some((id) => isAlive(w.units[id]) && !w.units[id].pending);
      if (!alive) continue;
      const d = Math.hypot(g.cx - s.cx, g.cz - s.cz);
      if (d < bd) {
        bd = d;
        best = g;
      }
    }
    if (!best) {
      if (s.order === 'ADVANCE') setOrder(w, s, 'HOLD');
      continue;
    }
    const dx = s.cx - best.cx;
    const dz = s.cz - best.cz;
    const d = Math.hypot(dx, dz) || 1;
    if (d > 10) {
      if (st.mode[s.id] !== 'go' + best.id || (s.order !== 'MOVE' && s.order !== 'DEESCALATE')) {
        st.mode[s.id] = 'go' + best.id;
        orderMove(w, [s], best.cx + (dx / d) * 7, best.cz + (dz / d) * 7);
      }
    }
    if (d <= 12 || (s.order === 'MOVE' && !s.dest)) {
      if (s.order !== 'DEESCALATE') setOrder(w, s, 'DEESCALATE');
    }
  }
};

export interface RunResult {
  won: boolean;
  time: number;
  rating: string;
  reason: string;
  policeDown: number;
  thrown: number;
  molotovs: number;
  blocked: number;
  hits: number;
  dodged: number;
  fires: number;
  burn: number;
  safety: number;
  avgForce: number;
  stats: Record<string, number>;
}

export function runGame(bot: Bot, seed: number, cfg: WorldConfig = MVP_CONFIG, maxSeconds = 300): RunResult {
  const w = createWorld({ ...cfg, seed });
  initialAssign(w);
  let i = 0;
  while (w.status === 'playing' && w.time < maxSeconds + 1) {
    if (i % 15 === 0) bot(w);
    stepWorld(w, STEP);
    i++;
  }
  const r = w.result;
  const st = w.metrics.stats;
  return {
    won: r?.outcome === 'won',
    time: w.time,
    rating: r?.rating ?? '-',
    reason: r?.reason ?? 'chua ket thuc',
    policeDown: st.policeDown,
    thrown: st.thrown,
    molotovs: st.molotovs,
    blocked: st.blocked,
    hits: st.projHits,
    dodged: st.dodged,
    fires: st.fireZones,
    burn: st.burnSeconds,
    safety: w.metrics.safety,
    avgForce: r?.avgForce ?? 0,
    stats: { ...st },
  };
}
