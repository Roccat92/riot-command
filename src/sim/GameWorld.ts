// GameWorld: du lieu ban do (quang truong Paris gia tuong) va khoi tao the gioi mo phong.
import { TUNE } from './tuning';
import { assignSlots, formationSlots, slotToWorld } from './FormationSystem';
import { NavGrid } from './NavGrid';
import { SpatialHash } from './SpatialHash';
import {
  CIVILIAN,
  POLICE,
  RIOTER,
  mulberry32,
  ROLE_FLANKER,
  ROLE_MELEE,
  ROLE_THROWER,
  type Building,
  type Group,
  type MapData,
  type Obstacle,
  type Squad,
  type Stats,
  type Team,
  type Unit,
  type Vec2,
  type World,
  type WorldConfig,
} from './types';

export const BOUNDS = { minX: -30, maxX: 30, minZ: -24, maxZ: 24 };
export const SQUAD_NAMES = ['Squad 1', 'Squad 2', 'Squad 3'];

// Bang mau trang phuc (chi so luu trong Unit, renderer tra mau)
export const JACKETS = [0xc0392b, 0xd68910, 0x1e8449, 0x7d3c98, 0x2e86c1, 0x566573, 0xa04000, 0xf4d03f, 0x16a085, 0xe6e6e6];
export const CIV_JACKETS = [0xe8dcc8, 0x9fb8ad, 0xe6b0aa, 0xaed6f1, 0xf9e79f, 0xd7bde2, 0xf5cba7, 0xa9cce3];
export const PANTS = [0x1c2833, 0x34495e, 0x2c3e50, 0x5d4037, 0x3b3b3b, 0x4a5a40];
export const SKINS = [0xf1c9a5, 0xd9a77c, 0xa9744f, 0x7b4a2e, 0xe8b998];

export function buildMap(): MapData {
  const obstacles: Obstacle[] = [];
  const circle = (x: number, z: number, r: number, type: 'statue' | 'tree' | 'bin' | 'lamp' | 'table') =>
    obstacles.push({ kind: 'circle', x, z, r, type });
  const box = (x: number, z: number, hw: number, hd: number, type: 'van' | 'barrier' | 'bench' | 'kiosk') =>
    obstacles.push({ kind: 'box', x, z, hw, hd, type });

  circle(0, 0, 2.9, 'statue');
  // xe van canh sat tren duong phia nam va phia tay
  box(-10, 21, 2.9, 1.25, 'van');
  box(10.5, 21.2, 2.9, 1.25, 'van');
  box(-26, 9, 1.25, 2.9, 'van');
  // hang rao chan
  for (const x of [-9, -6.5, 6.5, 9]) box(x, -6, 1.1, 0.3, 'barrier');
  box(-14, 6, 1.1, 0.3, 'barrier');
  box(14, 6, 1.1, 0.3, 'barrier');
  box(-3.5, 9, 1.1, 0.3, 'barrier');
  box(3.5, 9, 1.1, 0.3, 'barrier');
  // ghe da
  box(-5, 4.6, 1.0, 0.35, 'bench');
  box(5, -4.6, 1.0, 0.35, 'bench');
  box(-5, -4.6, 1.0, 0.35, 'bench');
  box(5, 4.6, 1.0, 0.35, 'bench');
  // cay
  const trees: [number, number][] = [
    [-16, -10], [-16, 10], [16, -10], [16, 10], [-8, -11.5], [8, -11.5], [-8, 11.5], [8, 11.5], [-20.5, 0], [20.5, 0],
  ];
  for (const [x, z] of trees) circle(x, z, 0.65, 'tree');
  // thung rac
  const bins: [number, number][] = [
    [-18, -13], [18, -13], [-18, 13], [18, 13], [-11, 14.5], [11, 14.5], [22, -6], [22, 6],
  ];
  for (const [x, z] of bins) circle(x, z, 0.5, 'bin');
  // cot den
  for (let x = -18; x <= 18; x += 9) {
    circle(x, -15.2, 0.22, 'lamp');
    circle(x, 15.2, 0.22, 'lamp');
  }
  for (const z of [-9, 0, 9]) {
    circle(-22, z, 0.22, 'lamp');
    circle(22, z, 0.22, 'lamp');
  }
  // ban cafe ben tay
  const tables: [number, number][] = [
    [-24.8, -10.5], [-24.8, -7], [-24.8, -3.5], [-22, -9], [-22, -5],
  ];
  for (const [x, z] of tables) circle(x, z, 0.6, 'table');

  // toa nha kieu Phap bao quanh, chua cac khe duong (|x|<6 phia bac/nam, |z|<5 phia dong/tay)
  const B = BOUNDS;
  const buildings: Building[] = [];
  const add = (x: number, z: number, w: number, d: number, h: number, facing: Building['facing'], wi: number, ri: number) => {
    const walls = [0xe9dfc8, 0xdccfb2, 0xd9c7a6, 0xe3d5bd, 0xcfc2a6];
    const roofs = [0x4f5d6e, 0x56606f, 0x3f4c5c];
    buildings.push({ x, z, w, d, h, facing, wall: walls[wi % walls.length], roof: roofs[ri % roofs.length] });
  };
  // phia bac (z < minZ) va phia nam (z > maxZ), moi ben chia 2 khoi + khe duong o giua
  const northSouth = (zc: number, facing: 'N' | 'S') => {
    const d = 9;
    const z = zc;
    add(-20, z, 28, d, 11, facing, 0, 0);
    add(20, z, 28, d, 12.5, facing, 1, 1);
    add(-40, z, 12, d, 10, facing, 2, 2);
    add(40, z, 12, d, 11.5, facing, 3, 0);
  };
  northSouth(B.minZ - 4.5, 'S');
  northSouth(B.maxZ + 4.5, 'N');
  // phia dong, tay (khe duong |z|<5)
  add(B.maxX + 4.5, -15, 9, 18, 11, 'W', 1, 1);
  add(B.maxX + 4.5, 15, 9, 18, 12, 'W', 3, 2);
  add(B.minX - 4.5, 15, 9, 18, 12, 'E', 3, 2);
  add(B.minX - 4.5, -20, 9, 8, 11, 'E', 1, 1);
  // quan cafe (thap hon, mai do) o phia tay
  buildings.push({ x: B.minX - 4.5, z: -11, w: 9, d: 10, h: 4.2, facing: 'E', wall: 0xc9b690, roof: 0x7a2b2b });

  const exits: Vec2[] = [
    { x: 0, z: B.minZ },
    { x: 0, z: B.maxZ },
    { x: B.minX, z: 0 },
    { x: B.maxX, z: 0 },
  ];
  return { ...B, obstacles, buildings, exits };
}

