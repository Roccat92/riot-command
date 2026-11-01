// ToolsSystem: xe voi rong (tia nuoc day lui/lam nga/dap lua), trang bi canh sat (hoi cay, luu dan choang, LRAD),
// trang thai choang/ho/nga, vung hoi cay, vung nuoc dong va vet chay, rung camera.
import { TUNE } from './tuning';
import { KIND_GAS, KIND_FLASH, damageTruck, hooks, launchPolice } from './ProjectileSystem';
import {
  CIVILIAN,
  POLICE,
  RIOTER,
  clamp,
  isAlive,
  isHostileState,
  type FireZone,
  type GasCloud,
  type Puddle,
  type Projectile,
  type Squad,
  type Unit,
  type World,
} from './types';

export const HYDRANT = { x: 0, z: 28 };
export const JET_RANGE = 22;
export const WATER_RATE = 10; // nuoc / giay
export const GAS_R = 5.2;
export const FLASH_R = 6.5;
export const LRAD_RANGE = 30;
export const LRAD_HALF = 0.5;

function pushFx(w: World, x: number, z: number, kind: 'splash' | 'flash' | 'gaspop' | 'burst'): void {
  w.fx.push({ x, z, t: w.time, kind });
  if (w.fx.length > 48) w.fx.shift();
}
function pushEvent(w: World, type: 'water' | 'gas' | 'flash' | 'lrad' | 'knock', x: number, z: number): void {
  w.events.push({ type, x, z });
  if (w.events.length > 64) w.events.shift();
}
export function addShake(w: World, a: number): void {
  w.shake = Math.min(1, w.shake + a);
}

export function addPuddle(w: World, x: number, z: number, r: number, dur: number, kind: number): Puddle {
  let best: Puddle | null = null;
  for (const p of w.puddles) {
    if (!p.active) {
      best = p;
      break;
    }
    if (!best || p.t / p.dur > best.t / best.dur) best = p;
  }
  const p = best!;
  p.active = true;
  p.x = x;
  p.z = z;
  p.r = r;
  p.t = 0;
  p.dur = dur;
  p.kind = kind;
  return p;
}

// ---------- xe voi rong ----------
export function truckDir(t: { x: number; z: number; aimX: number; aimZ: number; heading: number }): { x: number; z: number; d: number } {
  const dx = t.aimX - t.x;
  const dz = t.aimZ - t.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.5) return { x: Math.sin(t.heading), z: Math.cos(t.heading), d: 0 };
  return { x: dx / d, z: dz / d, d };
}

