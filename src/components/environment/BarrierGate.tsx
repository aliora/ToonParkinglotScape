import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { Group, MathUtils } from 'three';
import { useTrafficStore, GateState } from '../../stores/useTrafficStore';
import { TRAFFIC_CONFIG } from '../../config/constants';

interface BarrierGateProps {
    position?: [number, number, number];
    type: 'entry' | 'exit';
}

export function BarrierGate({ position = [-14, 0, -5], type }: BarrierGateProps) {
    const gateState = useTrafficStore((state) =>
        type === 'entry' ? state.entryGateState : state.exitGateState
    );

    // Store Actions
    const notifyOpen = useTrafficStore((state) =>
        type === 'entry' ? state.notifyEntryGateOpen : state.notifyExitGateOpen
    );
    const notifyClosed = useTrafficStore((state) =>
        type === 'entry' ? state.notifyEntryGateClosed : state.notifyExitGateClosed
    );

    const armRef = useRef<Group>(null);
    const armLen = TRAFFIC_CONFIG.BARRIER_ARM_LENGTH;
    const armCenter = armLen / 2;

    // Rotation values
    // Open: -PI/2 (Vertical up)
    // Closed: 0 (Horizontal)
    const targetRotationX = (gateState === GateState.OPEN || gateState === GateState.OPENING)
        ? -Math.PI / 2
        : 0; // Closed

    useFrame((_, delta) => {
        if (armRef.current) {
            // Smoothly interpolate rotation
            const speed = 4.0;
            armRef.current.rotation.x = MathUtils.damp(
                armRef.current.rotation.x,
                targetRotationX,
                speed,
                delta
            );

            if (gateState === GateState.OPENING) {
                if (Math.abs(armRef.current.rotation.x - (-Math.PI / 2)) < 0.1) {
                    notifyOpen();
                }
            } else if (gateState === GateState.CLOSING) {
                // Check if closed (rotation near 0)
                if (Math.abs(armRef.current.rotation.x) < 0.1) {
                    notifyClosed();
                }
            }
        }
    });

    // Light color based on state
    const lightColor = (gateState === GateState.OPEN || gateState === GateState.OPENING) ? "#27ae60" : "#e74c3c";

    return (
        <group position={position}>
            {/* Base post */}
            <Box position={[0, 1.5, 0]} args={[1.5, 3, 1.5]} castShadow>
                <meshStandardMaterial color="#2c3e50" />
            </Box>

            {/* Top light */}
            <Box position={[0, 3.2, 0]} args={[1.8, 0.4, 1.8]} castShadow>
                <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={0.5} />
            </Box>

            {/* Barrier arm */}
            <group ref={armRef} position={[0, 2.8, 0.5]} rotation={[0, 0, 0]}>
                {/* Pivot */}
                <Box position={[0, 0, 0]} args={[0.3, 0.3, 0.3]}>
                    <meshStandardMaterial color="#f1c40f" />
                </Box>

                {/* Arm - Configurable Length */}
                <Box position={[0, 0, armCenter]} args={[0.15, 0.15, armLen]}>
                    <meshStandardMaterial color="#e74c3c" />
                </Box>

                {/* End cap */}
                <Box position={[0, 0, armLen]} args={[0.25, 0.25, 0.5]}>
                    <meshStandardMaterial color="#f39c12" emissive="#f39c12" emissiveIntensity={0.3} />
                </Box>
            </group>

            {/* Support post - Positioned at end of arm */}
            <Box position={[0, 0.5, armLen]} args={[0.3, 1, 0.3]}>
                <meshStandardMaterial color="#7f8c8d" />
            </Box>
        </group>
    );
}

export default BarrierGate;
