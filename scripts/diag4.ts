import { TUNE } from '../src/sim/tuning';
if (process.env.TUNE) Object.assign(TUNE, JSON.parse(process.env.TUNE));
import { mixedBot, naiveAdvance, runGame } from '../src/sim/bots';
import { DBG } from '../src/sim/ProjectileSystem';
import { DBGC } from '../src/sim/CombatSystem';
for (let i = 0; i < 12; i++) {
  DBG.civFire = DBG.civProj = DBGC.strike = DBGC.engage = 0;
  const r = runGame(i % 2 ? naiveAdvance : mixedBot, 100 + i * 7);
  console.log(i % 2 ? 'naive' : 'mixed', r.won ? 'WIN' : 'LOSE', r.time.toFixed(0), 'safety', r.safety.toFixed(0), 'harm', r.stats.civiliansHarm.toFixed(2), 'strike', DBGC.strike, 'engage', DBGC.engage.toFixed(0), 'proj', DBG.civProj, 'fire', DBG.civFire.toFixed(0));
}
