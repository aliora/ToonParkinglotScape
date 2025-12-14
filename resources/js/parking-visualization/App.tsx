import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useEffect } from 'react';
import { ParkingLot } from './components/ParkingLot';
import { VehicleManager } from './components/VehicleManager';
import { useTrafficStore } from './stores/useTrafficStore';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import type { MountConfig } from './types';

interface AppProps {
    config: MountConfig;
}

function Scene({ config }: AppProps) {
    const initialize = useTrafficStore((state) => state.initialize);

    // Initialize store with config
    useEffect(() => {
        initialize(config);
    }, [config, initialize]);

    // Setup realtime sync
    useRealtimeSync(config.parkId, config.reverbConfig);

    return (
        <>
            <color attach="background" args={['#0f172a']} />

            {/* Lighting */}
            <ambientLight intensity={0.4} color="#ffffff" />
            <directionalLight
                position={[30, 50, 30]}
                intensity={1.2}
                color="#ffffff"
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={150}
                shadow-camera-left={-60}
                shadow-camera-right={60}
                shadow-camera-top={60}
                shadow-camera-bottom={-60}
            />
            <directionalLight
                position={[-20, 30, -20]}
                intensity={0.3}
                color="#4f46e5"
            />

            {/* 3D Scene */}
            <ParkingLot capacity={config.capacity} />
            <VehicleManager />

            {/* Controls */}
            <OrbitControls
                target={[15, 0, 15]}
                minDistance={10}
                maxDistance={100}
                maxPolarAngle={Math.PI / 2.2}
            />

            {/* Sky & Atmosphere */}
            <Sky
                sunPosition={[100, 20, 100]}
                inclination={0}
                azimuth={0.25}
            />
            <Environment preset="city" />

            {/* Orientation Gizmo */}
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                <GizmoViewport
                    axisColors={['#ff3653', '#0adb50', '#2c8fdf']}
                    labelColor="white"
                />
            </GizmoHelper>
        </>
    );
}

export default function App({ config }: AppProps) {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Canvas
                shadows
                camera={{ position: [-20, 40, 50], fov: 50 }}
                gl={{ antialias: true }}
            >
                <Scene config={config} />
            </Canvas>
        </div>
    );
}
