import { v4 as uuidv4 } from 'uuid';
import { VehicleType, normalizeVehicleType } from '../types/VehicleTypes';
import type { IVehicleData, ExternalVehicleData } from '../types/VehicleTypes';
import { VEHICLE_MODELS } from '../config/constants';

// Turkish city codes for license plates (01-81)
const CITY_CODES = Array.from({ length: 81 }, (_, i) => String(i + 1).padStart(2, '0'));
const LETTERS = 'ABCDEFGHJKLMNPRSTUVYZ';

/**
 * Generates a random Turkish-style license plate
 * Format: "34 AB 253" (city code + letters + numbers)
 */
export function generatePlate(): string {
    const cityCode = CITY_CODES[Math.floor(Math.random() * CITY_CODES.length)];
    const letter1 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const letter2 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const numbers = Math.floor(Math.random() * 900 + 100);
    return `${cityCode} ${letter1}${letter2} ${numbers}`;
}

/**
 * Returns the image path for a given vehicle type
 * Includes all 7 types from Laravel VehicleType enum
 */
export function getImageByType(type: VehicleType): string {
    const imageMap: Record<VehicleType, string> = {
        [VehicleType.CAR]: '/assets/ui/car.png',
        [VehicleType.MINIBUS]: '/assets/ui/minibus.png',
        [VehicleType.BUS]: '/assets/ui/bus.png',
        [VehicleType.PICKUP]: '/assets/ui/pickup.png',
        [VehicleType.TRUCK]: '/assets/ui/truck.png',
        [VehicleType.HEAVYTRUCK]: '/assets/ui/heavytruck.png',
        [VehicleType.MOTORCYCLE]: '/assets/ui/motorcycle.png',
    };
    return imageMap[type] ?? '/assets/ui/car.png';
}

/**
 * Returns a random VehicleType
 */
function getRandomVehicleType(): VehicleType {
    const types = Object.values(VehicleType).filter(v => typeof v === 'number') as VehicleType[];
    return types[Math.floor(Math.random() * types.length)];
}

/**
 * Get model configuration for a vehicle type
 * Falls back to CAR models if type has no specific models
 */
function getModelConfig(vehicleType: VehicleType) {
    const models = VEHICLE_MODELS[vehicleType];
    if (models && models.length > 0) {
        return models[Math.floor(Math.random() * models.length)];
    }
    // Fallback to CAR models
    const carModels = VEHICLE_MODELS[VehicleType.CAR];
    return carModels[Math.floor(Math.random() * carModels.length)];
}

/**
 * Creates a random vehicle with optional type specification
 */
export function createRandomVehicle(type?: VehicleType): IVehicleData {
    const vehicleType = type ?? getRandomVehicleType();
    const modelConfig = getModelConfig(vehicleType);

    return {
        id: uuidv4(),
        type: vehicleType,
        plate: generatePlate(),
        image: getImageByType(vehicleType),
        state: 'moving',
        modelUrl: modelConfig.model,
        modelScale: modelConfig.scale,
        modelRotation: modelConfig.rotation,
        modelYOffset: modelConfig.yOffset,
        entryTime: Date.now(),
        isExternalVehicle: false,
    };
}

/**
 * Creates a vehicle from external API data (Laravel/Filament)
 * Uses provided ID, plate, and entryTime from external system
 */
export function createVehicleFromExternal(extData: ExternalVehicleData): IVehicleData {
    const vehicleType = normalizeVehicleType(extData.type);
    const modelConfig = getModelConfig(vehicleType);

    return {
        id: extData.id,
        type: vehicleType,
        plate: extData.plate,
        image: extData.image ?? getImageByType(vehicleType),
        state: 'moving',
        modelUrl: modelConfig.model,
        modelScale: modelConfig.scale,
        modelRotation: modelConfig.rotation,
        modelYOffset: modelConfig.yOffset,
        entryTime: extData.entryTime,
        isExternalVehicle: true,
    };
}

export const VehicleFactory = {
    generatePlate,
    getImageByType,
    createRandomVehicle,
    createVehicleFromExternal,
};

export default VehicleFactory;

