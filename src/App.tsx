

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, GizmoHelper, GizmoViewport, useEnvironment } from '@react-three/drei';
import { ParkingLot } from './components/ParkingLot';
import { EnvironmentWrapper } from './components/EnvironmentWrapper';
import { VehicleManager } from './components/vehicles/VehicleManager';
import { ControlPanel } from './components/ui/ControlPanel';
import { memo, useMemo } from 'react';
import { useTrafficStore } from './stores/useTrafficStore';

import './App.css';

// Preload environment textures
function EnvironmentPreloader() {
  // Preload both presets at startup
  useEnvironment({ preset: 'city' });
  useEnvironment({ preset: 'night' });
  return null;
}

// Memoized parking lot to prevent re-render on timeOfDay change
const MemoizedParkingLot = memo(ParkingLot);
const MemoizedVehicleManager = memo(VehicleManager);

function Scene() {
  // Environment Controls from Store
  const worldConfig = useTrafficStore(state => state.worldConfig);
  const { timeOfDay, capacity } = worldConfig;

  const isNight = timeOfDay === 'Night';

  // Day/Night Configuration - memoized to prevent unnecessary recalculations
  const lighting = useMemo(() => isNight ? {
    ambient: { intensity: 0.1, color: '#1a1a2e' },
    directional: {
      position: [10, 20, 10] as [number, number, number],
      intensity: 0.5,
      color: '#aaccff'
    },
    sky: { sunPosition: [100, -10, 100] as [number, number, number], inclination: 0.6, azimuth: 0.25 },
    envPreset: 'night' as const,
    background: '#0f172a'
  } : {
    ambient: { intensity: 0.6, color: '#ffffff' },
    directional: {
      position: [10, 30, 20] as [number, number, number],
      intensity: 1.5,
      color: '#ffffff'
    },
    sky: { sunPosition: [100, 20, 100] as [number, number, number], inclination: 0, azimuth: 0.25 },
    envPreset: 'city' as const,
    background: '#87CEEB'
  }, [isNight]);

  return (
    <>
      <color attach="background" args={[lighting.background]} />

      {/* Dynamic Lighting */}
      <ambientLight intensity={lighting.ambient.intensity} color={lighting.ambient.color} />
      <directionalLight
        position={lighting.directional.position}
        intensity={lighting.directional.intensity}
        color={lighting.directional.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Memoized components - won't re-render on timeOfDay change */}
      <MemoizedParkingLot capacity={capacity} />
      <EnvironmentWrapper capacity={capacity} />
      <MemoizedVehicleManager capacity={capacity} />

      <OrbitControls target={[10, 0, 0]} />

      {/* Sky & Atmosphere */}
      <Sky
        sunPosition={lighting.sky.sunPosition}
        inclination={lighting.sky.inclination}
        azimuth={lighting.sky.azimuth}
      />
      <Environment preset={lighting.envPreset} />

      {/* XYZ Orientation Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport
          axisColors={['#ff3653', '#0adb50', '#2c8fdf']}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  );
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ControlPanel />
      <Canvas shadows camera={{ position: [-10, 30, 40], fov: 50 }}>
        <EnvironmentPreloader />
        <Scene />
      </Canvas>
    </div>
  );
}

export default App;

