// GameState: kho zustand cho trang thai UI (pha game, lua chon, anh chup HUD da gioi han tan suat, ket qua).
// Khong bao gio chua du lieu theo tung don vi moi khung hinh: HUD chi nhan anh chup ~4 lan/giay.
import { create } from 'zustand';
import { orderMove, setFormation, setOrder } from '../sim/SquadController';
import { simLoop } from '../sim/SimulationLoop';
import {
  CIVILIAN,
  RIOTER,
  isAlive,
  type FormationType,
  type Order,
  type ResultStats,
  type World,
} from '../sim/types';

export type Phase = 'briefing' | 'playing' | 'ended';

export interface HudUnit {
  hp: number; // 0..1
  down: boolean;
}
export interface HudSquad {
  id: number;
  name: string;
  formation: FormationType;
  order: Order;
  alive: number;
  total: number;
  units: HudUnit[];
  health: number;
  stamina: number;
  morale: number;
  cohesion: number;
  alert: string;
}
export interface Hud {
  time: number;
  limit: number;
  police: number;
  policeTotal: number;
  rioters: number;
  civilians: number;
  stability: number;
  safety: number;
  force: number;
  hostile: number;
  squads: HudSquad[];
}

export const EMPTY_HUD: Hud = {
  time: 0,
  limit: 300,
  police: 0,
  policeTotal: 0,
  rioters: 0,
  civilians: 0,
  stability: 0,
  safety: 100,
  force: 0,
  hostile: 0,
  squads: [],
};

export function makeSnapshot(w: World): Hud {
  let police = 0;
  let policeTotal = 0;
  let rioters = 0;
  let civilians = 0;
  for (const u of w.units) {
    if (u.team === 0) {
      policeTotal++;
      if (isAlive(u)) police++;
    } else if (u.team === RIOTER) {
      if (isAlive(u)) rioters++;
    } else if (u.team === CIVILIAN) {
      if (isAlive(u)) civilians++;
    }
  }
  const squads: HudSquad[] = w.squads.map((s) => {
    const units: HudUnit[] = [];
    let hs = 0;
    let ss = 0;
    let ms = 0;
    let cs = 0;
    let n = 0;
    for (const id of s.unitIds) {
      const u = w.units[id];
      const down = !isAlive(u);
      units.push({ hp: u.health / u.maxHealth, down });
      if (!down) {
        hs += u.health / u.maxHealth;
        ss += u.stamina / 100;
        ms += u.morale / 100;
        cs += u.cohesion / 100;
        n++;
      }
    }
    const k = Math.max(1, n);
    return {
      id: s.id,
      name: s.name,
      formation: s.formation,
      order: s.order,
      alive: n,
      total: s.unitIds.length,
      units,
      health: hs / k,
      stamina: ss / k,
      morale: ms / k,
      cohesion: cs / k,
      alert: s.alert,
    };
  });
  const m = w.metrics;
  return {
    time: w.time,
    limit: w.timeLimit,
    police,
    policeTotal,
    rioters,
    civilians,
    stability: m.stability,
    safety: m.safety,
    force: m.force,
    hostile: m.hostile,
    squads,
  };
}

interface GameStore {
  phase: Phase;
  paused: boolean;
  speed: number;
  selection: number[];
  hud: Hud;
  result: ResultStats | null;
  generation: number;
  start: () => void;
  restart: () => void;
  togglePause: () => void;
  setSpeed: (s: number) => void;
  select: (ids: number[], additive?: boolean) => void;
  applyFormation: (type: FormationType) => void;
  applyOrder: (order: Order) => void;
  moveTo: (x: number, z: number) => void;
  publish: () => void;
  finish: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'briefing',
  paused: false,
  speed: 1,
  selection: [],
  hud: EMPTY_HUD,
  result: null,
  generation: 0,
  start: () => {
    simLoop.running = true;
    simLoop.paused = false;
    set({ phase: 'playing', paused: false, hud: makeSnapshot(simLoop.world) });
  },
  restart: () => {
    simLoop.restart();
    simLoop.running = true;
    set({
      phase: 'playing',
      paused: false,
      selection: [],
      result: null,
      generation: simLoop.generation,
      hud: makeSnapshot(simLoop.world),
    });
  },
  togglePause: () => {
    if (get().phase !== 'playing') return;
    const p = !simLoop.paused;
    simLoop.paused = p;
    set({ paused: p });
  },
  setSpeed: (s) => {
    simLoop.speed = s;
    set({ speed: s });
  },
  select: (ids, additive = false) => {
    const cur = get().selection;
    const next = additive ? Array.from(new Set([...cur, ...ids])) : ids;
    set({ selection: next });
  },
  applyFormation: (type) => {
    const w = simLoop.world;
    for (const id of get().selection) setFormation(w, w.squads[id], type);
    get().publish();
  },
  applyOrder: (order) => {
    const w = simLoop.world;
    for (const id of get().selection) setOrder(w, w.squads[id], order);
    get().publish();
  },
  moveTo: (x, z) => {
    const w = simLoop.world;
    const sel = get().selection.map((id) => w.squads[id]).filter(Boolean);
    orderMove(w, sel, x, z);
    get().publish();
  },
  publish: () => set({ hud: makeSnapshot(simLoop.world) }),
  finish: () => set({ phase: 'ended', result: simLoop.world.result }),
}));

