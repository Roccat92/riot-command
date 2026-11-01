import { describe, expect, it } from 'vitest';
import { createWorld, initialAssign } from '../src/sim/GameWorld';
import { KIND_MOLOTOV, KIND_STONE, spawnFire, spawnProjectile } from '../src/sim/ProjectileSystem';
import { STEP, stepWorld } from '../src/sim/SimulationLoop';
import {
  HYDRANT,
  JET_RANGE,
  aimTruck,
  orderTruckMove,
  setTruckFiring,
  toolsReady,
  updateTools,
  useFlash,
  useGas,
  useLrad,
} from '../src/sim/ToolsSystem';
import { MVP_CONFIG, POLICE, RIOTER, type Unit, type World } from '../src/sim/types';
import { TUNE } from '../src/sim/tuning';

function make(seed = 3): World {
  const w = createWorld({ ...MVP_CONFIG, seed });
  initialAssign(w);
  // don sach san: dua moi nguoi bieu tinh ra xa de cac test tu bo tri
  for (const u of w.units) if (u.team === RIOTER) {
    u.x = u.px = -40 + (u.id % 10);
    u.z = u.pz = -40 + Math.floor(u.id / 10);
    u.state = 'IDLE';
  }
  w.truck.x = w.truck.px = 0;
  w.truck.z = w.truck.pz = 10;
  w.truck.heading = Math.PI;
  return w;
}
const rioter = (w: World, i = 0): Unit => w.units.filter((u) => u.team === RIOTER)[i];
function place(u: Unit, x: number, z: number): void {
  u.x = u.px = x;
  u.z = u.pz = z;
  u.vx = u.vz = u.kx = u.kz = 0;
}
const run = (w: World, sec: number, f?: () => void) => {
  for (let i = 0; i < sec / STEP; i++) {
    f?.();
    updateTools(w, STEP);
  }
};

