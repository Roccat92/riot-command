// ToolsRenderer: xe voi rong (low-poly, den nhap nhay), tia nuoc + hat bat nuoc, hoi cay, khoi, vun, vung nuoc dong, vet chay,
// vat can dang chay, chum LRAD, vong ngam. Moi thu dung InstancedMesh co pool co dinh va doc truc tiep tu mo phong moi khung hinh.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OctahedronGeometry,
  Quaternion,
  RingGeometry,
  Vector3,
  Euler,
  type BufferGeometry,
  type Group,
} from 'three';
import { simLoop } from '../sim/SimulationLoop';
import { useGameStore } from '../state/GameState';
import { FLASH_R, GAS_R, JET_RANGE, LRAD_HALF, LRAD_RANGE, truckDir } from '../sim/ToolsSystem';
import type { FxEvent, World } from '../sim/types';
import { Batch } from './Batch';
import { aim } from './aim';
import { QUALITY } from './quality';

const ZERO = new Matrix4().makeScale(0, 0, 0);
const mA = new Matrix4();
const qA = new Quaternion();
const eA = new Euler();
const vA = new Vector3();
const vS = new Vector3();
const Q0 = new Quaternion();
const col = new Color();

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function mk(g: BufferGeometry, mat: MeshBasicMaterial, n: number, order = 10): InstancedMesh {
  const m = new InstancedMesh(g, mat, n);
  m.frustumCulled = false;
  m.renderOrder = order;
  for (let i = 0; i < n; i++) m.setMatrixAt(i, ZERO);
  return m;
}
function put(m: InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, ry = 0, rx = 0, rz = 0): void {
  if (sx <= 0.001) {
    m.setMatrixAt(i, ZERO);
    return;
  }
  eA.set(rx, ry, rz);
  qA.setFromEuler(eA);
  vA.set(x, y, z);
  vS.set(sx, sy, sz);
  mA.compose(vA, qA, vS);
  m.setMatrixAt(i, mA);
}
function flat(m: InstancedMesh, i: number, x: number, y: number, z: number, r: number): void {
  if (r <= 0.001) {
    m.setMatrixAt(i, ZERO);
    return;
  }
  vA.set(x, y, z);
  vS.set(r, 1, r);
  mA.compose(vA, Q0, vS);
  m.setMatrixAt(i, mA);
}

// ---------- hinh hoc xe voi rong ----------
function buildTruck(): { body: BufferGeometry; turret: BufferGeometry } {
  const b = new Batch();
  const RED = 0xc62828;
  const cyl = new CylinderGeometry(1, 1, 1, 8);
  b.box(0, 0.3, 0, 2.1, 0.55, 5.3, 0x23262b); // khung xe
  b.box(0, 0.55, 1.95, 2.3, 1.55, 1.45, RED); // cabin
  b.box(0, 1.55, 2.7, 1.9, 0.7, 0.06, 0x2d4f6b); // kinh truoc
  b.box(0, 1.55, 2.0, 2.34, 0.62, 0.7, 0x2d4f6b); // kinh hong (tao dai kinh)
  b.box(0, 2.1, 2.0, 2.3, 0.16, 1.45, 0xa31f1f); // mai cabin
  b.box(0, 0.5, -0.9, 2.35, 1.75, 3.5, RED); // than xe
  b.box(0, 1.15, -0.9, 2.4, 0.2, 3.55, 0xf6f6f6); // soc trang
  b.box(0, 0.8, -0.9, 2.4, 0.08, 3.55, 0xf0c040); // soc vang
  b.box(0, 0.25, 2.78, 2.35, 0.3, 0.2, 0xcfd3d8); // can truoc
  b.box(0, 0.25, -2.7, 2.35, 0.3, 0.2, 0xcfd3d8); // can sau
  b.box(-0.8, 0.85, 2.75, 0.4, 0.22, 0.08, 0xfff1b0); // den pha
  b.box(0.8, 0.85, 2.75, 0.4, 0.22, 0.08, 0xfff1b0);
  b.box(-0.8, 0.9, -2.7, 0.3, 0.2, 0.08, 0xff3b2f); // den hau
  b.box(0.8, 0.9, -2.7, 0.3, 0.2, 0.08, 0xff3b2f);
  b.add(cyl, 0xcfd8dc, 0, 2.72, -0.9, 0, 0.62, 3.0, 0.62, Math.PI / 2); // bon nuoc tren noc
  b.box(0, 2.0, -2.0, 1.8, 0.1, 0.6, 0x37474f);
  for (const x of [-0.5, 0.5]) b.box(x, 3.3, -0.9, 0.06, 0.06, 3.2, 0xb0bec5); // thang
  for (const z of [1.95, -0.45, -1.95]) for (const x of [-1.15, 1.15]) b.add(cyl, 0x111214, x, 0.52, z, 0, 0.52, 0.42, 0.52, 0, Math.PI / 2);
  for (const z of [1.95, -0.45, -1.95]) for (const x of [-1.37, 1.37]) b.add(cyl, 0x9aa3ad, x, 0.52, z, 0, 0.24, 0.06, 0.24, 0, Math.PI / 2);
  const t = new Batch();
  t.cyl(0, 0, 0, 0.42, 0.45, 0x546e7a, 8);
  t.box(0, 0.35, 0.65, 0.3, 0.3, 1.5, 0x37474f);
  t.box(0, 0.35, 1.45, 0.4, 0.4, 0.28, 0xb0bec5);
  return { body: b.build()!, turret: t.build()! };
}

