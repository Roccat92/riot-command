// GameState: kho zustand cho trang thai UI (pha game, lua chon, anh chup HUD da gioi han tan suat, ket qua).
// Khong bao gio chua du lieu theo tung don vi moi khung hinh: HUD chi nhan anh chup ~4 lan/giay.
import { create } from 'zustand';
import { sfx } from '../ui/sfx';
import { orderMove, setFormation, setOrder } from '../sim/SquadController';
import { simLoop } from '../sim/SimulationLoop';
import { triggerDodge } from '../sim/ProjectileSystem';
import { TUNE } from '../sim/tuning';
import { aim } from '../render/aim';
import {
  aimTruck,
  orderTruckMove,
  orderTruckRefill,
  setTruckAuto,
  setTruckFiring,
  useFlash,
  useGas,
  useLrad,
} from '../sim/ToolsSystem';
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
  dodge: boolean; // dang o tu the san sang ne
}
export type ToolKind = 'gas' | 'flash' | 'lrad';
export interface HudTruck {
  active: boolean;
  hp: number; // 0..1
  water: number; // 0..1
  firing: boolean;
  auto: boolean;
  refilling: boolean;
  pumpLock: boolean;
  dead: boolean;
}
export interface HudTools {
  gas: number;
  gasMax: number;
  flash: number;
  flashMax: number;
  gasCd: number; // giay cho chung (nho nhat trong cac squad dang xet)
  flashCd: number;
  lradCd: number; // giay cho LRAD (0 = san sang)
  lradOn: boolean;
}
export interface Hud {
  truck: HudTruck;
  tools: HudTools;
  knockdowns: number;
  gassed: number;
  extinguished: number;
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
  thrown: number;
  molotovs: number;
  blocked: number;
  dodged: number;
  projHits: number;
  fires: number; // vung lua dang chay
  fireTotal: number; // tong vung lua da xuat hien
  pending: number; // tiep vien chua den
  nextWave: number; // giay den dot tiep vien ke tiep (-1 neu het)
  waveAlert: string | null;
  squads: HudSquad[];
}

export const EMPTY_HUD: Hud = {
  truck: { active: false, hp: 1, water: 1, firing: false, auto: false, refilling: false, pumpLock: false, dead: false },
  tools: { gas: 0, gasMax: 0, flash: 0, flashMax: 0, gasCd: 0, flashCd: 0, lradCd: 0, lradOn: false },
  knockdowns: 0,
  gassed: 0,
  extinguished: 0,
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
  thrown: 0,
  molotovs: 0,
  blocked: 0,
  dodged: 0,
  projHits: 0,
  fires: 0,
  fireTotal: 0,
  pending: 0,
  nextWave: -1,
  waveAlert: null,
  squads: [],
};

/** Cac squad dang dung trang bi: squad duoc chon, neu khong co thi tat ca squad con nguoi. */
export function toolSquads(w: World, sel: number[]): number[] {
  const ids = sel.filter((i) => w.squads[i] && w.squads[i].aliveCount > 0);
  return ids.length ? ids : w.squads.filter((s) => s.aliveCount > 0).map((s) => s.id);
}

