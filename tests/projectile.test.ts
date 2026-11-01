import { describe, expect, it } from 'vitest';
import { holdOnly, mixedBot, naiveAdvance, runGame } from '../src/sim/bots';
import { createWorld, initialAssign } from '../src/sim/GameWorld';
import {
  FIRE_R,
  KIND_BOTTLE,
  KIND_MOLOTOV,
  blockMultiplier,
  canDodge,
  inFire,
  spawnFire,
  spawnProjectile,
  throwCooldown,
  triggerDodge,
  updateProjectiles,
} from '../src/sim/ProjectileSystem';
import { STEP, stepWorld } from '../src/sim/SimulationLoop';
import { setOrder } from '../src/sim/SquadController';
import { MVP_CONFIG, POLICE, RIOTER, ROLE_THROWER, SLICE_CONFIG, type World } from '../src/sim/types';

function make(cfg = SLICE_CONFIG, seed = 7): World {
  const w = createWorld({ ...cfg, seed });
  initialAssign(w);
  return w;
}
const stepN = (w: World, sec: number) => {
  for (let i = 0; i < sec / STEP && w.status === 'playing'; i++) stepWorld(w);
};
const thrower = (w: World) => w.units.find((u) => u.team === RIOTER && u.active)!;

describe('Phong chong (khien huong ve nguon nem)', () => {
  it('khien huong dung chan gan het, quay lung thi khong chan', () => {
    const front = blockMultiplier('LINE', 0, 0.2);
    const back = blockMultiplier('LINE', 0, Math.PI);
    expect(front).toBeLessThan(0.3);
    expect(back).toBe(1);
  });
  it('COMPACT chan rong hon LINE (goc 90 do)', () => {
    expect(blockMultiplier('COMPACT', 0, 1.6)).toBeLessThan(1);
    expect(blockMultiplier('LINE', 0, 1.6)).toBe(1);
  });
});

describe('Vat bi nem', () => {
  it('co quy dao parabol theo thoi gian va trung dich sau dur giay', () => {
    const w = make();
    const t = thrower(w);
    const p = spawnProjectile(w, t, KIND_BOTTLE, 0, 10)!;
    expect(p.active).toBe(true);
    expect(p.arc).toBeGreaterThan(0);
    expect(w.metrics.stats.thrown).toBe(1);
    const dur = p.dur;
    for (let i = 0; i < (dur / STEP) * 0.5; i++) updateProjectiles(w, STEP);
    expect(p.active).toBe(true);
    for (let i = 0; i < (dur / STEP) * 0.7; i++) updateProjectiles(w, STEP);
    expect(p.active).toBe(false);
  });
  it('trung dich: khien chan giam sat thuong so voi khong khien', () => {
    const a = make();
    const b = make();
    for (const [w, ang] of [[a, 'front'], [b, 'back']] as const) {
      const sq = w.squads[0];
      const u = w.units[sq.unitIds[0]];
      u.heading = 0;
      sq.heading = 0;
      sq.formation = 'LINE';
      const src = w.units.find((x) => x.team === RIOTER)!;
      // dat nguoi nem o phia truoc hoac sau lung linh
      src.x = u.x + 0.1;
      src.z = u.z + (ang === 'front' ? 12 : -12);
      const p = spawnProjectile(w, src, KIND_BOTTLE, u.x, u.z)!;
      p.t = p.dur - 0.01;
      const hp0 = u.health;
      updateProjectiles(w, STEP);
      (w as unknown as { _dmg: number })._dmg = hp0 - u.health;
    }
    const front = (a as unknown as { _dmg: number })._dmg;
    const back = (b as unknown as { _dmg: number })._dmg;
    expect(front).toBeGreaterThan(0);
    expect(back).toBeGreaterThan(front * 3);
    expect(a.metrics.stats.blocked).toBe(1);
    expect(b.metrics.stats.projHits).toBe(1);
  });
  it('toc do nem tang theo kich dong (cooldown giam)', () => {
    const lo = throwCooldown(0.5, 0.5);
    const mid = throwCooldown(0.75, 0.5);
    const hi = throwCooldown(1, 0.5);
    expect(lo).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(hi);
  });
  it('nguoi bieu tinh nong ne ra vat nem trong mo phong (MVP, khong ai ra lenh)', () => {
    const w = make(MVP_CONFIG, 3);
    for (const s of w.squads) setOrder(w, s, 'HOLD');
    stepN(w, 120);
    expect(w.metrics.stats.thrown).toBeGreaterThan(5);
  });
  it('xoa diu (de-escalate) giam so vat bi nem so voi giu nguyen', () => {
    const count = (deesc: boolean) => {
      let total = 0;
      for (const seed of [3, 5, 9]) {
        const w = make(MVP_CONFIG, seed);
        for (const s of w.squads) setOrder(w, s, deesc ? 'DEESCALATE' : 'HOLD');
        // dua squad den gan cac nhom de ap dung
        if (deesc) {
          w.squads.forEach((s, i) => {
            s.cx = -12 + 12 * i;
            s.cz = -3;
          });
        }
        stepN(w, 60);
        total += w.metrics.stats.thrown;
      }
      return total;
    };
    expect(count(true)).toBeLessThan(count(false));
  });
  it('ngung nem khi het dan (het ammo thi chuyen sang can chien)', () => {
    const w = make();
    const t = thrower(w);
    t.role = ROLE_THROWER;
    t.ammo = 0;
    t.ammoMolo = 0;
    t.agitation = 1;
    t.throwCd = 0;
    stepN(w, 5);
    expect(w.metrics.stats.thrown).toBe(w.metrics.stats.thrown); // khong nem them tu nguoi nay
    expect(t.role).not.toBe(ROLE_THROWER);
  });
});