const OB_H: Record<string, number> = { van: 2.3, barrier: 1.05, bench: 1.0, kiosk: 2.6 };

interface Deb {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  spin: number;
}

export function ToolsRenderer() {
  const truckRef = useRef<Group>(null);
  const turretRef = useRef<Group>(null);
  const lightA = useRef<MeshBasicMaterial>(null);
  const lightB = useRef<MeshBasicMaterial>(null);
  const bodyMat = useRef<MeshLambertMaterial>(null);

  const geos = useMemo(buildTruck, []);
  const Qn = QUALITY;
  const o = useMemo(() => {
    const water = new MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false });
    const mist = new MeshBasicMaterial({ transparent: true, opacity: 0.42, depthWrite: false });
    const soft = new MeshBasicMaterial({ transparent: true, opacity: 0.66, depthWrite: false });
    const smokeM = new MeshBasicMaterial({ transparent: true, opacity: 0.58, depthWrite: false });
    const flameM = new MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false });
    const flatM = new MeshBasicMaterial({ transparent: true, opacity: 0.62, depthWrite: false, side: DoubleSide });
    const solid = new MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false });
    const ring = new MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, side: DoubleSide });
    const char = new MeshBasicMaterial({ color: 0x0c0a09, transparent: true, opacity: 0.55, depthWrite: false });
    const nJet = Qn.jet;
    const nSplash = Qn.splash;
    const nSmoke = Qn.smoke;
    const nDeb = Qn.debris;
    const MAX_OBS = 24;
    const jet = mk(new OctahedronGeometry(1, 0), water, nJet);
    const splash = mk(new OctahedronGeometry(1, 0), water, nSplash);
    const gas = mk(new IcosahedronGeometry(1, 0), soft, 8 * Qn.gasPuffs);
    const gasDisc = mk(new CircleGeometry(1, 24).rotateX(-Math.PI / 2), mist, 8, 3);
    const smoke = mk(new IcosahedronGeometry(1, 0), smokeM, nSmoke);
    const flames = mk(new ConeGeometry(0.28, 1, 5), flameM, MAX_OBS * Qn.flames);
    const charM = mk(new BoxGeometry(1, 1, 1), char, MAX_OBS, 4);
    const puddle = mk(new CircleGeometry(1, 18).rotateX(-Math.PI / 2), flatM, 40, 2);
    const debris = mk(new BoxGeometry(0.14, 0.14, 0.14), solid, nDeb);
    const lrad = mk(new RingGeometry(0.965, 1, 28, 1, -LRAD_HALF, LRAD_HALF * 2).rotateX(-Math.PI / 2), ring, 7);
    const dots = mk(new CircleGeometry(0.16, 8).rotateX(-Math.PI / 2), ring, 40);
    const reticle = mk(new RingGeometry(0.88, 1, 36).rotateX(-Math.PI / 2), ring, 3);
    const reticleFill = mk(new CircleGeometry(1, 36).rotateX(-Math.PI / 2), mist, 1, 5);
    for (let i = 0; i < nJet; i++) jet.setColorAt(i, col.set(i % 3 === 0 ? 0xffffff : i % 3 === 1 ? 0xbfe6ff : 0x8fd0ff));
    for (let i = 0; i < nSplash; i++) splash.setColorAt(i, col.set(0xe8f6ff));
    for (let i = 0; i < 8 * Qn.gasPuffs; i++) gas.setColorAt(i, col.set(i % 2 ? 0xcfe05a : 0xb5cc42));
    for (let i = 0; i < 8; i++) gasDisc.setColorAt(i, col.set(0xd5e27a));
    const SM = [0x2b2b2b, 0x3a3a3a, 0x4a4a4a, 0x303030, 0x585858];
    for (let i = 0; i < nSmoke; i++) smoke.setColorAt(i, col.set(SM[i % SM.length]));
    const FL = [0xffd24a, 0xff8a1f, 0xff4a1a];
    for (let i = 0; i < MAX_OBS * Qn.flames; i++) flames.setColorAt(i, col.set(FL[i % 3]));
    for (let i = 0; i < nDeb; i++) debris.setColorAt(i, col.set(0xffffff));
    for (let i = 0; i < 40; i++) puddle.setColorAt(i, col.set(0x6aa0c8));
    for (let i = 0; i < 7; i++) lrad.setColorAt(i, col.set(0xa8ecff));
    for (let i = 0; i < 40; i++) dots.setColorAt(i, col.set(0xffffff));
    reticle.setColorAt(0, col.set(0xffffff));
    reticleFill.setColorAt(0, col.set(0x9fd8ff));
    const all = [puddle, charM, gasDisc, jet, splash, gas, smoke, flames, debris, lrad, dots, reticle, reticleFill];
    const deb: Deb[] = Array.from({ length: nDeb }, () => ({ x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, spin: 0 }));
    return {
      all, jet, splash, gas, gasDisc, smoke, flames, charM, puddle, debris, lrad, dots, reticle, reticleFill, deb, MAX_OBS, nJet, nSplash, nSmoke, nDeb,
      state: { seen: new WeakSet<FxEvent>(), di: 0, charred: new Set<number>(), world: null as World | null },
    };
  }, [Qn]);

  useFrame((s, delta) => {
    const w = simLoop.world;
    const t = s.clock.elapsedTime;
    const dt = Math.min(0.05, delta || 0.016);
    const st = o.state;
    if (st.world !== w) {
      st.world = w;
      st.charred.clear();
      st.seen = new WeakSet();
      for (const d of o.deb) d.life = 0;
    }
    const tk = w.truck;
    const a = simLoop.alpha;
    const store = useGameStore.getState();

    // ---------- xe ----------
    const tg = truckRef.current;
    if (tg) {
      tg.visible = tk.active;
      const x = tk.px + (tk.x - tk.px) * a;
      const z = tk.pz + (tk.z - tk.pz) * a;
      tg.position.set(x, 0.28, z);
      tg.rotation.y = tk.heading;
      const dir = truckDir(tk);
      if (turretRef.current) turretRef.current.rotation.y = Math.atan2(dir.x, dir.z) - tk.heading;
      const blink = Math.floor(t * 5) % 2 === 0;
      if (lightA.current) lightA.current.color.setHex(blink && tk.hp > 0 ? 0x3a7bff : 0x16213a);
      if (lightB.current) lightB.current.color.setHex(!blink && tk.hp > 0 ? 0xff3b30 : 0x3a1a18);
      if (bodyMat.current) bodyMat.current.color.setHex(tk.hp <= 0 ? 0x4a4a4a : tk.hp / tk.maxHp < 0.35 ? 0xb8a8a0 : 0xffffff);
    }

    // ---------- tia nuoc ----------
    const dirT = truckDir(tk);
    const L = Math.min(JET_RANGE, Math.max(5, dirT.d));
    const nx = tk.x + dirT.x * 1.5;
    const nz = tk.z + dirT.z * 1.5;
    const ex = tk.x + dirT.x * L;
    const ez = tk.z + dirT.z * L;
    const jetK = tk.active ? tk.jet : 0;
    const px = -dirT.z;
    const pz = dirT.x;
    for (let i = 0; i < o.nJet; i++) {
      if (jetK < 0.05) {
        o.jet.setMatrixAt(i, ZERO);
        continue;
      }
      const ph = (t * 2.3 + i / o.nJet) % 1;
      const j = (hash(i * 3 + 1) - 0.5) * 0.9 * (0.15 + ph);
      const arc = 0.7 + L * 0.075;
      const k = ph;
      const fade = Math.min(1, ph / 0.04);
      put(
        o.jet,
        i,
        nx + (ex - nx) * k + px * j,
        3.9 * (1 - k) + 0.35 * k + 4 * arc * k * (1 - k) * 0.55,
        nz + (ez - nz) * k + pz * j,
        0.26 * (0.7 + 0.6 * hash(i + 3)) * jetK * fade * (1 + 0.5 * k),
        0.26 * (0.7 + 0.6 * hash(i + 3)) * jetK * fade * (1 + 0.5 * k),
        0.26 * (0.7 + 0.6 * hash(i + 3)) * jetK * fade * (1 + 0.5 * k),
        t * 5 + i,
      );
    }
    for (let i = 0; i < o.nSplash; i++) {
      if (jetK < 0.3) {
        o.splash.setMatrixAt(i, ZERO);
        continue;
      }
      const ph = (t * 1.9 + i / o.nSplash) % 1;
      const ang = hash(i * 5 + 2) * Math.PI * 2;
      const rad = (0.3 + ph * 2.2) * (0.5 + hash(i + 8));
      put(o.splash, i, ex + Math.cos(ang) * rad, 0.35 + Math.sin(ph * Math.PI) * 1.9 * (0.4 + hash(i + 4)), ez + Math.sin(ang) * rad, 0.22 * (1 - ph) + 0.05, undefined, undefined, t * 4 + i);
    }

    // ---------- vong ngam xe / trang bi ----------
    const dots = o.dots;
    let nd = 0;
    const lineTo = (ax: number, az: number, bx: number, bz: number, n: number) => {
      for (let i = 0; i < n && nd < 40; i++) {
        const k = (i + 1) / (n + 1);
        flat(dots, nd++, ax + (bx - ax) * k, 0.42, az + (bz - az) * k, 0.55);
      }
    };
    let retR = 0;
    let rx = 0;
    let rz = 0;
    let rc = 0xffffff;
    if (store.targeting && aim.valid) {
      const k = store.targeting;
      retR = k === 'gas' ? GAS_R : k === 'flash' ? FLASH_R : 3.2;
      rx = aim.x;
      rz = aim.z;
      rc = k === 'gas' ? 0xd7e66a : k === 'flash' ? 0xffffff : 0x8fe6ff;
      const ids = store.selection.length ? store.selection : w.squads.map((q) => q.id);
      let best = 1e9;
      let bs = -1;
      for (const id of ids) {
        const q = w.squads[id];
        if (!q || q.aliveCount <= 0) continue;
        const d = Math.hypot(q.cx - aim.x, q.cz - aim.z);
        if (d < best) {
          best = d;
          bs = id;
        }
      }
      if (bs >= 0) lineTo(w.squads[bs].cx, w.squads[bs].cz, aim.x, aim.z, 16);
    } else if (tk.active && tk.hp > 0 && (store.truckSel || tk.firing) && !tk.auto) {
      retR = 1.3;
      rx = ex;
      rz = ez;
      rc = tk.firing ? 0x7fd0ff : 0xffffff;
      if (!tk.firing) lineTo(nx, nz, ex, ez, 14);
    } else if (tk.active && tk.hp > 0 && tk.auto && tk.firing) {
      retR = 1.1;
      rx = ex;
      rz = ez;
      rc = 0x7fd0ff;
    }
    for (let i = nd; i < 40; i++) dots.setMatrixAt(i, ZERO);
    if (retR > 0) {
      const pul = 1 + 0.08 * Math.sin(t * 8);
      vA.set(rx, 0.45, rz);
      vS.set(retR * pul, 1, retR * pul);
      mA.compose(vA, Q0, vS);
      o.reticle.setMatrixAt(0, mA);
      col.set(rc);
      o.reticle.setColorAt(0, col);
      vA.set(rx, 0.4, rz);
      vS.set(retR * 0.98, 1, retR * 0.98);
      mA.compose(vA, Q0, vS);
      o.reticleFill.setMatrixAt(0, mA);
      o.reticleFill.setColorAt(0, col);
    } else {
      o.reticle.setMatrixAt(0, ZERO);
      o.reticleFill.setMatrixAt(0, ZERO);
    }

    // ---------- hoi cay ----------
    const P = Qn.gasPuffs;
    for (let c = 0; c < 8; c++) {
      const g = w.gas[c];
      if (!g || !g.active) {
        for (let k = 0; k < P; k++) o.gas.setMatrixAt(c * P + k, ZERO);
        o.gasDisc.setMatrixAt(c, ZERO);
        continue;
      }
      const grow = Math.min(1, g.t / 0.8) * Math.min(1, (g.dur - g.t) / 2);
      flat(o.gasDisc, c, g.x, 0.33, g.z, g.r * Math.min(1, g.t / 0.6) * (0.85 + 0.05 * Math.sin(t * 2 + c)));
      for (let k = 0; k < P; k++) {
        const seed = c * 17 + k;
        const ang = hash(seed) * Math.PI * 2 + t * 0.18 * (hash(seed + 1) > 0.5 ? 1 : -1);
        const rad = Math.sqrt(hash(seed + 2)) * g.r * 0.62;
        const sc = g.r * 0.34 * (0.65 + 0.7 * hash(seed + 3)) * grow;
        put(o.gas, c * P + k, g.x + Math.cos(ang) * rad, 0.9 + hash(seed + 4) * 1.5 + Math.sin(t * 0.9 + seed) * 0.2, g.z + Math.sin(ang) * rad, sc, sc * 0.8, sc, t * 0.2 + seed);
      }
    }

    // ---------- vat can chay / khoi / lua ----------
    const NF = Qn.flames;
    let smokeN = 0;
    const addSmoke = (sx: number, sy: number, sz: number, scale: number, n: number, seed: number) => {
      for (let j = 0; j < n && smokeN < o.nSmoke; j++) {
        const ph = (t * 0.3 + hash(seed * 7 + j * 3)) % 1;
        const sc = (0.5 + ph * 1.5) * scale * Math.min(1, ph / 0.12) * (ph > 0.8 ? (1 - ph) / 0.2 : 1);
        put(o.smoke, smokeN++, sx + (hash(seed + j) - 0.5) * 0.9 + ph * 2.6 + Math.sin(t + seed + j) * 0.3 * ph, sy + ph * 6.5, sz + (hash(seed + j + 4) - 0.5) * 0.9 + ph * 0.8, sc, sc * 0.85, sc, t * 0.3 + j);
      }
    };
    const obs = w.map.obstacles;
    let fo = 0;
    for (let i = 0; i < obs.length && fo < o.MAX_OBS; i++) {
      const ob = obs[i];
      const b = w.burning[i];
      if (ob.kind !== 'box') continue;
      if (b > 0) st.charred.add(i);
      if (b <= 0 && !st.charred.has(i)) continue;
      const h = OB_H[ob.type] ?? 1;
      vA.set(ob.x, h * 0.5, ob.z);
      vS.set(ob.hw * 2 + 0.12, h + 0.06, ob.hd * 2 + 0.12);
      mA.compose(vA, Q0, vS);
      o.charM.setMatrixAt(fo, b > 0 ? mA : mA);
      if (b > 0) {
        const f = Math.min(1, b / 4);
        for (let k = 0; k < NF; k++) {
          const seed = i * 13 + k;
          const ph = (t * (1.2 + 0.5 * hash(seed)) + hash(seed + 7)) % 1;
          const sc = (1 - ph) * (1.2 + 1.0 * hash(seed + 9)) * f * (ob.type === 'van' ? 1.9 : 1.2);
          vA.set(ob.x + (hash(seed + 3) - 0.5) * ob.hw * 1.7, h * (0.7 + 0.5 * ph), ob.z + (hash(seed + 5) - 0.5) * ob.hd * 1.7);
          vS.set(sc, sc * (1.3 + ph * 0.5), sc);
          mA.compose(vA, Q0, vS);
          o.flames.setMatrixAt(fo * NF + k, sc > 0.02 ? mA : ZERO);
        }
        addSmoke(ob.x, h, ob.z, (ob.type === 'van' ? 1.35 : 0.9) * f, ob.type === 'van' ? 4 : 2, i);
      } else for (let k = 0; k < NF; k++) o.flames.setMatrixAt(fo * NF + k, ZERO);
      fo++;
    }
    for (let i = fo; i < o.MAX_OBS; i++) {
      o.charM.setMatrixAt(i, ZERO);
      for (let k = 0; k < NF; k++) o.flames.setMatrixAt(i * NF + k, ZERO);
    }
    for (let i = 0; i < w.fires.length; i++) {
      const f = w.fires[i];
      if (f.active) addSmoke(f.x, 1.2, f.z, 0.85 * Math.min(1, f.t / 1.0) * Math.min(1, (f.dur - f.t) / 1.5), 2, 100 + i);
    }
    if (tk.active && (tk.burnT > 0 || tk.hp <= 0 || tk.hp / tk.maxHp < 0.4)) {
      addSmoke(tk.x, 3.2, tk.z, tk.hp <= 0 ? 1.4 : 1, 3, 200);
    }
    for (let i = smokeN; i < o.nSmoke; i++) o.smoke.setMatrixAt(i, ZERO);

    // ---------- vung nuoc dong / vet chay ----------
    for (let i = 0; i < 40; i++) {
      const p = w.puddles[i];
      if (!p || !p.active) {
        o.puddle.setMatrixAt(i, ZERO);
        continue;
      }
      const f = Math.min(1, p.t / 0.5) * Math.min(1, (p.dur - p.t) / (p.dur * 0.25));
      flat(o.puddle, i, p.x, p.kind === 0 ? 0.285 : 0.287, p.z, p.r * f);
      col.set(p.kind === 0 ? 0x6aa0c8 : 0x1c1815);
      o.puddle.setColorAt(i, col);
    }

    // ---------- LRAD ----------
    const lr = w.lrad;
    for (let k = 0; k < 7; k++) {
      if (!lr.active) {
        o.lrad.setMatrixAt(k, ZERO);
        continue;
      }
      const r = 3 + ((lr.t * 15 + k * 4) % (LRAD_RANGE - 3));
      const fade = 1 - r / LRAD_RANGE;
      eA.set(0, lr.ang - Math.PI / 2, 0);
      qA.setFromEuler(eA);
      vA.set(lr.x, 0.5, lr.z);
      vS.set(r, 1, r);
      mA.compose(vA, qA, vS);
      o.lrad.setMatrixAt(k, fade > 0.03 ? mA : ZERO);
    }

    // ---------- vun / hat tu su kien ----------
    for (const e of w.fx) {
      if (st.seen.has(e)) continue;
      st.seen.add(e);
      const n = e.kind === 'burst' ? 14 : e.kind === 'flash' ? 12 : e.kind === 'glass' ? 8 : e.kind === 'splash' ? 6 : e.kind === 'gaspop' ? 6 : e.kind === 'hit' ? 6 : e.kind === 'block' ? 5 : 0;
      for (let k = 0; k < n; k++) {
        const d = o.deb[st.di];
        const ang = Math.random() * Math.PI * 2;
        const sp = (e.kind === 'splash' ? 1.5 : 3) * (0.4 + Math.random());
        d.x = e.x;
        d.z = e.z;
        d.y = e.kind === 'splash' ? 0.4 : 1.0;
        d.vx = Math.cos(ang) * sp;
        d.vz = Math.sin(ang) * sp;
        d.vy = (e.kind === 'splash' ? 3 : 4.5) * (0.5 + Math.random());
        d.max = d.life = 0.7 + Math.random() * 0.6;
        d.size = e.kind === 'burst' ? 1.3 : 1;
        d.spin = Math.random() * 6;
        const c =
          e.kind === 'burst' ? (k % 2 ? 0xff8a1f : 0x2b2420) :
          e.kind === 'glass' ? (k % 2 ? 0x7bffb0 : 0xc8fff0) :
          e.kind === 'flash' ? 0xffffff :
          e.kind === 'splash' ? 0xbfe6ff :
          e.kind === 'gaspop' ? 0xd9e58a :
          e.kind === 'hit' ? (k % 2 ? 0xff5a3c : 0x8a8478) : 0xbfe3ff;
        o.debris.setColorAt(st.di, col.set(c));
        st.di = (st.di + 1) % o.nDeb;
      }
    }
    const ddt = Math.min(0.05, dt || 0.016);
    for (let i = 0; i < o.nDeb; i++) {
      const d = o.deb[i];
      if (d.life <= 0) {
        o.debris.setMatrixAt(i, ZERO);
        continue;
      }
      d.life -= ddt;
      d.vy -= 14 * ddt;
      d.x += d.vx * ddt;
      d.z += d.vz * ddt;
      d.y += d.vy * ddt;
      if (d.y < 0.3) {
        d.y = 0.3;
        d.vy *= -0.3;
        d.vx *= 0.6;
        d.vz *= 0.6;
      }
      const f = Math.min(1, d.life / (d.max * 0.4));
      put(o.debris, i, d.x, d.y, d.z, d.size * f, undefined, undefined, d.spin + t * 8, t * 6, d.spin);
    }

    // chop sang (luu dan choang): overlay HTML
    let flash = 0;
    for (const e of w.fx) if (e.kind === 'flash') flash = Math.max(flash, 1 - (w.time - e.t) / 0.55);
    const ov = document.getElementById('flash-overlay');
    if (ov) ov.style.opacity = String(Math.max(0, flash) ** 2 * 0.55);

    // chi ve so instance dang dung (giu ngan sach tam giac)
    o.jet.count = jetK < 0.05 ? 0 : o.nJet;
    o.splash.count = jetK < 0.3 ? 0 : o.nSplash;
    let gl1 = 0;
    for (let c = 0; c < 8; c++) if (w.gas[c]?.active) gl1 = c + 1;
    o.gas.count = gl1 * P;
    o.gasDisc.count = gl1;
    o.smoke.count = smokeN;
    o.flames.count = fo * NF;
    o.charM.count = fo;
    let pl = 0;
    for (let i = 0; i < 40; i++) if (w.puddles[i]?.active) pl = i + 1;
    o.puddle.count = pl;
    let dl = 0;
    for (let i = 0; i < o.nDeb; i++) if (o.deb[i].life > 0) dl = i + 1;
    o.debris.count = dl;
    o.lrad.count = lr.active ? 7 : 0;
    o.dots.count = nd;
    o.reticle.count = retR > 0 ? 1 : 0;
    o.reticleFill.count = retR > 0 ? 1 : 0;
    for (const m of o.all) m.instanceMatrix.needsUpdate = true;
    if (o.puddle.instanceColor) o.puddle.instanceColor.needsUpdate = true;
    if (o.debris.instanceColor) o.debris.instanceColor.needsUpdate = true;
    if (o.reticle.instanceColor) o.reticle.instanceColor.needsUpdate = true;
    if (o.reticleFill.instanceColor) o.reticleFill.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <group ref={truckRef}>
        <mesh geometry={geos.body} castShadow>
          <meshLambertMaterial ref={bodyMat} vertexColors flatShading />
        </mesh>
        <group ref={turretRef} position={[0, 3.45, -0.6]}>
          <mesh geometry={geos.turret} castShadow>
            <meshLambertMaterial vertexColors flatShading />
          </mesh>
        </group>
        <mesh position={[-0.5, 2.28, 2.05]}>
          <boxGeometry args={[0.55, 0.16, 0.3]} />
          <meshBasicMaterial ref={lightA} color={0x3a7bff} />
        </mesh>
        <mesh position={[0.5, 2.28, 2.05]}>
          <boxGeometry args={[0.55, 0.16, 0.3]} />
          <meshBasicMaterial ref={lightB} color={0xff3b30} />
        </mesh>
      </group>
      {o.all.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}
