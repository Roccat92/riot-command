// Trang thai camera dung chung (doi tuong co the thay doi, khong qua React).
export const cam = {
  x: 0,
  z: 11,
  yaw: 0,
  zoom: 22,
  tx: 0,
  tz: 11,
  tyaw: 0,
  tzoom: 22,
  elevation: (45 * Math.PI) / 180,
  keys: new Set<string>(),
};
export const ZOOM_MIN = 11;
export const ZOOM_MAX = 64;

import type { Camera } from 'three';
export const camRef: { current: Camera | null } = { current: null };
