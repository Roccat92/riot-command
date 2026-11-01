// CrowdAI: may trang thai huu han (FSM) cho nguoi bieu tinh va dan thuong.
// IDLE, GATHER, AGITATED, APPROACH, ENGAGE, RETREAT, PANIC, DISPERSE (+ DOWN khi mat kha nang).
import { exitGoal, navGoal, setGoal } from './MovementSystem';
import { TUNE } from './tuning';
import { THROW_MAX, tryThrow } from './ProjectileSystem';
import {
  CIVILIAN,
  POLICE,
  RIOTER,
  ROLE_FLANKER,
  ROLE_THROWER,
  clamp,
  isAlive,
  type AIState,
  type Unit,
  type World,
} from './types';

export interface RioterInput {
  state: AIState;
  health: number;
  morale: number; // 0..100
  agitation: number; // 0..1
  temper: number; // 0.7..1.3
  nearPoliceDist: number;
  stateTime: number;
  groupMorale: number;
  distToExit: number;
  calmed: boolean;
}

/** Ham thuan tuy: trang thai ke tiep cua mot nguoi bieu tinh. */
export function rioterTransition(i: RioterInput): AIState {
  if (i.health <= 0) return 'DOWN';
  const m = i.morale + (i.temper - 1) * 12; // nguoi nong tinh kho bo chay hon
  switch (i.state) {
    case 'IDLE':
      return i.agitation > 0.2 ? 'GATHER' : 'IDLE';
    case 'GATHER':
      if (m < 30) return 'RETREAT';
      if (i.agitation > 0.45) return 'AGITATED';
      if (i.agitation < 0.08 && i.stateTime > 3) return 'IDLE';
      return 'GATHER';
    case 'AGITATED':
      if (m < 30) return 'RETREAT';
      if (i.agitation > 0.75 && i.nearPoliceDist < 45) return 'APPROACH';
      if (i.agitation < 0.3) return 'GATHER';
      return 'AGITATED';
    case 'APPROACH':
      if (m < 35) return 'RETREAT';
      if (i.nearPoliceDist <= 1.7) return 'ENGAGE';
      if (i.agitation < 0.4) return 'AGITATED';
      return 'APPROACH';
    case 'ENGAGE':
      if (m < 35) return 'RETREAT';
      if (i.nearPoliceDist > 3.0) return 'APPROACH';
      if (i.calmed && i.agitation < 0.4) return 'AGITATED';
      return 'ENGAGE';
    case 'RETREAT':
      if (i.distToExit < 3 || m < 10 || (i.groupMorale < 22 && i.stateTime > 5)) return 'DISPERSE';
      if (m < 15 || (i.nearPoliceDist < 3 && m < 25)) return 'PANIC';
      if (m > 55 && i.nearPoliceDist > 15 && i.stateTime > 6) return 'GATHER';
      return 'RETREAT';
    case 'PANIC':
      if (i.distToExit < 3 || m < 8 || (i.stateTime > 4 && m < 20)) return 'DISPERSE';
      if (m > 30 && i.stateTime > 3 && i.nearPoliceDist > 8) return 'RETREAT';
      return 'PANIC';
    default:
      return i.state; // DISPERSE, DOWN: ket thuc
  }
}

export interface CivilianInput {
  state: AIState;
  health: number;
  danger: number; // 0..1
  morale: number; // binh tinh
  stateTime: number;
  distToExit: number;
  bravery?: number; // 0..1: nguoi tho o/to mo, chi bo chay khi nguy hiem cao
}

export function civilianTransition(i: CivilianInput): AIState {
  if (i.health <= 0) return 'DOWN';
  switch (i.state) {
    case 'IDLE':
      return i.danger > 0.25 + 0.45 * (i.bravery ?? 0) || i.morale < 70 - 25 * (i.bravery ?? 0) ? 'RETREAT' : 'IDLE';
    case 'RETREAT':
      if (i.danger > 0.65 || i.morale < 40) return 'PANIC';
      if (i.distToExit < 2.5 && i.danger > 0.3) return 'DISPERSE';
      if (i.danger < 0.05 && i.morale > 85 && i.stateTime > 4) return 'IDLE';
      return 'RETREAT';
    case 'PANIC':
      if (i.distToExit < 3 || (i.morale < 15 && i.stateTime > 3)) return 'DISPERSE';
      if (i.danger < 0.2 && i.morale > 50) return 'RETREAT';
      return 'PANIC';
    default:
      return i.state;
  }
}

