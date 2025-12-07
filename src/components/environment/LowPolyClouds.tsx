import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AssetInstance } from '../AssetInstance';
import * as THREE from 'three';

interface Props {
    boundMinX?: number;
    boundMaxX?: number;
    boundMinZ?: number;
    boundMaxZ?: number;
    density?: number; // Clouds per 100x100 area
    height?: number;
    color?: string;
}

export const LowPolyClouds: React.FC<Props> = ({
    boundMinX = -50,
    boundMaxX = 50,
    boundMinZ = -50,
    boundMaxZ = 50,
    density = 1,
    height = 40,
    color = '#ffffff'
}) => {
    const groupRef = useRef<THREE.Group>(null);

    // Calculate dynamic area and count
    const width = boundMaxX - boundMinX + 100; // Add buffer
    const depth = boundMaxZ - boundMinZ + 100; // Add buffer
    const area = width * depth;
    const count = Math.floor((area / 10000) * density * 20); // Base density scaling

    // Generate static cloud data
    const clouds = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = boundMinX - 50 + Math.random() * width;
            const z = boundMinZ - 50 + Math.random() * depth;
            const y = height + (Math.random() - 0.5) * 20; // Increased random height variation

            const scale = 0.2 + Math.random() * 0.5; // Adjusted scale for new model
            const rotation = [
                Math.random() * Math.PI * 0.1, // Reduced X tilt
                Math.random() * Math.PI * 0.5, // Reduced Y rotation (quarter circle)
                0 // No Z-axis rotation
            ] as [number, number, number]; // Random rotation excluding Z
            const model = 'low_poly_cloud.fbx';
            const speed = 0.005 + Math.random() * 0.01; // Movement speed

            temp.push({ position: [x, y, z] as [number, number, number], scale, rotation, model, speed, startX: x });
        }
        return temp;
    }, [count, width, depth, height, boundMinX, boundMinZ]);

    // Animate clouds
    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.children.forEach((child, i) => {
                const cloud = clouds[i];
                child.position.x += cloud.speed * 20 * delta; // Move along X

                // Wrap around dynamic width
                // Calculate max X threshold based on current bounds
                const maxX = boundMaxX + 50;
                const minX = boundMinX - 50;

                if (child.position.x > maxX) {
                    child.position.x = minX;
                }
            });
        }
    });

    return (
        <group ref={groupRef}>
            {clouds.map((cloud, i) => (
                <AssetInstance
                    key={`cloud-${i}`}
                    url={cloud.model}
                    position={cloud.position}
                    rotation={cloud.rotation}
                    scale={cloud.scale}
                    preserveMaterials={true} // Use original material but override color 
                    baseColor={color} // Use dynamic lighting color
                />
            ))}
        </group>
    );
};
