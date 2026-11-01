import { createRoot } from 'react-dom/client';
import App from './App';
import { useGameStore } from './state/GameState';
import { simLoop, stepWorld } from './sim/SimulationLoop';
import { perf } from './render/SimDriver';
import { cam, camRef } from './render/cameraState';
import './styles.css';

// Hook goi loi (cho kiem thu headless)
(window as unknown as Record<string, unknown>).__RC = { simLoop, store: useGameStore, stepWorld, perf, cam, camRef };

createRoot(document.getElementById('root')!).render(
  <App />,
);