function emptyStats(): Stats {
  return {
    policeDown: 0,
    rioterDown: 0,
    rioterDispersed: 0,
    civiliansHarm: 0,
    civiliansEvacuated: 0,
    batons: 0,
    pushes: 0,
    collateral: 0,
    peakForce: 0,
    forceSum: 0,
    forceSamples: 0,
    thrown: 0,
    molotovs: 0,
    projHits: 0,
    blocked: 0,
    dodged: 0,
    fireZones: 0,
    burnSeconds: 0,
  };
}

function newUnit(id: number, team: Team, group: number, x: number, z: number, rng: () => number): Unit {
  return {
    id,
    team,
    group,
    x,
    z,
    px: x,
    pz: z,
    vx: 0,
    vz: 0,
    dvx: 0,
    dvz: 0,
    kx: 0,
    kz: 0,
    heading: 0,
    pheading: 0,
    face: 0,
    health: team === POLICE ? 100 : team === RIOTER ? 70 : 50,
    maxHealth: team === POLICE ? 100 : team === RIOTER ? 70 : 50,
    stamina: 100,
    morale: team === POLICE ? 85 : team === RIOTER ? 70 + rng() * 12 : 80,
    cohesion: 80,
    state: 'IDLE',
    stateTime: 0,
    react: rng() * 0.8,
    temper: 0.75 + rng() * 0.55,
    agitation: 0,
    homeX: x,
    homeZ: z,
    offA: rng() * Math.PI * 2,
    offR: 0.5 + rng() * 3.2,
    wanderX: x,
    wanderZ: z,
    wanderT: rng() * 3,
    nearPolice: 99,
    nearPoliceId: -1,
    danger: 0,
    dangerX: 0,
    dangerZ: 0,
    role: 0,
    throwCd: 3 + rng() * 6,
    ammo: 0,
    ammoMolo: 0,
    flankSide: rng() < 0.5 ? -1 : 1,
    calmed: false,
    dodgeT: 0,
    dodgeX: 0,
    dodgeZ: 0,
    burn: 0,
    pending: false,
    spawnAt: 0,
    exitIdx: -1,
    path: [],
    pathT: rng() * 0.5,
    target: -1,
    slot: -1,
    atkCd: rng() * 1,
    anim: 'NONE',
    animT: 0,
    animDur: 0.4,
    provoked: 0,
    downT: 0,
    phase: rng() * 6,
    speed: 0,
    active: true,
    exited: false,
    jacket: (rng() * 1000) | 0,
    pants: (rng() * 1000) | 0,
    skin: (rng() * 1000) | 0,
    hood: rng() < 0.55,
  };
}

