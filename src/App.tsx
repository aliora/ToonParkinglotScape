
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import { Leva, useControls } from 'leva';
import { ParkingLot } from './components/ParkingLot';
import './App.css';

function Scene() {
  const config = useControls('Parking Lot', {
    capacity: { value: 20, min: 1, max: 200, step: 1, label: 'Total Capacity' },
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

      <ParkingLot
        capacity={config.capacity}
      />

      <OrbitControls target={[10, 0, 0]} />
      <Sky sunPosition={[100, 20, 100]} />
      <Environment preset="city" />
    </>
  );
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Leva collapsed={false} />
      <Canvas shadows camera={{ position: [-10, 30, 40], fov: 50 }}>
        <Scene />
      </Canvas>
    </div>
  );
}

export default App;
