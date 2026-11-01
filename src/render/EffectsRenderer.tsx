// EffectsRenderer: vat bi nem (parabol), vong canh bao tren mat dat, vung lua (hat lua + vang sang cam), hieu ung va cham.
// Tat ca dung InstancedMesh co pool co dinh va doc truc tiep tu mo phong moi khung hinh (khong cap phat moi khung).
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import {
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  OctahedronGeometry,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { simLoop } from '../sim/SimulationLoop';
import { STEP } from '../sim/SimulationLoop';
import { FIRE_R, HIT_R } from '../sim/ProjectileSystem';

const MAX_P = 64;
const MAX_FIRE = 12;
const FP = 14; // hat lua moi vung
const MAX_FX = 48;
const MAX_BURN = 64;
const ZERO = new Matrix4().makeScale(0, 0, 0);

const KIND_COL = [0xb8b2a6, 0x57d98a, 0xff8a1f];
const FX_COL: Record<string, number> = { block: 0xbfe3ff, hit: 0xff5a3c, glass: 0x7bffb0, burst: 0xffa030, dodge: 0x6fe9ff };
const FX_KIND = ['block', 'hit', 'glass', 'burst', 'dodge'];

const mA = new Matrix4();
const qA = new Quaternion();
const eA = new Euler();
const vA = new Vector3();
const vS = new Vector3();
const Q0 = new Quaternion();

function mk(g: import('three').BufferGeometry, mat: MeshBasicMaterial, n: number): InstancedMesh {
  const m = new InstancedMesh(g, mat, n);
  m.frustumCulled = false;
  m.renderOrder = 9;
  for (let i = 0; i < n; i++) m.setMatrixAt(i, ZERO);
  return m;
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function EffectsRenderer() {
  const o = useMemo(() => {
    const solid = new MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false });
    const glowMat = new MeshBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false, color: 0xff6a10 });
    const ringMat = new MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, side: DoubleSide });
    const flameMat = new MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false });
    const stone = mk(new OctahedronGeometry(0.2, 0), solid, MAX_P);
    const bottle = mk(new BoxGeometry(0.14, 0.4, 0.14), solid, MAX_P);
    const molo = mk(new BoxGeometry(0.2, 0.34, 0.2), solid, MAX_P);
    const warn = mk(new RingGeometry(0.86, 1.0, 36).rotateX(-Math.PI / 2), ringMat, MAX_P);
    const warnFill = mk(new CircleGeometry(1, 28).rotateX(-Math.PI / 2), glowMat, MAX_P);
    const glow = mk(new CircleGeometry(1, 28).rotateX(-Math.PI / 2), glowMat, MAX_FIRE);
    const flames = mk(new ConeGeometry(0.28, 1, 5), flameMat, MAX_FIRE * FP);
    const burnF = mk(new ConeGeometry(0.2, 0.7, 5), flameMat, MAX_BURN);
    const fx = mk(new RingGeometry(0.7, 1, 24).rotateX(-Math.PI / 2), ringMat, MAX_FX);
    const spark = mk(new SphereGeometry(0.16, 5, 4), flameMat, MAX_FX);
    const c = new Color();
    for (let i = 0; i < MAX_P; i++) {
      c.set(KIND_COL[0]);
      stone.setColorAt(i, c);
      c.set(KIND_COL[1]);
      bottle.setColorAt(i, c);
      c.set(KIND_COL[2]);
      molo.setColorAt(i, c);
      c.set(0xffcc33);
      warn.setColorAt(i, c);
      c.set(0xff7a1a);
      warnFill.setColorAt(i, c);
    }
    const FL = [0xffd24a, 0xff8a1f, 0xff4a1a];
    for (let i = 0; i < MAX_FIRE * FP; i++) {
      c.set(FL[i % 3]);
      flames.setColorAt(i, c);
    }
    for (let i = 0; i < MAX_BURN; i++) {
      c.set(FL[i % 3]);
      burnF.setColorAt(i, c);
    }
    for (let i = 0; i < MAX_FX; i++) {
      c.set(0xffffff);
      fx.setColorAt(i, c);
      spark.setColorAt(i, c);
    }
    const all = [stone, bottle, molo, warn, warnFill, glow, flames, burnF, fx, spark];
    return { stone, bottle, molo, warn, warnFill, glow, flames, burnF, fx, spark, all };
  }, []);

  useFrame((state) => {
    const w = simLoop.world;
    const a = simLoop.alpha;
    const t = state.clock.elapsedTime;
    const { stone, bottle, molo, warn, warnFill, glow, flames, burnF, fx, spark } = o;
    // ---- vat bi nem + vong canh bao ----
    for (let i = 0; i < MAX_P; i++) {
      const p = w.projectiles[i];
      if (!p || !p.active) {
        stone.setMatrixAt(i, ZERO);
        bottle.setMatrixAt(i, ZERO);
        molo.setMatrixAt(i, ZERO);
        warn.setMatrixAt(i, ZERO);
        warnFill.setMatrixAt(i, ZERO);
        continue;
      }
      const prog = Math.min(1, (p.t + (simLoop.paused ? 0 : a * STEP)) / p.dur);
      const x = p.sx + (p.tx - p.sx) * prog;
      const z = p.sz + (p.tz - p.sz) * prog;
      const y = 1.5 + 4 * p.arc * prog * (1 - prog) * 0.55;
      eA.set(p.spin + t * 9, t * 6, t * 7);
      qA.setFromEuler(eA);
      vA.set(x, y, z);
      vS.set(1.3, 1.3, 1.3);
      mA.compose(vA, qA, vS);
      stone.setMatrixAt(i, p.kind === 0 ? mA : ZERO);
      bottle.setMatrixAt(i, p.kind === 1 ? mA : ZERO);
      molo.setMatrixAt(i, p.kind === 2 ? mA : ZERO);
      // vong canh bao: ban kinh chinh la vung anh huong, thu hep va dam dan khi sap cham dat
      const r = p.kind === 2 ? FIRE_R : HIT_R[p.kind] + 0.35;
      const pulse = 1 + 0.18 * (1 - prog) * Math.sin(t * 14);
      const sc = r * (1.0 + 0.35 * (1 - prog)) * pulse;
      vA.set(p.tx, 0.31, p.tz);
      vS.set(sc, 1, sc);
      mA.compose(vA, Q0, vS);
      warn.setMatrixAt(i, mA);
      vA.set(p.tx, 0.3, p.tz);
      vS.set(r * prog, 1, r * prog);
      mA.compose(vA, Q0, vS);
      warnFill.setMatrixAt(i, mA);
    }
    // ---- vung lua ----
    for (let i = 0; i < MAX_FIRE; i++) {
      const f = w.fires[i];
      if (!f || !f.active) {
        glow.setMatrixAt(i, ZERO);
        for (let k = 0; k < FP; k++) flames.setMatrixAt(i * FP + k, ZERO);
        continue;
      }
      const fade = Math.min(1, f.t / 0.5) * Math.min(1, (f.dur - f.t) / 1.2);
      const flick = 1 + 0.06 * Math.sin(t * 11 + i);
      vA.set(f.x, 0.29, f.z);
      vS.set(f.r * 1.15 * flick * (0.4 + 0.6 * fade), 1, f.r * 1.15 * flick * (0.4 + 0.6 * fade));
      mA.compose(vA, Q0, vS);
      glow.setMatrixAt(i, mA);
      for (let k = 0; k < FP; k++) {
        const seed = i * 31 + k;
        const ph = (t * (1.1 + 0.5 * hash(seed)) + hash(seed + 7)) % 1;
        const ang = hash(seed + 3) * Math.PI * 2;
        const rad = Math.sqrt(hash(seed + 5)) * f.r * 0.82;
        const h = ph * 2.4;
        const sc = (1 - ph) * (0.7 + 0.8 * hash(seed + 9)) * fade;
        vA.set(f.x + Math.cos(ang) * rad + Math.sin(t * 3 + seed) * 0.12, 0.3 + h * 0.5 + sc * 0.5, f.z + Math.sin(ang) * rad);
        vS.set(sc, sc * (1.2 + h * 0.3), sc);
        mA.compose(vA, Q0, vS);
        flames.setMatrixAt(i * FP + k, mA);
      }
    }
    // ---- don vi dang chay ----
    let nb = 0;
    for (const u of w.units) {
      if (u.burn > 0 && u.active && nb < MAX_BURN) {
        const ph = (t * 2.2 + u.id * 0.37) % 1;
        const sc = 0.8 + 0.5 * Math.sin(t * 16 + u.id) * 0.3;
        vA.set(u.x, 1.1 + ph * 1.1, u.z);
        vS.set(sc, sc * 1.4, sc);
        mA.compose(vA, Q0, vS);
        burnF.setMatrixAt(nb++, mA);
      }
    }
    for (let i = nb; i < MAX_BURN; i++) burnF.setMatrixAt(i, ZERO);
    // ---- hieu ung va cham ----
    const ncol = new Color();
    for (let i = 0; i < MAX_FX; i++) {
      const e = w.fx[i];
      if (!e) {
        fx.setMatrixAt(i, ZERO);
        spark.setMatrixAt(i, ZERO);
        continue;
      }
      const age = Math.max(0, w.time - e.t);
      const k = Math.min(1, age / 0.6);
      const col = FX_COL[e.kind] ?? 0xffffff;
      const sc = (e.kind === 'burst' ? 3.2 : e.kind === 'dodge' ? 1.6 : 1.5) * (0.3 + 0.9 * k);
      vA.set(e.x, 0.34, e.z);
      vS.set(sc, 1, sc);
      mA.compose(vA, Q0, vS);
      fx.setMatrixAt(i, k < 1 ? mA : ZERO);
      ncol.set(col).multiplyScalar(1 - k * 0.6);
      fx.setColorAt(i, ncol);
      const up = 0.6 + k * 1.6;
      const ss = (1 - k) * (e.kind === 'burst' ? 1.8 : 0.9);
      vA.set(e.x, up, e.z);
      vS.set(ss, ss, ss);
      mA.compose(vA, Q0, vS);
      spark.setMatrixAt(i, ss > 0.02 ? mA : ZERO);
      spark.setColorAt(i, ncol);
    }
    for (const m of o.all) {
      m.instanceMatrix.needsUpdate = true;
    }
    if (fx.instanceColor) fx.instanceColor.needsUpdate = true;
    if (spark.instanceColor) spark.instanceColor.needsUpdate = true;
  });

  return (
    <>
      {o.all.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}

export { FX_KIND };
