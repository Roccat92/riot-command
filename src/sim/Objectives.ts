// Muc tieu nhiem vu: do on dinh, an toan dan thuong, vu luc; dieu kien thang/thua.
import { CIVILIAN, POLICE, RIOTER, clamp, isAlive, isThreatState, type AIState, type ResultStats, type World } from './types';

const STATE_WEIGHT: Record<AIState, number> = {
  IDLE: 0.05,
  GATHER: 0.25,
  AGITATED: 0.45,
  APPROACH: 0.6,
  ENGAGE: 0.75,
  RETREAT: 0.2,
  PANIC: 0.15,
  DISPERSE: 0,
  DOWN: 0,
};

export const CIVILIAN_HARM_LIMIT = 2.0;

export function computeSafety(harm: number, hasCivilians: boolean): number {
  if (!hasCivilians) return 100;
  return clamp(100 * (1 - harm / CIVILIAN_HARM_LIMIT), 0, 100);
}

export function ratingFor(safety: number, avgForce: number, policeFrac: number, time = 150): string {
  const score = safety * 0.35 + clamp(100 - avgForce * 1.5, 0, 100) * 0.3 + policeFrac * 100 * 0.2 + (1 - time / 300) * 15;
  return score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 55 ? 'B' : 'C';
}

export function updateObjectives(w: World, dt: number): void {
  if (w.status !== 'playing') return;
  const m = w.metrics;
  const st = m.stats;
  let hostile = 0;
  let wSum = 0;
  let totalR = 0;
  let harm = 0;
  let civs = 0;
  let evacR = 0;
  let evacC = 0;
  let effSum = 0;
  let policeActive = 0;
  let policeTotal = 0;
  for (const u of w.units) {
    if (u.team === RIOTER) {
      totalR++;
      if (u.exited) evacR++;
      if (isAlive(u)) {
        if (isThreatState(u.state)) hostile++;
        wSum += STATE_WEIGHT[u.state];
      }
    } else if (u.team === CIVILIAN) {
      civs++;
      harm += 1 - u.health / u.maxHealth;
      if (u.exited) evacC++;
    } else {
      policeTotal++;
      if (isAlive(u)) {
        policeActive++;
        effSum += (u.health / u.maxHealth) * (0.5 + 0.5 * (u.morale / 100));
      }
    }
  }
  m.hostile = hostile;
  st.rioterDispersed = evacR;
  st.civiliansEvacuated = evacC;
  const frac = totalR ? wSum / totalR : 0;
  let target = 100 - 100 * frac;
  target -= Math.max(0, m.force - 60) * 0.25;
  target -= (civs ? harm / civs : 0) * 10;
  target -= (1 - (policeTotal ? effSum / policeTotal : 0)) * 45;
  m.stability += (clamp(target, 0, 100) - m.stability) * Math.min(1, dt * 0.5);
  m.safety = computeSafety(harm, civs > 0);
  m.stats.forceSum += m.force;
  m.stats.forceSamples++;
  m.clearTimer = hostile === 0 ? m.clearTimer + dt : 0;
  m.lowStabilityTimer = m.stability < 12 ? m.lowStabilityTimer + dt : 0;
  const eff = policeTotal ? effSum / policeTotal : 0;

  let outcome: 'won' | 'lost' | null = null;
  let reason = '';
  if (m.safety <= 0) {
    outcome = 'lost';
    reason = 'Thương vong dân thường vượt giới hạn';
  } else if (eff < 0.2 || policeActive <= 3) {
    outcome = 'lost';
    reason = 'Lực lượng cảnh sát mất khả năng chiến đấu';
  } else if (m.lowStabilityTimer > 5) {
    outcome = 'lost';
    reason = 'Tình hình vượt ngưỡng mất kiểm soát';
  } else if (m.clearTimer >= 3 && w.time > 5) {
    if (m.safety >= w.safetyThreshold) {
      outcome = 'won';
      reason = 'Các nhóm bạo động đã giải tán hoặc rút lui, quảng trường ổn định';
    } else {
      outcome = 'lost';
      reason = 'Quảng trường đã yên nhưng mức an toàn dân thường dưới yêu cầu';
    }
  } else if (w.time >= w.timeLimit) {
    outcome = 'lost';
    reason = 'Hết thời gian 5 phút mà quảng trường chưa ổn định';
  }
  if (outcome) {
    const avgForce = st.forceSamples ? st.forceSum / st.forceSamples : 0;
    const result: ResultStats = {
      outcome,
      reason,
      time: w.time,
      rating: outcome === 'won' ? ratingFor(m.safety, avgForce, policeActive / Math.max(1, policeTotal), w.time) : '-',
      policeActive,
      policeTotal,
      stats: { ...st },
      avgForce,
      safety: m.safety,
      stability: m.stability,
    };
    w.status = outcome;
    w.result = result;
  }
}

export { POLICE };
