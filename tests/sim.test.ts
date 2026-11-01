import { describe, expect, it } from 'vitest';
import { createWorld, initialAssign } from '../src/sim/GameWorld';
import { STEP, stepWorld } from '../src/sim/SimulationLoop';
import { orderMove, setFormation, setOrder } from '../src/sim/SquadController';
import { CIVILIAN, MVP_CONFIG, POLICE, RIOTER, SLICE_CONFIG, isAlive } from '../src/sim/types';

function make(cfg = MVP_CONFIG) {
  const w = createWorld(cfg);
  initialAssign(w);
  return w;
}
function run(w: ReturnType<typeof make>, seconds: number) {
  for (let i = 0; i < seconds / STEP && w.status === 'playing'; i++) stepWorld(w);
}

describe('GameWorld', () => {
  it('MVP: 3 squad x 8 canh sat, 3 nhom x 10 bao dong, 10 dan thuong', () => {
    const w = make();
    expect(w.squads).toHaveLength(3);
    expect(w.squads.every((s) => s.unitIds.length === 8)).toBe(true);
    expect(w.units.filter((u) => u.team === POLICE)).toHaveLength(24);
    expect(w.units.filter((u) => u.team === RIOTER)).toHaveLength(30);
    expect(w.units.filter((u) => u.team === CIVILIAN)).toHaveLength(10);
    expect(w.groups.every((g) => g.unitIds.length === 10)).toBe(true);
  });
  it('lat cat: 2 squad, 1 nhom', () => {
    const w = make(SLICE_CONFIG);
    expect(w.units.filter((u) => u.team === POLICE)).toHaveLength(16);
    expect(w.units.filter((u) => u.team === RIOTER)).toHaveLength(10);
  });
  it('moi don vi co du Health/Stamina/Morale/Cohesion', () => {
    for (const u of make().units) {
      for (const k of ['health', 'stamina', 'morale', 'cohesion'] as const) {
        expect(u[k]).toBeGreaterThan(0);
        expect(u[k]).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('Mo phong', () => {
  it('khong sinh NaN va don vi luon nam trong ban do sau 120s', () => {
    const w = make();
    run(w, 120);
    for (const u of w.units) {
      expect(Number.isFinite(u.x) && Number.isFinite(u.z)).toBe(true);
      if (u.active) {
        expect(u.x).toBeGreaterThanOrEqual(w.map.minX - 1);
        expect(u.x).toBeLessThanOrEqual(w.map.maxX + 1);
        expect(u.z).toBeGreaterThanOrEqual(w.map.minZ - 1);
        expect(u.z).toBeLessThanOrEqual(w.map.maxZ + 1);
      }
    }
  });
  it('xac dinh: cung seed cho cung ket qua', () => {
    const a = make();
    const b = make();
    run(a, 40);
    run(b, 40);
    expect(a.units.map((u) => u.x.toFixed(4))).toEqual(b.units.map((u) => u.x.toFixed(4)));
  });
  it('giu vi tri (Hold) trong 90s: dan thuong van an toan o muc chap nhan duoc', () => {
    const w = make();
    for (const s of w.squads) setOrder(w, s, 'HOLD');
    run(w, 90);
    expect(w.metrics.safety).toBeGreaterThan(50);
  });
  it('lenh di chuyen: squad toi dich va giu duoc doi hinh', () => {
    const w = make();
    const s = w.squads[0];
    orderMove(w, [s], -10, 8);
    expect(s.order).toBe('MOVE');
    let maxErr = 0;
    for (let i = 0; i < 20 / STEP; i++) {
      stepWorld(w);
      maxErr = Math.max(maxErr, s.slotError);
    }
    expect(Math.hypot(s.cx + 10, s.cz - 8)).toBeLessThan(2);
    expect(maxErr).toBeLessThan(3);
  });
  it('doi doi hinh: cac don vi tu di chuyen muot ve o moi, khong dich chuyen tuc thoi', () => {
    const w = make();
    const s = w.squads[0];
    const before = s.unitIds.map((id) => ({ x: w.units[id].x, z: w.units[id].z }));
    setFormation(w, s, 'COMPACT');
    stepWorld(w);
    const jump = Math.max(...s.unitIds.map((id, i) => Math.hypot(w.units[id].x - before[i].x, w.units[id].z - before[i].z)));
    expect(jump).toBeLessThan(0.5);
    run(w, 4);
    expect(s.slotError).toBeLessThan(0.3);
  });
  it('Advance doi muc tieu va Hold dung lai; Advance tu quay ve Hold khi khong con muc tieu', () => {
    const w = make(SLICE_CONFIG);
    const s = w.squads[0];
    setOrder(w, s, 'ADVANCE');
    run(w, 3);
    expect(s.order === 'ADVANCE' || s.order === 'HOLD').toBe(true);
    expect(s.cz).toBeLessThan(16.5);
    setOrder(w, s, 'HOLD');
    expect(s.path).toHaveLength(0);
  });
  it('De-escalate: canh sat khong tan cong', () => {
    const w = make();
    for (const s of w.squads) setOrder(w, s, 'DEESCALATE');
    run(w, 120);
    expect(w.metrics.stats.batons + w.metrics.stats.pushes).toBe(0);
  });
  it('co thang/thua ro rang khi het gio', () => {
    const w = make();
    w.timeLimit = 2;
    run(w, 3);
    expect(w.status).not.toBe('playing');
    expect(w.result?.reason).toBeTruthy();
  });
  it('chi so an toan dan thuong giam khi dan thuong bi thuong', () => {
    const w = make();
    const civ = w.units.find((u) => u.team === CIVILIAN)!;
    civ.health = 10;
    stepWorld(w);
    expect(w.metrics.safety).toBeLessThan(100);
    expect(isAlive(civ)).toBe(true);
  });
  it('thiet hai phu: dan thuong dung gan tran giao tranh bi thuong va an toan giam', () => {
    const w = make();
    const civ = w.units.find((u) => u.team === CIVILIAN)!;
    const r = w.units.find((u) => u.team === RIOTER)!;
    const p = w.units.find((u) => u.team === POLICE)!;
    for (const s of w.squads) setOrder(w, s, 'HOLD');
    p.x = p.px = 0; p.z = p.pz = 10;
    r.x = r.px = 0.8; r.z = r.pz = 10; r.state = 'ENGAGE'; r.target = p.id; r.agitation = 1; r.atkCd = 0;
    civ.x = civ.px = 1.6; civ.z = civ.pz = 10.5; civ.state = 'IDLE'; civ.temper = 1.3; civ.homeX = civ.x; civ.homeZ = civ.z;
    const h0 = civ.health;
    for (let i = 0; i < 30; i++) stepWorld(w);
    expect(civ.health).toBeLessThan(h0);
    expect(w.metrics.safety).toBeLessThan(100);
  });
});
