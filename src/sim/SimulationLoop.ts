// SimulationLoop: buoc co dinh (fixed timestep) cho AI/gameplay, tach khoi vong lap render.
import { updateCombat } from './CombatSystem';
import { updateCrowdAI } from './CrowdAI';
import { createWorld, initialAssign } from './GameWorld';
import { updateMovement } from './MovementSystem';
import { updateObjectives } from './Objectives';
import { updatePoliceIntent, updateSquads } from './SquadController';
import { MVP_CONFIG, SLICE_CONFIG, type World, type WorldConfig } from './types';

export const STEP = 1 / 30;

/** Mot buoc mo phong (thu tu: squad -> AI -> y dinh canh sat -> di chuyen -> chien dau -> muc tieu). */
export function stepWorld(w: World, dt = STEP): void {
  if (w.status !== 'playing') return;
  w.time += dt;
  w.tick++;
  updateSquads(w, dt);
  updateCrowdAI(w, dt);
  updatePoliceIntent(w, dt);
  updateMovement(w, dt);
  updateCombat(w, dt);
  updateObjectives(w, dt);
}

export function configFromUrl(): WorldConfig {
  // Giai doan lat cat doc: mac dinh 2 squad + 1 nhom; them ?mvp=1 de chay quy mo MVP
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('mvp') === '1') return MVP_CONFIG;
  return SLICE_CONFIG;
}

export class SimulationLoop {
  world: World;
  acc = 0;
  alpha = 0;
  speed = 1;
  paused = false;
  running = false; // chi chay khi dang o man choi
  generation = 0;
  constructor(config: WorldConfig) {
    this.world = createWorld(config);
    initialAssign(this.world);
  }
  restart(config?: WorldConfig): void {
    this.world = createWorld(config ?? this.world.config);
    initialAssign(this.world);
    this.acc = 0;
    this.alpha = 0;
    this.paused = false;
    this.generation++;
  }
  /** Goi moi khung hinh: tich luy thoi gian va chay cac buoc co dinh. */
  advance(realDt: number): number {
    if (!this.running || this.paused || this.world.status !== 'playing') return 0;
    this.acc += Math.min(realDt, 0.1) * this.speed;
    let n = 0;
    while (this.acc >= STEP && n < 12) {
      stepWorld(this.world, STEP);
      this.acc -= STEP;
      n++;
    }
    this.alpha = this.acc / STEP;
    return n;
  }
}

export const simLoop = new SimulationLoop(configFromUrl());
