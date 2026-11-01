import { createWorld, initialAssign } from '../src/sim/GameWorld';
import { stepWorld, STEP } from '../src/sim/SimulationLoop';
import { setOrder, orderMove } from '../src/sim/SquadController';
import { MVP_CONFIG, SLICE_CONFIG, isAlive } from '../src/sim/types';

const mode = process.argv[2] ?? 'idle';
const cfg = process.argv[3] === 'slice' ? SLICE_CONFIG : MVP_CONFIG;
const w = createWorld(cfg);
initialAssign(w);
const log = (t: string) => {
  const R = w.units.filter((u) => u.team === 1);
  const counts: Record<string, number> = {};
  for (const u of R) counts[u.state + (u.exited ? '(x)' : '')] = (counts[u.state + (u.exited ? '(x)' : '')] ?? 0) + 1;
  const P = w.units.filter((u) => u.team === 0 && isAlive(u)).length;
  const C = w.units.filter((u) => u.team === 2 && isAlive(u) && u.active).length;
  const m = w.metrics;
  console.log(t, 'police', P, 'civ', C, 'stab', m.stability.toFixed(0), 'safe', m.safety.toFixed(0), 'force', m.force.toFixed(0), JSON.stringify(counts), w.status);
};
const t0 = performance.now();
let ticks = 0;
for (let i = 0; i < 300 / STEP && w.status === 'playing'; i++) {
  if (mode === 'advance' && w.time > 20 && Math.abs(w.time - 20) < STEP) for (const s of w.squads) setOrder(w, s, 'ADVANCE');
  if (mode === 'deesc' && Math.abs(w.time - 15) < STEP) for (const s of w.squads) setOrder(w, s, 'DEESCALATE');
  if (mode === 'move' && Math.abs(w.time - 1) < STEP) { orderMove(w, w.squads, 0, 8); }
  stepWorld(w); ticks++;
  if (i % (30 * 15) === 0) log('t=' + w.time.toFixed(0));
}
log('END t=' + w.time.toFixed(1));
console.log('result', JSON.stringify(w.result));
console.log('ms/tick', ((performance.now() - t0) / ticks).toFixed(3));
for (const u of w.units) if (u.team === 1 && u.active && u.state !== 'DOWN') console.log(u.id, u.state, u.x.toFixed(1), u.z.toFixed(1), 'exit', u.exitIdx, 'np', u.nearPolice.toFixed(1), 'v', u.vx.toFixed(1), u.vz.toFixed(1), 'dv', u.dvx.toFixed(1), u.dvz.toFixed(1), 'm', u.morale.toFixed(0));