describe('Vung lua (molotov)', () => {
  it('molotov cham dat tao vung lua chay 6-8 giay roi tat', () => {
    const w = make();
    const t = thrower(w);
    const p = spawnProjectile(w, t, KIND_MOLOTOV, 0, 0)!;
    p.t = p.dur - 0.01;
    updateProjectiles(w, STEP);
    const f = w.fires.find((x) => x.active)!;
    expect(f).toBeDefined();
    expect(f.dur).toBeGreaterThanOrEqual(6);
    expect(f.dur).toBeLessThanOrEqual(8);
    expect(inFire(w, 0, 0)).toBe(f);
    expect(inFire(w, FIRE_R + 3, 0)).toBeNull();
    for (let i = 0; i < 8.5 / STEP; i++) updateProjectiles(w, STEP);
    expect(w.fires.some((x) => x.active)).toBe(false);
  });
  it('dung trong lua bi tru health va morale', () => {
    const w = make();
    const u = w.units[w.squads[0].unitIds[0]];
    spawnFire(w, u.x, u.z)!;
    const hp = u.health;
    const mo = u.morale;
    for (let i = 0; i < 2 / STEP; i++) updateProjectiles(w, STEP);
    expect(u.health).toBeLessThan(hp);
    expect(u.morale).toBeLessThan(mo);
    expect(w.metrics.stats.burnSeconds).toBeGreaterThan(1);
  });
  it('don vi chay ra khoi lua va tranh vung lua khi di chuyen', () => {
    const w = make();
    const sq = w.squads[0];
    const u = w.units[sq.unitIds[0]];
    spawnFire(w, u.x, u.z)!;
    stepN(w, 3);
    const f = w.fires.find((x) => x.active);
    if (f) expect(Math.hypot(u.x - f.x, u.z - f.z)).toBeGreaterThan(f.r - 0.6);
  });
});

