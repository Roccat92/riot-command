// Kieu du lieu dung chung cho phan mo phong (khong phu thuoc React/three).
import type { NavGrid } from './NavGrid';
import type { SpatialHash } from './SpatialHash';

export const POLICE = 0;
export const RIOTER = 1;
export const CIVILIAN = 2;
export type Team = 0 | 1 | 2;

export type AIState =
  | 'IDLE'
  | 'GATHER'
  | 'AGITATED'
  | 'APPROACH'
  | 'ENGAGE'
  | 'RETREAT'
  | 'PANIC'
  | 'DISPERSE'
  | 'DOWN';

export type FormationType = 'LINE' | 'DOUBLE_LINE' | 'COMPACT';
export type Order = 'MOVE' | 'HOLD' | 'ADVANCE' | 'REGROUP' | 'DEESCALATE';
export type AnimType = 'NONE' | 'BATON' | 'PUSH' | 'HIT' | 'PUNCH';

export interface Vec2 {
  x: number;
  z: number;
}

export interface Unit {
  id: number;
  team: Team;
  group: number; // police: squad id, rioter: group id, civilian: -1
  // vi tri (mat phang XZ); px/pz = vi tri tick truoc de noi suy khi render
  x: number;
  z: number;
  px: number;
  pz: number;
  vx: number;
  vz: number;
  dvx: number; // van toc mong muon (do AI dat)
  dvz: number;
  kx: number; // van toc day lui (knockback)
  kz: number;
  heading: number;
  pheading: number;
  face: number; // huong mong muon
  // chi so
  health: number;
  stamina: number;
  morale: number;
  cohesion: number;
  maxHealth: number;
  // AI
  state: AIState;
  stateTime: number;
  react: number; // do tre phan ung ca nhan (giay)
  temper: number; // tinh nong nay 0.7..1.3
  agitation: number; // 0..1
  homeX: number;
  homeZ: number;
  offA: number;
  offR: number;
  wanderX: number;
  wanderZ: number;
  wanderT: number;
  nearPolice: number;
  nearPoliceId: number;
  danger: number;
  dangerX: number;
  dangerZ: number;
  exitIdx: number;
  path: Vec2[];
  pathT: number;
  target: number;
  // police
  slot: number;
  // chien dau / hoat anh
  atkCd: number;
  anim: AnimType;
  animT: number;
  animDur: number;
  provoked: number;
  downT: number;
  phase: number;
  speed: number;
  active: boolean; // false khi da roi ban do
  exited: boolean;
  // trang phuc (cho renderer)
  jacket: number;
  pants: number;
  skin: number;
  hood: boolean;
}

export interface Squad {
  id: number;
  name: string;
  unitIds: number[];
  formation: FormationType;
  order: Order;
  cx: number; // diem neo doi hinh
  cz: number;
  heading: number;
  path: Vec2[];
  pathIdx: number;
  dest: Vec2 | null;
  speed: number;
  retarget: number;
  slotError: number;
  alert: string;
  aliveCount: number;
}

export interface Group {
  id: number;
  unitIds: number[];
  cx: number;
  cz: number;
  agitation: number;
  morale: number;
  escalation: number; // toc do leo thang theo thoi gian
  baseAgitation: number;
}

export interface CircleObs {
  kind: 'circle';
  x: number;
  z: number;
  r: number;
  type: 'statue' | 'tree' | 'bin' | 'lamp' | 'table';
}
export interface BoxObs {
  kind: 'box';
  x: number;
  z: number;
  hw: number; // nua rong theo X
  hd: number; // nua sau theo Z
  type: 'van' | 'barrier' | 'bench' | 'kiosk';
}
export type Obstacle = CircleObs | BoxObs;

export interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  wall: number;
  roof: number;
  facing: 'N' | 'S' | 'E' | 'W'; // mat tien huong vao quang truong
}

export interface MapData {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  obstacles: Obstacle[];
  buildings: Building[];
  exits: Vec2[]; // 4 loi thoat (cac con pho)
}

export interface StrikeEvent {
  x: number;
  z: number;
  t: number;
  kind: 'baton' | 'push';
}

export interface Stats {
  policeDown: number;
  rioterDown: number;
  rioterDispersed: number;
  civiliansHarm: number;
  civiliansEvacuated: number;
  batons: number;
  pushes: number;
  collateral: number;
  peakForce: number;
  forceSum: number;
  forceSamples: number;
}

export interface Metrics {
  stability: number;
  safety: number;
  force: number;
  hostile: number; // so nguoi bieu tinh chua duoc xu ly
  clearTimer: number; // thoi gian lien tuc khong con hostile
  lowStabilityTimer: number;
  stats: Stats;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface ResultStats {
  outcome: 'won' | 'lost';
  reason: string;
  time: number;
  rating: string;
  policeActive: number;
  policeTotal: number;
  stats: Stats;
  avgForce: number;
  safety: number;
  stability: number;
}

export interface WorldConfig {
  squads: number;
  groups: number;
  civilians: number;
  seed: number;
}

export const SLICE_CONFIG: WorldConfig = { squads: 2, groups: 1, civilians: 0, seed: 7 };
export const MVP_CONFIG: WorldConfig = { squads: 3, groups: 3, civilians: 10, seed: 7 };

export interface World {
  config: WorldConfig;
  time: number;
  tick: number;
  rng: () => number;
  units: Unit[];
  squads: Squad[];
  groups: Group[];
  map: MapData;
  nav: NavGrid;
  hash: SpatialHash;
  strikes: StrikeEvent[];
  metrics: Metrics;
  status: GameStatus;
  result: ResultStats | null;
  aiAcc: number;
  timeLimit: number;
  safetyThreshold: number;
  messages: string[];
}

export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isAlive(u: Unit): boolean {
  return u.active && u.state !== 'DOWN';
}

// Trang thai nguoi bieu tinh con "chua xu ly" (dieu kien thang)
export function isThreatState(s: AIState): boolean {
  return s === 'GATHER' || s === 'AGITATED' || s === 'APPROACH' || s === 'ENGAGE';
}
// Trang thai nguoi bieu tinh canh sat duoc phep chong do
export function isHostileState(s: AIState): boolean {
  return s === 'AGITATED' || s === 'APPROACH' || s === 'ENGAGE';
}