function enter(w: World, u: Unit, next: AIState): void {
  const prev = u.state;
  u.state = next;
  u.stateTime = 0;
  if (next === 'RETREAT' || next === 'PANIC' || next === 'DISPERSE') {
    if (u.exitIdx < 0 || next === 'RETREAT') u.exitIdx = chooseExit(w, u);
  }
  if (next === 'GATHER' && prev === 'RETREAT') u.agitation = Math.max(u.agitation, 0.4);
  if (next === 'DISPERSE') u.target = -1;
}

export function chooseExit(w: World, u: Unit): number {
  let best = 0;
  let bs = -1e9;
  const p = u.nearPoliceId >= 0 ? w.units[u.nearPoliceId] : null;
  for (let k = 0; k < w.map.exits.length; k++) {
    const e = w.map.exits[k];
    const dEx = Math.hypot(e.x - u.x, e.z - u.z);
    let s = -dEx * 0.6;
    if (p && u.team === RIOTER) s += Math.hypot(e.x - p.x, e.z - p.z);
    if (u.team === CIVILIAN && (u.dangerX || u.dangerZ)) {
      const dl = Math.hypot(u.dangerX, u.dangerZ) || 1;
      s += ((e.x - u.x) * (u.dangerX / dl) + (e.z - u.z) * (u.dangerZ / dl)) * 0.5;
    }
    if (s > bs) {
      bs = s;
      best = k;
    }
  }
  return best;
}

function distToExit(w: World, u: Unit): number {
  if (u.exitIdx < 0) u.exitIdx = chooseExit(w, u);
  const e = w.map.exits[u.exitIdx];
  return Math.hypot(e.x - u.x, e.z - u.z);
}

/** Tick AI nang (4 Hz): thong ke nhom, tinh than, kich dong, chuyen trang thai. */
function heavyTick(w: World, dtH: number): void {
  const { units, groups, squads } = w;
  // thong ke nhom
  for (const g of groups) {
    let n = 0;
    let cx = 0;
    let cz = 0;
    let ag = 0;
    let mo = 0;
    for (const id of g.unitIds) {
      const u = units[id];
      if (!isAlive(u)) continue;
      n++;
      cx += u.x;
      cz += u.z;
      ag += u.agitation;
      mo += u.morale;
    }
    if (n) {
      g.cx = cx / n;
      g.cz = cz / n;
      g.agitation = ag / n;
      g.morale = mo / n;
      for (const id of g.unitIds) {
        const u = units[id];
        if (!isAlive(u)) continue;
        const d = Math.hypot(u.x - g.cx, u.z - g.cz);
        u.cohesion = clamp(100 - d * 8, 0, 100);
      }
    }
  }
  const force = w.metrics.force;
  for (const u of units) {
    if (!isAlive(u) || u.team === POLICE) continue;
    u.stateTime += dtH;
    u.react -= dtH;
    if (u.team === RIOTER) updateRioter(w, u, dtH, force, squads);
    else updateCivilian(w, u, dtH);
  }
}

