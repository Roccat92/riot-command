// CombatSystem: dun khien va vung dui cui truu tuong (khong mau me), phan ung trung don, mat kha nang chien dau.
import { TUNE } from './tuning';
import {
  CIVILIAN,
  POLICE,
  RIOTER,
  clamp,
  isAlive,
  isHostileState,
  type Order,
  type Unit,
  type World,
} from './types';

export const PUSH_REACH = 1.55;
export const BATON_REACH = 1.9;
const near: number[] = [];

/** Lenh nao cho phep canh sat chu dong ra don. */
export function orderAllowsStrike(order: Order): boolean {
  return order === 'MOVE' || order === 'HOLD' || order === 'ADVANCE';
}

/**
 * Quy tac chon muc tieu cua canh sat (ham thuan tuy, co kiem thu):
 * - KHONG BAO GIO tan cong dan thuong hoac canh sat.
 * - Chi danh nguoi bieu tinh con kha nang chien dau.
 * - Khi ADVANCE: danh duoc nguoi dang kich dong/tien toi/giao tranh.
 * - Khi HOLD/MOVE: chi phong ve nguoi dang APPROACH/ENGAGE hoac khi vua bi tan cong (provoked).
 */
export function canPoliceTarget(order: Order, provoked: boolean, target: Pick<Unit, 'team' | 'state' | 'active'>): boolean {
  if (target.team !== RIOTER || !target.active) return false;
  if (!isHostileState(target.state)) return false;
  if (!orderAllowsStrike(order)) return false;
  if (order === 'ADVANCE') return true;
  return target.state === 'APPROACH' || target.state === 'ENGAGE' || provoked;
}

export const DBGC = { strike: 0, engage: 0 };
export function applyDamage(w: World, victim: Unit, dmg: number): void {
  if (!isAlive(victim)) return;
  const before = victim.health;
  victim.health = Math.max(0, victim.health - dmg);
  if (victim.team === CIVILIAN) {
    w.metrics.stats.civiliansHarm += (before - victim.health) / victim.maxHealth;
  }
  if (victim.health <= 0) goDown(w, victim);
}

function goDown(w: World, v: Unit): void {
  v.state = 'DOWN';
  v.stateTime = 0;
  v.dvx = v.dvz = 0;
  v.anim = 'NONE';
  v.target = -1;
  const st = w.metrics.stats;
  if (v.team === POLICE) st.policeDown++;
  else if (v.team === RIOTER) st.rioterDown++;
  // dong doi thay nguoi nga: tinh than giam
  for (const o of w.units) {
    if (o === v || !isAlive(o)) continue;
    const d = Math.hypot(o.x - v.x, o.z - v.z);
    if (d > 8) continue;
    if (o.team === v.team) o.morale = clamp(o.morale - (o.team === POLICE ? 5 : 10) * (1 - d / 12), 0, 100);
    else if (o.team !== CIVILIAN) o.morale = clamp(o.morale + 3, 0, 100);
    else if (o.team === CIVILIAN) o.morale = clamp(o.morale - 15, 0, 100);
  }
}

function strike(w: World, a: Unit, t: Unit, kind: 'baton' | 'push'): void {
  const dx = t.x - a.x;
  const dz = t.z - a.z;
  const d = Math.hypot(dx, dz) || 1;
  a.face = Math.atan2(dx, dz);
  a.anim = kind === 'baton' ? 'BATON' : 'PUSH';
  a.animDur = kind === 'baton' ? 0.45 : 0.4;
  a.animT = a.animDur;
  const m = w.metrics;
  const st = m.stats;
  const stamF = 0.6 + 0.4 * (a.stamina / 100);
  const moraleF = 0.7 + 0.3 * (a.morale / 100);
  if (kind === 'baton') {
    a.atkCd = 1.15 + w.rng() * 0.4;
    st.batons++;
    m.force = clamp(m.force + 1.3, 0, 100);
    applyDamage(w, t, 12 * stamF * moraleF);
    t.morale = clamp(t.morale - 6, 0, 100);
    t.kx += (dx / d) * 1.5;
    t.kz += (dz / d) * 1.5;
  } else {
    a.atkCd = 0.9 + w.rng() * 0.4;
    st.pushes++;
    m.force = clamp(m.force + 0.3, 0, 100);
    applyDamage(w, t, 2.5 * stamF);
    t.morale = clamp(t.morale - 2, 0, 100);
    t.kx += (dx / d) * 4.2;
    t.kz += (dz / d) * 4.2;
    t.atkCd = Math.max(t.atkCd, 0.7);
  }
  a.stamina = clamp(a.stamina - 1.2, 0, 100);
  t.anim = 'HIT';
  t.animDur = 0.35;
  t.animT = 0.35;
  st.peakForce = Math.max(st.peakForce, m.force);
  w.strikes.push({ x: t.x, z: t.z, t: w.time, kind });
  // lan toa: nguoi bieu tinh gan do bi kich dong khi bi dung dui cui
  for (const o of w.units) {
    if (!isAlive(o) || o === t) continue;
    const od = Math.hypot(o.x - t.x, o.z - t.z);
    if (o.team === RIOTER && od < 8 && kind === 'baton') o.agitation = clamp(o.agitation + 0.2, 0, 1);
    // thiet hai phu: dan thuong dung gan diem tac dong
    if (o.team === CIVILIAN && od < 1.3) {
      DBGC.strike += kind === 'baton' ? 3 : 1;
      applyDamage(w, o, kind === 'baton' ? 3 : 1);
      st.collateral++;
      m.force = clamp(m.force + 1, 0, 100);
    }
  }
}

