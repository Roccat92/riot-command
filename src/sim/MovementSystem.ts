// MovementSystem: tich phan van toc, tach nhau (hash luoi), va cham vat can, gioi han ban do, loi thoat.
import { CIVILIAN, POLICE, angleDiff, type Unit, type Vec2, type World } from './types';

const SEP_R = 0.82;
const UNIT_R = 0.38;
const tmpNear: number[] = [];

function mass(u: Unit): number {
  if (u.state === 'DOWN') return 100;
  return u.team === POLICE ? 1.5 : u.team === CIVILIAN ? 0.8 : 1;
}

/** Dat van toc mong muon huong ve (tx,tz) voi toc do toi da `speed`, giam dan khi den gan. */
export function setGoal(u: Unit, tx: number, tz: number, speed: number, arrive = 1.2): void {
  const dx = tx - u.x;
  const dz = tz - u.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) {
    u.dvx = 0;
    u.dvz = 0;
    return;
  }
  const s = d < arrive ? speed * (d / arrive) : speed;
  u.dvx = (dx / d) * s;
  u.dvz = (dz / d) * s;
}

/** Di chuyen toi (tx,tz) co dan duong A* (tinh lai moi ~0.5-1s) de vong qua vat can lon. */
export function navGoal(w: World, u: Unit, tx: number, tz: number, speed: number, arrive: number, dt: number): void {
  u.pathT -= dt;
  if (u.pathT <= 0) {
    u.pathT = 0.5 + w.rng() * 0.5;
    u.path = w.nav.findPath({ x: u.x, z: u.z }, { x: tx, z: tz });
  }
  let wp: Vec2 = u.path.length ? u.path[0] : { x: tx, z: tz };
  while (u.path.length > 1 && Math.hypot(wp.x - u.x, wp.z - u.z) < 0.9) {
    u.path.shift();
    wp = u.path[0];
  }
  const last = u.path.length <= 1;
  setGoal(u, last ? tx : wp.x, last ? tz : wp.z, speed, last ? arrive : 0.4);
}

/** Diem dich ben ngoai loi thoat (de don vi that su di ra khoi ban do). */
export function exitGoal(w: World, idx: number): Vec2 {
  const e = w.map.exits[idx];
  const l = Math.hypot(e.x, e.z) || 1;
  const horizontal = Math.abs(e.x) > Math.abs(e.z);
  return horizontal ? { x: e.x + Math.sign(e.x) * 4, z: e.z } : { x: e.x, z: e.z + Math.sign(e.z) * 4 + 0 * l };
}

/** Tranh vung lua: dang o trong thi chay ra, o gan thi lai vong. Ap dung cho moi phe. */
export function avoidFires(w: World, u: Unit): boolean {
  for (const f of w.fires) {
    if (!f.active) continue;
    let dx = u.x - f.x;
    let dz = u.z - f.z;
    if (Math.abs(dx) + Math.abs(dz) < 0.05) {
      dx = Math.cos(u.id * 2.4);
      dz = Math.sin(u.id * 2.4);
    }
    const d = Math.hypot(dx, dz) || 1e-3;
    if (d < f.r + 0.15) {
      // dang trong lua: chay ra phia ngoai gan nhat
      const s = u.team === POLICE ? 4.4 : 4.0;
      u.dvx = (dx / d) * s;
      u.dvz = (dz / d) * s;
      return true;
    }
  }
  const sp = Math.hypot(u.dvx, u.dvz);
  if (sp < 0.2) return false;
  const dx = u.dvx / sp;
  const dz = u.dvz / sp;
  const look = 3.2;
  let ax = 0;
  let az = 0;
  for (const f of w.fires) {
    if (!f.active) continue;
    const cx = u.x - f.x;
    const cz = u.z - f.z;
    const r = f.r + 1.0;
    const t = clampT(((f.x - u.x) * dx + (f.z - u.z) * dz) / look);
    const ddx = u.x + dx * look * t - f.x;
    const ddz = u.z + dz * look * t - f.z;
    const dd = Math.hypot(ddx, ddz);
    if (dd < r) {
      const side = dx * cz - dz * cx >= 0 ? 1 : -1;
      const k = (1 - dd / r) * 2.4;
      ax += -dz * side * k;
      az += dx * side * k;
    }
  }
  if (ax || az) {
    u.dvx += ax * sp;
    u.dvz += az * sp;
    const s2 = Math.hypot(u.dvx, u.dvz);
    if (s2 > sp) {
      u.dvx = (u.dvx / s2) * sp;
      u.dvz = (u.dvz / s2) * sp;
    }
  }
  return false;
}

