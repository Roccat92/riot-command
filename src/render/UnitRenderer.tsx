// UnitRenderer: ve toan bo nhan vat bang InstancedMesh (hinh hop/cau/tru dung chung, mau theo instance).
// Doc truc tiep du lieu mo phong moi khung hinh, KHONG dung React state.
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OctahedronGeometry,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { useGameStore } from '../state/GameState';
import { CIV_JACKETS, JACKETS, PANTS, SKINS } from '../sim/GameWorld';
import { simLoop } from '../sim/SimulationLoop';
import { CIVILIAN, POLICE, RIOTER, angleDiff, type AIState, type Unit } from '../sim/types';

export const SQUAD_COLORS = [0x4aa3ff, 0x5ce0a0, 0xffc857];
const S = 1.28; // ti le hien thi nhan vat

const MARKER_COLOR: Partial<Record<AIState, number>> = {
  GATHER: 0xcfd8dc,
  AGITATED: 0xffd24a,
  APPROACH: 0xff8a2a,
  ENGAGE: 0xff3b30,
  RETREAT: 0x4fc3f7,
  PANIC: 0xff6ad5,
};

// ---------- hinh hoc dung chung ----------
const geo = {
  torso: new BoxGeometry(0.46, 0.62, 0.28),
  head: new SphereGeometry(0.17, 8, 6),
  helmet: new SphereGeometry(0.215, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62),
  visor: new BoxGeometry(0.27, 0.08, 0.12),
  hood: new SphereGeometry(0.215, 7, 5),
  arm: new BoxGeometry(0.12, 0.56, 0.12).translate(0, -0.28, 0),
  leg: new BoxGeometry(0.17, 0.64, 0.18).translate(0, -0.32, 0),
  shield: new BoxGeometry(0.62, 0.98, 0.06),
  shieldStripe: new BoxGeometry(0.64, 0.12, 0.07),
  baton: new CylinderGeometry(0.03, 0.03, 0.62, 5).translate(0, 0.2, 0),
  vest: new BoxGeometry(0.5, 0.3, 0.32),
  marker: new OctahedronGeometry(0.15, 0),
  ring: new RingGeometry(0.58, 0.78, 20).rotateX(-Math.PI / 2),
};

