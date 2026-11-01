// Nhan so squad hien tren dau moi squad: DOM duoc cap nhat truc tiep moi khung hinh (khong qua React state).
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { camRef } from '../render/cameraState';
import { SQUAD_COLORS } from '../render/UnitRenderer';
import { useGameStore } from '../state/GameState';
import { simLoop } from '../sim/SimulationLoop';

export function SquadTags() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const v = new Vector3();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const cam = camRef.current;
      if (!cam) return;
      const sel = useGameStore.getState().selection;
      simLoop.world.squads.forEach((s, i) => {
        const el = refs.current[i];
        if (!el) return;
        if (s.aliveCount <= 0) {
          el.style.display = 'none';
          return;
        }
        v.set(s.cx, 3.6, s.cz).project(cam);
        el.style.display = 'grid';
        el.style.transform = `translate(${((v.x + 1) / 2) * window.innerWidth}px, ${((1 - v.y) / 2) * window.innerHeight}px) translate(-50%, -100%)`;
        el.classList.toggle('sel', sel.includes(i));
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <>
      {simLoop.world.squads.map((s, i) => (
        <div
          key={s.id}
          className="squad-tag"
          ref={(el) => {
            refs.current[i] = el;
          }}
          style={{ borderColor: '#' + SQUAD_COLORS[i].toString(16).padStart(6, '0'), position: 'absolute', left: 0, top: 0 }}
        >
          {i + 1}
        </div>
      ))}
    </>
  );
}
