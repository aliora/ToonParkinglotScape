import { useState, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { VehicleInstance } from '../types';

interface VehicleProps {
    vehicle: VehicleInstance;
}

// Vehicle colors based on vehicle class
const VEHICLE_COLORS: Record<number, string> = {
    1: '#3b82f6', // Car - Blue
    2: '#10b981', // Van - Green
    3: '#f59e0b', // Truck - Orange
    4: '#8b5cf6', // Motorcycle - Purple
};

export function Vehicle({ vehicle }: VehicleProps) {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef<Mesh>(null);

    // Subtle floating animation
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = 0.4 + Math.sin(state.clock.elapsedTime * 2 + vehicle.spotIndex) * 0.02;
        }
    });

    const color = VEHICLE_COLORS[vehicle.vehicleClass] ?? '#3b82f6';

    return (
        <group
            position={[vehicle.position.x + 1.5, 0, vehicle.position.z + 2.5]}
            onPointerEnter={(e) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerLeave={() => {
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
        >
            {/* Car body */}
            <mesh ref={meshRef} castShadow>
                <boxGeometry args={[2.2, 0.8, 4.2]} />
                <meshStandardMaterial
                    color={hovered ? '#60a5fa' : color}
                    metalness={0.6}
                    roughness={0.3}
                />
            </mesh>

            {/* Car roof/cabin */}
            <mesh position={[0, 0.7, -0.3]} castShadow>
                <boxGeometry args={[1.8, 0.5, 2]} />
                <meshStandardMaterial
                    color={hovered ? '#93c5fd' : '#1e3a5f'}
                    metalness={0.3}
                    roughness={0.5}
                />
            </mesh>

            {/* Wheels */}
            {[
                [-0.9, -0.2, 1.3],
                [0.9, -0.2, 1.3],
                [-0.9, -0.2, -1.3],
                [0.9, -0.2, -1.3],
            ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                    <meshStandardMaterial color="#1f2937" />
                </mesh>
            ))}

            {/* Headlights */}
            <mesh position={[0.6, 0.1, 2.1]}>
                <boxGeometry args={[0.3, 0.2, 0.05]} />
                <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[-0.6, 0.1, 2.1]}>
                <boxGeometry args={[0.3, 0.2, 0.05]} />
                <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={0.3} />
            </mesh>

            {/* Hover Tooltip with Photo */}
            {hovered && (
                <Html
                    position={[0, 2.5, 0]}
                    center
                    distanceFactor={15}
                    style={{ pointerEvents: 'none' }}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-3 min-w-[200px] border border-gray-200 dark:border-gray-700">
                        {/* Vehicle Photo */}
                        {vehicle.photoUrl && (
                            <div className="mb-2 rounded-lg overflow-hidden">
                                <img
                                    src={vehicle.photoUrl}
                                    alt={`Araç - ${vehicle.plateNumber}`}
                                    className="w-full h-32 object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        )}

                        {/* Plate Number */}
                        <div className="bg-yellow-400 text-black font-bold text-lg px-3 py-1 rounded text-center tracking-wider">
                            {vehicle.plateNumber}
                        </div>

                        {/* Entry Time */}
                        {vehicle.entryAt && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                                Giriş: {new Date(vehicle.entryAt).toLocaleTimeString('tr-TR')}
                            </div>
                        )}
                    </div>
                </Html>
            )}
        </group>
    );
}
