/**
 * Vehicle Types and Data Structures for Parking Simulation
 * Synchronized with Laravel PHP enum: App\Enums\VehicleType
 */

export const VehicleType = {
    CAR: 1,
    MINIBUS: 2,
    BUS: 3,
    PICKUP: 4,
    TRUCK: 5,
    HEAVYTRUCK: 6,
    MOTORCYCLE: 7,
} as const;

export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

// All valid vehicle type numbers (for external API validation)
export const VALID_VEHICLE_TYPES = [1, 2, 3, 4, 5, 6, 7] as const;

// Map unknown types to CAR (default fallback)
export function normalizeVehicleType(type: number): VehicleType {
    if (VALID_VEHICLE_TYPES.includes(type as any)) {
        return type as VehicleType;
    }
    return VehicleType.CAR; // Default fallback
}

export interface IVehicleData {
    id: string;
    type: VehicleType;
    plate: string;
    image: string;
    color?: string;
    state: 'moving' | 'parked';
    modelUrl: string;
    modelScale: number;
    modelRotation?: [number, number, number] | readonly [number, number, number];
    modelTexture?: string;
    modelYOffset?: number;
    entryTime: number; // Unix timestamp - araç giriş zamanı
    isExternalVehicle?: boolean; // True if vehicle was added via external API
}

/**
 * External vehicle data structure (from Laravel/Filament)
 */
export interface ExternalVehicleData {
    id: string;
    type: number; // 1-7, will be normalized
    plate: string;
    image?: string;
    entryTime: number; // Unix timestamp (milliseconds)
}