export function orderTruckMove(w: World, x: number, z: number): void {
  const t = w.truck;
  if (!t.active || t.hp <= 0) return;
  const m = w.map;
  const dest = { x: clamp(x, m.minX + 2, m.maxX - 2), z: clamp(z, m.minZ + 2, m.maxZ - 2) };
  t.dest = dest;
  t.path = w.nav.findPath({ x: t.x, z: t.z }, dest);
  t.pathIdx = 0;
  t.refilling = false;
}
export function orderTruckRefill(w: World): void {
  orderTruckMove(w, HYDRANT.x, HYDRANT.z - 1.5);
  w.truck.refilling = true;
}
export function setTruckFiring(w: World, on: boolean): void {
  w.truck.firing = on;
}
export function setTruckAuto(w: World, on: boolean): void {
  w.truck.auto = on;
}
export function aimTruck(w: World, x: number, z: number): void {
  w.truck.aimX = x;
  w.truck.aimZ = z;
}

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz || 1;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function autoAim(w: World, dt: number): void {
  const t = w.truck;
  let tx = 0;
  let tz = 0;
  let found = false;
  // 1) lua dang de doa gan canh sat hoac xe
  let bd = 1e9;
  for (const f of w.fires) {
    if (!f.active) continue;
    const d = Math.hypot(f.x - t.x, f.z - t.z);
    if (d > JET_RANGE + 2) continue;
    let near = Math.hypot(f.x - t.x, f.z - t.z) < 6 ? 0 : 99;
    for (const u of w.units) if (u.team === POLICE && isAlive(u)) near = Math.min(near, Math.hypot(u.x - f.x, u.z - f.z));
    if (near < 7 && d < bd) {
      bd = d;
      tx = f.x;
      tz = f.z;
      found = true;
    }
  }
  // 2) nguoi bieu tinh hung han gan phong tuyen
  if (!found) {
    let best = 1e9;
    for (const u of w.units) {
      if (u.team !== RIOTER || !isAlive(u) || !isHostileState(u.state) || u.knock > 0) continue;
      const d = Math.hypot(u.x - t.x, u.z - t.z);
      if (d > JET_RANGE - 1 || d < 3) continue;
      // uu tien ke dang can chien / gan canh sat
      const sc = d - (u.state === 'ENGAGE' ? 8 : 0) - (u.role === 1 ? 4 : 0);
      if (sc < best) {
        best = sc;
        tx = u.x + u.vx * 0.3;
        tz = u.z + u.vz * 0.3;
        found = true;
      }
    }
  }
  if (found) {
    const dx = tx - t.aimX;
    const dz = tz - t.aimZ;
    const d = Math.hypot(dx, dz);
    const step = Math.min(d, 38 * dt);
    if (d > 0.01) {
      t.aimX += (dx / d) * step;
      t.aimZ += (dz / d) * step;
    }
    const aligned = d < 2.5;
    if (!t.firing && t.water > 14 && aligned) t.firing = true;
    if (t.firing && (t.water <= 2 || !found)) t.firing = false;
  } else if (t.firing) t.firing = false;
  // het nuoc: ve voi
  if (t.water < 8 && !t.refilling && t.pumpCd <= 0 && t.hp > 0) orderTruckRefill(w);
  if (t.refilling && t.water >= 96 && !t.dest) {
    t.refilling = false;
    orderTruckMove(w, 0, 15);
  }
}

