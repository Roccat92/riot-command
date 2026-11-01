// SquadController: lenh cho squad (di chuyen, doi hinh, Hold/Advance/Regroup/De-escalate) va y dinh cua tung canh sat.
import { assignSlots, formationSlots, slotToWorld } from './FormationSystem';
import { setGoal } from './MovementSystem';
import { TUNE } from './tuning';
import { inFire } from './ProjectileSystem';
import {
  POLICE,
  RIOTER,
  angleDiff,
  clamp,
  isAlive,
  isThreatState,
  type FormationType,
  type Order,
  type Squad,
  type Unit,
  type Vec2,
  type World,
} from './types';

export function activeOf(w: World, s: Squad): Unit[] {
  const out: Unit[] = [];
  for (const id of s.unitIds) {
    const u = w.units[id];
    if (isAlive(u)) out.push(u);
  }
  return out;
}

function centroid(us: Unit[]): Vec2 {
  let x = 0;
  let z = 0;
  for (const u of us) {
    x += u.x;
    z += u.z;
  }
  return { x: x / Math.max(1, us.length), z: z / Math.max(1, us.length) };
}

export function reassignSlots(w: World, s: Squad): void {
  const us = activeOf(w, s);
  s.aliveCount = us.length;
  const slots = formationSlots(s.formation, us.length).map((sl) => slotToWorld(s.cx, s.cz, s.heading, sl, { x: 0, z: 0 }));
  const a = assignSlots(us, slots);
  us.forEach((u, i) => (u.slot = a[i]));
}

export function setFormation(w: World, s: Squad, type: FormationType): void {
  if (s.formation === type) return;
  s.formation = type;
  reassignSlots(w, s);
  s.alert = '';
}

export function setOrder(w: World, s: Squad, order: Order): void {
  if (s.order === order) return;
  s.order = order;
  s.retarget = 0;
  s.alert = '';
  if (order === 'HOLD' || order === 'DEESCALATE') {
    s.path = [];
    s.dest = null;
  }
  if (order === 'REGROUP') {
    s.path = [];
    s.dest = null;
    reassignSlots(w, s);
  }
}

/** Ra lenh di chuyen cho nhieu squad den (x,z), giu vi tri tuong doi giua cac squad. */
export function orderMove(w: World, squads: Squad[], x: number, z: number): void {
  if (!squads.length) return;
  const m = w.map;
  let cx = 0;
  let cz = 0;
  for (const s of squads) {
    cx += s.cx;
    cz += s.cz;
  }
  cx /= squads.length;
  cz /= squads.length;
  for (const s of squads) {
    let ox = (s.cx - cx) * (squads.length > 1 ? 1 : 0);
    let oz = (s.cz - cz) * (squads.length > 1 ? 1 : 0);
    const l = Math.hypot(ox, oz);
    if (l > 10) {
      ox *= 10 / l;
      oz *= 10 / l;
    }
    const dest = {
      x: clamp(x + ox, m.minX + 2, m.maxX - 2),
      z: clamp(z + oz, m.minZ + 2, m.maxZ - 2),
    };
    s.order = 'MOVE';
    s.alert = '';
    s.dest = dest;
    s.path = w.nav.findPath({ x: s.cx, z: s.cz }, dest);
    s.pathIdx = 0;
  }
}

let wRef: World;
function moveAnchor(s: Squad, speed: number, dt: number): void {
  if (s.pathIdx >= s.path.length) {
    s.dest = null;
    return;
  }
  const wp = s.path[s.pathIdx];
  const dx = wp.x - s.cx;
  const dz = wp.z - s.cz;
  const d = Math.hypot(dx, dz);
  if (d > 0.05) {
    const want = Math.atan2(dx, dz);
    const err = angleDiff(s.heading, want);
    const turn = 2.2 * dt;
    s.heading += clamp(err, -turn, turn);
    const ahead = inFire(wRef, s.cx + Math.sin(s.heading) * 3.5, s.cz + Math.cos(s.heading) * 3.5, 2.0);
    const f = clamp(1 - Math.abs(err) / 1.3, 0.1, 1) * clamp(1.15 - s.slotError / 3.5, 0.2, 1) * (ahead ? 0.2 : 1) * (s.formation === 'COMPACT' ? 0.8 : 1);
    const step = speed * f * dt;
    if (d <= step) {
      s.cx = wp.x;
      s.cz = wp.z;
      s.pathIdx++;
    } else {
      s.cx += (dx / d) * step;
      s.cz += (dz / d) * step;
    }
  } else s.pathIdx++;
  if (s.pathIdx >= s.path.length) s.dest = null;
}

function nearestRioter(w: World, x: number, z: number, threatOnly: boolean, maxD: number): Unit | null {
  let best: Unit | null = null;
  let bd = maxD * maxD;
  for (const u of w.units) {
    if (u.team !== RIOTER || !isAlive(u)) continue;
    if (threatOnly && !isThreatState(u.state)) continue;
    const d = (u.x - x) ** 2 + (u.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = u;
    }
  }
  return best;
}