interface PartDef {
  g: BufferGeometry;
  owners: Unit[];
  color: (u: Unit, i: number) => number;
  basic?: boolean;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
export function jacketColor(u: Unit): number {
  if (u.team === POLICE) return 0x1f2f66;
  return u.team === RIOTER ? pick(JACKETS, u.jacket) : pick(CIV_JACKETS, u.jacket);
}
export function pantsColor(u: Unit): number {
  return u.team === POLICE ? 0x141c36 : pick(PANTS, u.pants);
}

// ---------- ma tran tam ----------
const rootM = new Matrix4();
const m = new Matrix4();
const armM = new Matrix4();
const handM = new Matrix4();
const qA = new Quaternion();
const qB = new Quaternion();
const eA = new Euler();
const vA = new Vector3();
const vS = new Vector3(1, 1, 1);
const ONE = new Vector3(1, 1, 1);
const ZERO_M = new Matrix4().makeScale(0, 0, 0);

function put(mesh: InstancedMesh, i: number, px: number, py: number, pz: number, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1): void {
  eA.set(rx, 0, rz);
  qA.setFromEuler(eA);
  vA.set(px, py, pz);
  vS.set(sx, sy, sz);
  m.compose(vA, qA, vS);
  m.premultiply(rootM);
  mesh.setMatrixAt(i, m);
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function UnitRenderer() {
  const gen = useGameStore((s) => s.generation);
  const groupRef = useRef<import('three').Group>(null);

  const built = useMemo(() => {
    const units = simLoop.world.units;
    const police = units.filter((u) => u.team === POLICE);
    const rioters = units.filter((u) => u.team === RIOTER);
    const hooded = rioters.filter((u) => u.hood);
    const npcs = units.filter((u) => u.team !== POLICE);
    const defs: Record<string, PartDef> = {
      torso: { g: geo.torso, owners: units, color: jacketColor },
      head: { g: geo.head, owners: units, color: (u) => pick(SKINS, u.skin) },
      armL: { g: geo.arm, owners: units, color: jacketColor },
      armR: { g: geo.arm, owners: units, color: jacketColor },
      legL: { g: geo.leg, owners: units, color: pantsColor },
      legR: { g: geo.leg, owners: units, color: pantsColor },
      helmet: { g: geo.helmet, owners: police, color: () => 0x0e1634 },
      visor: { g: geo.visor, owners: police, color: () => 0x05070f },
      vest: { g: geo.vest, owners: police, color: () => 0x2b3d7d },
      shield: { g: geo.shield, owners: police, color: () => 0x34477f },
      stripe: { g: geo.shieldStripe, owners: police, color: () => 0xe8edf5 },
      baton: { g: geo.baton, owners: police, color: () => 0x15181f },
      hood: { g: geo.hood, owners: hooded, color: jacketColor },
      marker: { g: geo.marker, owners: npcs, color: () => 0xffffff, basic: true },
      ring: { g: geo.ring, owners: police, color: (u) => SQUAD_COLORS[u.group % 3], basic: true },
    };
    const lambert = new MeshLambertMaterial({ flatShading: true });
    const basic = new MeshBasicMaterial({ transparent: true, opacity: 0.95 });
    const meshes: Record<string, InstancedMesh> = {};
    const idx: Record<string, Map<number, number>> = {};
    for (const [k, d] of Object.entries(defs)) {
      const mesh = new InstancedMesh(d.g, d.basic ? basic : lambert, Math.max(1, d.owners.length));
      mesh.frustumCulled = false;
      mesh.castShadow = !d.basic;
      mesh.receiveShadow = false;
      const map = new Map<number, number>();
      const c = new Color();
      d.owners.forEach((u, i) => {
        map.set(u.id, i);
        c.set(d.color(u, i));
        mesh.setColorAt(i, c);
        mesh.setMatrixAt(i, ZERO_M);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      meshes[k] = mesh;
      idx[k] = map;
    }
    return { meshes, idx, defs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen]);

  useEffect(() => {
    return () => {
      for (const mesh of Object.values(built.meshes)) mesh.dispose();
    };
  }, [built]);

  const markerColor = useMemo(() => new Color(), []);
  const lastMarker = useRef<Map<number, AIState>>(new Map());

  useFrame((state) => {
    const w = simLoop.world;
    const a = simLoop.alpha;
    const sel = new Set(useGameStore.getState().selection);
    const t = state.clock.elapsedTime;
    const { meshes, idx } = built;
    for (const u of w.units) {
      const down = u.state === 'DOWN';
      const visible = u.active;
      const ix = idx.torso.get(u.id)!;
      if (!visible) {
        for (const k of ['torso', 'head', 'armL', 'armR', 'legL', 'legR']) meshes[k].setMatrixAt(ix, ZERO_M);
        for (const k of ['helmet', 'visor', 'vest', 'shield', 'stripe', 'baton', 'hood', 'marker', 'ring']) {
          const j = idx[k].get(u.id);
          if (j !== undefined) meshes[k].setMatrixAt(j, ZERO_M);
        }
        continue;
      }
      const x = u.px + (u.x - u.px) * a;
      const z = u.pz + (u.z - u.pz) * a;
      const h = u.pheading + angleDiff(u.pheading, u.heading) * a;
      const walk = Math.min(1, u.speed / 2.2);
      const sw = Math.sin(u.phase) * 0.8 * walk;
      let tilt = 0;
      let y = Math.abs(Math.sin(u.phase)) * 0.05 * walk;
      let armLa = -sw * 0.85;
      let armRa = sw * 0.85;
      let shieldPush = 0;
      let batonA = -0.4;
      const at = u.animDur > 0 ? 1 - u.animT / u.animDur : 1;
      const animating = u.animT > 0;
      if (down) {
        const e = easeOut(u.downT);
        tilt = -Math.PI / 2 * e;
        y = 0.17 * e;
        armLa = 0.4 * e;
        armRa = -0.3 * e;
      } else {
        if (u.team === POLICE) {
          armLa = -1.25;
          armRa = -0.25 + sw * 0.4;
          batonA = -0.5;
          if (animating && u.anim === 'PUSH') {
            shieldPush = 0.38 * Math.sin(Math.PI * at);
            tilt += 0.22 * Math.sin(Math.PI * at);
            armLa = -1.45;
          } else if (animating && u.anim === 'BATON') {
            const raise = at < 0.3 ? at / 0.3 : 1;
            armRa = at < 0.3 ? -0.25 + (-2.5 + 0.25) * raise : -2.5 + 2.3 * Math.min(1, (at - 0.3) / 0.35);
            tilt += 0.18 * Math.sin(Math.PI * at);
          }
        } else if (u.team === RIOTER) {
          if (u.state === 'AGITATED') {
            armRa = -2.5 + 0.55 * Math.sin(t * 7 + u.offA * 5);
            armLa = walk > 0.3 ? armLa : -0.4;
          } else if (u.state === 'APPROACH') {
            armLa = -sw * 1.2;
            armRa = sw * 1.2;
          } else if (u.state === 'PANIC') {
            armLa = -2.6 + 0.4 * Math.sin(t * 12 + u.offA);
            armRa = -2.6 + 0.4 * Math.sin(t * 12 + u.offA + 1.5);
          }
          if (animating && u.anim === 'PUNCH') armRa = -0.4 - 1.7 * Math.sin(Math.PI * at);
          if (animating && u.anim === 'THROW') {
            // vung tay qua dau roi nem ve phia truoc
            armRa = at < 0.45 ? -0.4 - 2.6 * (at / 0.45) : -3.0 + 3.4 * Math.min(1, (at - 0.45) / 0.3);
            tilt += 0.28 * Math.sin(Math.PI * Math.min(1, at * 1.3));
          }
        } else if (u.state === 'PANIC') {
          armLa = -2.7 + 0.3 * Math.sin(t * 10 + u.offA);
          armRa = -2.7 + 0.3 * Math.sin(t * 10 + u.offA + 1);
        }
        if (animating && u.anim === 'HIT') tilt -= 0.38 * Math.sin(Math.PI * at);
        if (animating && u.anim === 'DODGE') {
          // lao nguoi sang ben nem tranh
          tilt += 0.45 * Math.sin(Math.PI * at);
          y += 0.28 * Math.sin(Math.PI * at);
        }
      }
      // ma tran goc
      eA.set(tilt, h, 0, 'YXZ');
      qA.setFromEuler(eA);
      vA.set(x, y * S, z);
      vS.set(S, S, S);
      rootM.compose(vA, qA, vS);
      const bodyY = 0.95;
      put(meshes.torso, ix, 0, bodyY, 0);
      put(meshes.head, ix, 0, 1.43, 0.0);
      put(meshes.legL, ix, -0.12, 0.64, 0, sw);
      put(meshes.legR, ix, 0.12, 0.64, 0, -sw);
      put(meshes.armL, ix, -0.3, 1.22, 0, armLa);
      // tay phai: giu ma tran de gan dui cui
      eA.set(armRa, 0, 0);
      qA.setFromEuler(eA);
      vA.set(0.3, 1.22, 0);
      armM.compose(vA, qA, ONE);
      m.copy(armM).premultiply(rootM);
      meshes.armR.setMatrixAt(ix, m);

      if (u.team === POLICE) {
        const j = idx.helmet.get(u.id)!;
        put(meshes.helmet, j, 0, 1.46, 0);
        put(meshes.visor, j, 0, 1.43, 0.14);
        put(meshes.vest, j, 0, 1.04, 0);
        put(meshes.shield, j, -0.14, 0.92, 0.36 + shieldPush);
        put(meshes.stripe, j, -0.14, 1.1, 0.375 + shieldPush);
        // dui cui gan vao ban tay phai
        eA.set(batonA - 0.5, 0, 0);
        qB.setFromEuler(eA);
        vA.set(0, -0.54, 0.04);
        handM.compose(vA, qB, ONE);
        m.copy(armM).multiply(handM).premultiply(rootM);
        meshes.baton.setMatrixAt(j, m);
        // vong chon
        const r = idx.ring.get(u.id)!;
        if (sel.has(u.group) && !down) {
          eA.set(0, 0, 0);
          qA.identity();
          vA.set(x, 0.22, z);
          vS.set(1, 1, 1);
          m.compose(vA, qA, vS);
          meshes.ring.setMatrixAt(r, m);
        } else meshes.ring.setMatrixAt(r, ZERO_M);
      } else {
        if (u.team === RIOTER && u.hood) {
          const j = idx.hood.get(u.id)!;
          put(meshes.hood, j, 0, 1.46, -0.045);
        }
        // bieu tuong trang thai tren dau
        const j = idx.marker.get(u.id)!;
        const mc = MARKER_COLOR[u.state];
        if (mc !== undefined && !down) {
          if (lastMarker.current.get(u.id) !== u.state) {
            markerColor.set(mc);
            meshes.marker.setColorAt(j, markerColor);
            if (meshes.marker.instanceColor) meshes.marker.instanceColor.needsUpdate = true;
            lastMarker.current.set(u.id, u.state);
          }
          eA.set(0, t * 2 + u.id, 0);
          qA.setFromEuler(eA);
          vA.set(x, (2.35 + Math.sin(t * 3 + u.id) * 0.06) * S * 0.92, z);
          const sc = u.state === 'ENGAGE' ? 1.25 : 1;
          vS.set(sc * S * 0.8, sc * S * 0.8, sc * S * 0.8);
          m.compose(vA, qA, vS);
          meshes.marker.setMatrixAt(j, m);
        } else meshes.marker.setMatrixAt(j, ZERO_M);
      }
    }
    for (const mesh of Object.values(meshes)) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {Object.entries(built.meshes).map(([k, mesh]) => (
        <primitive key={k + gen} object={mesh} />
      ))}
    </group>
  );
}
