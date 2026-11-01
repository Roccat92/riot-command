import { TUNE } from '../src/sim/tuning';
if (process.env.TUNE) Object.assign(TUNE, JSON.parse(process.env.TUNE));
import { mixedBot, naiveAdvance, holdOnly } from '../src/sim/bots';
import { createWorld, initialAssign } from '../src/sim/GameWorld';
import { stepWorld, STEP } from '../src/sim/SimulationLoop';
import { MVP_CONFIG, POLICE, RIOTER, isAlive } from '../src/sim/types';
const bots: any = { mixed: mixedBot, naive: naiveAdvance, hold: holdOnly };
const b = bots[process.argv[2] ?? 'mixed'];
const w = createWorld({ ...MVP_CONFIG, seed: Number(process.argv[3] ?? 100) });
initialAssign(w);
let i = 0;
while (w.status === 'playing' && w.time < 301) {
  if (i % 15 === 0) b(w);
  stepWorld(w, STEP);
  i++;
  if (i % 300 === 0) {
    const P = w.units.filter((u) => u.team === POLICE && isAlive(u));
    const R = w.units.filter((u) => u.team === RIOTER && isAlive(u) && !u.pending);
    const st: Record<string, number> = {};
    R.forEach((u) => (st[u.state] = (st[u.state] ?? 0) + 1));
    const hp = P.reduce((s, u) => s + u.health, 0) / (P.length || 1);
    const mo = P.reduce((s, u) => s + u.morale, 0) / (P.length || 1);
    console.log(w.time.toFixed(0), 'P', P.length, 'hp', hp.toFixed(0), 'mo', mo.toFixed(0), 'stab', w.metrics.stability.toFixed(0), 'R', R.length, JSON.stringify(st), 'orders', w.squads.map((s) => s.order[0] + s.formation[0]).join(','), 'thr', w.metrics.stats.thrown);
  }
}
console.log(w.result?.reason, w.time);
console.log(w.squads.map((s) => `${s.cx.toFixed(0)},${s.cz.toFixed(0)} ${s.order}`).join(' | '));
const R2 = w.units.filter((u) => u.team === RIOTER && isAlive(u) && !u.pending);
console.log(R2.slice(0, 14).map((u) => `${u.role}:${u.x.toFixed(0)},${u.z.toFixed(0)} d${u.nearPolice.toFixed(0)}`).join(' '));