export function updateSquads(w: World, dt: number): void {
  wRef = w;
  for (const s of w.squads) {
    const us = activeOf(w, s);
    if (us.length !== s.aliveCount) reassignSlots(w, s);
    if (!us.length) continue;
    s.retarget -= dt;
    switch (s.order) {
      case 'MOVE':
        moveAnchor(s, 3.0, dt);
        break;
      case 'ADVANCE': {
        if (s.retarget <= 0) {
          s.retarget = 1.0;
          const t = nearestRioter(w, s.cx, s.cz, true, 60);
          if (!t) {
            setOrder(w, s, 'HOLD');
            s.alert = 'Không còn mục tiêu - giữ vị trí';
            break;
          }
          const dx = t.x - s.cx;
          const dz = t.z - s.cz;
          const d = Math.hypot(dx, dz);
          const k = d > 3.5 ? (d - 2.4) / d : 0.0;
          const dest = { x: s.cx + dx * k, z: s.cz + dz * k };
          if (d > 3.5) {
            s.dest = dest;
            s.path = w.nav.findPath({ x: s.cx, z: s.cz }, dest);
            s.pathIdx = 0;
          } else {
            s.path = [];
            s.dest = null;
            s.heading += clamp(angleDiff(s.heading, Math.atan2(dx, dz)), -0.4, 0.4);
          }
        }
        moveAnchor(s, 1.9, dt);
        break;
      }
      case 'REGROUP': {
        const c = centroid(us);
        const k = 1 - Math.exp(-1.6 * dt);
        s.cx += (c.x - s.cx) * k;
        s.cz += (c.z - s.cz) * k;
        if (s.slotError < 0.9 && Math.hypot(c.x - s.cx, c.z - s.cz) < 0.6) {
          setOrder(w, s, 'HOLD');
          s.alert = 'Đã tập hợp xong';
        }
        break;
      }
      default: {
        // HOLD / DEESCALATE: dung yen, quay mat ve phia dam dong gan nhat
        const t = nearestRioter(w, s.cx, s.cz, true, 34) ?? nearestRioter(w, s.cx, s.cz, false, 30);
        if (t) {
          const err = angleDiff(s.heading, Math.atan2(t.x - s.cx, t.z - s.cz));
          s.heading += clamp(err, -1.0 * dt, 1.0 * dt);
        }
      }
    }
  }
}

const tmpV: Vec2 = { x: 0, z: 0 };

/** Dat y dinh cho tung canh sat (bam o doi hinh) va cap nhat the luc, tinh than, gan ket. */
export function updatePoliceIntent(w: World, dt: number): void {
  for (const s of w.squads) {
    const us = activeOf(w, s);
    const slots = formationSlots(s.formation, us.length);
    let errSum = 0;
    let stamSum = 0;
    for (const u of us) {
      stamSum += u.stamina;
      const sl = slots[Math.min(u.slot < 0 ? 0 : u.slot, slots.length - 1)];
      slotToWorld(s.cx, s.cz, s.heading, sl, tmpV);
      const dx = tmpV.x - u.x;
      const dz = tmpV.z - u.z;
      const err = Math.hypot(dx, dz);
      errSum += err;
      const stamF = 0.6 + 0.4 * (u.stamina / 100);
      const base = Math.max(s.order === 'ADVANCE' ? 2.2 : 3.0, 2.0);
      const maxS = (base * 1.3 + clamp(err, 0, 1.5) * 1.3) * stamF;
      if (u.dodgeT > 0) setGoal(u, u.dodgeX, u.dodgeZ, 6.0, 0.3);
      else setGoal(u, tmpV.x, tmpV.z, maxS, 1.0);
      // huong mat
      u.face = s.heading;
      if (u.target >= 0) {
        const t = w.units[u.target];
        if (t && isAlive(t) && (t.x - u.x) ** 2 + (t.z - u.z) ** 2 < 12) u.face = Math.atan2(t.x - u.x, t.z - u.z);
      }
      // the luc
      const moving = u.speed > 1.2;
      if (moving) u.stamina -= (s.order === 'ADVANCE' ? TUNE.advDrain : 1.4) * dt;
      else u.stamina += (s.order === 'HOLD' || s.order === 'REGROUP' || s.order === 'DEESCALATE' ? 6 : 3.5) * dt;
      u.stamina = clamp(u.stamina, 0, 100);
      // gan ket (cohesion)
      const target = clamp(100 - err * 22, 0, 100);
      const rate = s.order === 'REGROUP' ? 2.5 : 0.9;
      u.cohesion += (target - u.cohesion) * Math.min(1, rate * dt);
      if (s.order === 'REGROUP' && u.target < 0) u.morale = Math.min(95, u.morale + 2.2 * dt);
    }
    s.stamina = us.length ? stamSum / us.length : 0;
    s.slotError += ((us.length ? errSum / us.length : 0) - s.slotError) * Math.min(1, dt * 3);
  }
}

/** Chon squad gan diem (x,z) nhat (trong ban kinh r). */
export function pickSquadNear(w: World, x: number, z: number, r: number): Squad | null {
  let best: Squad | null = null;
  let bd = r * r;
  for (const s of w.squads) {
    for (const id of s.unitIds) {
      const u = w.units[id];
      if (!isAlive(u)) continue;
      const d = (u.x - x) ** 2 + (u.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
  }
  return best;
}

export function policeOf(w: World) {
  return w.units.filter((u) => u.team === POLICE);
}
