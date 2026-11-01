// Overlays: duong di (cham tron), dau diem den, nhan squad. Doc truc tiep tu mo phong moi khung hinh.
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import {
  CircleGeometry,
  Color,
  ConeGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from 'three';
import { useGameStore } from '../state/GameState';
import { simLoop } from '../sim/SimulationLoop';
import { SQUAD_COLORS } from './UnitRenderer';

const MAX_DOTS = 3 * 64;
const ZERO = new Matrix4().makeScale(0, 0, 0);

export function PathOverlay() {
  const { dots, rings, arrows } = useMemo(() => {
    const mat = new MeshBasicMaterial({ transparent: true, opacity: 0.9, depthTest: false });
    const dots = new InstancedMesh(new CircleGeometry(0.17, 8).rotateX(-Math.PI / 2), mat, MAX_DOTS);
    const rings = new InstancedMesh(new RingGeometry(0.9, 1.15, 28).rotateX(-Math.PI / 2), mat, 3);
    const arrows = new InstancedMesh(new ConeGeometry(0.45, 0.9, 3).rotateX(Math.PI / 2).rotateY(Math.PI), mat, 3);
    for (const mm of [dots, rings, arrows]) {
      mm.frustumCulled = false;
      mm.renderOrder = 10;
      for (let i = 0; i < mm.count; i++) mm.setMatrixAt(i, ZERO);
    }
    const c = new Color();
    for (let i = 0; i < 3; i++) {
      c.set(SQUAD_COLORS[i]);
      rings.setColorAt(i, c);
      arrows.setColorAt(i, c);
    }
    for (let i = 0; i < MAX_DOTS; i++) {
      c.set(SQUAD_COLORS[Math.floor(i / 64)]);
      dots.setColorAt(i, c);
    }
    return { dots, rings, arrows };
  }, []);
  const m = useMemo(() => new Matrix4(), []);
  const q = useMemo(() => new Quaternion(), []);
  const v = useMemo(() => new Vector3(), []);
  const s = useMemo(() => new Vector3(), []);

  useFrame((state) => {
    const w = simLoop.world;
    const sel = new Set(useGameStore.getState().selection);
    const t = state.clock.elapsedTime;
    for (let si = 0; si < 3; si++) {
      const sq = w.squads[si];
      let n = 0;
      let showDest = false;
      if (sq && sel.has(sq.id) && sq.dest && sq.pathIdx < sq.path.length && sq.order !== 'HOLD') {
        showDest = true;
        let px = sq.cx;
        let pz = sq.cz;
        let carry = 0;
        for (let k = sq.pathIdx; k < sq.path.length && n < 64; k++) {
          const wp = sq.path[k];
          const dx = wp.x - px;
          const dz = wp.z - pz;
          const len = Math.hypot(dx, dz);
          let d = 1.0 - carry;
          while (d <= len && n < 64) {
            v.set(px + (dx / len) * d, 0.1, pz + (dz / len) * d);
            q.identity();
            s.set(1, 1, 1);
            m.compose(v, q, s);
            dots.setMatrixAt(si * 64 + n, m);
            n++;
            d += 1.0;
          }
          carry = len - (d - 1.0);
          px = wp.x;
          pz = wp.z;
        }
      }
      for (let k = n; k < 64; k++) dots.setMatrixAt(si * 64 + k, ZERO);
      if (showDest && sq.dest) {
        const pulse = 1 + 0.12 * Math.sin(t * 5);
        v.set(sq.dest.x, 0.12, sq.dest.z);
        q.identity();
        s.set(pulse, 1, pulse);
        m.compose(v, q, s);
        rings.setMatrixAt(si, m);
        const last = sq.path[sq.path.length - 1];
        const prev = sq.path.length > 1 ? sq.path[sq.path.length - 2] : { x: sq.cx, z: sq.cz };
        const ang = Math.atan2(last.x - prev.x, last.z - prev.z);
        q.setFromAxisAngle(new Vector3(0, 1, 0), ang);
        v.set(sq.dest.x, 0.2, sq.dest.z);
        s.set(1, 1, 1);
        m.compose(v, q, s);
        arrows.setMatrixAt(si, m);
      } else {
        rings.setMatrixAt(si, ZERO);
        arrows.setMatrixAt(si, ZERO);
      }
    }
    dots.instanceMatrix.needsUpdate = true;
    rings.instanceMatrix.needsUpdate = true;
    arrows.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <primitive object={dots} />
      <primitive object={rings} />
      <primitive object={arrows} />
    </>
  );
}

export function Overlays() {
  return <PathOverlay />;
}
