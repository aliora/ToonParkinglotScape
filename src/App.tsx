

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Leva, useControls } from 'leva';
import { ParkingLot } from './components/ParkingLot';
import { EnvironmentWrapper } from './components/EnvironmentWrapper';
import { VehicleManager } from './components/vehicles/VehicleManager';
import { ControlPanel } from './components/ui/ControlPanel';

import './App.css';

function Scene() {
  // Environment Controls
  const { timeOfDay } = useControls('Environment', {
    timeOfDay: { options: ['Day', 'Night'], value: 'Day' },
  });

  const config = useControls('Parking Lot', {
    capacity: { value: 20, min: 1, max: 200, step: 1, label: 'Total Capacity' },
  });

  const isNight = timeOfDay === 'Night';

  // Day/Night Configuration
  const lighting = isNight ? {
    ambient: { intensity: 0.1, color: '#1a1a2e' },     // Moonlit dark blue
    directional: {
      position: [10, 20, 10],
      intensity: 0.5,
      color: '#aaccff'
    }, // Moonlight
    sky: { sunPosition: [100, -10, 100], inclination: 0.6, azimuth: 0.25 }, // Moon position (hidden/low)
    envParams: { preset: 'night' },
    cloudColor: '#2c3e50',
    background: '#0f172a'
  } : {
    ambient: { intensity: 0.6, color: '#ffffff' },     // Bright daylight
    directional: {
      position: [10, 30, 20],
      intensity: 1.5,
      color: '#ffffff'
    }, // Sunlight
    sky: { sunPosition: [100, 20, 100], inclination: 0, azimuth: 0.25 }, // High noon
    envParams: { preset: 'city' },
    cloudColor: '#ffffff',
    background: '#87CEEB'
  };

  return (
    <>
      <color attach="background" args={[lighting.background]} />

      {/* Dynamic Lighting */}
      <ambientLight intensity={lighting.ambient.intensity} color={lighting.ambient.color} />
      <directionalLight
        position={lighting.directional.position as [number, number, number]}
        intensity={lighting.directional.intensity}
        color={lighting.directional.color}
        castShadow
        shadow-mapSize={[2048, 2048]} // Higher res shadows
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      <ParkingLot capacity={config.capacity} />
      <EnvironmentWrapper capacity={config.capacity} />
      <VehicleManager capacity={config.capacity} />

      <OrbitControls target={[10, 0, 0]} />

      {/* Sky & Atmosphere */}
      <Sky
        sunPosition={lighting.sky.sunPosition as [number, number, number]}
        inclination={lighting.sky.inclination}
        azimuth={lighting.sky.azimuth}
      />
      <Environment preset={lighting.envParams.preset as any} />



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
      <Leva collapsed={false} />
      <ControlPanel />
      <Canvas shadows camera={{ position: [-10, 30, 40], fov: 50 }}>
        <Scene />
      </Canvas>
    </div>
  );
}

export default App;
