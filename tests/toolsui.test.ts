import { describe, expect, it } from 'vitest';
import { useGameStore, makeSnapshot, toolSquads } from '../src/state/GameState';
import { simLoop } from '../src/sim/SimulationLoop';
import { aim } from '../src/render/aim';
import { TUNE } from '../src/sim/tuning';
import { runGame, withTools, withoutTools, naiveAdvance } from '../src/sim/bots';

describe('HUD / store: xe voi rong va trang bi', () => {
  it('snapshot co so dan, nuoc, do ben xe', () => {
    simLoop.restart();
    const h = makeSnapshot(simLoop.world, []);
    expect(h.truck.active).toBe(true);
    expect(h.truck.water).toBe(1);
    expect(h.tools.gas).toBe(3 * TUNE.gasCharges);
    expect(h.tools.flashMax).toBe(3 * TUNE.flashCharges);
    expect(h.tools.lradCd).toBe(0);
    expect(makeSnapshot(simLoop.world, [1]).tools.gas).toBe(TUNE.gasCharges);
  });
  it('toolSquads: squad duoc chon, neu khong thi tat ca squad con nguoi', () => {
    simLoop.restart();
    expect(toolSquads(simLoop.world, [])).toEqual([0, 1, 2]);
    expect(toolSquads(simLoop.world, [2])).toEqual([2]);
  });
  it('fireTool dung dan cua squad gan diem nham nhat va tru dan', () => {
    simLoop.restart();
    const s = useGameStore.getState();
    const w = simLoop.world;
    const near = [...w.squads].sort((a, b) => Math.hypot(a.cx - 0, a.cz + 12) - Math.hypot(b.cx - 0, b.cz + 12))[0];
    expect(s.fireTool('gas', 0, -12)).toBe(true);
    expect(w.squads[near.id].gas).toBe(TUNE.gasCharges - 1);
    // cung luc thi squad do dang cho nap; squad khac van ban duoc
    expect(s.fireTool('gas', 0, -12)).toBe(true);
    expect(w.squads.reduce((a, q) => a + q.gas, 0)).toBe(3 * TUNE.gasCharges - 2);
    expect(s.fireTool('lrad', 0, -12)).toBe(true);
    expect(w.lrad.active).toBe(true);
  });
  it('xe: phun theo con tro, tu dong tat phun thu cong, nap nuoc di ve tru', () => {
    simLoop.restart();
    const s = useGameStore.getState();
    const w = simLoop.world;
    aim.x = 4;
    aim.z = -3;
    s.truckSpray(true);
    expect(w.truck.firing).toBe(true);
    expect([w.truck.aimX, w.truck.aimZ]).toEqual([4, -3]);
    s.truckSpray(false);
    expect(w.truck.firing).toBe(false);
    s.truckAutoToggle();
    expect(w.truck.auto).toBe(true);
    s.truckAutoToggle();
    expect(w.truck.auto).toBe(false);
    s.truckDrive(10, 12);
    expect(w.truck.dest).not.toBeNull();
    s.truckRefill();
    expect(w.truck.refilling).toBe(true);
  });
  it('chon xe bo chon squad va nguoc lai', () => {
    simLoop.restart();
    const s = useGameStore.getState();
    s.select([0]);
    s.selectTruck(true);
    expect(useGameStore.getState().selection).toEqual([]);
    expect(useGameStore.getState().truckSel).toBe(true);
    useGameStore.getState().select([1]);
    expect(useGameStore.getState().truckSel).toBe(false);
  });
});

describe('Bot dung trang bi', () => {
  it('chay tron mot van: co dung trang bi, xe co phun nuoc; withoutTools khong dung gi', () => {
    const a = runGame(withTools(naiveAdvance), 100);
    expect(a.stats.waterUsed).toBeGreaterThan(10);
    expect(a.stats.gasUsed + a.stats.flashUsed + a.stats.lradUsed).toBeGreaterThan(0);
    const b = runGame(withoutTools(naiveAdvance), 100);
    expect(b.stats.waterUsed).toBe(0);
    expect(b.stats.gasUsed + b.stats.flashUsed + b.stats.lradUsed).toBe(0);
  }, 60000);
});
