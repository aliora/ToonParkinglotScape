import { useMemo } from 'react';
import { DIMENSIONS } from '../config/constants';

export const useParkingLayout = (capacity: number) => {
    return useMemo(() => {
        const { SLOT_WIDTH, SLOT_DEPTH, LANE_GAP, MAX_ROWS, GAP_SIZE, BUFFER } = DIMENSIONS;

        let rows = 1;
        let cols = capacity;

        if (capacity > 0) {
            const neededRows = Math.ceil(capacity / preferredCols);
            rows = Math.max(1, Math.min(MAX_ROWS, neededRows));
            cols = Math.ceil(capacity / rows);
        }

        const numGaps = Math.floor((cols - 1) / 5);
        const parkingWidth = cols * SLOT_WIDTH + numGaps * GAP_SIZE;

        const pairHeight = 2 * SLOT_DEPTH + LANE_GAP;
        const totalPairs = Math.ceil(rows / 2);
        const blockHeight = totalPairs * pairHeight;

        // Bounding box logic
        const minZ = -blockHeight / 2 - 5;
        const maxZ = blockHeight / 2 + 5;
        const minX = -5; // Entrance area
        const maxX = parkingWidth + 10; // Right edge

        return {
            rows,
            cols,
            parkingWidth,
            blockHeight,
            minZ,
            maxZ,
            minX,
            maxX,
            pairHeight,
            boundMinX: minX - BUFFER,
            boundMaxX: maxX + BUFFER,
            boundMinZ: minZ,
            boundMaxZ: maxZ,
        };
    }, [capacity]);
};

// Helper for local variables if needed inside useMemo
const preferredCols = DIMENSIONS.PREFERRED_COLS;