export function makeSnapshot(w: World, sel: number[] = []): Hud {
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
      dodge: s.alertT > 0,
    };
  });
  const m = w.metrics;
  let pending = 0;
  let nextWave = -1;
  for (const u of w.units) {
    if (!u.pending) continue;
    pending++;
    const left = u.spawnAt - w.time;
    if (nextWave < 0 || left < nextWave) nextWave = left;
  }
  let fires = 0;
  for (const f of w.fires) if (f.active) fires++;
  const st = m.stats;
  const tk = w.truck;
  const ids = toolSquads(w, sel);
  let gas = 0;
  let flash = 0;
  let gasCd = 99;
  let flashCd = 99;
  let lradCd = 99;
  for (const id of ids) {
    const s = w.squads[id];
    gas += s.gas;
    flash += s.flash;
    gasCd = Math.min(gasCd, s.gas > 0 ? s.eqCd : 99);
    flashCd = Math.min(flashCd, s.flash > 0 ? s.eqCd : 99);
    lradCd = Math.min(lradCd, s.lradCd);
  }
  return {
    truck: {
      active: tk.active,
      hp: tk.hp / tk.maxHp,
      water: tk.water / tk.maxWater,
      firing: tk.firing && tk.jet > 0.2,
      auto: tk.auto,
      refilling: tk.refilling,
      pumpLock: tk.pumpCd > 0,
      dead: tk.hp <= 0,
    },
    tools: {
      gas,
      gasMax: ids.length * TUNE.gasCharges,
      flash,
      flashMax: ids.length * TUNE.flashCharges,
      gasCd: gasCd === 99 ? 0 : gasCd,
      flashCd: flashCd === 99 ? 0 : flashCd,
      lradCd: lradCd === 99 ? 0 : lradCd,
      lradOn: w.lrad.active,
    },
    knockdowns: st.knockdowns,
    gassed: st.gassed,
    extinguished: st.extinguished,
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
    thrown: st.thrown,
    molotovs: st.molotovs,
    blocked: st.blocked,
    dodged: st.dodged,
    projHits: st.projHits,
    fires,
    fireTotal: st.fireZones,
    pending,
    nextWave: Math.max(0, nextWave),
    waveAlert: w.alert && w.time - w.alert.t < 9 ? w.alert.text : null,
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
  dodge: () => void;
  truckSel: boolean;
  targeting: ToolKind | null;
  toast: { text: string; t: number } | null;
  selectTruck: (on?: boolean) => void;
  truckSpray: (on?: boolean) => void;
  truckAutoToggle: () => void;
  truckRefill: () => void;
  truckDrive: (x: number, z: number) => void;
  setTargeting: (k: ToolKind | null) => void;
  fireTool: (k: ToolKind, x?: number, z?: number) => boolean;
  sfxOn: boolean;
  toggleSfx: () => void;
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
    set({ phase: 'playing', paused: false, hud: makeSnapshot(simLoop.world, get().selection) });
  },
  restart: () => {
    simLoop.restart();
    simLoop.running = true;
    set({
      phase: 'playing',
      paused: false,
      selection: [],
      truckSel: false,
      targeting: null,
      result: null,
      generation: simLoop.generation,
      hud: makeSnapshot(simLoop.world, get().selection),
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
    set({ selection: next, truckSel: ids.length ? false : get().truckSel });
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
  dodge: () => {
    const w = simLoop.world;
    for (const id of get().selection) if (w.squads[id]) triggerDodge(w, w.squads[id]);
    get().publish();
  },
  truckSel: false,
  targeting: null,
  toast: null,
  selectTruck: (on) => {
    const w = simLoop.world;
    if (!w.truck.active) return;
    const v = on ?? !get().truckSel;
    set({ truckSel: v, selection: v ? [] : get().selection, targeting: null });
    get().publish();
  },
  truckSpray: (on) => {
    const w = simLoop.world;
    if (!w.truck.active || w.truck.hp <= 0) return;
    const v = on ?? !w.truck.firing;
    if (v) {
      w.truck.auto = false;
      aimTruck(w, aim.x, aim.z);
    }
    setTruckFiring(w, v);
    get().publish();
  },
  truckAutoToggle: () => {
    const w = simLoop.world;
    if (!w.truck.active || w.truck.hp <= 0) return;
    setTruckAuto(w, !w.truck.auto);
    if (!w.truck.auto) w.truck.firing = false;
    get().publish();
  },
  truckRefill: () => {
    const w = simLoop.world;
    if (!w.truck.active || w.truck.hp <= 0) return;
    orderTruckRefill(w);
    get().publish();
  },
  truckDrive: (x, z) => {
    const w = simLoop.world;
    if (!w.truck.active || w.truck.hp <= 0) return;
    orderTruckMove(w, x, z);
  },
  setTargeting: (k) => set({ targeting: k, truckSel: k ? false : get().truckSel }),
  fireTool: (k, x = aim.x, z = aim.z) => {
    const w = simLoop.world;
    const ids = toolSquads(w, get().selection).sort((a, b) => {
      const sa = w.squads[a];
      const sb = w.squads[b];
      return Math.hypot(sa.cx - x, sa.cz - z) - Math.hypot(sb.cx - x, sb.cz - z);
    });
    const fn = k === 'gas' ? useGas : k === 'flash' ? useFlash : useLrad;
    let ok = false;
    for (const id of ids) {
      if (fn(w, id, x, z)) {
        ok = true;
        break;
      }
    }
    set({
      targeting: null,
      toast: ok ? null : { text: k === 'lrad' ? 'LRAD đang hồi chiêu' : 'Hết đạn hoặc đang nạp', t: performance.now() },
    });
    get().publish();
    return ok;
  },
  sfxOn: false,
  toggleSfx: () => {
    const on = !get().sfxOn;
    sfx.enabled = on;
    set({ sfxOn: on });
  },
  publish: () => set({ hud: makeSnapshot(simLoop.world, get().selection) }),
  finish: () => set({ phase: 'ended', result: simLoop.world.result }),
}));

