import { useEffect } from 'react';
import { Vector3 } from 'three';
import type { ParkingSpot } from '../../stores/useTrafficStore';
import { useTrafficStore } from '../../stores/useTrafficStore';
import { VehicleBox } from './VehicleBox';
import { useParkingLayout } from '../../hooks/useParkingLayout';
import { DIMENSIONS } from '../../config/constants';

interface VehicleManagerProps {
    capacity: number;
}

export function VehicleManager({ capacity }: VehicleManagerProps) {
    const vehicles = useTrafficStore((state) => state.vehicles);
    const setSpots = useTrafficStore((state) => state.setSpots);
    const setLayoutInfo = useTrafficStore((state) => state.setLayoutInfo);
    const layout = useParkingLayout(capacity);

    // Initialize parking spots and layout info
    useEffect(() => {
        const spots: ParkingSpot[] = [];
        const { SLOT_WIDTH, SLOT_DEPTH, LANE_GAP, GAP_SIZE } = DIMENSIONS;
        const startX = 5;

        // Calculate number of pairs
        const numPairs = Math.ceil(layout.rows / 2);

        // Store layout info for waypoint generation
        setLayoutInfo(layout.blockHeight, layout.pairHeight, numPairs);

        let spotIndex = 0;

        for (let row = 0; row < layout.rows; row++) {
            // Determine which pair this row belongs to
            const pairIndex = Math.floor(row / 2);
            const isTopOfPair = row % 2 === 0;

            // Calculate pair center and row positions
            const startBlockZ = -(layout.blockHeight / 2) + layout.pairHeight / 2;
            const pairCenterZ = startBlockZ + pairIndex * layout.pairHeight;

            // Row Z position (center of parking slot)
            const rowZ = isTopOfPair
                ? pairCenterZ - LANE_GAP / 2 - SLOT_DEPTH / 2
                : pairCenterZ + LANE_GAP / 2 + SLOT_DEPTH / 2;

            // Lane Z position (center of the driving lane between pairs)
            const laneZ = pairCenterZ;

            for (let col = 0; col < layout.cols && spotIndex < capacity; col++) {
                // Calculate gaps for X position
                const gapsBeforeCol = Math.floor(col / 5);
                const x = startX + col * SLOT_WIDTH + gapsBeforeCol * GAP_SIZE;

                spots.push({
                    id: `spot-${spotIndex}`,
                    position: new Vector3(x, 0, rowZ),
                    laneZ: laneZ,
                    occupied: false,
                    row: row,
                    pairIndex: pairIndex,
                    isTopRow: isTopOfPair,
                });

                spotIndex++;
            }
        }

        setSpots(spots);
    }, [capacity, layout, setSpots, setLayoutInfo]);

    return (
        <group name="vehicle-manager">
            {vehicles.map((vehicle) => (
                <VehicleBox key={vehicle.id} data={vehicle} />
            ))}
        </group>
    );
}

export default VehicleManager;
