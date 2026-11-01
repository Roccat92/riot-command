// ProjectileSystem: nem da/chai/molotov (quy dao parabol, vong canh bao tren mat dat), vung lua, ne tranh.
// Phong cach hoa, khong mau me. Dung pool co dinh (khong cap phat moi moi lan nem).
import { TUNE } from './tuning';
import { applyDamage } from './CombatSystem';
import {
  CIVILIAN,
  POLICE,
  ROLE_MELEE,
  ROLE_THROWER,
  angleDiff,
  clamp,
  isAlive,
  type FormationType,
  type Projectile,
  type Squad,
  type Unit,
  type World,
  type FireZone,
} from './types';

export const KIND_STONE = 0;
export const KIND_BOTTLE = 1;
export const KIND_MOLOTOV = 2;
export const HIT_R = [1.0, 1.15, 1.0];
export const FIRE_R = 2.4;
export const THROW_MIN = 5;
export const THROW_MAX = 26;
export const DODGE_STAMINA = 12;
export const DODGE_MIN_STAMINA = 20;

/** Thoi gian cho giua hai lan nem: nong tinh cang cao nem cang nhanh. */
export function throwCooldown(agitation: number, rand: number): number {
  return (16 - 8 * clamp(agitation, 0, 1)) * (0.8 + 0.6 * rand) * TUNE.throwCd;
}

/** He so sat thuong khi co khien: goc nhin +- cua doi hinh va muc giam. 1 = khong chan duoc. */
export function blockMultiplier(formation: FormationType, heading: number, srcAngle: number): number {
  const half = formation === 'COMPACT' ? 1.9 : formation === 'DOUBLE_LINE' ? 1.4 : 1.2; // rad
  const mult = formation === 'COMPACT' ? 0.12 : formation === 'DOUBLE_LINE' ? 0.18 : 0.2;
  return Math.abs(angleDiff(heading, srcAngle)) <= half ? mult : 1;
}

/** Ket qua cua mot don vi co the ne hay khong. */
export function canDodge(u: Pick<Unit, 'stamina' | 'state' | 'dodgeT' | 'active'>): boolean {
  return u.active && u.state !== 'DOWN' && u.dodgeT <= 0 && u.stamina >= DODGE_MIN_STAMINA;
}

function poolGet<T extends { active: boolean }>(arr: T[]): T | null {
  for (const x of arr) if (!x.active) return x;
  return null;
}

function pushEvent(w: World, type: 'throw' | 'block' | 'hit' | 'glass' | 'fire' | 'dodge' | 'wave', x: number, z: number): void {
  w.events.push({ type, x, z });
  if (w.events.length > 64) w.events.shift();
}
function pushFx(w: World, x: number, z: number, kind: 'block' | 'hit' | 'glass' | 'burst' | 'dodge'): void {
  w.fx.push({ x, z, t: w.time, kind });
  if (w.fx.length > 48) w.fx.shift();
}

export function spawnFire(w: World, x: number, z: number): FireZone | null {
  const f = poolGet(w.fires);
  if (!f) return null;
  f.active = true;
  f.x = x;
  f.z = z;
  f.r = FIRE_R;
  f.t = 0;
  f.dur = 6 + w.rng() * 2; // chay 6-8 giay
  w.metrics.stats.fireZones++;
  pushEvent(w, 'fire', x, z);
  return f;
}

export function inFire(w: World, x: number, z: number, margin = 0): FireZone | null {
  for (const f of w.fires) {
    if (!f.active) continue;
    if ((x - f.x) ** 2 + (z - f.z) ** 2 < (f.r + margin) ** 2) return f;
  }
  return null;
}

/** Lenh Dodge: squad vao tu the san sang ne trong 8 giay. */
export function triggerDodge(_w: World, s: Squad): void {
  s.alertT = 8;
}