function updateTruck(w: World, dt: number): void {
  const t = w.truck;
  if (!t.active) return;
  t.px = t.x;
  t.pz = t.z;
  if (t.hp <= 0) {
    t.jet = Math.max(0, t.jet - dt * 6);
    return;
  }
  t.pumpCd = Math.max(0, t.pumpCd - dt);
  if (t.auto) autoAim(w, dt);
  // lai xe theo duong da
  if (t.dest && t.pathIdx < t.path.length) {
    const wp = t.path[t.pathIdx];
    const dx = wp.x - t.x;
    const dz = wp.z - t.z;
    const d = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let da = want - t.heading;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    t.heading += clamp(da, -1.7 * dt, 1.7 * dt);
    const speed = (t.firing ? 2.6 : 4.4) * (Math.abs(da) > 0.9 ? 0.15 : 1);
    const step = Math.min(d, speed * dt);
    t.x += Math.sin(t.heading) * step;
    t.z += Math.cos(t.heading) * step;
    if (d < 0.9) t.pathIdx++;
  } else t.dest = null;
  // bom nuoc / tiep nuoc
  const hyd = Math.hypot(t.x - HYDRANT.x, t.z - HYDRANT.z);
  const atHydrant = hyd < 4.8;
  if (atHydrant && t.water < t.maxWater) {
    t.water = Math.min(t.maxWater, t.water + 22 * dt);
    t.refilling = true;
  } else if (!atHydrant && !t.dest) t.refilling = false;
  const can = t.firing && t.water > 0 && t.pumpCd <= 0;
  if (t.firing && t.water <= 0 && t.pumpCd <= 0) {
    t.pumpCd = 2.5; // bom qua nhiet khi can nuoc
    t.firing = false;
  }
  t.jet += ((can ? 1 : 0) - t.jet) * Math.min(1, dt * 7);
  // tu dap lua tren xe
  if (t.burnT > 0 && t.hp > 0) {
    t.burnT -= (can ? 3.5 : 1) * dt;
    damageTruck(w, 7 * dt, true);
  }
  // dung trong vung lua
  for (const f of w.fires) if (f.active && Math.hypot(f.x - t.x, f.z - t.z) < f.r + 1.2) {
    t.burnT = Math.max(t.burnT, 2);
  }
  if (!can) return;
  t.water = Math.max(0, t.water - WATER_RATE * dt);
  w.metrics.stats.waterUsed += WATER_RATE * dt;
  const dir = truckDir(t);
  const L = Math.min(JET_RANGE, Math.max(5, dir.d));
  const ax = t.x + dir.x * 1.5;
  const az = t.z + dir.z * 1.5;
  const ex = t.x + dir.x * L;
  const ez = t.z + dir.z * L;
  t.jetEndX = ex;
  t.jetEndZ = ez;
  for (const u of w.units) {
    if (!isAlive(u) || u.team !== RIOTER) continue;
    const rx = u.x - ax;
    const rz = u.z - az;
    const s = rx * dir.x + rz * dir.z;
    if (s < 0 || s > L) continue;
    const lat = Math.abs(rx * dir.z - rz * dir.x);
    if (lat > 0.9 + s * 0.075) continue;
    const f = 1 - 0.45 * (s / L);
    const side = rx * dir.z - rz * dir.x >= 0 ? 1 : -1;
    u.kx += (dir.x * TUNE.waterPush * f + dir.z * side * 5 * f) * dt;
    u.kz += (dir.z * TUNE.waterPush * f - dir.x * side * 5 * f) * dt;
    u.morale = clamp(u.morale - 14 * f * dt, 0, 100);
    u.stamina = clamp(u.stamina - 9 * f * dt, 0, 100);
    u.agitation = clamp(u.agitation - 0.1 * dt, 0, 1);
    u.atkCd = Math.max(u.atkCd, 0.8);
    u.soak += dt * f * 2.6;
    if (u.soak > 0.9 && u.knock <= 0) {
      u.knock = u.knockDur = 1.7 + w.rng() * 1.1;
      u.soak = 0;
      u.anim = 'NONE';
      w.metrics.stats.knockdowns++;
      pushEvent(w, 'knock', u.x, u.z);
      pushFx(w, u.x, u.z, 'splash');
    }
  }
  // dap lua doc theo tia
  for (const f of w.fires) {
    if (!f.active) continue;
    if (segDist(f.x, f.z, ax, az, ex, ez) <= f.r + 0.5) {
      f.t += 5.5 * dt;
      if (f.t >= f.dur) douse(w, f);
    }
  }
  for (let i = 0; i < w.burning.length; i++) {
    if (w.burning[i] <= 0) continue;
    const o = w.map.obstacles[i];
    if (segDist(o.x, o.z, ax, az, ex, ez) <= 2.4) {
      w.burning[i] -= 16 * dt;
      if (w.burning[i] <= 0) {
        w.burning[i] = 0;
        w.metrics.stats.extinguished++;
        pushFx(w, o.x, o.z, 'splash');
      }
    }
  }
  // thu vien nuoc + puddle
  if (w.tick % 5 === 0) {
    pushFx(w, ex, ez, 'splash');
    const a = w.rng() * Math.PI * 2;
    addPuddle(w, ex + Math.cos(a) * 1.2, ez + Math.sin(a) * 1.2, 1.1 + w.rng() * 1.1, 16, 0);
  }
  if (w.tick % 9 === 0) pushEvent(w, 'water', ex, ez);
}

export function douse(w: World, f: FireZone): void {
  f.active = false;
  w.metrics.stats.extinguished++;
  pushFx(w, f.x, f.z, 'splash');
  addPuddle(w, f.x, f.z, f.r * 0.95, 18, 0);
  addPuddle(w, f.x + 0.5, f.z - 0.4, f.r * 0.6, 40, 1);
}

// ---------- trang bi ----------
function spendPolice(w: World, s: Squad): boolean {
  void w;
  return s.aliveCount > 0;
}

