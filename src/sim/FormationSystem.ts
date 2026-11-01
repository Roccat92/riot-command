// Doi hinh: tinh o (slot) cuc bo, doi sang toa do the gioi va gan nguoi vao o.
import type { FormationType, Unit, Vec2 } from './types';

export interface Slot {
  x: number; // ngang (phai duong)
  y: number; // doc (phia truoc duong)
}

export const FORMATION_LABEL: Record<FormationType, string> = {
  LINE: 'LINE',
  DOUBLE_LINE: 'DOUBLE LINE',
  COMPACT: 'COMPACT',
};

/** O cuc bo cua doi hinh, can giua quanh (0,0). y duong = hang dau. */
export function formationSlots(type: FormationType, count: number): Slot[] {
  const slots: Slot[] = [];
  if (count <= 0) return slots;
  if (type === 'LINE') {
    const sp = 1.3;
    for (let i = 0; i < count; i++) slots.push({ x: (i - (count - 1) / 2) * sp, y: 0 });
  } else if (type === 'DOUBLE_LINE') {
    const sp = 1.3;
    const front = Math.ceil(count / 2);
    const back = count - front;
    for (let i = 0; i < front; i++) slots.push({ x: (i - (front - 1) / 2) * sp, y: 0.8 });
    for (let i = 0; i < back; i++) slots.push({ x: (i - (back - 1) / 2) * sp, y: -0.8 });
  } else {
    // COMPACT: luoi chat, toi da 3 cot
    const cols = count <= 2 ? count : 3;
    const rows = Math.ceil(count / cols);
    let placed = 0;
    for (let r = 0; r < rows; r++) {
      const n = Math.min(cols, count - placed);
      for (let i = 0; i < n; i++) {
        slots.push({ x: (i - (n - 1) / 2) * 1.0, y: ((rows - 1) / 2 - r) * 1.0 });
        placed++;
      }
    }
  }
  return slots;
}

/** Doi o cuc bo sang toa do the gioi quanh diem neo (cx,cz) voi huong `heading`. */
export function slotToWorld(cx: number, cz: number, heading: number, s: Slot, out: Vec2): Vec2 {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const rx = Math.cos(heading);
  const rz = -Math.sin(heading);
  out.x = cx + rx * s.x + fx * s.y;
  out.z = cz + rz * s.x + fz * s.y;
  return out;
}

/**
 * Gan don vi vao o bang thuat toan tham lam theo khoang cach ngan nhat toan cuc.
 * Tra ve mang chi so o cho tung don vi (cung thu tu voi `units`).
 */
export function assignSlots(units: Unit[], worldSlots: Vec2[]): number[] {
  const pairs: { u: number; s: number; d: number }[] = [];
  for (let u = 0; u < units.length; u++) {
    for (let s = 0; s < worldSlots.length; s++) {
      const dx = units[u].x - worldSlots[s].x;
      const dz = units[u].z - worldSlots[s].z;
      pairs.push({ u, s, d: dx * dx + dz * dz });
    }
  }
  pairs.sort((a, b) => a.d - b.d);
  const result = new Array<number>(units.length).fill(-1);
  const usedS = new Set<number>();
  let n = 0;
  for (const p of pairs) {
    if (result[p.u] !== -1 || usedS.has(p.s)) continue;
    result[p.u] = p.s;
    usedS.add(p.s);
    if (++n === units.length) break;
  }
  return result;
}
