(globalThis as any).__PEACE = Number(process.env.PEACE ?? 45);
import { pulse, advanceDodge, holdOnly, mixedBot, naiveAdvance, runGame, withTools, withoutTools, type Bot } from '../src/sim/bots';

import { MVP_CONFIG } from '../src/sim/types';
import { TUNE } from '../src/sim/tuning';
if (process.env.TUNE) Object.assign(TUNE, JSON.parse(process.env.TUNE));
const N = Number(process.argv[2] ?? 12);
const only = process.env.ONLY;
const base: [string, Bot][] = ([['naive-advance', naiveAdvance], ['advance+dodge', advanceDodge], ['pulse', pulse], ['hold-only', holdOnly], ['mixed', mixedBot]] as [string, Bot][]);
// MODE=old: khong co trang bi moi; MODE=tools (mac dinh): bot dung xe voi rong + hoi cay + luu dan + LRAD; MODE=idle: co xe/trang bi nhung bot khong dung
const mode = process.env.MODE ?? 'both';
const bots: [string, Bot][] = [];
for (const [n, b] of base) {
  if (mode === 'old' || mode === 'both') bots.push([n + ' (no-tools)', withoutTools(b)]);
  if (mode === 'tools' || mode === 'both') bots.push([n + ' +tools', withTools(b)]);
  if (mode === 'idle') bots.push([n + ' (idle)', b]);
}
for (const [name, bot] of bots.filter(([n]) => !only || only.split(',').some((o) => n.startsWith(o)))) {
  const rs = Array.from({ length: N }, (_, i) => runGame(bot, 100 + i * 7, process.env.GS ? { ...MVP_CONFIG, groupSizes: JSON.parse(process.env.GS) } : MVP_CONFIG));
  const wins = rs.filter((r) => r.won);
  const avg = (f: (r: (typeof rs)[number]) => number, a = rs) => (a.length ? a.reduce((s, r) => s + f(r), 0) / a.length : 0);
  const ratings: Record<string, number> = {};
  for (const r of wins) ratings[r.rating] = (ratings[r.rating] ?? 0) + 1;
  const reasons: Record<string, number> = {};
  for (const r of rs.filter((r) => !r.won)) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  console.log(
    `${name.padEnd(14)} win ${wins.length}/${N} (${Math.round((wins.length / N) * 100)}%) | win time ${avg((r) => r.time, wins).toFixed(0)}s | ratings ${JSON.stringify(ratings)} | police down ${avg((r) => r.policeDown).toFixed(1)} | thrown ${avg((r) => r.thrown).toFixed(0)} (molotov ${avg((r) => r.molotovs).toFixed(1)}, blocked ${avg((r) => r.blocked).toFixed(0)}, hit ${avg((r) => r.hits).toFixed(0)}, dodged ${avg((r) => r.dodged).toFixed(0)}) fires ${avg((r) => r.fires).toFixed(1)} | safety ${avg((r) => r.safety).toFixed(0)} | tools: water ${avg((r) => r.stats.waterUsed).toFixed(0)} knock ${avg((r) => r.stats.knockdowns).toFixed(0)} out ${avg((r) => r.stats.extinguished).toFixed(1)} gas ${avg((r) => r.stats.gasUsed).toFixed(1)} flash ${avg((r) => r.stats.flashUsed).toFixed(1)} lrad ${avg((r) => r.stats.lradUsed).toFixed(1)} truckDmg ${avg((r) => r.stats.truckDamage).toFixed(0)} | losses ${JSON.stringify(reasons)}`,
  );
}
