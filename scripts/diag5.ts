import { TUNE } from '../src/sim/tuning';
if (process.env.TUNE) Object.assign(TUNE, JSON.parse(process.env.TUNE));
import { mixedBot, naiveAdvance } from '../src/sim/bots';
import { createWorld, initialAssign } from '../src/sim/GameWorld';
import { stepWorld, STEP } from '../src/sim/SimulationLoop';
import { MVP_CONFIG, CIVILIAN, isAlive } from '../src/sim/types';
const b = process.argv[2] === 'naive' ? naiveAdvance : mixedBot;
const w = createWorld({ ...MVP_CONFIG, seed: Number(process.argv[3] ?? 100) });
initialAssign(w);
const last = new Map<number, number>();
let i = 0;
while (w.status === 'playing' && w.time < 301) {
  if (i % 15 === 0) b(w);
  stepWorld(w, STEP);
  i++;
  for (const u of w.units) if (u.team === CIVILIAN) {
    const h = last.get(u.id) ?? u.maxHealth;
    if (u.health < h - 0.5) {
      const sq = w.squads.map((s) => `${s.cx.toFixed(0)},${s.cz.toFixed(0)}${s.order[0]}`).join(' ');
      console.log(w.time.toFixed(0), 'civ', u.id, u.state, `at ${u.x.toFixed(0)},${u.z.toFixed(0)}`, 'dmg', (h - u.health).toFixed(1), 'squads', sq);
      last.set(u.id, u.health);
    }
  }
}
console.log(w.result?.reason, w.time, w.metrics.safety);