function rioterHit(w: World, r: Unit, p: Unit): void {
  r.anim = 'PUNCH';
  r.animDur = 0.4;
  r.animT = 0.4;
  r.atkCd = 1.3 + w.rng() * 0.6;
  // khien chan: tinh theo huong
  const toR = Math.atan2(r.x - p.x, r.z - p.z);
  let diff = Math.abs(toR - p.heading) % (Math.PI * 2);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  const sq = w.squads[p.group];
  let f = diff < 1.2 ? 0.55 : 1.0;
  if (sq.order === 'HOLD') f *= 0.8;
  if (sq.order === 'DEESCALATE') f *= 0.85;
  const coh = 1 - 0.3 * (p.cohesion / 100);
  applyDamage(w, p, TUNE.punch * f * coh);
  p.morale = clamp(p.morale - 2.5, 0, 100);
  p.provoked = 3;
  p.anim = 'HIT';
  p.animDur = 0.3;
  p.animT = 0.3;
}

export function updateCombat(w: World, dt: number): void {
  const { units, hash, metrics } = w;
  // loai su kien cu
  while (w.strikes.length && w.time - w.strikes[0].t > 3) w.strikes.shift();
  // vu luc: gian dan dan theo thoi gian
  metrics.force = Math.max(0, metrics.force - 0.45 * dt);
  for (const s of w.squads) if (s.order === 'ADVANCE' && s.aliveCount > 0) metrics.force = clamp(metrics.force + 0.12 * dt, 0, 100);

  for (const u of units) {
    if (!isAlive(u)) continue;
    u.atkCd -= dt;
    if (u.provoked > 0) u.provoked -= dt;
    if (u.team === POLICE) {
      const sq = w.squads[u.group];
      u.target = -1;
      if (!orderAllowsStrike(sq.order)) continue;
      hash.query(u.x, u.z, BATON_REACH, near);
      let best: Unit | null = null;
      let bd = BATON_REACH * BATON_REACH;
      for (const j of near) {
        const t = units[j];
        if (!isAlive(t) || !canPoliceTarget(sq.order, u.provoked > 0, t)) continue;
        const d = (t.x - u.x) ** 2 + (t.z - u.z) ** 2;
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
      if (best) {
        u.target = best.id;
        if (u.atkCd <= 0) {
          const d = Math.sqrt(bd);
          const useBaton = u.provoked > 0 && (d > PUSH_REACH || w.rng() < 0.5);
          if (!useBaton && d > PUSH_REACH) continue;
          strike(w, u, best, useBaton ? 'baton' : 'push');
        }
      }
    } else if (u.team === RIOTER && u.state === 'ENGAGE') {
      const p = u.target >= 0 ? units[u.target] : null;
      if (p && isAlive(p) && p.team === POLICE && Math.hypot(p.x - u.x, p.z - u.z) < 1.5 && u.atkCd <= 0 && u.knock <= 0 && u.stun <= 0) rioterHit(w, u, p);
      // thiet hai phu: dan thuong dung gan tran giao tranh
      if (p) {
        hash.query(u.x, u.z, 2.6, near);
        for (const j of near) {
          const c = units[j];
          if (c.team === CIVILIAN && isAlive(c) && Math.hypot(c.x - u.x, c.z - u.z) < 2.6) {
            const before = c.health;
            DBGC.engage += 1.5 * dt;
            applyDamage(w, c, 1.5 * dt);
            if (before > 0 && Math.floor(before / 10) !== Math.floor(c.health / 10)) w.metrics.stats.collateral++;
          }
        }
      }
    }
  }
  // tinh than canh sat: bi bao vay / chiu ap luc
  for (const u of units) {
    if (u.team !== POLICE || !isAlive(u)) continue;
    let enemies = 0;
    let friends = 0;
    hash.query(u.x, u.z, 6, near);
    for (const j of near) {
      const o = units[j];
      if (!isAlive(o) || o === u) continue;
      if (Math.hypot(o.x - u.x, o.z - u.z) > 6) continue;
      if (o.team === RIOTER && isHostileState(o.state)) enemies++;
      else if (o.team === POLICE) friends++;
    }
    const sq = w.squads[u.group];
    if (enemies > friends + 1) u.morale = clamp(u.morale - 0.6 * dt * (enemies - friends), 0, 100);
    else if (enemies === 0 && u.morale < 90) u.morale = clamp(u.morale + (sq.order === 'HOLD' || sq.order === 'REGROUP' ? 0.8 : 0.35) * dt, 0, 100);
  }
}