describe('Xe voi rong', () => {
  it('mac dinh co xe voi bon day nuoc, hoat dong o map MVP', () => {
    const w = createWorld(MVP_CONFIG);
    expect(w.truck.active).toBe(true);
    expect(w.truck.water).toBe(w.truck.maxWater);
    expect(w.truck.hp).toBe(TUNE.truckHp);
  });
  it('tia nuoc day lui nguoi bieu tinh theo huong tia va lam ho nga', () => {
    const w = make();
    const r = rioter(w);
    place(r, 0, -4); // truoc xe 14 m ve phia -z
    aimTruck(w, 0, -12);
    setTruckFiring(w, true);
    const z0 = r.z;
    const hold = () => place(r, r.x, r.z); // khong de AI/di chuyen can nhieu
    void hold;
    run(w, 1.4);
    expect(w.truck.jet).toBeGreaterThan(0.5);
    expect(r.kz).toBeLessThan(-1); // bi day ve phia tia (-z)
    expect(r.knock).toBeGreaterThan(0);
    expect(w.metrics.stats.knockdowns).toBe(1);
    expect(w.metrics.stats.waterUsed).toBeGreaterThan(5);
    expect(r.morale).toBeLessThan(100);
    void z0;
  });
  it('nguoi ngoai pham vi tia (lech ben hoac qua xa) khong bi anh huong', () => {
    const w = makeAimed();
    const side = rioter(w, 1);
    const far = rioter(w, 2);
    place(side, 6, -2);
    place(far, 0, 10 - JET_RANGE - 6);
    run(w, 1.5);
    expect(side.knock).toBe(0);
    expect(far.knock).toBe(0);
    expect(side.kx).toBe(0);
  });
  it('bon nuoc can dan, bom bi khoa roi tiep nuoc o tru nuoc', () => {
    const w = makeAimed();
    w.truck.water = 12;
    run(w, 2);
    expect(w.truck.water).toBe(0);
    expect(w.truck.pumpCd).toBeGreaterThan(0);
    expect(w.truck.firing).toBe(false);
    // ra tru va tiep nuoc
    w.truck.x = HYDRANT.x;
    w.truck.z = HYDRANT.z - 1.5;
    run(w, 3);
    expect(w.truck.water).toBeGreaterThan(40);
    run(w, 5);
    expect(w.truck.water).toBe(w.truck.maxWater);
  });
  it('dap tat vung lua molotov doc theo tia va de lai vung nuoc', () => {
    const w = makeAimed();
    const f = spawnFire(w, 0, -2)!;
    expect(f.active).toBe(true);
    run(w, 2);
    expect(f.active).toBe(false);
    expect(w.metrics.stats.extinguished).toBeGreaterThanOrEqual(1);
    expect(w.puddles.some((p) => p.active && p.kind === 0)).toBe(true);
  });
  it('lua tu tat de lai vet chay (puddle kind 1)', () => {
    const w = make();
    const f = spawnFire(w, 5, 5)!;
    for (let i = 0; i < 9 / STEP && f.active; i++) stepWorld(w);
    expect(f.active).toBe(false);
    expect(w.puddles.some((p) => p.active && p.kind === 1)).toBe(true);
  });
  it('rao chan/xe van bi molotov se chay, tia nuoc dap tat', () => {
    const w = makeAimed();
    const idx = w.map.obstacles.findIndex((o) => o.kind === 'box' && o.type === 'barrier');
    const o = w.map.obstacles[idx];
    const t = thrower0(w);
    w.burning.fill(0);
    spawnProjectile(w, t, KIND_MOLOTOV, o.x, o.z);
    for (let i = 0; i < 2 / STEP; i++) stepWorld(w);
    expect(w.burning[idx]).toBeGreaterThan(20);
    // quay xe nham vao rao
    w.truck.x = w.truck.px = o.x;
    w.truck.z = w.truck.pz = o.z + 12;
    aimTruck(w, o.x, o.z);
    setTruckFiring(w, true);
    run(w, 3);
    expect(w.burning[idx]).toBe(0);
  });
  it('da/molotov trung xe lam xe hu hai; het mau thi xe ngung phun', () => {
    const w = make();
    const t = thrower0(w);
    const hp0 = w.truck.hp;
    place(t, 0, -10);
    spawnProjectile(w, t, KIND_STONE, w.truck.x, w.truck.z);
    for (let i = 0; i < 2 / STEP; i++) updateStepProj(w);
    expect(w.truck.hp).toBeLessThan(hp0);
    // molotov
    spawnProjectile(w, t, KIND_MOLOTOV, w.truck.x, w.truck.z);
    for (let i = 0; i < 2.5 / STEP; i++) updateStepProj(w);
    expect(w.truck.hp).toBeLessThan(hp0 - TUNE.moloTruck * 0.9);
    expect(w.truck.burnT).toBeGreaterThan(0);
    // pha huy
    w.truck.hp = 1;
    spawnProjectile(w, t, KIND_MOLOTOV, w.truck.x, w.truck.z);
    setTruckFiring(w, true);
    for (let i = 0; i < 2.5 / STEP; i++) updateStepProj(w);
    expect(w.truck.hp).toBe(0);
    expect(w.truck.firing).toBe(false);
    expect(w.truck.jet).toBeLessThan(0.05);
  });
  it('lai xe theo duong A* toi dich', () => {
    const w = make();
    orderTruckMove(w, 12, 22);
    expect(w.truck.path.length).toBeGreaterThan(0);
    run(w, 8);
    expect(Math.hypot(w.truck.x - 12, w.truck.z - 22)).toBeLessThan(3);
  });
  it('tu dong: ngam vao ke hung han trong tam va phun', () => {
    const w = make();
    const r = rioter(w);
    place(r, 3, -4);
    r.state = 'APPROACH';
    w.truck.auto = true;
    let fired = false;
    for (let i = 0; i < 3 / STEP; i++) {
      r.state = 'APPROACH';
      updateTools(w, STEP);
      fired ||= w.truck.firing;
    }
    expect(fired).toBe(true);
    expect(w.metrics.stats.waterUsed).toBeGreaterThan(3);
  });
});

function updateStepProj(w: World): void {
  stepWorld(w);
}
function thrower0(w: World): Unit {
  const t = rioter(w, 5);
  place(t, 0, -12);
  return t;
}
function makeAimed(): World {
  const w = make();
  const r = rioter(w);
  place(r, 0, -30); // xa
  aimTruck(w, 0, -12);
  setTruckFiring(w, true);
  return w;
}

