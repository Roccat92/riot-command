// CameraController: camera truc giao (orthographic) nghieng ~45 do. WASD pan, cuon de zoom, Q/E xoay.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { OrthographicCamera } from 'three';
import { cam, camRef, ZOOM_MAX, ZOOM_MIN } from './cameraState';

const DIST = 120;

export function CameraController() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      cam.keys.add(e.code);
    };
    const up = (e: KeyboardEvent) => cam.keys.delete(e.code);
    const blur = () => cam.keys.clear();
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.tzoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.tzoom * Math.exp(-e.deltaY * 0.0013)));
    };
    let mid = false;
    let lx = 0;
    let ly = 0;
    const pd = (e: PointerEvent) => {
      if (e.button === 1) {
        mid = true;
        lx = e.clientX;
        ly = e.clientY;
        e.preventDefault();
      }
    };
    const pm = (e: PointerEvent) => {
      if (!mid) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      const s = 1 / cam.zoom;
      const rx = Math.cos(cam.yaw);
      const rz = -Math.sin(cam.yaw);
      const ux = -Math.sin(cam.yaw);
      const uz = -Math.cos(cam.yaw);
      cam.tx -= (rx * dx - ux * dy / Math.sin(cam.elevation)) * s;
      cam.tz -= (rz * dx - uz * dy / Math.sin(cam.elevation)) * s;
    };
    const pu = (e: PointerEvent) => {
      if (e.button === 1) mid = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    gl.domElement.addEventListener('wheel', wheel, { passive: false });
    gl.domElement.addEventListener('pointerdown', pd);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      gl.domElement.removeEventListener('wheel', wheel);
      gl.domElement.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
    };
  }, [gl]);

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.1);
    const k = cam.keys;
    const sp = (34 * 24) / cam.zoom;
    let fx = 0;
    let fz = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) fz += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) fz -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) fx += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) fx -= 1;
    if (fx || fz) {
      const l = Math.hypot(fx, fz);
      fx /= l;
      fz /= l;
      const ux = -Math.sin(cam.tyaw);
      const uz = -Math.cos(cam.tyaw);
      const rx = Math.cos(cam.tyaw);
      const rz = -Math.sin(cam.tyaw);
      cam.tx += (ux * fz + rx * fx) * sp * dt;
      cam.tz += (uz * fz + rz * fx) * sp * dt;
    }
    if (k.has('KeyQ')) cam.tyaw -= 1.6 * dt;
    if (k.has('KeyE')) cam.tyaw += 1.6 * dt;
    cam.tx = Math.max(-36, Math.min(36, cam.tx));
    cam.tz = Math.max(-28, Math.min(28, cam.tz));
    const a = 1 - Math.exp(-12 * dt);
    cam.x += (cam.tx - cam.x) * a;
    cam.z += (cam.tz - cam.z) * a;
    cam.yaw += (cam.tyaw - cam.yaw) * a;
    cam.zoom += (cam.tzoom - cam.zoom) * a;
    const c = state.camera as OrthographicCamera;
    camRef.current = c;
    const ce = Math.cos(cam.elevation);
    c.position.set(cam.x + Math.sin(cam.yaw) * ce * DIST, Math.sin(cam.elevation) * DIST, cam.z + Math.cos(cam.yaw) * ce * DIST);
    c.zoom = cam.zoom;
    c.lookAt(cam.x, 0, cam.z);
    c.updateProjectionMatrix();
  });
  return null;
}