function planDodges(w: World, p: Projectile): void {
  const molotov = p.kind === KIND_MOLOTOV;
  const danger = molotov ? FIRE_R + 0.9 : 1.5;
  const thrower = w.units[p.thrower];
  for (const u of w.units) {
    if (u.team !== POLICE || !isAlive(u) || !canDodge(u)) continue;
    const dx = u.x - p.tx;
    const dz = u.z - p.tz;
    const d = Math.hypot(dx, dz);
    if (d > danger) continue;
    const sq = w.squads[u.group];
    let prob: number;
    if (sq.alertT > 0) prob = 1;
    else if (molotov) prob = TUNE.autoDodge;
    else {
      const src = thrower ? Math.atan2(thrower.x - u.x, thrower.z - u.z) : u.heading;
      prob = blockMultiplier(sq.formation, u.heading, src) < 1 ? 0 : 0.25; // da duoc khien che thi khong can ne
    }
    if (w.rng() > prob) continue;
    let nx = d > 0.05 ? dx / d : Math.cos(u.id);
    let nz = d > 0.05 ? dz / d : Math.sin(u.id);
    const dist = (molotov ? FIRE_R + 1.1 : 1.9) + w.rng() * 0.4;
    u.dodgeT = Math.max(0.9, p.dur - p.t + 0.35); // giu cho ne cho den khi vat cham dat
    u.dodgeX = p.tx + nx * dist;
    u.dodgeZ = p.tz + nz * dist;
    u.stamina = Math.max(0, u.stamina - DODGE_STAMINA);
    u.anim = 'DODGE';
    u.animDur = 0.5;
    u.animT = 0.5;
    w.metrics.stats.dodged++;
    pushFx(w, u.x, u.z, 'dodge');
    pushEvent(w, 'dodge', u.x, u.z);
    nx = nz = 0;
  }
}

export function spawnProjectile(w: World, thrower: Unit, kind: number, tx: number, tz: number): Projectile | null {
  const p = poolGet(w.projectiles);
  if (!p) return null;
  const dx = tx - thrower.x;
  const dz = tz - thrower.z;
  const dist = Math.hypot(dx, dz);
  p.active = true;
  p.kind = kind;
  p.sx = thrower.x;
  p.sz = thrower.z;
  p.tx = tx;
  p.tz = tz;
  p.t = 0;
  p.dur = Math.max(0.9, dist / 14);
  p.arc = 1.8 + dist * 0.2;
  p.thrower = thrower.id;
  p.spin = w.rng() * 6;
  const st = w.metrics.stats;
  st.thrown++;
  if (kind === KIND_MOLOTOV) st.molotovs++;
  pushEvent(w, 'throw', thrower.x, thrower.z);
  planDodges(w, p);
  return p;
}

export function chooseKind(w: World, u: Unit): number {
  if (u.ammoMolo > 0 && w.time > 40 && u.agitation > 0.65 && w.rng() < 0.4) return KIND_MOLOTOV;
  return w.rng() < 0.5 ? KIND_BOTTLE : KIND_STONE;
}

/** Nguoi bieu tinh co nem muc tieu `target` khong (cooldown, tam xa, tinh trang). Tra ve true neu da nem. */
export const DBG = { noThrow: false, civProj: 0, civFire: 0 };
export function tryThrow(w: World, u: Unit, target: Unit | null): boolean {
  if (DBG.noThrow) return false;
  if (!target || u.throwCd > 0 || u.calmed || !isAlive(target)) return false;
  if (u.agitation < 0.5) return false;
  if (u.ammo <= 0 && u.ammoMolo <= 0) {
    if (u.role === ROLE_THROWER) u.role = ROLE_MELEE; // het dan thi lao vao can chien
    return false;
  }
  const dx = target.x - u.x;
  const dz = target.z - u.z;
  const d = Math.hypot(dx, dz);
  if (d < THROW_MIN || d > THROW_MAX) return false;
  const kind = u.ammo > 0 ? chooseKind(w, u) : KIND_MOLOTOV;
  if (kind !== KIND_MOLOTOV) u.ammo--;
  // do chinh xac: sai so tang theo khoang cach, nong tinh qua cao nem lech hon
  const err = 0.8 + d * 0.07 + (u.agitation > 0.9 ? 0.5 : 0);
  const a = w.rng() * Math.PI * 2;
  const r = Math.sqrt(w.rng()) * err;
  // nham ve phia truoc muc tieu mot chut neu muc tieu dang di chuyen
  const lead = 0.5;
  const tx = target.x + target.vx * lead + Math.cos(a) * r;
  const tz = target.z + target.vz * lead + Math.sin(a) * r;
  if (!spawnProjectile(w, u, kind, tx, tz)) return false;
  if (kind === KIND_MOLOTOV) u.ammoMolo--;
  u.throwCd = throwCooldown(u.agitation, w.rng()) * (u.role === ROLE_THROWER ? 1 : 2);
  u.anim = 'THROW';
  u.animDur = 0.5;
  u.animT = 0.5;
  u.face = Math.atan2(dx, dz);
  return true;
}