describe('Trang bi canh sat', () => {
  it('hoi cay: bay toi muc tieu, tao dam khoi, nguoi trong do ho va mat tinh than, canh sat khong sao', () => {
    const w = make();
    const r = rioter(w);
    place(r, 0, -10);
    r.state = 'AGITATED';
    const m0 = r.morale;
    const s = w.squads[0];
    expect(useGas(w, 0, 0, -10)).toBe(true);
    expect(s.gas).toBe(TUNE.gasCharges - 1);
    expect(w.metrics.stats.gasUsed).toBe(1);
    expect(w.gas.some((g) => g.active)).toBe(false); // dang bay
    for (let i = 0; i < 4 / STEP; i++) {
      place(r, 0, -10);
      stepWorld(w);
    }
    expect(w.gas.some((g) => g.active)).toBe(true);
    expect(r.cough).toBeGreaterThan(0);
    expect(r.morale).toBeLessThan(m0);
    expect(w.metrics.stats.gassed).toBeGreaterThanOrEqual(1);
    const cop = w.units.find((u) => u.team === POLICE)!;
    expect(cop.cough).toBe(0);
  });
  it('dam khoi tan sau ~15 giay', () => {
    const w = make();
    useGas(w, 0, 0, -10);
    run(w, 3.5);
    for (let i = 0; i < 20 / STEP; i++) stepWorld(w);
    expect(w.gas.some((g) => g.active)).toBe(false);
  });
  it('so dan co gioi han va co thoi gian cho', () => {
    const w = make();
    expect(useGas(w, 0, 0, -10)).toBe(true);
    expect(useGas(w, 0, 0, -10)).toBe(false); // cho
    expect(toolsReady(w, 0).gas).toBe(false);
    for (let i = 0; i < (TUNE.eqCd + 1) / STEP; i++) updateTools(w, STEP);
    expect(useGas(w, 0, 0, -10)).toBe(true);
    for (let i = 0; i < (TUNE.eqCd + 1) / STEP; i++) updateTools(w, STEP);
    expect(w.squads[0].gas).toBe(0);
    expect(useGas(w, 0, 0, -10)).toBe(false);
    expect(w.squads[1].gas).toBe(TUNE.gasCharges); // squad khac khong bi anh huong
  });
  it('luu dan choang lam choang nguoi trong ban kinh, xa hon thi khong', () => {
    const w = make();
    const a = rioter(w, 0);
    const b = rioter(w, 1);
    place(a, 0, -10);
    place(b, 15, -10);
    expect(useFlash(w, 0, 0, -10)).toBe(true);
    let peak = 0;
    for (let i = 0; i < 1.5 / STEP; i++) {
      stepWorld(w);
      peak = Math.max(peak, w.shake);
    }
    expect(peak).toBeGreaterThan(0.2);
    expect(a.stun).toBeGreaterThan(0);
    expect(a.stunK).toBeLessThan(0.2);
    expect(b.stun).toBe(0);
    expect(w.metrics.stats.stunned).toBeGreaterThanOrEqual(1);
    expect(w.metrics.stats.flashUsed).toBe(1);
  });
  it('nguoi bi choang di cham, het choang thi binh thuong lai', () => {
    const w = make();
    const a = rioter(w, 0);
    place(a, 0, -10);
    a.stun = 1;
    a.stunK = 0.08;
    run(w, 1.2);
    expect(a.stun).toBe(0);
    expect(a.stunK).toBe(1);
  });
  it('LRAD: chum am thanh hinh non chi anh huong nguoi trong goc, co cooldown', () => {
    const w = make();
    const s = w.squads[0];
    const front = rioter(w, 0);
    const behind = rioter(w, 1);
    const side = rioter(w, 2);
    place(front, s.cx, s.cz - 12);
    place(behind, s.cx, s.cz + 12);
    place(side, s.cx + 14, s.cz - 2);
    const m = front.morale;
    expect(useLrad(w, 0, s.cx, s.cz - 12)).toBe(true);
    expect(useLrad(w, 0, s.cx, s.cz - 12)).toBe(false);
    for (let i = 0; i < 2 / STEP; i++) {
      updateTools(w, STEP);
      place(front, s.cx, s.cz - 12);
      place(behind, s.cx, s.cz + 12);
      place(side, s.cx + 14, s.cz - 2);
    }
    expect(front.stun).toBeGreaterThan(0);
    expect(front.morale).toBeLessThan(m);
    expect(behind.stun).toBe(0);
    expect(side.stun).toBe(0);
    expect(w.lrad.active).toBe(true);
    run(w, 4);
    expect(w.lrad.active).toBe(false);
    expect(w.squads[0].lradCd).toBeGreaterThan(0);
  });
  it('nguoi ho/choang khong the danh canh sat', () => {
    const w = make();
    const r = rioter(w, 0);
    const p = w.units.find((u) => u.team === POLICE)!;
    place(r, p.x, p.z + 0.8);
    r.state = 'ENGAGE';
    r.target = p.id;
    r.knock = 2;
    const hp = p.health;
    r.atkCd = 0;
    for (let i = 0; i < 20; i++) {
      r.state = 'ENGAGE';
      r.knock = 2;
      place(r, p.x, p.z + 0.8);
      stepWorld(w);
    }
    expect(p.health).toBe(hp);
  });
  it('xe chan duong: don vi bi day ra khoi than xe', () => {
    const w = make();
    const r = rioter(w);
    place(r, w.truck.x, w.truck.z);
    stepWorld(w);
    expect(Math.hypot(r.x - w.truck.x, r.z - w.truck.z)).toBeGreaterThan(1.2);
  });
});
