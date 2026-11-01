// Minimap goc tren phai: ve truc tiep len canvas 2D (~10 fps), khong qua React state.
import { useEffect, useRef } from 'react';
import { cam } from '../render/cameraState';
import { useGameStore } from '../state/GameState';
import { simLoop } from '../sim/SimulationLoop';
import { isAlive } from '../sim/types';
import { SQUAD_COLORS } from '../render/UnitRenderer';

const W = 220;
const H = 150;

export function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.scale(dpr, dpr);
    const map = simLoop.world.map;
    const spanX = map.maxX - map.minX + 24;
    const spanZ = map.maxZ - map.minZ + 18;
    const sc = Math.min(W / spanX, H / spanZ);
    const ox = W / 2;
    const oy = H / 2;
    const px = (x: number) => ox + x * sc;
    const pz = (z: number) => oy + z * sc;
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 100) return;
      last = now;
      const w = simLoop.world;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#2c333c';
      ctx.fillRect(0, 0, W, H);
      // duong + via he + quang truong
      ctx.fillStyle = '#434b56';
      ctx.fillRect(px(map.minX), pz(map.minZ), (map.maxX - map.minX) * sc, (map.maxZ - map.minZ) * sc);
      ctx.fillStyle = '#7d7a72';
      ctx.fillRect(px(-24), pz(-18), 48 * sc, 36 * sc);
      ctx.fillStyle = '#a89f8a';
      ctx.fillRect(px(-20), pz(-14), 40 * sc, 28 * sc);
      // cac con pho
      ctx.fillStyle = '#434b56';
      ctx.fillRect(px(-6), pz(-34), 12 * sc, 12 * sc);
      ctx.fillRect(px(-6), pz(22), 12 * sc, 12 * sc);
      ctx.fillRect(px(28), pz(-6), 12 * sc, 12 * sc);
      ctx.fillRect(px(-40), pz(-6), 12 * sc, 12 * sc);
      ctx.fillStyle = '#6b6559';
      for (const b of map.buildings) ctx.fillRect(px(b.x - b.w / 2), pz(b.z - b.d / 2), b.w * sc, b.d * sc);
      for (const o of map.obstacles) {
        if (o.kind === 'circle') {
          if (o.type === 'lamp') continue;
          ctx.fillStyle = o.type === 'tree' ? '#4f8a45' : o.type === 'statue' ? '#d8cdb0' : '#8a8f96';
          ctx.beginPath();
          ctx.arc(px(o.x), pz(o.z), Math.max(1.2, o.r * sc), 0, 7);
          ctx.fill();
        } else {
          ctx.fillStyle = o.type === 'van' ? '#2a3f78' : '#9aa4ad';
          ctx.fillRect(px(o.x - o.hw), pz(o.z - o.hd), o.hw * 2 * sc, o.hd * 2 * sc);
        }
      }
      const sel = new Set(useGameStore.getState().selection);
      for (const u of w.units) {
        if (!isAlive(u)) {
          if (u.active) {
            ctx.fillStyle = '#555';
            ctx.fillRect(px(u.x) - 1, pz(u.z) - 1, 2, 2);
          }
          continue;
        }
        ctx.fillStyle = u.team === 0 ? '#4aa3ff' : u.team === 1 ? '#ff4d3d' : '#e8e8e8';
        const r = u.team === 0 ? 2.1 : 1.8;
        ctx.beginPath();
        ctx.arc(px(u.x), pz(u.z), r, 0, 7);
        ctx.fill();
        if (u.team === 0 && sel.has(u.group)) {
          ctx.strokeStyle = '#' + SQUAD_COLORS[u.group].toString(16).padStart(6, '0');
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px(u.x), pz(u.z), 3.4, 0, 7);
          ctx.stroke();
        }
      }
      // khung nhin camera
      const vw = window.innerWidth / cam.zoom;
      const vh = window.innerHeight / cam.zoom / Math.sin(cam.elevation);
      ctx.save();
      ctx.translate(px(cam.x), pz(cam.z));
      ctx.rotate(-cam.yaw);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect((-vw / 2) * sc, (-vh / 2) * sc, vw * sc, vh * sc);
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    const click = (e: MouseEvent) => {
      const r = c.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * W;
      const my = ((e.clientY - r.top) / r.height) * H;
      cam.tx = Math.max(-36, Math.min(36, (mx - ox) / sc));
      cam.tz = Math.max(-28, Math.min(28, (my - oy) / sc));
    };
    c.addEventListener('pointerdown', click);
    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener('pointerdown', click);
    };
  }, []);
  return <canvas id="minimap" ref={ref} style={{ width: W, height: H }} />;
}
