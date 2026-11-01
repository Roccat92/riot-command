// Dieu khien chuot: click trai chon squad, keo de chon nhieu squad, click phai ra lenh di chuyen.
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { useGameStore } from '../state/GameState';
import { simLoop } from '../sim/SimulationLoop';
import { pickSquadNear } from '../sim/SquadController';
import { isAlive } from '../sim/types';
import { aim } from './aim';

export function InputLayer() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const el = gl.domElement;
    const ray = new Raycaster();
    const plane = new Plane(new Vector3(0, 1, 0), 0);
    const ndc = new Vector2();
    const hit = new Vector3();
    const proj = new Vector3();
    let start: { x: number; y: number } | null = null;
    let dragging = false;
    const box = document.getElementById('select-box');

    const ground = (cx: number, cy: number): Vector3 | null => {
      const r = el.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(plane, hit);
    };
    const setBox = (x0: number, y0: number, x1: number, y1: number, show: boolean) => {
      if (!box) return;
      box.style.display = show ? 'block' : 'none';
      box.style.left = Math.min(x0, x1) + 'px';
      box.style.top = Math.min(y0, y1) + 'px';
      box.style.width = Math.abs(x1 - x0) + 'px';
      box.style.height = Math.abs(y1 - y0) + 'px';
    };
    let spraying = false;
    const hover = (e: PointerEvent) => {
      const p = ground(e.clientX, e.clientY);
      if (p) {
        aim.x = p.x;
        aim.z = p.z;
        aim.valid = true;
      }
    };
    const down = (e: PointerEvent) => {
      const st0 = useGameStore.getState();
      if (st0.phase !== 'playing') return;
      if (e.button === 0) {
        const p = ground(e.clientX, e.clientY);
        if (p) {
          aim.x = p.x;
          aim.z = p.z;
        }
        const w0 = simLoop.world;
        // che do nham trang bi: click de nem / phat
        if (st0.targeting && p) {
          st0.fireTool(st0.targeting, p.x, p.z);
          return;
        }
        // click vao xe voi rong -> chon xe
        if (p && w0.truck.active && !st0.truckSel && Math.hypot(p.x - w0.truck.x, p.z - w0.truck.z) < 3.2) {
          st0.selectTruck(true);
          return;
        }
        // che do xe: giu chuot trai de phun (tru khi click vao squad de chuyen sang squad)
        if (st0.truckSel && p && !pickSquadNear(w0, p.x, p.z, 2.4)) {
          st0.truckSpray(true);
          spraying = true;
          return;
        }
        start = { x: e.clientX, y: e.clientY };
        dragging = false;
      } else if (e.button === 2) {
        const p = ground(e.clientX, e.clientY);
        const st1 = useGameStore.getState();
        if (st1.targeting) {
          st1.setTargeting(null);
          return;
        }
        if (p && st1.truckSel) {
          st1.truckDrive(p.x, p.z);
          window.dispatchEvent(new CustomEvent('rc-move', { detail: { x: p.x, z: p.z } }));
          return;
        }
        if (p) {
          const st = useGameStore.getState();
          if (st.selection.length) {
            st.moveTo(p.x, p.z);
            window.dispatchEvent(new CustomEvent('rc-move', { detail: { x: p.x, z: p.z } }));
          }
        }
      }
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) dragging = true;
      if (dragging) setBox(start.x, start.y, e.clientX, e.clientY, true);
    };
    const up = (e: PointerEvent) => {
      if (e.button === 0 && spraying) {
        spraying = false;
        useGameStore.getState().truckSpray(false);
        return;
      }
      if (e.button !== 0 || !start) return;
      const st = useGameStore.getState();
      const w = simLoop.world;
      if (dragging) {
        const r = el.getBoundingClientRect();
        const x0 = Math.min(start.x, e.clientX);
        const x1 = Math.max(start.x, e.clientX);
        const y0 = Math.min(start.y, e.clientY);
        const y1 = Math.max(start.y, e.clientY);
        const ids = new Set<number>();
        for (const u of w.units) {
          if (u.team !== 0 || !isAlive(u)) continue;
          proj.set(u.x, 0.9, u.z).project(camera);
          const sx = ((proj.x + 1) / 2) * r.width + r.left;
          const sy = ((1 - proj.y) / 2) * r.height + r.top;
          if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) ids.add(u.group);
        }
        st.select([...ids], e.shiftKey);
      } else {
        const p = ground(e.clientX, e.clientY);
        const s = p ? pickSquadNear(w, p.x, p.z, 2.4) : null;
        if (s) st.select([s.id], e.shiftKey);
        else if (!e.shiftKey) st.select([]);
      }
      start = null;
      dragging = false;
      setBox(0, 0, 0, 0, false);
    };
    const ctx = (e: Event) => e.preventDefault();
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', hover);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('contextmenu', ctx);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', hover);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('contextmenu', ctx);
    };
  }, [gl, camera]);
  return null;
}