export function useGas(w: World, sid: number, x: number, z: number): boolean {
  const s = w.squads[sid];
  if (!s || !spendPolice(w, s) || s.gas <= 0 || s.eqCd > 0) return false;
  const { tx, tz } = clampRange(s, x, z, 5, 28);
  if (!launchPolice(w, s, KIND_GAS, tx, tz)) return false;
  s.gas--;
  s.eqCd = TUNE.eqCd;
  w.metrics.stats.gasUsed++;
  return true;
}
export function useFlash(w: World, sid: number, x: number, z: number): boolean {
  const s = w.squads[sid];
  if (!s || !spendPolice(w, s) || s.flash <= 0 || s.eqCd > 0) return false;
  const { tx, tz } = clampRange(s, x, z, 4, 22);
  if (!launchPolice(w, s, KIND_FLASH, tx, tz)) return false;
  s.flash--;
  s.eqCd = TUNE.eqCd * 0.6;
  w.metrics.stats.flashUsed++;
  return true;
}
export function useLrad(w: World, sid: number, x: number, z: number): boolean {
  const s = w.squads[sid];
  if (!s || !spendPolice(w, s) || s.lradCd > 0 || w.lrad.active) return false;
  w.lrad = { active: true, x: s.cx, z: s.cz, ang: Math.atan2(x - s.cx, z - s.cz), t: 0, dur: 5 };
  s.lradCd = TUNE.lradCd;
  w.metrics.stats.lradUsed++;
  pushEvent(w, 'lrad', s.cx, s.cz);
  addShake(w, 0.1);
  return true;
}
function clampRange(s: Squad, x: number, z: number, lo: number, hi: number): { tx: number; tz: number } {
  const dx = x - s.cx;
  const dz = z - s.cz;
  const d = Math.hypot(dx, dz) || 1;
  const k = clamp(d, lo, hi) / d;
  return { tx: s.cx + dx * k, tz: s.cz + dz * k };
}

export function spawnGas(w: World, x: number, z: number): GasCloud | null {
  const g = w.gas.find((c) => !c.active);
  if (!g) return null;
  g.active = true;
  g.x = x;
  g.z = z;
  g.r = 1.5;
  g.t = 0;
  g.dur = 13 + w.rng() * 3;
  g.vx = (w.rng() - 0.5) * 0.7;
  g.vz = (w.rng() - 0.5) * 0.7;
  return g;
}

/** Vat bi nem cua canh sat cham dat. */
export function detonate(w: World, p: Projectile): void {
  if (p.kind === KIND_GAS) {
    spawnGas(w, p.tx, p.tz);
    pushFx(w, p.tx, p.tz, 'gaspop');
    pushEvent(w, 'gas', p.tx, p.tz);
    addShake(w, 0.1);
  } else if (p.kind === KIND_FLASH) {
    pushFx(w, p.tx, p.tz, 'flash');
    pushEvent(w, 'flash', p.tx, p.tz);
    addShake(w, 0.35);
    for (const u of w.units) {
      if (!isAlive(u) || u.team === POLICE) continue;
      const d = Math.hypot(u.x - p.tx, u.z - p.tz);
      if (d > FLASH_R) continue;
      const f = 1 - d / (FLASH_R * 1.4);
      if (u.stun <= 0) w.metrics.stats.stunned++;
      u.stun = Math.max(u.stun, (u.team === RIOTER ? TUNE.flashStun : 2.2) * f + 0.6);
      u.stunK = 0.08;
      u.morale = clamp(u.morale - TUNE.flashMorale * f, 0, 100);
      u.agitation = clamp(u.agitation - 0.18 * f, 0, 1);
      u.atkCd = Math.max(u.atkCd, u.stun);
    }
  }
}
hooks.detonate = detonate;
hooks.scorch = (w, f) => {
  addPuddle(w, f.x, f.z, f.r * 0.9, 45, 1);
};

