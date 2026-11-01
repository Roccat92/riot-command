import { mixedBot, naiveAdvance, holdOnly, runGame } from '../src/sim/bots';
const bots: any = { mixed: mixedBot, naive: naiveAdvance, hold: holdOnly };
const b = bots[process.argv[2] ?? 'mixed'];
for (let i = 0; i < 6; i++) {
  const r = runGame(b, 100 + i * 7);
  console.log(r.won ? 'WIN' : 'LOSE', r.time.toFixed(0), 'rDown', r.stats.rioterDown, 'disp', r.stats.rioterDispersed, 'pDown', r.stats.policeDown, 'thrown', r.thrown, 'hits', r.hits, 'burn', r.burn.toFixed(0), r.reason);
}
