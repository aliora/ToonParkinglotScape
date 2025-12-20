export interface InitialVehicle {
    id: string;
    plateNumber: string;
    photoUrl: string | null;
    entryAt: string | null;
    vehicleClass: number;
}

export interface ReverbConfig {
    key: string;
    host: string;
    port: number;
    scheme: string;
}

export interface MountConfig {
    parkId: number;
    capacity: number;
    initialVehicles: InitialVehicle[];
    reverbConfig: ReverbConfig;
    onVehicleCountChange?: (count: number) => void;
}

export interface VehicleInstance {
    id: string;
    plateNumber: string;
    photoUrl: string | null;
    entryAt: string | null;
    vehicleClass: number;
    position: { x: number; z: number };
    spotIndex: number;
}

export interface VehicleEnteredEvent {
    sessionUid: string;
    plateNumber: string;
    photoUrl: string | null;
    vehicleClass: number;
}

export interface VehicleExitedEvent {
    sessionUid: string;
}
