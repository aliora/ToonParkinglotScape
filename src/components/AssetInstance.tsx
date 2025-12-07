import React, { useMemo, Suspense } from 'react';
import { useFBX, Box, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { ErrorBoundary } from './ErrorBoundary';
import { PATHS } from '../config/constants';

interface AssetInstanceProps {
    url: string;
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    texturePath?: string;
    preserveMaterials?: boolean;
    baseColor?: string;
}

const InnerAssetInstance: React.FC<AssetInstanceProps> = ({
    url,
    position,
    rotation,
    scale = 1,
    texturePath,
    preserveMaterials = false,
    baseColor
}) => {
    const fbx = useFBX(PATHS.BASE + url);
    const texPathToUse = texturePath || PATHS.TEXTURE_DEFAULT;
    const texture = useTexture(texPathToUse);

    const scene = useMemo(() => {
        const clone = SkeletonUtils.clone(fbx);
        if (!preserveMaterials) {
            clone.traverse((child: any) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: texture,
                        transparent: true,
                        alphaTest: 0.5
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

    return (
        <primitive
            object={scene}
            position={position}
            rotation={rotation}
            scale={[scale, scale, scale]}
        />
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
