/**
 * ToonParkingLot External API
 * Interface for controlling the parking visualization from external systems (Laravel/Filament)
 */

import type { ExternalVehicleData } from '../types/VehicleTypes';

// Re-export for convenience
export type { ExternalVehicleData } from '../types/VehicleTypes';

/**
 * Initialization configuration
 */
export interface InitConfig {
    /** Parking lot capacity (required) */
    capacity: number;

    /** Vehicles that should appear already parked on init */
    preParkedVehicles?: ExternalVehicleData[];

    /** Enable automatic day/night based on system time (default: true) */
    autoTimeOfDay?: boolean;

    /** Manual time of day override (only used if autoTimeOfDay is false) */
    timeOfDay?: 'Day' | 'Night';

    /** Show control panel UI (default: false for embedded mode) */
    showControls?: boolean;
}

/**
 * ToonParkingLot API Interface
 * Exposed as window.ToonParkingLot global object
 */
export interface ToonParkingLotAPI {
    /**
     * Initialize the parking lot visualization
     * @param container - DOM element to render into
     * @param config - Initialization configuration
     */
    init(container: HTMLElement, config: InitConfig): void;

    /**
     * Destroy the visualization and clean up
     */
    destroy(): void;

    // --- VEHICLE CONTROL ---

    /**
     * Add a new vehicle with entry animation
     * Vehicle will enter from spawn point and park in an available spot
     */
    addVehicle(data: ExternalVehicleData): void;

    /**
     * Trigger vehicle exit with animation
     * Vehicle will leave its parking spot and exit the scene
     */
    triggerExit(vehicleId: string): void;

    /**
     * Remove vehicle instantly (no animation)
     */
    removeVehicle(vehicleId: string): void;

    /**
     * Get all currently parked vehicles
     */
    getParkedVehicles(): ExternalVehicleData[];

    /**
     * Get number of available parking spots
     */
    getAvailableSpots(): number;

    /**
     * Check if parking lot is full
     */
    isFull(): boolean;

    // --- EVENT CALLBACKS ---

    /**
     * Register callback for when a vehicle finishes parking
     */
    onVehicleParked(callback: (data: ExternalVehicleData) => void): () => void;

    /**
     * Register callback for when a vehicle exits the scene
     */
    onVehicleExited(callback: (vehicleId: string) => void): () => void;

    /**
     * Register callback for when parking lot becomes full
     */
    onParkingFull(callback: () => void): () => void;

    // --- CONFIGURATION ---

    /**
     * Update time of day manually
     */
    setTimeOfDay(time: 'Day' | 'Night'): void;

    /**
     * Get current time of day setting
     */
    getTimeOfDay(): 'Day' | 'Night';
}

// Event callback storage (for internal use)
export interface EventCallbacks {
    onVehicleParked: ((data: ExternalVehicleData) => void)[];
    onVehicleExited: ((vehicleId: string) => void)[];
    onParkingFull: (() => void)[];
}