function freeSpot(map: MapData, x: number, z: number, rng: () => number, spread: number, others: Unit[]): Vec2 {
  for (let tries = 0; tries < 40; tries++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * spread;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    let ok = true;
    for (const o of map.obstacles) {
      if (o.kind === 'circle') {
        if (Math.hypot(px - o.x, pz - o.z) < o.r + 0.6) ok = false;
      } else if (Math.abs(px - o.x) < o.hw + 0.6 && Math.abs(pz - o.z) < o.hd + 0.6) ok = false;
    }
    for (const u of others) if (Math.hypot(px - u.x, pz - u.z) < 1.0) ok = false;
    if (ok) return { x: px, z: pz };
  }
  return { x, z };
}

const SQUAD_SPAWN: Vec2[] = [
  { x: -10.5, z: 16.5 },
  { x: 0, z: 16.5 },
  { x: 10.5, z: 16.5 },
];
const SQUAD_SPAWN_SLICE: Vec2[] = [
  { x: -6, z: 16.5 },
  { x: 6, z: 16.5 },
];
const GROUP_SPAWN: Vec2[] = [
  { x: -12, z: -11 },
  { x: 12, z: -11 },
  { x: 0, z: -16 },
  { x: 26.5, z: 0 }, // tiep vien tu pho phia Dong
  { x: -26.5, z: 1 }, // tiep vien tu pho phia Tay
];
export const WAVE_LABEL = ['', '', '', 'phố phía Đông', 'phố phía Tây'];
const GROUP_SPAWN_SLICE: Vec2[] = [{ x: 0, z: -11 }];
const CIV_SPOTS: Vec2[] = [
  { x: -22.5, z: -8 },
  { x: -22, z: -6 },
  { x: -24, z: -5 },
  { x: -23, z: -10 },
  { x: 8, z: 5 },
  { x: -8, z: 6 },
  { x: 5, z: -3 },
  { x: -9, z: -2 },
  { x: 12, z: 2 },
  { x: -13, z: 4 },
];

