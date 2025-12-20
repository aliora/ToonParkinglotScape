import { v4 as uuidv4 } from 'uuid';
import { VehicleType } from '../types/VehicleTypes';
import type { IVehicleData } from '../types/VehicleTypes';
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
 */
export function getImageByType(type: VehicleType): string {
    const imageMap: Record<VehicleType, string> = {
        [VehicleType.CAR]: '/assets/ui/car.png',
        [VehicleType.MINIBUS]: '/assets/ui/minibus.png',
        [VehicleType.BUS]: '/assets/ui/bus.png',
        [VehicleType.TRUCK]: '/assets/ui/truck.png',
    };
    return imageMap[type];
}

/**
 * Generates a random hex color
 */
function generateRandomColor(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

/**
 * Returns a random VehicleType
 */
function getRandomVehicleType(): VehicleType {
    const types = Object.values(VehicleType) as VehicleType[];
    return types[Math.floor(Math.random() * types.length)];
}

/**
 * Creates a random vehicle with optional type specification
 */
export function createRandomVehicle(type?: VehicleType): IVehicleData {
    const vehicleType = type ?? getRandomVehicleType();

    // Select random model config
    const models = VEHICLE_MODELS[vehicleType];
    const modelConfig = models && models.length > 0
        ? models[Math.floor(Math.random() * models.length)]
        : { model: 'Car.fbx', scale: 0.015 };

    return {
        id: uuidv4(),
        type: vehicleType,
        plate: generatePlate(),
        image: getImageByType(vehicleType),
        color: generateRandomColor(),
        state: 'moving',
        modelUrl: modelConfig.model,
        modelScale: modelConfig.scale,
        modelRotation: modelConfig.rotation,
        modelTexture: modelConfig.texture,
        modelYOffset: modelConfig.yOffset,
    };
}

export const VehicleFactory = {
    generatePlate,
    getImageByType,
    createRandomVehicle,
};

export default VehicleFactory;
