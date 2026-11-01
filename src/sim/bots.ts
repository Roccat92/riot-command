// Bot chien thuat dung de can bang va kiem thu (khong dung trong game that).
import { createWorld, initialAssign } from './GameWorld';
import { KIND_MOLOTOV, triggerDodge } from './ProjectileSystem';
import { orderTruckMove, useFlash, useGas, useLrad } from './ToolsSystem';
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

// ---------- bot dung trang bi moi (xe voi rong, hoi cay, luu dan, LRAD) ----------
function densest(w: World, from: { x: number; z: number }, lo: number, hi: number, rad: number): { x: number; z: number; n: number } | null {
  const hot = w.units.filter((u) => u.team === RIOTER && isAlive(u) && isThreatState(u.state) && u.stun <= 0);
  let best: { x: number; z: number; n: number } | null = null;
  for (const c of hot) {
    const d = Math.hypot(c.x - from.x, c.z - from.z);
    if (d < lo || d > hi) continue;
    let n = 0;
    let sx = 0;
    let sz = 0;
    for (const o of hot) if ((o.x - c.x) ** 2 + (o.z - c.z) ** 2 < rad * rad) {
      n++;
      sx += o.x;
      sz += o.z;
    }
    if (!best || n > best.n) best = { x: sx / n, z: sz / n, n };
  }
  return best;
}

/** Bao boc mot bot co san: bat xe voi rong tu dong va dung hoi cay / luu dan / LRAD dung luc. */
export function withTools(base: Bot): Bot {
  return (w) => {
    base(w);
    if (w.time < 2) return;
    const t = w.truck;
    if (t.active && t.hp > 0) {
      t.auto = true;
      if (!t.dest && !t.refilling && t.water > 25) {
        // di theo hang canh sat, giu o phia sau 5-8 m
        const tgt = w.squads.filter((s) => s.aliveCount > 0).sort((a, b) => a.cz - b.cz)[0];
        if (tgt) {
          const gx = Math.max(-18, Math.min(18, tgt.cx));
          const gz = Math.min(26, tgt.cz + 7);
          if (Math.hypot(t.x - gx, t.z - gz) > 6) orderTruckMove(w, gx, gz);
        }
      }
    }
    for (const s of w.squads) {
      if (s.aliveCount <= 0) continue;
      const near = w.units.filter((u) => u.team === RIOTER && isAlive(u) && isThreatState(u.state) && Math.hypot(u.x - s.cx, u.z - s.cz) < 9);
      if (s.flash > 0 && s.eqCd <= 0 && near.length >= 3) {
        const cx = near.reduce((a, u) => a + u.x, 0) / near.length;
        const cz = near.reduce((a, u) => a + u.z, 0) / near.length;
        useFlash(w, s.id, cx, cz);
      }
      if (s.gas > 0 && s.eqCd <= 0) {
        const c = densest(w, { x: s.cx, z: s.cz }, 8, 26, 4.5);
        if (c && c.n >= 5) useGas(w, s.id, c.x, c.z);
      }
      if (s.lradCd <= 0 && !w.lrad.active) {
        const c = densest(w, { x: s.cx, z: s.cz }, 8, 24, 8);
        if (c && c.n >= 9) useLrad(w, s.id, c.x, c.z);
      }
    }
  };
}

/** Tat het trang bi moi (de so sanh voi ban cu): xe vo hieu hoa, khong co dan. */
export function withoutTools(base: Bot): Bot {
  return (w) => {
    if (w.truck.active) w.truck.active = false;
    for (const s of w.squads) {
      s.gas = 0;
      s.flash = 0;
      s.lradCd = 1e9;
    }
    base(w);
  };
}
