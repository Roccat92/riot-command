// Luoi dan duong A* thô cho diem neo doi hinh (1m / o), co lam muot duong di.
import type { MapData, Vec2 } from './types';

export class NavGrid {
  readonly w: number;
  readonly h: number;
  readonly blocked: Uint8Array;
  constructor(
    private readonly map: MapData,
    private readonly clearance = 0.9,
    private readonly cs = 1,
  ) {
    this.w = Math.ceil((map.maxX - map.minX) / cs);
    this.h = Math.ceil((map.maxZ - map.minZ) / cs);
    this.blocked = new Uint8Array(this.w * this.h);
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const x = map.minX + (i + 0.5) * cs;
        const z = map.minZ + (j + 0.5) * cs;
        if (this.hitsObstacle(x, z)) this.blocked[j * this.w + i] = 1;
      }
    }
  }
  private hitsObstacle(x: number, z: number): boolean {
    const c = this.clearance;
    for (const o of this.map.obstacles) {
      if (o.kind === 'circle') {
        if (o.type === 'lamp') continue;
        const dx = x - o.x;
        const dz = z - o.z;
        const r = o.r + c;
        if (dx * dx + dz * dz < r * r) return true;
      } else {
        if (Math.abs(x - o.x) < o.hw + c && Math.abs(z - o.z) < o.hd + c) return true;
      }
    }
    return false;
  }
  private cell(x: number, z: number): number {
    const i = Math.min(this.w - 1, Math.max(0, Math.floor((x - this.map.minX) / this.cs)));
    const j = Math.min(this.h - 1, Math.max(0, Math.floor((z - this.map.minZ) / this.cs)));
    return j * this.w + i;
  }
  isBlockedAt(x: number, z: number): boolean {
    return this.blocked[this.cell(x, z)] === 1;
  }
  private center(idx: number): Vec2 {
    const i = idx % this.w;
    const j = (idx / this.w) | 0;
    return { x: this.map.minX + (i + 0.5) * this.cs, z: this.map.minZ + (j + 0.5) * this.cs };
  }
  private nearestFree(idx: number): number {
    if (!this.blocked[idx]) return idx;
    const i0 = idx % this.w;
    const j0 = (idx / this.w) | 0;
    for (let r = 1; r < 12; r++) {
      let best = -1;
      let bd = 1e9;
      for (let j = j0 - r; j <= j0 + r; j++) {
        for (let i = i0 - r; i <= i0 + r; i++) {
          if (i < 0 || j < 0 || i >= this.w || j >= this.h) continue;
          if (this.blocked[j * this.w + i]) continue;
          const d = (i - i0) ** 2 + (j - j0) ** 2;
          if (d < bd) {
            bd = d;
            best = j * this.w + i;
          }
        }
      }
      if (best >= 0) return best;
    }
    return idx;
  }
  /** Kiem tra duong thang giua hai diem khong cat o bi chan. */
  lineClear(a: Vec2, b: Vec2): boolean {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(len / (this.cs * 0.5)));
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      if (this.isBlockedAt(a.x + dx * t, a.z + dz * t)) return false;
    }
    return true;
  }
  findPath(from: Vec2, to: Vec2): Vec2[] {
    const start = this.nearestFree(this.cell(from.x, from.z));
    const goal = this.nearestFree(this.cell(to.x, to.z));
    const goalPos = this.center(goal);
    const target: Vec2 = this.blocked[this.cell(to.x, to.z)] ? goalPos : { x: to.x, z: to.z };
    if (this.lineClear(from, target)) return [target];
    const n = this.w * this.h;
    const g = new Float32Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const open: number[] = [start];
    const f = new Float32Array(n);
    g[start] = 0;
    f[start] = this.hEst(start, goal);
    const gi = goal % this.w;
    const gj = (goal / this.w) | 0;
    let found = false;
    while (open.length) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
      const cur = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      if (cur === goal) {
        found = true;
        break;
      }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const ci = cur % this.w;
      const cj = (cur / this.w) | 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di;
          const nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= this.w || nj >= this.h) continue;
          const nidx = nj * this.w + ni;
          if (this.blocked[nidx] || closed[nidx]) continue;
          if (di && dj && (this.blocked[cj * this.w + ni] || this.blocked[nj * this.w + ci])) continue;
          const ng = g[cur] + (di && dj ? 1.414 : 1);
          if (ng < g[nidx]) {
            g[nidx] = ng;
            came[nidx] = cur;
            f[nidx] = ng + Math.hypot(ni - gi, nj - gj);
            open.push(nidx);
          }
        }
      }
    }
    if (!found) return [target];
    const raw: Vec2[] = [];
    for (let c = goal; c !== -1 && c !== start; c = came[c]) raw.push(this.center(c));
    raw.reverse();
    raw[raw.length - 1] = target;
    // lam muot: bo cac diem trung gian neu nhin thang duoc
    const out: Vec2[] = [];
    let anchor: Vec2 = from;
    let i = 0;
    while (i < raw.length) {
      let j = raw.length - 1;
      while (j > i && !this.lineClear(anchor, raw[j])) j--;
      out.push(raw[j]);
      anchor = raw[j];
      i = j + 1;
    }
    return out;
  }
  private hEst(a: number, b: number): number {
    return Math.hypot((a % this.w) - (b % this.w), ((a / this.w) | 0) - ((b / this.w) | 0));
  }
}
