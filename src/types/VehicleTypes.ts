/**
 * Vehicle Types and Data Structures for Parking Simulation
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

export interface IVehicleData {
    id: string;
    type: VehicleType;
    plate: string;
    image: string;
    color: string;
    state: 'moving' | 'parked';
    modelUrl: string;
    modelScale: number;
    modelRotation?: [number, number, number];
    modelTexture?: string;
    modelYOffset?: number;
}
