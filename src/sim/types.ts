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
export type AnimType = 'NONE' | 'BATON' | 'PUSH' | 'HIT' | 'PUNCH' | 'THROW' | 'DODGE';

// Vai tro nguoi bieu tinh
export const ROLE_MELEE = 0;
export const ROLE_THROWER = 1;
export const ROLE_FLANKER = 2;

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
  // vai tro + nem do vat
  role: number;
  throwCd: number;
  ammoMolo: number;
  ammo: number; // so lan nem da/chai con lai
  flankSide: number;
  calmed: boolean;
  // canh sat: ne tranh
  dodgeT: number;
  dodgeX: number;
  dodgeZ: number;
  burn: number;
  knock: number; // giay con nam duoi dat (bi voi rong quat ngã)
  knockDur: number;
  soak: number; // do uot tich luy (>= nguong thi nga)
  stun: number; // giay bi choang (flashbang / LRAD)
  stunK: number; // he so toc do khi bi choang (0..1)
  cough: number; // giay con ho (hoi cay)
  pending: boolean; // dang cho dot tiep vien
  spawnAt: number;
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
  alertT: number;
  stamina: number; // the luc trung binh (0..100) // che do san sang ne (lenh Dodge)
  gas: number; // so dan hoi cay con lai
  flash: number; // so luu dan choang con lai
  eqCd: number; // thoi gian cho chung cua dan hoi cay / luu dan
  lradCd: number; // thoi gian cho LRAD
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

export interface Projectile {
  active: boolean;
  kind: number; // 0 da, 1 chai, 2 molotov
  sx: number;
  sz: number;
  tx: number;
  tz: number;
  t: number;
  dur: number;
  arc: number;
  thrower: number;
  spin: number;
}

export interface FireZone {
  active: boolean;
  x: number;
  z: number;
  r: number;
  t: number;
  dur: number;
}

export interface Truck {
  active: boolean;
  x: number;
  z: number;
  px: number;
  pz: number;
  heading: number;
  hp: number;
  maxHp: number;
  water: number;
  maxWater: number;
  aimX: number;
  aimZ: number;
  firing: boolean; // dang phun
  auto: boolean; // tu ngam va phun
  pumpCd: number; // khoa bom sau khi can nuoc
  dest: Vec2 | null;
  path: Vec2[];
  pathIdx: number;
  refilling: boolean;
  burnT: number; // dang chay (giay)
  jet: number; // 0..1 cuong do tia nuoc hien tai (cho renderer)
  jetEndX: number;
  jetEndZ: number;
}

export interface GasCloud {
  active: boolean;
  x: number;
  z: number;
  r: number;
  t: number;
  dur: number;
  vx: number;
  vz: number;
}

export interface Puddle {
  active: boolean;
  x: number;
  z: number;
  r: number;
  t: number;
  dur: number;
  kind: number; // 0 nuoc, 1 vet chay
}

export interface LradBeam {
  active: boolean;
  x: number;
  z: number;
  ang: number;
  t: number;
  dur: number;
}

export interface FxEvent {
  x: number;
  z: number;
  t: number;
  kind: 'block' | 'hit' | 'glass' | 'burst' | 'dodge' | 'splash' | 'flash' | 'gaspop';
}

export interface SimEvent {
  type: 'throw' | 'block' | 'hit' | 'glass' | 'fire' | 'dodge' | 'wave' | 'water' | 'gas' | 'flash' | 'lrad' | 'truckhit' | 'knock';
  x: number;
  z: number;
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
  thrown: number;
  molotovs: number;
  projHits: number;
  blocked: number;
  dodged: number;
  fireZones: number;
  burnSeconds: number;
  waterUsed: number;
  knockdowns: number;
  extinguished: number;
  gasUsed: number;
  flashUsed: number;
  lradUsed: number;
  truckDamage: number;
  gassed: number; // so luot nguoi bieu tinh bi ho vi hoi cay (moi nguoi tinh 1 lan)
  stunned: number;
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
  groupSizes: number[];
  waveTimes: number[]; // 0 = co mat tu dau; > 0 = tiep vien den luc do (giay)
}

export const SLICE_CONFIG: WorldConfig = { squads: 2, groups: 1, civilians: 0, seed: 7, groupSizes: [10], waveTimes: [0] };
export const MVP_CONFIG: WorldConfig = {
  squads: 3,
  groups: 5,
  civilians: 10,
  seed: 7,
  groupSizes: [13, 13, 13, 16, 18],
  waveTimes: [0, 0, 0, 55, 120],
};

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
  projectiles: Projectile[];
  fires: FireZone[];
  truck: Truck;
  gas: GasCloud[];
  puddles: Puddle[];
  lrad: LradBeam;
  burning: number[]; // thoi gian chay con lai cua tung vat can (xe, rao chan)
  shake: number; // bien do rung camera (0..1)
  fx: FxEvent[];
  events: SimEvent[];
  alert: { text: string; t: number } | null;
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
