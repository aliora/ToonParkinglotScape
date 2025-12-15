import { Box } from '@react-three/drei';

interface BarrierGateProps {
    position?: [number, number, number];
}

// Simple decorative barrier - no queue logic
export function BarrierGate({ position = [-14, 0, -5] }: BarrierGateProps) {
    return (
        <group position={position}>
            {/* Base post */}
            <Box position={[0, 1.5, 0]} args={[1.5, 3, 1.5]} castShadow>
                <meshStandardMaterial color="#2c3e50" />
            </Box>

            {/* Top light */}
            <Box position={[0, 3.2, 0]} args={[1.8, 0.4, 1.8]} castShadow>
                <meshStandardMaterial color="#27ae60" />
            </Box>

            {/* Barrier arm - always open */}
            <group position={[0, 2.8, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
                {/* Pivot */}
                <Box position={[0, 0, 0]} args={[0.3, 0.3, 0.3]}>
                    <meshStandardMaterial color="#f1c40f" />
                </Box>

                {/* Arm */}
                <Box position={[0, 0, 6]} args={[0.15, 0.15, 12]}>
                    <meshStandardMaterial color="#e74c3c" />
                </Box>

                {/* End cap */}
                <Box position={[0, 0, 12]} args={[0.25, 0.25, 0.5]}>
                    <meshStandardMaterial color="#f39c12" emissive="#f39c12" emissiveIntensity={0.3} />
                </Box>
            </group>

            {/* Support post */}
            <Box position={[0, 0.5, 12]} args={[0.3, 1, 0.3]}>
                <meshStandardMaterial color="#7f8c8d" />
            </Box>
        </group>
    );
}

export default BarrierGate;
