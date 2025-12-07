import React, { useMemo } from 'react';
import { Box } from '@react-three/drei';

interface Props {
    minX: number;
}

export const ConnectionRoad: React.FC<Props> = ({ minX }) => {
    return useMemo(() => {
        const roadLength = 35;
        const roadWidth = 14;
        const roadStartX = minX - 10;
        // Sync end point to start point
        const roadEndX = roadStartX - roadLength;
        const roadCenterX = (roadStartX + roadEndX) / 2;

        return (
            <group key="connection-road">
                <Box
                    position={[roadCenterX, 0.01, 0]}
                    args={[roadLength, 0.05, roadWidth]}
                    receiveShadow
                >
                    <meshStandardMaterial color="#333333" />
                </Box>
                {/* Road Center Lines (Double or Dashed) */}
                {Array.from({ length: 10 }).map((_, i) => (
                    <Box
                        key={`road-line-${i}`}
                        position={[roadStartX - (i * (roadLength / 10)) - 2.5, 0.06, 0]}
                        args={[2.5, 0.02, 0.4]}
                    >
                        <meshStandardMaterial color="#FFFFFF" />
                    </Box>
                ))}
            </group>
        );
    }, [minX]);
};
