import { Mesh, Vector3 } from 'three';

// Constants
export const MOVE_SPEED = 10;
export const ROTATION_SPEED = 4;
export const ARRIVAL_THRESHOLD = 0.1;
export const PARKING_APPROACH_DISTANCE = 3.0;
export const PARKING_LERP_SPEED = 3.0;

// Helper: Move mesh towards target, returns true if arrived
export function moveTowardsTarget(
    mesh: Mesh,
    target: Vector3,
    delta: number,
    vehicleHeight: number
): boolean {
    const currentPos = new Vector3(mesh.position.x, 0, mesh.position.z);
    const targetPos = new Vector3(target.x, 0, target.z);
    const direction = new Vector3().subVectors(targetPos, currentPos);
    const distance = direction.length();

    if (distance < ARRIVAL_THRESHOLD) {
        // Do not snap here yet, let the main loop handle final snap
        return true;
    }

    direction.normalize();

    // Rotate towards target
    if (direction.lengthSq() > 0.001) {
        const targetAngle = Math.atan2(direction.x, direction.z);
        let angleDiff = targetAngle - mesh.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        mesh.rotation.y += angleDiff * ROTATION_SPEED * delta;
    }

    // Move towards target
    const moveDistance = Math.min(MOVE_SPEED * delta, distance);
    mesh.position.x += direction.x * moveDistance;
    mesh.position.z += direction.z * moveDistance;
    mesh.position.y = vehicleHeight / 2;

    return false;
}
