import { describe, expect, it } from 'vitest';
import { canPoliceTarget } from '../src/sim/CombatSystem';
import { civilianTransition, rioterTransition, type RioterInput } from '../src/sim/CrowdAI';

const base: RioterInput = {
  state: 'IDLE',
  health: 60,
  morale: 75,
  agitation: 0,
  temper: 1,
  nearPoliceDist: 30,
  stateTime: 10,
  groupMorale: 75,
  distToExit: 99,
  calmed: false,
};
const t = (over: Partial<RioterInput>) => rioterTransition({ ...base, ...over });

describe('Rioter FSM', () => {
  it('IDLE -> GATHER khi kich dong tang', () => {
    expect(t({ state: 'IDLE', agitation: 0.1 })).toBe('IDLE');
    expect(t({ state: 'IDLE', agitation: 0.3 })).toBe('GATHER');
  });
  it('GATHER -> AGITATED -> APPROACH theo ngưỡng kích động và khoảng cách cảnh sát', () => {
    expect(t({ state: 'GATHER', agitation: 0.5 })).toBe('AGITATED');
    expect(t({ state: 'AGITATED', agitation: 0.8, nearPoliceDist: 20 })).toBe('APPROACH');
    expect(t({ state: 'AGITATED', agitation: 0.8, nearPoliceDist: 80 })).toBe('AGITATED');
  });
  it('APPROACH -> ENGAGE khi chạm canh sat, ENGAGE -> APPROACH khi bi day ra xa', () => {
    expect(t({ state: 'APPROACH', agitation: 0.9, nearPoliceDist: 1.5 })).toBe('ENGAGE');
    expect(t({ state: 'ENGAGE', agitation: 0.9, nearPoliceDist: 4 })).toBe('APPROACH');
    expect(t({ state: 'ENGAGE', agitation: 0.9, nearPoliceDist: 1 })).toBe('ENGAGE');
  });
  it('tinh than thap -> RETREAT -> PANIC -> DISPERSE', () => {
    expect(t({ state: 'ENGAGE', morale: 25, nearPoliceDist: 1 })).toBe('RETREAT');
    expect(t({ state: 'RETREAT', morale: 12, nearPoliceDist: 10 })).toBe('PANIC');
    expect(t({ state: 'PANIC', morale: 5 })).toBe('DISPERSE');
    expect(t({ state: 'RETREAT', morale: 40, distToExit: 2 })).toBe('DISPERSE');
  });
  it('RETREAT -> GATHER khi da binh tinh va xa canh sat (nhung chi sau khi doi mot luc)', () => {
    expect(t({ state: 'RETREAT', morale: 70, nearPoliceDist: 25, stateTime: 8 })).toBe('GATHER');
    expect(t({ state: 'RETREAT', morale: 70, nearPoliceDist: 25, stateTime: 2 })).toBe('RETREAT');
  });
  it('de-escalation: ENGAGE -> AGITATED khi duoc xoa diu', () => {
    expect(t({ state: 'ENGAGE', agitation: 0.3, nearPoliceDist: 1, calmed: true })).toBe('AGITATED');
    expect(t({ state: 'AGITATED', agitation: 0.2 })).toBe('GATHER');
    expect(t({ state: 'GATHER', agitation: 0.05, stateTime: 5 })).toBe('IDLE');
  });
  it('mat suc khoe -> DOWN; DISPERSE va DOWN la trang thai cuoi', () => {
    expect(t({ state: 'APPROACH', health: 0 })).toBe('DOWN');
    expect(t({ state: 'DISPERSE', morale: 100 })).toBe('DISPERSE');
    expect(t({ state: 'DOWN', health: 0 })).toBe('DOWN');
  });
  it('nguoi nong tinh (temper cao) kho bo chay hon', () => {
    expect(t({ state: 'ENGAGE', morale: 33, temper: 0.8, nearPoliceDist: 1 })).toBe('RETREAT');
    expect(t({ state: 'ENGAGE', morale: 33, temper: 1.3, nearPoliceDist: 1 })).toBe('ENGAGE');
  });
});

describe('Civilian FSM', () => {
  const c = (over: object) => civilianTransition({ state: 'IDLE', health: 50, danger: 0, morale: 100, stateTime: 5, distToExit: 50, ...over });
  it('IDLE -> RETREAT -> PANIC -> DISPERSE khi nguy hiem tang', () => {
    expect(c({ danger: 0.1 })).toBe('IDLE');
    expect(c({ danger: 0.4 })).toBe('RETREAT');
    expect(c({ state: 'RETREAT', danger: 0.8 })).toBe('PANIC');
    expect(c({ state: 'PANIC', morale: 10, stateTime: 5 })).toBe('DISPERSE');
  });
  it('binh tinh lai khi het nguy hiem', () => {
    expect(c({ state: 'RETREAT', danger: 0, morale: 95, stateTime: 6 })).toBe('IDLE');
    expect(c({ state: 'PANIC', danger: 0.1, morale: 60 })).toBe('RETREAT');
  });
});

describe('Quy tac chon muc tieu cua canh sat', () => {
  const u = (team: 0 | 1 | 2, state: string) => ({ team, state, active: true }) as never;
  it('KHONG BAO GIO tan cong dan thuong, o bat ky lenh va trang thai nao', () => {
    for (const order of ['MOVE', 'HOLD', 'ADVANCE', 'REGROUP', 'DEESCALATE'] as const) {
      for (const state of ['IDLE', 'AGITATED', 'APPROACH', 'ENGAGE', 'PANIC', 'RETREAT']) {
        expect(canPoliceTarget(order, true, u(2, state))).toBe(false);
      }
    }
  });
  it('khong danh nguoi dang bo chay / da giai tan / dong doi', () => {
    for (const state of ['RETREAT', 'PANIC', 'DISPERSE', 'DOWN', 'IDLE']) expect(canPoliceTarget('ADVANCE', true, u(1, state))).toBe(false);
    expect(canPoliceTarget('ADVANCE', true, u(0, 'ENGAGE'))).toBe(false);
  });
  it('REGROUP va DEESCALATE khong cho phep tan cong chu dong', () => {
    expect(canPoliceTarget('REGROUP', true, u(1, 'ENGAGE'))).toBe(false);
    expect(canPoliceTarget('DEESCALATE', true, u(1, 'ENGAGE'))).toBe(false);
  });
  it('HOLD/MOVE chi phong ve; ADVANCE danh ca nguoi dang kich dong', () => {
    expect(canPoliceTarget('HOLD', false, u(1, 'AGITATED'))).toBe(false);
    expect(canPoliceTarget('HOLD', false, u(1, 'APPROACH'))).toBe(true);
    expect(canPoliceTarget('HOLD', true, u(1, 'AGITATED'))).toBe(true);
    expect(canPoliceTarget('ADVANCE', false, u(1, 'AGITATED'))).toBe(true);
  });
});
