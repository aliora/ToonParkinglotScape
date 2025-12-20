import React, { useMemo, Suspense } from 'react';
import { useFBX, Box, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { ErrorBoundary } from './ErrorBoundary';
import { PATHS } from '../config/constants';
import { addWindTarget, removeWindTarget } from '../utils/WindTargets';

interface AssetInstanceProps {
    url: string;
    position: [number, number, number] | readonly [number, number, number];
    rotation?: [number, number, number] | readonly [number, number, number];
    scale?: number;
    texturePath?: string;
    preserveMaterials?: boolean;
    baseColor?: string;
    basePath?: string;
    wind?: boolean;
}

const InnerAssetInstance: React.FC<AssetInstanceProps & { wind?: boolean }> = ({
    url,
    position,
    rotation,
    scale = 1,
    texturePath,
    preserveMaterials = false,
    baseColor,
    basePath = PATHS.BASE,
    wind = false
}) => {
    const fbx = useFBX(basePath + url);
    const texPathToUse = texturePath || PATHS.TEXTURE_DEFAULT;
    const texture = useTexture(texPathToUse);
    const windGroupRef = React.useRef<THREE.Group>(null);
    const timeOffset = useMemo(() => Math.random() * 100, []); // Random start time offset

    const scene = useMemo(() => {
        const clone = SkeletonUtils.clone(fbx);
        if (!preserveMaterials) {
            clone.traverse((child: any) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: texture,
                        transparent: true,
                        alphaTest: 0.5,
                        color: baseColor || '#ffffff', // Apply base color if provided
                    });
                }
            });
        } else if (baseColor) {
            // Apply base color to preserved materials
            clone.traverse((child: any) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material = child.material.map((mat: any) => {
                            const newMat = mat.clone();
                            newMat.color = new THREE.Color(baseColor);
                            return newMat;
                        });
                    } else {
                        child.material = child.material.clone();
                        child.material.color = new THREE.Color(baseColor);
                    }
                }
            });
        }
        return clone;
    }, [fbx, texture, preserveMaterials, baseColor]);

    // Register wind target
    React.useEffect(() => {
        if (wind) {
            const vec = new THREE.Vector3(position[0], position[1], position[2]);
            addWindTarget(vec);
            return () => removeWindTarget(vec);
        }
    }, [wind, position[0], position[1], position[2]]);

    useFrame((state) => {
        if (wind && windGroupRef.current) {
            const t = state.clock.getElapsedTime();
            // Create a wind wave effect based on position
            // Uses position x/z to create a "rolling" wind effect across the map
            const xOff = position[0] * 0.1;
            const zOff = position[2] * 0.1;

            // Primary sway (Low frequency, larger amplitude)
            const sway1 = Math.sin(t * 1.5 + xOff + zOff + timeOffset) * 0.1;

            // Secondary turbulence (High frequency, small amplitude)
            const sway2 = Math.sin(t * 4 + xOff - zOff) * 0.02;

            // Apply rotation around Z axis to tip the tree
            // Also slight X rotation for 3D feel
            windGroupRef.current.rotation.z = sway1 + sway2;
            windGroupRef.current.rotation.x = Math.cos(t * 1.2 + xOff) * 0.01;
        }
    });

    return (
        <group position={position}>
            {/* Wind Group: Applies sway relative to world axes */}
            <group ref={windGroupRef}>
                {/* Placement Group: Applies random rotation and scale */}
                <group rotation={rotation} scale={[scale, scale, scale]}>
                    <primitive object={scene} />
                </group>
            </group>
        </group>
    );
};

const AssetFallback = ({ position, rotation, scale }: any) => {
    return (
        <Box
            args={[1, 1, 1]}
            position={position}
            rotation={rotation}
            scale={[scale * 100, scale * 100, scale * 100]}
        >
            <meshStandardMaterial color="red" wireframe />
        </Box>
    );
};

export const AssetInstance: React.FC<AssetInstanceProps> = (props) => {
    return (
        <ErrorBoundary fallback={<AssetFallback {...props} />}>
            <Suspense fallback={null}>
                <InnerAssetInstance {...props} />
            </Suspense>
        </ErrorBoundary>
    );
};
