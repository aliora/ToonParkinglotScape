
import React, { useMemo } from 'react';
import { Plane, Box } from '@react-three/drei';

interface ParkingLotProps {
    capacity?: number;
}

export const ParkingLot: React.FC<ParkingLotProps> = ({
    capacity = 10,
}) => {
    // Constants
    const slotWidth = 3;
    const slotDepth = 6;
    const laneGap = 8;
    const maxRows = 4;
    const preferredCols = 5;
    const gapSize = 8; // Gap width between blocks of 5, doubled for lights

    let rows = 1;
    let cols = capacity;

    if (capacity > 0) {
        const neededRows = Math.ceil(capacity / preferredCols);
        rows = Math.max(1, Math.min(maxRows, neededRows));
        cols = Math.ceil(capacity / rows);
    }

    // Calculate gaps for the full width of cols
    // Calculate gaps for the full width of cols
    const numGaps = Math.floor((cols - 1) / 5);
    const parkingWidth = cols * slotWidth + numGaps * gapSize;

    // Calculate dynamic depth matching EnvironmentWrapper
    const pairHeight = 2 * slotDepth + laneGap;
    const totalPairs = Math.ceil(rows / 2);
    const blockHeight = totalPairs * pairHeight;

    const groundWidth = parkingWidth + 40;
    const groundDepth = blockHeight + 10;

    const groundColor = '#333333';
    const lineColor = '#FFFFFF';

    const gates = useMemo(() => {
        // Single gate placed at the entrance road connection
        // Road is centered at Z=0 and starts around X=-15
        return [
            <group key="gate-main" position={[-14, 0, 0]}>
                {/* Booth - moved to Z=9 to be clearly off the 14-width road (which is -7 to 7) */}
                <Box position={[0, 1.5, 9]} args={[2, 3, 2]} castShadow>
                    <meshStandardMaterial color="#4444FF" />
                </Box>
                {/* Barrier Stand */}
                <Box position={[0, 1, 7.5]} args={[0.5, 2, 0.5]}>
                    <meshStandardMaterial color="#FFFF00" />
                </Box>
                {/* Barrier Arm - extends from 7.5 inwards. Length 8 covers 3.5 to 11.5? No. Center it. */}
                {/* If center is 3.5. Length 8 -> -0.5 to 7.5. Covers right lane effectively. */}
                <Box position={[0, 2, 3.5]} args={[0.2, 0.2, 8]} rotation={[0, 0, 0]}>
                    <meshStandardMaterial color="#FF0000" />
                </Box>
            </group>
        ];
    }, []);


    const lines = useMemo(() => {
        const linesArray = [];

        const startX = 5;

        // Recalculate block metrics for row Z positions
        const pairHeight = 2 * slotDepth + laneGap;
        const totalPairs = Math.ceil(rows / 2);
        const blockHeight = totalPairs * pairHeight;
        const startBlockZ = -(blockHeight / 2) + pairHeight / 2;

        for (let r = 0; r < rows; r++) {
            const pairIndex = Math.floor(r / 2);
            const isEven = r % 2 === 0;
            const pairCenterZ = startBlockZ + pairIndex * pairHeight;

            const zPos = isEven
                ? pairCenterZ - (laneGap / 2 + slotDepth / 2)
                : pairCenterZ + (laneGap / 2 + slotDepth / 2);

            const backLineZ = isEven ? zPos - slotDepth / 2 : zPos + slotDepth / 2;



            for (let s = 0; s < cols; s++) {
                // Check capacity limit per row distribution approximation? 
                // We iterate s from 0..cols. 
                // But the total capacity logic was: "fill columns".
                // The implementation before: "fill rows until full".
                // My previous logic: `if (currentSlotIndex >= capacity) break;` where `currentSlotIndex = r * cols + s`.
                // This distributes slots row by row. But `cols` relies on `capacity / rows`.
                // It should be fine.

                const currentSlotIndex = r * cols + s;
                if (currentSlotIndex >= capacity) break;

                // Gap Logic
                const gapOffset = Math.floor(s / 5) * gapSize;
                const xPos = startX + s * slotWidth + gapOffset;

                // Visual Lines
                linesArray.push(
                    <Box
                        key={`line-side-l-${r}-${s}`}
                        position={[xPos - slotWidth / 2, 0.02, zPos]}
                        args={[0.15, 0.02, slotDepth]}
                    >
                        <meshStandardMaterial color={lineColor} />
                    </Box>
                );

                // Right line?
                if (s === cols - 1 || currentSlotIndex === capacity - 1 || (s + 1) % 5 === 0) {
                    // If next slot is a new block (gap), we need a right line for current block end?
                    // Actually, usually slots share lines.
                    // If there is a gap, the current slot (index 9, 19...) needs a right line.
                    // AND the next slot (index 10, 20...) needs a left line (handled by loop).

                    linesArray.push(
                        <Box
                            key={`line-side-r-${r}-${s}`}
                            position={[xPos + slotWidth / 2, 0.02, zPos]}
                            args={[0.15, 0.02, slotDepth]}
                        >
                            <meshStandardMaterial color={lineColor} />
                        </Box>
                    );
                }

                // Back Line
                linesArray.push(
                    <Box
                        key={`line-back-${r}-${s}`}
                        position={[xPos, 0.02, backLineZ]}
                        args={[slotWidth + 0.15, 0.02, 0.15]}
                    >
                        <meshStandardMaterial color={lineColor} />
                    </Box>
                );
            }
        }
        return linesArray;
    }, [rows, cols, capacity, gapSize]);

    return (
        <group>
            {/* Ground Plane */}
            <Plane
                args={[groundWidth, groundDepth]}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[groundWidth / 2 - 15, -0.01, 0]}
                receiveShadow
            >
                <meshStandardMaterial color={groundColor} roughness={0.8} />
            </Plane>

            {/* Gates */}
            {gates}

            {/* Lines */}
            {lines}
        </group>
    );
};
