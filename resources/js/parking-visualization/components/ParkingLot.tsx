import { useMemo } from 'react';

interface ParkingLotProps {
    capacity: number;
}

/**
 * Calculate parking lot dimensions based on capacity
 */
function calculateDimensions(capacity: number) {
    const cols = Math.ceil(Math.sqrt(capacity));
    const rows = Math.ceil(capacity / cols);

    const slotWidth = 3;
    const slotDepth = 5;
    const laneWidth = 4;
    const margin = 3;

    // Each "lane" has two rows of slots facing each other
    const numLanes = Math.ceil(rows / 2);

    const totalWidth = cols * slotWidth + margin * 2;
    const totalDepth = numLanes * (slotDepth * 2 + laneWidth) + margin * 2;

    return { cols, rows, numLanes, slotWidth, slotDepth, laneWidth, totalWidth, totalDepth, margin };
}

export function ParkingLot({ capacity }: ParkingLotProps) {
    const dims = useMemo(() => calculateDimensions(capacity), [capacity]);

    // Generate parking slot markings
    const slotMarkings = useMemo(() => {
        const markings: JSX.Element[] = [];
        let slotIndex = 0;

        for (let lane = 0; lane < dims.numLanes && slotIndex < capacity; lane++) {
            const laneZ = dims.margin + lane * (dims.slotDepth * 2 + dims.laneWidth);

            for (let col = 0; col < dims.cols && slotIndex < capacity; col++) {
                const x = dims.margin + col * dims.slotWidth + dims.slotWidth / 2;

                // Top row slot
                if (slotIndex < capacity) {
                    const z = laneZ + dims.slotDepth / 2;
                    markings.push(
                        <group key={`slot-${slotIndex}`} position={[x, 0.01, z]}>
                            {/* Slot border */}
                            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                                <planeGeometry args={[dims.slotWidth - 0.1, dims.slotDepth - 0.1]} />
                                <meshStandardMaterial
                                    color="#1e3a5f"
                                    transparent
                                    opacity={0.3}
                                />
                            </mesh>
                            {/* Slot number */}
                            {/* We skip text rendering for performance */}
                        </group>
                    );
                    slotIndex++;
                }

                // Bottom row slot (facing opposite direction)
                if (slotIndex < capacity) {
                    const z = laneZ + dims.slotDepth + dims.laneWidth + dims.slotDepth / 2;
                    markings.push(
                        <group key={`slot-${slotIndex}`} position={[x, 0.01, z]}>
                            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                                <planeGeometry args={[dims.slotWidth - 0.1, dims.slotDepth - 0.1]} />
                                <meshStandardMaterial
                                    color="#1e3a5f"
                                    transparent
                                    opacity={0.3}
                                />
                            </mesh>
                        </group>
                    );
                    slotIndex++;
                }
            }
        }

        return markings;
    }, [capacity, dims]);

    // Generate lane markings (center lines)
    const laneMarkings = useMemo(() => {
        const markings: JSX.Element[] = [];

        for (let lane = 0; lane < dims.numLanes; lane++) {
            const laneZ = dims.margin + lane * (dims.slotDepth * 2 + dims.laneWidth) + dims.slotDepth + dims.laneWidth / 2;

            markings.push(
                <mesh
                    key={`lane-${lane}`}
                    position={[dims.totalWidth / 2, 0.02, laneZ]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <planeGeometry args={[dims.totalWidth - dims.margin * 2, 0.15]} />
                    <meshStandardMaterial color="#fbbf24" />
                </mesh>
            );
        }

        return markings;
    }, [dims]);

    return (
        <group>
            {/* Ground plane */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[dims.totalWidth / 2, 0, dims.totalDepth / 2]}
                receiveShadow
            >
                <planeGeometry args={[dims.totalWidth, dims.totalDepth]} />
                <meshStandardMaterial color="#1a1a2e" />
            </mesh>

            {/* Asphalt layer */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[dims.totalWidth / 2, 0.005, dims.totalDepth / 2]}
                receiveShadow
            >
                <planeGeometry args={[dims.totalWidth - 2, dims.totalDepth - 2]} />
                <meshStandardMaterial color="#2d3748" />
            </mesh>

            {/* Parking slot markings */}
            {slotMarkings}

            {/* Lane markings */}
            {laneMarkings}

            {/* Entrance marker */}
            <mesh position={[-1, 0.5, dims.totalDepth / 2]}>
                <boxGeometry args={[0.2, 1, 3]} />
                <meshStandardMaterial color="#22c55e" />
            </mesh>

            {/* Exit marker */}
            <mesh position={[dims.totalWidth + 1, 0.5, dims.totalDepth / 2]}>
                <boxGeometry args={[0.2, 1, 3]} />
                <meshStandardMaterial color="#ef4444" />
            </mesh>
        </group>
    );
}
