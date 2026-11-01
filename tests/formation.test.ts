import { describe, expect, it } from 'vitest';
import { assignSlots, formationSlots, slotToWorld } from '../src/sim/FormationSystem';
import type { FormationType, Unit } from '../src/sim/types';

const TYPES: FormationType[] = ['LINE', 'DOUBLE_LINE', 'COMPACT'];

describe('FormationSystem.formationSlots', () => {
  for (const type of TYPES) {
    it(`${type}: so o bang so nguoi va khong chong nhau (n = 1..8)`, () => {
      for (let n = 1; n <= 8; n++) {
        const slots = formationSlots(type, n);
        expect(slots).toHaveLength(n);
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const d = Math.hypot(slots[i].x - slots[j].x, slots[i].y - slots[j].y);
            expect(d).toBeGreaterThanOrEqual(0.95);
          }
        }
      }
    });
    it(`${type}: can giua quanh (0,0)`, () => {
      const slots = formationSlots(type, 8);
      const cx = slots.reduce((a, s) => a + s.x, 0) / 8;
      const cy = slots.reduce((a, s) => a + s.y, 0) / 8;
      expect(Math.abs(cx)).toBeLessThan(0.2);
      expect(Math.abs(cy)).toBeLessThan(0.5);
    });
  }
  it('LINE la mot hang ngang, DOUBLE_LINE co 2 hang, COMPACT hep hon LINE', () => {
    const line = formationSlots('LINE', 8);
    expect(new Set(line.map((s) => s.y)).size).toBe(1);
    const dbl = formationSlots('DOUBLE_LINE', 8);
    expect(new Set(dbl.map((s) => s.y)).size).toBe(2);
    const width = (a: { x: number }[]) => Math.max(...a.map((s) => s.x)) - Math.min(...a.map((s) => s.x));
    expect(width(formationSlots('COMPACT', 8))).toBeLessThan(width(dbl));
    expect(width(dbl)).toBeLessThan(width(line));
  });
});

describe('FormationSystem.slotToWorld', () => {
  it('heading = 0: truoc mat la +Z, phai la +X', () => {
    const p = slotToWorld(10, 5, 0, { x: 1, y: 2 }, { x: 0, z: 0 });
    expect(p.x).toBeCloseTo(11);
    expect(p.z).toBeCloseTo(7);
  });
  it('heading = PI: xoay 180 do quanh diem neo', () => {
    const p = slotToWorld(0, 0, Math.PI, { x: 1, y: 2 }, { x: 0, z: 0 });
    expect(p.x).toBeCloseTo(-1);
    expect(p.z).toBeCloseTo(-2);
  });
  it('xoay giu nguyen khoang cach toi diem neo', () => {
    for (const h of [0.3, 1.2, 2.7, -1.5]) {
      const p = slotToWorld(3, -4, h, { x: 1.3, y: 0.8 }, { x: 0, z: 0 });
      expect(Math.hypot(p.x - 3, p.z + 4)).toBeCloseTo(Math.hypot(1.3, 0.8));
    }
  });
});

describe('FormationSystem.assignSlots', () => {
  it('moi o chi gan cho mot don vi, uu tien o gan nhat', () => {
    const units = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 5, z: 0 }] as Unit[];
    const slots = [{ x: 10, z: 0.5 }, { x: 0, z: 0.5 }, { x: 5, z: 0.5 }];
    expect(assignSlots(units, slots)).toEqual([1, 0, 2]);
  });
  it('khi thieu o van gan duoc cho cac don vi con lai (it o hon don vi)', () => {
    const units = [{ x: 0, z: 0 }, { x: 10, z: 0 }] as Unit[];
    const r = assignSlots(units, [{ x: 0, z: 0 }]);
    expect(r.filter((v) => v >= 0)).toHaveLength(1);
  });
});
