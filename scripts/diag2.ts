import { naiveAdvance, runGame } from '../src/sim/bots';
import { DBG } from '../src/sim/ProjectileSystem';
DBG.noThrow = process.argv[2] === '1';
for (let i = 0; i < 6; i++) {
  const r = runGame(naiveAdvance, 100 + i * 7);
  console.log(r.won ? 'WIN' : 'LOSE', r.time.toFixed(0), r.rating, 'rDown', r.stats.rioterDown, 'disp', r.stats.rioterDispersed, 'pDown', r.stats.policeDown, 'thrown', r.thrown, r.reason);
}