export function createWorld(config: WorldConfig): World {
  const rng = mulberry32(config.seed);
  const map = buildMap();
  const units: Unit[] = [];
  const squads: Squad[] = [];
  const groups: Group[] = [];
  const nav = new NavGrid(map);
  const hash = new SpatialHash(map.minX - 4, map.minZ - 4, map.maxX - map.minX + 8, map.maxZ - map.minZ + 8);

  // Canh sat: moi squad 8 don vi
  const sp = config.squads === 2 ? SQUAD_SPAWN_SLICE : SQUAD_SPAWN;
  for (let s = 0; s < config.squads; s++) {
    const squad: Squad = {
      id: s,
      name: SQUAD_NAMES[s],
      unitIds: [],
      formation: 'LINE',
      order: 'HOLD',
      cx: sp[s].x,
      cz: sp[s].z,
      heading: Math.PI, // huong ve phia bac (-Z)
      path: [],
      pathIdx: 0,
      dest: null,
      speed: 3,
      retarget: 0,
      slotError: 0,
      alert: '',
      aliveCount: 8,
      alertT: 0,
      stamina: 100,
    };
    const slotsLocal = formationSlots(squad.formation, 8);
    const tmp: Vec2 = { x: 0, z: 0 };
    for (let k = 0; k < 8; k++) {
      slotToWorld(squad.cx, squad.cz, squad.heading, slotsLocal[k], tmp);
      const u = newUnit(units.length, POLICE, s, tmp.x, tmp.z, rng);
      u.heading = u.pheading = u.face = squad.heading;
      u.slot = k;
      u.morale = 85;
      u.cohesion = 90;
      u.jacket = 0;
      squad.unitIds.push(u.id);
      units.push(u);
    }
    squads.push(squad);
  }

  // Nhom bao dong (so nguoi theo config), co dot tiep vien tu cac con pho ben
  const gp = config.groups === 1 ? GROUP_SPAWN_SLICE : GROUP_SPAWN;
  const baseAg = [0.35, 0.3, 0.28, 0.7, 0.7];
  const escal = [0.009 * TUNE.escal, 0.007 * TUNE.escal, 0.006 * TUNE.escal, 0.02, 0.02];
  const throwerFrac = [0.3, 0.45, 0.6, 0.4, 0.5];
  const flankerFrac = [0.15, 0.3, 0.1, 0.35, 0.15];
  for (let g = 0; g < config.groups; g++) {
    const group: Group = {
      id: g,
      unitIds: [],
      cx: gp[g].x,
      cz: gp[g].z,
      agitation: baseAg[g],
      morale: 75,
      escalation: escal[g],
      baseAgitation: baseAg[g],
    };
    const wave = config.waveTimes[g] ?? 0;
    const size = config.groupSizes[g] ?? 10;
    for (let k = 0; k < size; k++) {
      const spread = wave > 0 ? 3.4 : 4.2;
      const p = freeSpot(map, gp[g].x, gp[g].z, rng, spread, units);
      const u = newUnit(units.length, RIOTER, g, p.x, p.z, rng);
      u.state = wave > 0 ? 'AGITATED' : 'GATHER';
      u.agitation = baseAg[g] + (rng() - 0.5) * 0.12;
      u.homeX = gp[g].x;
      u.homeZ = gp[g].z;
      u.heading = u.pheading = u.face = Math.PI * 0;
      u.temper = (g === 0 ? 1.05 : g === 1 ? 0.95 : g === 2 ? 0.9 : 1.1) * (0.8 + rng() * 0.4);
      const roll = rng();
      u.role = roll < throwerFrac[g] ? ROLE_THROWER : roll < throwerFrac[g] + flankerFrac[g] ? ROLE_FLANKER : ROLE_MELEE;
      u.ammo = u.role === ROLE_THROWER ? Math.round(TUNE.ammo * (0.7 + rng() * 0.6)) : u.role === ROLE_FLANKER ? 2 : 0;
      u.ammoMolo = u.role === ROLE_THROWER && rng() < TUNE.molo ? 1 : 0;
      if (wave > 0) {
        u.active = false;
        u.pending = true;
        u.spawnAt = wave;
        u.heading = u.pheading = u.face = gp[g].x > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      group.unitIds.push(u.id);
      units.push(u);
    }
    groups.push(group);
  }

  // Dan thuong
  for (let c = 0; c < config.civilians; c++) {
    const spot = CIV_SPOTS[c % CIV_SPOTS.length];
    const p = freeSpot(map, spot.x, spot.z, rng, 1.2, units);
    const u = newUnit(units.length, CIVILIAN, -1, p.x, p.z, rng);
    u.homeX = p.x;
    u.homeZ = p.z;
    u.heading = u.pheading = u.face = rng() * Math.PI * 2;
    units.push(u);
  }

  const world: World = {
    config,
    time: 0,
    tick: 0,
    rng,
    units,
    squads,
    groups,
    map,
    nav,
    hash,
    strikes: [],
    projectiles: Array.from({ length: 64 }, () => ({ active: false, kind: 0, sx: 0, sz: 0, tx: 0, tz: 0, t: 0, dur: 1, arc: 3, thrower: -1, spin: 0 })),
    fires: Array.from({ length: 12 }, () => ({ active: false, x: 0, z: 0, r: 2.4, t: 0, dur: 7 })),
    fx: [],
    events: [],
    alert: null,
    metrics: {
      stability: 75,
      safety: 100,
      force: 0,
      hostile: 0,
      clearTimer: 0,
      lowStabilityTimer: 0,
      stats: emptyStats(),
    },
    status: 'playing',
    result: null,
    aiAcc: 0,
    timeLimit: 300,
    safetyThreshold: 50,
    messages: [],
  };
  return world;
}

export function unitsOf(world: World, ids: number[]): Unit[] {
  const out: Unit[] = [];
  for (const id of ids) out.push(world.units[id]);
  return out;
}

export function initialAssign(world: World): void {
  for (const s of world.squads) {
    const us = unitsOf(world, s.unitIds);
    const slots = formationSlots(s.formation, us.length);
    const ws = slots.map((sl) => slotToWorld(s.cx, s.cz, s.heading, sl, { x: 0, z: 0 }));
    const a = assignSlots(us, ws);
    us.forEach((u, i) => (u.slot = a[i]));
  }
}

/** Dot tiep vien: don vi cho den gio thi xuat hien o cuoi con pho. */
export function updateWaves(w: World): void {
  for (const u of w.units) {
    if (!u.pending || w.time < u.spawnAt) continue;
    u.pending = false;
    u.active = true;
    const g = w.groups[u.group];
    if (!w.alert || w.alert.t !== u.spawnAt) {
      w.alert = { text: `Đợt tiếp viện của người biểu tình từ ${WAVE_LABEL[g.id] || 'con phố bên'}!`, t: u.spawnAt };
      w.events.push({ type: 'wave', x: g.cx, z: g.cz });
    }
  }
}