function updateRioter(w: World, u: Unit, dt: number, force: number, squads: World['squads']): void {
  const g = w.groups[u.group];
  // canh sat gan nhat
  let nd = 99;
  let nid = -1;
  let np = 0; // so canh sat trong 6m
  let nr = 0; // dong bon trong 6m
  let advancing = false;
  let calmed = false;
  let fat = 0; // suc ep cua hang khien tien len (giam khi ho kiet suc)
  let hot = 0; // dong bon dang hung han gan do keo nguoi khac vao
  for (const p of w.units) {
    if (!isAlive(p)) continue;
    const d = Math.hypot(p.x - u.x, p.z - u.z);
    if (p.team === POLICE) {
      if (d < nd) {
        nd = d;
        nid = p.id;
      }
      if (d < 6) {
        np++;
        const sq = squads[p.group];
        if (sq.order === 'ADVANCE' && d < 7) advancing = true;
      }
    } else if (p.team === RIOTER && p !== u) {
      if (d < 6) nr++;
      if (d < 9 && (p.state === 'APPROACH' || p.state === 'ENGAGE')) hot++;
    }
  }
  for (const s of squads) {
    if (s.order === 'DEESCALATE' && Math.hypot(s.cx - u.x, s.cz - u.z) < 15 && s.aliveCount > 0) calmed = true;
    if (s.order === 'ADVANCE' && Math.hypot(s.cx - u.x, s.cz - u.z) < 18 && s.aliveCount > 0) {
      advancing = true;
      fat = Math.max(fat, 0.3 + 0.7 * clamp((s.stamina - 20) / 55, 0, 1));
    }
  }
  u.nearPolice = nd;
  u.nearPoliceId = nid;
  u.calmed = calmed;

  // kich dong
  let da = 0;
  const fleeing = u.state === 'RETREAT' || u.state === 'PANIC' || u.state === 'DISPERSE';
  if (!calmed) da += g.escalation * u.temper;
  if (nd < 12) da += 0.04 * (1 - nd / 12) + (advancing ? 0.03 : 0);
  if (advancing && !calmed && u.agitation < 0.7 && u.state !== 'RETREAT') da += TUNE.provoke; // tien len ma khong xoa diu se khien dam dong nong len
  if (force > 55) da += ((force - 55) / 45) * 0.02;
  if (g.agitation > u.agitation) da += 0.3 * (g.agitation - u.agitation) * (0.4 + 0.6 * (u.cohesion / 100));
  if (!calmed && !fleeing) da += 0.015 * Math.min(hot, 5); // dam dong hung han keo nguoi xung quanh
  if (calmed) da -= 0.14;
  if (u.morale < 40) da -= 0.02;
  if (fleeing) da = -0.05;
  u.agitation = clamp(u.agitation + da * dt, 0, 1);

  // tinh than
  let dm = 0;
  if (np > 0) {
    dm -= (advancing ? 0.9 : 0.35) * (Math.min(np, 6) / 3);
    if (nr >= 5 && np <= 4) dm += 0.9; // dong nguoi tao can dam
    if (nr / (np + 0.5) > 1.6) dm += 0.8;
  } else if (advancing && nd < 19) dm -= (TUNE.pressure * Math.max(fat, 0.7)) / (1 + TUNE.embolden * hot); // bi ep lui boi hang khien dang tien
  else if (!advancing && u.morale < 75) dm += 0.9;
  dm += 0.12 * (g.morale - u.morale);
  if (force > 70) dm += 0.5;
  u.morale = clamp(u.morale + dm * dt, 0, 100);
  // the luc
  u.stamina = clamp(u.stamina + (u.speed > 2.5 ? -2.5 : 3) * dt, 15, 100);

  const next = rioterTransition({
    state: u.state,
    health: u.health,
    morale: u.morale,
    agitation: u.agitation,
    temper: u.temper,
    nearPoliceDist: nd,
    stateTime: u.stateTime,
    groupMorale: g.morale,
    distToExit: u.state === 'RETREAT' || u.state === 'PANIC' ? distToExit(w, u) : 99,
    calmed,
  });
  if (next !== u.state) {
    const urgent = next === 'PANIC' || next === 'DISPERSE' || next === 'DOWN' || next === 'ENGAGE';
    if (urgent || u.react <= 0) {
      enter(w, u, next);
      u.react = 0.2 + w.rng() * 1.0;
    }
  }
  if (u.state === 'ENGAGE' || u.state === 'APPROACH') u.target = nid;
}

function updateCivilian(w: World, u: Unit, dt: number): void {
  let sum = 0;
  let dx = 0;
  let dz = 0;
  for (const o of w.units) {
    if (o === u || !isAlive(o)) continue;
    const ox = u.x - o.x;
    const oz = u.z - o.z;
    const d = Math.hypot(ox, oz);
    let s = 0;
    if (o.team === RIOTER) {
      if (o.state === 'ENGAGE' && d < 12) s = 1 - d / 12;
      else if (o.state === 'APPROACH' && d < 9) s = 0.8 * (1 - d / 9);
      else if (o.state === 'AGITATED' && d < 5) s = 0.25 * (1 - d / 5);
    } else if (o.team === POLICE) {
      if ((o.anim === 'BATON' || o.anim === 'PUSH') && d < 7) s = 0.5;
      else if (w.squads[o.group].order === 'ADVANCE' && d < 5) s = 0.2;
    }
    if (s > 0) {
      sum += s;
      const dd = d || 1;
      dx += (ox / dd) * s;
      dz += (oz / dd) * s;
    }
  }
  u.danger = clamp(sum * 0.8, 0, 1);
  const dl = Math.hypot(dx, dz);
  if (dl > 0.01) {
    u.dangerX = dx / dl;
    u.dangerZ = dz / dl;
  }
  u.morale = clamp(u.morale + (u.danger > 0.05 ? -35 * u.danger : 4) * dt, 0, 100);
  const next = civilianTransition({
    state: u.state,
    health: u.health,
    danger: u.danger,
    morale: u.morale,
    stateTime: u.stateTime,
    distToExit: u.state === 'IDLE' ? 99 : distToExit(w, u),
    bravery: clamp((u.temper - 0.75) / 0.55, 0, 1),
  });
  if (next !== u.state) {
    const urgent = next === 'PANIC' || next === 'DISPERSE' || next === 'DOWN';
    if (urgent || u.react <= 0) {
      enter(w, u, next);
      u.react = 0.2 + w.rng() * 0.8;
    }
  }
}

