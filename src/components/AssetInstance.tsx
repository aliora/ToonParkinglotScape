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
}

const InnerAssetInstance: React.FC<AssetInstanceProps> = ({
    url,
    position,
    rotation,
    scale = 1,
    texturePath
}) => {
    const fbx = useFBX(PATHS.BASE + url);
    const texPathToUse = texturePath || PATHS.TEXTURE_DEFAULT;
    const texture = useTexture(texPathToUse);

    const scene = useMemo(() => {
        const clone = SkeletonUtils.clone(fbx);
        clone.traverse((child: any) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    map: texture,
                    transparent: true,
                    alphaTest: 0.5
                });
            }
        });
        return clone;
    }, [fbx, texture]);

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
