import { useTrafficStore } from '../stores/useTrafficStore';
import { Vehicle } from './Vehicle';

export function VehicleManager() {
    const vehicles = useTrafficStore((state) => state.vehicles);

    return (
        <group>
            {vehicles.map((vehicle) => (
                <Vehicle key={vehicle.id} vehicle={vehicle} />
            ))}
        </group>
    );
}