// ---------- cap nhat chung ----------
export function updateTools(w: World, dt: number): void {
  w.shake = Math.max(0, w.shake - 1.8 * dt);
  for (const s of w.squads) {
    if (s.eqCd > 0) s.eqCd = Math.max(0, s.eqCd - dt);
    if (s.lradCd > 0) s.lradCd = Math.max(0, s.lradCd - dt);
  }
  // dem nguoc trang thai
  for (const u of w.units) {
    if (!u.active) continue;
    if (u.knock > 0) u.knock = Math.max(0, u.knock - dt);
    if (u.stun > 0) {
      u.stun = Math.max(0, u.stun - dt);
      if (u.stun <= 0) u.stunK = 1;
    }
    if (u.cough > 0) u.cough = Math.max(0, u.cough - dt);
    if (u.soak > 0) u.soak = Math.max(0, u.soak - dt * 0.6);
  }
  updateTruck(w, dt);
  // hoi cay
  const st = w.metrics.stats;
  for (const g of w.gas) {
    if (!g.active) continue;
    g.t += dt;
    if (g.t >= g.dur) {
      g.active = false;
      continue;
    }
    g.x += g.vx * dt;
    g.z += g.vz * dt;
    g.r = Math.min(GAS_R, 1.5 + 3.7 * (g.t / 2.5)) * (g.dur - g.t < 2.5 ? 0.6 + 0.4 * ((g.dur - g.t) / 2.5) : 1);
    for (const u of w.units) {
      if (!isAlive(u) || u.team === POLICE) continue;
      if ((u.x - g.x) ** 2 + (u.z - g.z) ** 2 > g.r * g.r) continue;
      if (u.cough <= 0) st.gassed++;
      u.cough = 0.9;
      if (u.team === RIOTER) {
        u.morale = clamp(u.morale - TUNE.gasMorale * dt, 0, 100);
        u.agitation = clamp(u.agitation - 0.25 * dt, 0, 1);
        u.stamina = clamp(u.stamina - 6 * dt, 0, 100);
        u.atkCd = Math.max(u.atkCd, 0.6);
      } else u.morale = clamp(u.morale - 25 * dt, 0, 100);
    }
  }
  // LRAD
  const L = w.lrad;
  if (L.active) {
    L.t += dt;
    if (L.t >= L.dur) L.active = false;
    else {
      const dx = Math.sin(L.ang);
      const dz = Math.cos(L.ang);
      for (const u of w.units) {
        if (!isAlive(u) || u.team === POLICE) continue;
        const rx = u.x - L.x;
        const rz = u.z - L.z;
        const s = rx * dx + rz * dz;
        if (s < 3 || s > LRAD_RANGE) continue;
        const ang = Math.abs(Math.atan2(rx * dz - rz * dx, s));
        if (ang > LRAD_HALF) continue;
        const f = 1 - 0.5 * (s / LRAD_RANGE);
        if (u.stun <= 0) st.stunned++;
        u.stun = Math.max(u.stun, 0.35);
        u.stunK = Math.min(u.stunK, 0.5);
        if (u.team === RIOTER) {
          u.morale = clamp(u.morale - TUNE.lradMorale * f * dt, 0, 100);
          u.agitation = clamp(u.agitation - 0.28 * f * dt, 0, 1);
          u.atkCd = Math.max(u.atkCd, 0.5);
        }
      }
    }
  }
  // puddles + vet chay
  for (const p of w.puddles) {
    if (!p.active) continue;
    p.t += dt;
    if (p.t >= p.dur) p.active = false;
  }
  for (let i = 0; i < w.burning.length; i++) if (w.burning[i] > 0) w.burning[i] = Math.max(0, w.burning[i] - dt);
}

export function toolsReady(w: World, sid: number): { gas: boolean; flash: boolean; lrad: boolean } {
  const s = w.squads[sid];
  return { gas: !!s && s.gas > 0 && s.eqCd <= 0, flash: !!s && s.flash > 0 && s.eqCd <= 0, lrad: !!s && s.lradCd <= 0 && !w.lrad.active };
}
void CIVILIAN;
export type { Unit };
