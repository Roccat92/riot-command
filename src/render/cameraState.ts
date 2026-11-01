// Trang thai camera dung chung (doi tuong co the thay doi, khong qua React).
export const cam = {
  x: 0,
  z: 8,
  yaw: 0,
  zoom: 23,
  tx: 0,
  tz: 8,
  tyaw: 0,
  tzoom: 23,
  elevation: (45 * Math.PI) / 180,
  keys: new Set<string>(),
};
export const ZOOM_MIN = 11;
export const ZOOM_MAX = 64;

import type { Camera } from 'three';
export const camRef: { current: Camera | null } = { current: null };