const STONE = { h: 2, s: 4, m: 1.5 };
const BOTTLE = { h: 3, s: 3, m: 3 };

function impact(w: World, p: Projectile): void {
  const st = w.metrics.stats;
  const thrower = w.units[p.thrower];
  const r = HIT_R[p.kind];
  const molotov = p.kind === KIND_MOLOTOV;
  for (const u of w.units) {
    if (!isAlive(u)) continue;
    if (u.team !== POLICE && u.team !== CIVILIAN) continue;
    if ((u.x - p.tx) ** 2 + (u.z - p.tz) ** 2 > r * r) continue;
    if (u.team === CIVILIAN) {
      DBG.civProj += molotov ? 8 : 4;
      applyDamage(w, u, molotov ? 8 : 4);
      u.morale = clamp(u.morale - 20, 0, 100);
      st.collateral++;
      continue;
    }
    const sq = w.squads[u.group];
    const src = thrower ? Math.atan2(thrower.x - u.x, thrower.z - u.z) : u.heading + Math.PI;
    const mult = blockMultiplier(sq.formation, u.heading, src);
    const base = molotov ? { h: TUNE.moloHit, s: 4, m: 10 } : p.kind === KIND_BOTTLE ? BOTTLE : STONE;
    const blocked = mult < 1;
    if (blocked) {
      st.blocked++;
      pushFx(w, u.x, u.z, 'block');
      pushEvent(w, 'block', u.x, u.z);
    } else {
      st.projHits++;
      pushFx(w, u.x, u.z, 'hit');
      pushEvent(w, p.kind === KIND_BOTTLE ? 'glass' : 'hit', u.x, u.z);
    }
    applyDamage(w, u, base.h * mult * (molotov ? 1 : TUNE.projDmg));
    u.stamina = clamp(u.stamina - base.s * (blocked ? 0.5 : 1), 0, 100);
    u.morale = clamp(u.morale - base.m * (blocked ? 0.25 : 1), 0, 100);
    u.provoked = 3;
    if (u.anim === 'NONE' || u.anim === 'HIT') {
      u.anim = 'HIT';
      u.animDur = 0.3;
      u.animT = 0.3;
    }
  }
  if (p.kind === KIND_BOTTLE) pushFx(w, p.tx, p.tz, 'glass');
  if (molotov) {
    pushFx(w, p.tx, p.tz, 'burst');
    spawnFire(w, p.tx, p.tz);
  }
}

export function updateProjectiles(w: World, dt: number): void {
  for (const p of w.projectiles) {
    if (!p.active) continue;
    p.t += dt;
    if (p.t >= p.dur) {
      p.active = false;
      impact(w, p);
    }
  }
  const st = w.metrics.stats;
  for (const f of w.fires) {
    if (!f.active) continue;
    f.t += dt;
    if (f.t >= f.dur) {
      f.active = false;
      continue;
    }
    for (const u of w.units) {
      if (!isAlive(u)) continue;
      if ((u.x - f.x) ** 2 + (u.z - f.z) ** 2 > f.r * f.r) continue;
      u.burn = 0.35;
      if (u.team === POLICE) {
        applyDamage(w, u, TUNE.burn * dt);
        u.morale = clamp(u.morale - 2 * TUNE.burn * dt, 0, 100);
        u.stamina = clamp(u.stamina - 2 * dt, 0, 100);
        st.burnSeconds += dt;
      } else {
        if (u.team === CIVILIAN) DBG.civFire += 5 * dt;
        applyDamage(w, u, 5 * dt);
        u.morale = clamp(u.morale - 8 * dt, 0, 100);
      }
    }
  }
  for (const s of w.squads) if (s.alertT > 0) s.alertT = Math.max(0, s.alertT - dt);
  for (const u of w.units) {
    if (u.burn > 0) u.burn -= dt;
    if (u.dodgeT > 0) u.dodgeT -= dt;
  }
  while (w.fx.length && w.time - w.fx[0].t > 0.7) w.fx.shift();
}

export function isThrower(u: Unit): boolean {
  return u.role === ROLE_THROWER;
}
