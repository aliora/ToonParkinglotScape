
import { useMemo, Suspense } from 'react';
import { Plane, Box } from '@react-three/drei';
import { useParkingLayout } from '../hooks/useParkingLayout';
import { DIMENSIONS, COLORS, PARKING_FENCE } from '../config/constants';
import { AssetInstance } from './AssetInstance';
import { BarrierGate } from './environment/BarrierGate';

interface ParkingLotProps {
    capacity?: number;
}

export const ParkingLot: React.FC<ParkingLotProps> = ({ capacity = 10 }) => {
    const {
        rows,
        cols,
        parkingWidth,
        blockHeight,
        pairHeight,
    } = useParkingLayout(capacity);

    const groundWidth = parkingWidth + 40;
    const groundDepth = blockHeight + 10;

    // Barrier gate is now a separate animated component

    const lines = useMemo(() => {
        const { SLOT_WIDTH, SLOT_DEPTH, LANE_GAP, GAP_SIZE } = DIMENSIONS;
        const els: React.ReactNode[] = [];
        const startX = 5;
        const startBlockZ = -(blockHeight / 2) + pairHeight / 2;

        for (let r = 0; r < rows; r++) {
            const pairIndex = Math.floor(r / 2);
            const isEven = r % 2 === 0;
            const pairCenterZ = startBlockZ + pairIndex * pairHeight;

            const zPos = isEven
                ? pairCenterZ - (LANE_GAP / 2 + SLOT_DEPTH / 2)
                : pairCenterZ + (LANE_GAP / 2 + SLOT_DEPTH / 2);

            const backLineZ = isEven ? zPos - SLOT_DEPTH / 2 : zPos + SLOT_DEPTH / 2;

            for (let s = 0; s < cols; s++) {
                const currentSlotIndex = r * cols + s;
                if (currentSlotIndex >= capacity) break;

                const gapOffset = Math.floor(s / 5) * GAP_SIZE;
                const xPos = startX + s * SLOT_WIDTH + gapOffset;

                // Left Line
                els.push(
                    <Box
                        key={`line-l-${r}-${s}`}
                        position={[xPos - SLOT_WIDTH / 2, 0.02, zPos]}
                        args={[0.15, 0.02, SLOT_DEPTH]}
                    >
                        <meshStandardMaterial color={COLORS.LINE} />
                    </Box>
                );

                // Right Line (only for edges or before gaps)
                if (s === cols - 1 || currentSlotIndex === capacity - 1 || (s + 1) % 5 === 0) {
                    els.push(
                        <Box
                            key={`line-r-${r}-${s}`}
                            position={[xPos + SLOT_WIDTH / 2, 0.02, zPos]}
                            args={[0.15, 0.02, SLOT_DEPTH]}
                        >
                            <meshStandardMaterial color={COLORS.LINE} />
                        </Box>
                    );
                }

                // Back Line
                els.push(
                    <Box
                        key={`line-b-${r}-${s}`}
                        position={[xPos, 0.02, backLineZ]}
                        args={[SLOT_WIDTH + 0.15, 0.02, 0.15]}
                    >
                        <meshStandardMaterial color={COLORS.LINE} />
                    </Box>
                );
            }
        }
        return els;
    }, [rows, cols, capacity, blockHeight, pairHeight]);

    // Fence spawning on parking lines
    const fences = useMemo(() => {
        const { SLOT_WIDTH, SLOT_DEPTH, LANE_GAP, GAP_SIZE } = DIMENSIONS;
        const fence: React.ReactNode[] = [];
        const startX = 5;
        const startBlockZ = -(blockHeight / 2) + pairHeight / 2;

        for (let r = 0; r < rows; r++) {
            const pairIndex = Math.floor(r / 2);
            const isEven = r % 2 === 0;
            const pairCenterZ = startBlockZ + pairIndex * pairHeight;

            const zPos = isEven
                ? pairCenterZ - (LANE_GAP / 2 + SLOT_DEPTH / 2)
                : pairCenterZ + (LANE_GAP / 2 + SLOT_DEPTH / 2);

            const backLineZ = isEven ? zPos - SLOT_DEPTH / 2 : zPos + SLOT_DEPTH / 2;

            for (let s = 0; s < cols; s++) {
                const currentSlotIndex = r * cols + s;
                if (currentSlotIndex >= capacity) break;

                const gapOffset = Math.floor(s / 5) * GAP_SIZE;
                const xPos = startX + s * SLOT_WIDTH + gapOffset;

                // Back Line Fence (horizontal - Z axis)
                const yPos = (0 * PARKING_FENCE.yOffsetMultiplier) + PARKING_FENCE.yOffsetAdd;
                fence.push(
                    <AssetInstance
                        key={`fence-b-${r}-${s}`}
                        url={PARKING_FENCE.model}
                        position={[xPos, yPos, backLineZ]}
                        rotation={PARKING_FENCE.rotationHorizontal}
                        scale={PARKING_FENCE.scale}
                        preserveMaterials={true}
                    />
                );
            }
        }
        return fence;
    }, [rows, cols, capacity, blockHeight, pairHeight]);

    return (
        <group>
            {/* Ground Plane */}
            <Plane
                args={[groundWidth, groundDepth]}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[groundWidth / 2 - 15, -0.01, 0]}
                receiveShadow
            >
                <meshStandardMaterial color={COLORS.GROUND} roughness={0.8} />
            </Plane>

            <BarrierGate position={[-14, 0, -5]} />
            {lines}
            <Suspense fallback={null}>
                {fences}
            </Suspense>
        </group>
    );
};