describe('Ne (dodge)', () => {
  it('co the ne khi du the luc, khong ne khi kiet suc', () => {
    expect(canDodge({ stamina: 60, state: 'IDLE', dodgeT: 0, active: true })).toBe(true);
    expect(canDodge({ stamina: 5, state: 'IDLE', dodgeT: 0, active: true })).toBe(false);
    expect(canDodge({ stamina: 60, state: 'DOWN', dodgeT: 0, active: true })).toBe(false);
  });
  it('lenh Dodge: squad ne molotov dang rơi, ton the luc, va giam sat thuong', () => {
    const run = (dodge: boolean) => {
      const w = make();
      const sq = w.squads[0];
      const us = sq.unitIds.map((id) => w.units[id]);
      const src = w.units.find((x) => x.team === RIOTER)!;
      if (dodge) triggerDodge(w, sq);
      const tgt = us[3];
      const p = spawnProjectile(w, src, KIND_MOLOTOV, tgt.x, tgt.z)!;
      const st0 = us.map((u) => u.stamina);
      stepN(w, p.dur + 0.5);
      const hp = us.reduce((a, u) => a + u.health, 0);
      const stam = us.reduce((a, u, i) => a + (st0[i] - u.stamina), 0);
      return { hp, dodged: w.metrics.stats.dodged, stam };
    };
    const no = run(false);
    const yes = run(true);
    expect(yes.dodged).toBeGreaterThan(0);
    expect(no.dodged).toBe(0);
    expect(yes.hp).toBeGreaterThan(no.hp);
    expect(yes.stam).toBeGreaterThan(0);
  });
});

describe('Tiep vien (waves)', () => {
  it('MVP: 39 nguoi co mat luc dau, 26 nguoi den sau 55 s va 120 s', () => {
    const w = make(MVP_CONFIG, 4);
    const act = () => w.units.filter((u) => u.team === RIOTER && u.active).length;
    expect(act()).toBe(39);
    stepN(w, 56);
    expect(act()).toBeGreaterThanOrEqual(52 - 4);
    expect(w.alert?.text).toContain('tiếp viện');
    stepN(w, 66);
    expect(w.units.some((u) => u.team === RIOTER && u.pending)).toBe(false);
  });
  it('khong thang khi con tiep vien chua den', () => {
    const w = make(MVP_CONFIG, 4);
    expect(w.units.some((u) => u.pending)).toBe(true);
    expect(w.metrics.hostile).toBeGreaterThanOrEqual(0);
  });
  it('police khong bi am thanh/NaN: vat bi nem luon huu han', () => {
    const w = make(MVP_CONFIG, 6);
    stepN(w, 100);
    for (const p of w.projectiles) expect(Number.isFinite(p.t)).toBe(true);
    for (const u of w.units) expect(Number.isFinite(u.health)).toBe(true);
    expect(w.units.filter((u) => u.team === POLICE).length).toBe(24);
  });
});

describe('Can bang (mo phong bot)', () => {
  const seeds = [100, 107, 114, 121, 128, 135, 142, 149];
  const sim = (bot: typeof naiveAdvance) => seeds.map((s) => runGame(bot, s));
  const results = {
    hold: sim(holdOnly),
    naive: sim(naiveAdvance),
    mixed: sim(mixedBot),
  };
  const rate = (r: { won: boolean }[]) => r.filter((x) => x.won).length / r.length;
  it('chi phong thu (hold) khong thang: ben nem lien tuc se kiet suc phong tuyen', () => {
    expect(rate(results.hold)).toBeLessThanOrEqual(0.25);
    expect(results.hold.every((r) => r.thrown > 100)).toBe(true);
  });
  it('tien thang (naive advance) khong thang de dang: thang thi muon (> 150 s) va hau het xep hang C/D', () => {
    const wins = results.naive.filter((r) => r.won);
    expect(rate(results.naive)).toBeLessThanOrEqual(0.9);
    for (const r of wins) expect(r.time).toBeGreaterThan(150);
    const poor = wins.filter((r) => r.rating === 'C' || r.rating === 'D').length;
    expect(poor / Math.max(1, wins.length)).toBeGreaterThanOrEqual(0.5);
    expect(results.naive.reduce((a, r) => a + r.policeDown, 0) / seeds.length).toBeGreaterThan(3);
  });
  it('chien thuat hon hop co ne chu dong (so lan ne cao hon han tien thang) va thang nhieu hon chi phong thu', () => {
    const dodged = results.mixed.reduce((a, r) => a + r.dodged, 0);
    const dodgedNaive = results.naive.reduce((a, r) => a + r.dodged, 0);
    expect(dodged).toBeGreaterThan(dodgedNaive * 1.5);
    expect(rate(results.mixed)).toBeGreaterThan(rate(results.hold));
  });
});