function wander(w: World, u: Unit, dt: number, cx: number, cz: number, radius: number, speed: number): void {
  u.wanderT -= dt;
  if (u.wanderT <= 0 || (u.wanderX === u.x && u.wanderZ === u.z)) {
    const a = w.rng() * Math.PI * 2;
    const r = Math.sqrt(w.rng()) * radius;
    u.wanderX = cx + Math.cos(a) * r;
    u.wanderZ = cz + Math.sin(a) * r;
    u.wanderT = 2 + w.rng() * 4;
  }
  setGoal(u, u.wanderX, u.wanderZ, speed, 0.8);
}

/** Moi buoc mo phong: dat van toc mong muon theo trang thai (re, co jitter ca nhan). */
function intent(w: World, dt: number): void {
  const t = w.time;
  for (const u of w.units) {
    if (!isAlive(u) || u.team === POLICE) continue;
    if (u.team === RIOTER) {
      u.throwCd -= dt;
      const g = w.groups[u.group];
      const tgt = u.nearPoliceId >= 0 ? w.units[u.nearPoliceId] : null;
      switch (u.state) {
        case 'IDLE':
          wander(w, u, dt, u.homeX, u.homeZ, 4, 0.6);
          break;
        case 'GATHER': {
          const gx = g.cx + Math.cos(u.offA) * u.offR;
          const gz = g.cz + Math.sin(u.offA) * u.offR;
          if (Math.hypot(gx - u.x, gz - u.z) > 1.4) navGoal(w, u, gx, gz, 1.1 * u.temper, 1.0, dt);
          else wander(w, u, dt, gx, gz, 1.4, 0.5);
          break;
        }
        case 'AGITATED': {
          let cx = u.x;
          let cz = u.z;
          if (tgt && u.nearPolice > 12) {
            const dx = tgt.x - u.x;
            const dz = tgt.z - u.z;
            const d = Math.hypot(dx, dz) || 1;
            cx += (dx / d) * 2.2;
            cz += (dz / d) * 2.2;
          }
          wander(w, u, dt, cx, cz, 2.4, 1.5 * u.temper);
          // nem tu xa khi dam dong da nong
          if (u.role === ROLE_THROWER || u.agitation > 0.85) tryThrow(w, u, tgt);
          break;
        }
        case 'APPROACH': {
          if (!tgt) break;
          const dx = tgt.x - u.x;
          const dz = tgt.z - u.z;
          const d = Math.hypot(dx, dz) || 1;
          const sp = 2.7 * u.temper * (0.7 + 0.3 * (u.stamina / 100));
          if (u.role === ROLE_THROWER) {
            // giu khoang cach 9-15 m: tien, lui (vua lui vua nem) hoac di vong
            tryThrow(w, u, tgt);
            if (d > 15) navGoal(w, u, tgt.x, tgt.z, sp, 1.0, dt);
            else if (d < 9) {
              const away = Math.min(1, (9 - d) / 4);
              setGoal(u, u.x - (dx / d) * 6, u.z - (dz / d) * 6, (1.6 + 0.5 * away) * (0.6 + 0.4 * (u.stamina / 100)), 0.5);
            } else {
              const side = u.flankSide * Math.sin(t * 0.6 + u.offA);
              setGoal(u, u.x + (-dz / d) * side * 3, u.z + (dx / d) * side * 3, 1.2, 0.5);
            }
            u.face = Math.atan2(dx, dz);
          } else if (u.role === ROLE_FLANKER && d > 7) {
            // van hong: di toi mot ben doi hinh roi moi xong vao
            const sq = w.squads[tgt.group];
            const fx = sq.cx + Math.cos(sq.heading) * u.flankSide * 10.5 - Math.sin(sq.heading) * 1.5;
            const fz = sq.cz - Math.sin(sq.heading) * u.flankSide * 10.5 - Math.cos(sq.heading) * 1.5;
            const df = Math.hypot(fx - u.x, fz - u.z);
            if (df > 4 && d > 9) navGoal(w, u, fx, fz, sp * 1.1, 1.0, dt);
            else navGoal(w, u, tgt.x, tgt.z, sp * 1.15, 1.2, dt);
            if (d < 20 && u.agitation > 0.85) tryThrow(w, u, tgt);
          } else {
            const weave = Math.sin(t * 2.1 + u.offA * 3) * 0.9 * Math.min(1, d / 6);
            navGoal(w, u, tgt.x + (-dz / d) * weave, tgt.z + (dx / d) * weave, sp, 1.2, dt);
            if (d > 8 && d < 18 && u.agitation > 0.9) tryThrow(w, u, tgt);
          }
          if (u.role !== ROLE_THROWER) u.face = Math.atan2(dx, dz);
          break;
        }
        case 'ENGAGE': {
          if (!tgt) break;
          navGoal(w, u, tgt.x, tgt.z, 1.8, 1.4, dt);
          u.face = Math.atan2(tgt.x - u.x, tgt.z - u.z);
          break;
        }
        case 'RETREAT':
        case 'PANIC':
        case 'DISPERSE': {
          if (u.exitIdx < 0) u.exitIdx = chooseExit(w, u);
          const e = exitGoal(w, u.exitIdx);
          let tx = e.x;
          let tz = e.z;
          if (u.state !== 'DISPERSE' && tgt && u.nearPolice < 8) {
            const dx = u.x - tgt.x;
            const dz = u.z - tgt.z;
            const d = Math.hypot(dx, dz) || 1;
            tx = u.x + (dx / d) * 6 + (e.x - u.x) * 0.15;
            tz = u.z + (dz / d) * 6 + (e.z - u.z) * 0.15;
          }
          const base = u.state === 'PANIC' ? 4.0 : u.state === 'RETREAT' ? 3.0 : 2.6;
          let zig = 0;
          if (u.state === 'PANIC') zig = Math.sin(t * 5 + u.offA * 4) * 1.5;
          const dx = tx - u.x;
          const dz = tz - u.z;
          const d = Math.hypot(dx, dz) || 1;
          navGoal(w, u, tx + (-dz / d) * zig, tz + (dx / d) * zig, base * (0.85 + 0.15 * u.temper), 0.6, dt);
          break;
        }
      }
    } else if (u.team === CIVILIAN) {
      switch (u.state) {
        case 'IDLE':
          wander(w, u, dt, u.homeX, u.homeZ, 2.5, 0.5);
          break;
        case 'RETREAT':
        case 'PANIC':
        case 'DISPERSE': {
          if (u.exitIdx < 0) u.exitIdx = chooseExit(w, u);
          const e = exitGoal(w, u.exitIdx);
          const ex = e.x - u.x;
          const ez = e.z - u.z;
          const el = Math.hypot(ex, ez) || 1;
          let mx = ex / el;
          let mz = ez / el;
          if (u.state !== 'DISPERSE') {
            mx = mx * 0.5 + u.dangerX * 0.7;
            mz = mz * 0.5 + u.dangerZ * 0.7;
          }
          const ml = Math.hypot(mx, mz) || 1;
          const zig = u.state === 'PANIC' ? Math.sin(t * 6 + u.offA * 4) * 0.5 : 0;
          const sp = u.state === 'PANIC' ? 3.8 : u.state === 'DISPERSE' ? 3.2 : 1.9;
          const dxn = mx / ml + (-mz / ml) * zig;
          const dzn = mz / ml + (mx / ml) * zig;
          if (u.state === 'DISPERSE') navGoal(w, u, e.x, e.z, sp, 0.6, dt);
          else navGoal(w, u, u.x + dxn * 7, u.z + dzn * 7, sp, 0.5, dt);
          break;
        }
      }
    }
  }
}

export function updateCrowdAI(w: World, dt: number): void {
  w.aiAcc += dt;
  if (w.aiAcc >= 0.25) {
    heavyTick(w, w.aiAcc);
    w.aiAcc = 0;
  }
  intent(w, dt);
}


void THROW_MAX;
