import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { PCFShadowMap } from 'three';
import { CameraController } from './render/CameraController';
import { InputLayer } from './render/InputLayer';
import { Overlays } from './render/Overlays';
import { SimDriver } from './render/SimDriver';
import { UnitRenderer } from './render/UnitRenderer';
import { WorldScene } from './render/WorldScene';
import { HUD } from './ui/HUD';

const FIXED_HIGH = typeof location !== 'undefined' && new URLSearchParams(location.search).get('q') === 'high';

export default function App() {
  const [tier, setTier] = useState(0); // 0 = cao, 1 = ha dpr, 2 = tat bong do
  const dpr = tier === 0 ? 1.75 : 1;
  return (
    <div className="app">
      <Canvas
        orthographic
        flat
        shadows={tier < 2 ? { type: PCFShadowMap } : false}
        dpr={dpr}
        camera={{ position: [0, 85, 85], zoom: 24, near: 0.1, far: 600 }}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      >
        {!FIXED_HIGH && <PerformanceMonitor bounds={() => [24, 50]} onDecline={() => setTier((t) => Math.min(2, t + 1))} flipflops={4} />}
        <WorldScene />
        <UnitRenderer />
        <Overlays />
        <CameraController />
        <InputLayer />
        <SimDriver />
      </Canvas>
      <HUD />
    </div>
  );
}