/** Ne vat can: lech van toc mong muon neu co vat can phia truoc. */
export function avoidObstacles(w: World, u: Unit): void {
  const sp = Math.hypot(u.dvx, u.dvz);
  if (sp < 0.2) return;
  const dx = u.dvx / sp;
  const dz = u.dvz / sp;
  const look = 2.6;
  const lx = u.x + dx * look;
  const lz = u.z + dz * look;
  let ax = 0;
  let az = 0;
  for (const o of w.map.obstacles) {
    if (o.kind === 'circle') {
      if (o.type === 'lamp') continue;
      const cx = u.x - o.x;
      const cz = u.z - o.z;
      const r = o.r + 1.1;
      // khoang cach tu tam vat can den doan thang (u -> look)
      const t = clampT(((o.x - u.x) * dx + (o.z - u.z) * dz) / look);
      const px = u.x + dx * look * t;
      const pz = u.z + dz * look * t;
      const ddx = px - o.x;
      const ddz = pz - o.z;
      const dd = Math.hypot(ddx, ddz);
      if (dd < r) {
        const side = dx * cz - dz * cx >= 0 ? 1 : -1;
        const k = (1 - dd / r) * 1.8;
        ax += -dz * side * k;
        az += dx * side * k;
      }
    } else {
      const nx = Math.max(o.x - o.hw, Math.min(lx, o.x + o.hw));
      const nz = Math.max(o.z - o.hd, Math.min(lz, o.z + o.hd));
      const ddx = lx - nx;
      const ddz = lz - nz;
      const dd = Math.hypot(ddx, ddz);
      if (dd < 1.0) {
        const cx = u.x - o.x;
        const cz = u.z - o.z;
        const side = dx * cz - dz * cx >= 0 ? 1 : -1;
        const k = (1 - dd / 1.0) * 1.6;
        ax += -dz * side * k;
        az += dx * side * k;
      }
    }
  }
  if (ax || az) {
    u.dvx += ax * sp;
    u.dvz += az * sp;
    const s2 = Math.hypot(u.dvx, u.dvz);
    if (s2 > sp) {
      u.dvx = (u.dvx / s2) * sp;
      u.dvz = (u.dvz / s2) * sp;
    }
  }
}

