(globalThis as any).__PEACE = Number(process.env.PEACE ?? 45);
import { pulse, advanceDodge, holdOnly, mixedBot, naiveAdvance, runGame, type Bot } from '../src/sim/bots';

import { TUNE } from '../src/sim/tuning';
if (process.env.TUNE) Object.assign(TUNE, JSON.parse(process.env.TUNE));
const N = Number(process.argv[2] ?? 12);
const only = process.env.ONLY;
const bots: [string, Bot][] = ([['naive-advance', naiveAdvance], ['advance+dodge', advanceDodge], ['pulse', pulse], ['hold-only', holdOnly], ['mixed', mixedBot]] as [string, Bot][]).filter(([n]) => !only || only.split(',').includes(n));
for (const [name, bot] of bots) {
  const rs = Array.from({ length: N }, (_, i) => runGame(bot, 100 + i * 7));
  const wins = rs.filter((r) => r.won);
  const avg = (f: (r: (typeof rs)[number]) => number, a = rs) => (a.length ? a.reduce((s, r) => s + f(r), 0) / a.length : 0);
  const ratings: Record<string, number> = {};
  for (const r of wins) ratings[r.rating] = (ratings[r.rating] ?? 0) + 1;
  const reasons: Record<string, number> = {};
  for (const r of rs.filter((r) => !r.won)) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  console.log(
    `${name.padEnd(14)} win ${wins.length}/${N} (${Math.round((wins.length / N) * 100)}%) | win time ${avg((r) => r.time, wins).toFixed(0)}s | ratings ${JSON.stringify(ratings)} | police down ${avg((r) => r.policeDown).toFixed(1)} | thrown ${avg((r) => r.thrown).toFixed(0)} (molotov ${avg((r) => r.molotovs).toFixed(1)}, blocked ${avg((r) => r.blocked).toFixed(0)}, hit ${avg((r) => r.hits).toFixed(0)}, dodged ${avg((r) => r.dodged).toFixed(0)}) fires ${avg((r) => r.fires).toFixed(1)} | safety ${avg((r) => r.safety).toFixed(0)} | losses ${JSON.stringify(reasons)}`,
  );
}