function clampT(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function inGap(w: World, u: Unit): boolean {
  const m = w.map;
  return (
    ((u.z < m.minZ + 2 || u.z > m.maxZ - 2) && Math.abs(u.x) < 5.5) ||
    ((u.x < m.minX + 2 || u.x > m.maxX - 2) && Math.abs(u.z) < 5.5)
  );
}

export function updateMovement(w: World, dt: number): void {
  const { units, hash, map } = w;
  hash.clear();
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.active) hash.insert(i, u.x, u.z);
  }
  // 1. tich phan chuyen dong
  for (const u of units) {
    if (!u.active) continue;
    u.px = u.x;
    u.pz = u.z;
    u.pheading = u.heading;
    const knockDecay = Math.exp(-4.5 * dt);
    if (u.state === 'DOWN' || u.knock > 0) {
      u.vx = u.vz = 0;
      u.dvx = u.dvz = 0;
      u.x += u.kx * dt;
      u.z += u.kz * dt;
      u.kx *= knockDecay;
      u.kz *= knockDecay;
      u.speed = 0;
      u.downT = Math.min(1, u.downT + dt * 2.2);
      continue;
    }
    u.downT = Math.max(0, u.downT - dt * 3);
    avoidObstacles(w, u);
    avoidFires(w, u);
    if (u.stun > 0 || u.cough > 0) {
      const f = (u.stun > 0 ? u.stunK : 1) * (u.cough > 0 ? 0.6 : 1);
      u.dvx *= f;
      u.dvz *= f;
      if (u.stun > 0 && u.stunK < 0.2) {
        // luu dan choang: lao dao, di loang choang
        u.dvx += Math.sin(w.time * 5 + u.id) * 0.8;
        u.dvz += Math.cos(w.time * 4 + u.id * 1.7) * 0.8;
      }
    }
    const a = Math.min(1, dt * (u.team === POLICE ? 7 : 5));
    u.vx += (u.dvx - u.vx) * a;
    u.vz += (u.dvz - u.vz) * a;
    u.x += (u.vx + u.kx) * dt;
    u.z += (u.vz + u.kz) * dt;
    u.kx *= knockDecay;
    u.kz *= knockDecay;
    const sp = Math.hypot(u.vx, u.vz);
    u.speed = sp;
    u.phase += sp * dt * 2.7;
    // quay mat
    let want = u.face;
    if (u.team !== POLICE && sp > 0.35) want = Math.atan2(u.vx, u.vz);
    const turn = (u.team === POLICE ? 6 : 8) * dt;
    const diff = angleDiff(u.heading, want);
    u.heading += Math.max(-turn, Math.min(turn, diff));
    if (u.animT > 0) u.animT = Math.max(0, u.animT - dt);
    else u.anim = 'NONE';
  }
  // 2. tach nhau (hash luoi)
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    if (!a.active) continue;
    hash.query(a.x, a.z, SEP_R, tmpNear);
    for (let k = 0; k < tmpNear.length; k++) {
      const j = tmpNear[k];
      if (j <= i) continue;
      const b = units[j];
      if (!b.active) continue;
      if (a.state === 'DOWN' && b.state === 'DOWN') continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d2 = dx * dx + dz * dz;
      let r = SEP_R;
      if (a.team === POLICE && b.team === POLICE) r = 0.78;
      if (d2 >= r * r) continue;
      let d = Math.sqrt(d2);
      let nx: number;
      let nz: number;
      if (d < 1e-4) {
        nx = 1;
        nz = 0;
        d = 0;
      } else {
        nx = dx / d;
        nz = dz / d;
      }
      const ov = r - d;
      const ma = mass(a);
      const mb = mass(b);
      const ta = mb / (ma + mb);
      const tb = ma / (ma + mb);
      a.x -= nx * ov * ta * 0.6;
      a.z -= nz * ov * ta * 0.6;
      b.x += nx * ov * tb * 0.6;
      b.z += nz * ov * tb * 0.6;
    }
  }
  // 3. vat can + ban do + loi thoat
  for (const u of units) {
    if (!u.active) continue;
    for (const o of map.obstacles) {
      if (o.kind === 'circle') {
        const dx = u.x - o.x;
        const dz = u.z - o.z;
        const r = o.r + UNIT_R;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 1e-4;
          u.x = o.x + (dx / d) * r;
          u.z = o.z + (dz / d) * r;
        }
      } else {
        const hx = o.hw + UNIT_R;
        const hz = o.hd + UNIT_R;
        const dx = u.x - o.x;
        const dz = u.z - o.z;
        if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
          const px = hx - Math.abs(dx);
          const pz = hz - Math.abs(dz);
          if (px < pz) u.x = o.x + Math.sign(dx || 1) * hx;
          else u.z = o.z + Math.sign(dz || 1) * hz;
        }
      }
    }
    const tk = w.truck;
    if (tk.active) {
      const hx = Math.sin(tk.heading);
      const hz = Math.cos(tk.heading);
      for (let k = -1; k <= 1; k++) {
        const cx = tk.x + hx * 1.5 * k;
        const cz = tk.z + hz * 1.5 * k;
        const dx = u.x - cx;
        const dz = u.z - cz;
        const r = 1.3 + UNIT_R;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 1e-4;
          u.x = cx + (dx / d) * r;
          u.z = cz + (dz / d) * r;
        }
      }
    }
    const gap = inGap(w, u);
    const canExit = u.state === 'DISPERSE' && u.team !== POLICE;
    if (canExit && gap) {
      if (u.z < map.minZ - 0.6 || u.z > map.maxZ + 0.6 || u.x < map.minX - 0.6 || u.x > map.maxX + 0.6) {
        u.active = false;
        u.exited = true;
        continue;
      }
      // trong khe duong: chi gioi han hai ben tuong
      if (u.z < map.minZ + 2 || u.z > map.maxZ - 2) u.x = Math.max(-5.2, Math.min(5.2, u.x));
      else u.z = Math.max(-5.2, Math.min(5.2, u.z));
    } else {
      u.x = Math.max(map.minX + 0.4, Math.min(map.maxX - 0.4, u.x));
      u.z = Math.max(map.minZ + 0.4, Math.min(map.maxZ - 0.4, u.z));
    }
  }
}
