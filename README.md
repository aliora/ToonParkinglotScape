# zone-parking-3d

3D Parking Visualization package for Zone using React Three.js.

## Features

- 🚗 Real-time 3D visualization of parking lot
- 📸 Vehicle photos displayed on hover (from `photo_vehicle`)
- 🔄 Cold start: loads existing vehicles on page load
- 📡 Real-time updates via Laravel Reverb/Echo
- 📐 Dynamic parking lot size based on capacity

## Installation

### 1. Add the Package to Zone

Add to `composer.json` in the Zone project:

```json
{
    "repositories": [
        {
            "type": "path",
            "url": "../zone-parking-3d"
        }
    ],
    "require": {
        "zone/parking-3d": "*"
    }
}
```

Then run:

```bash
composer update zone/parking-3d
```

### 2. Install NPM Dependencies

Add these to Zone's `package.json`:

```json
{
    "dependencies": {
        "@react-three/drei": "^10.7.7",
        "@react-three/fiber": "^9.4.2",
        "react": "^19.2.0",
        "react-dom": "^19.2.0",
        "three": "^0.181.2",
        "zustand": "^5.0.9"
    },
    "devDependencies": {
        "@vitejs/plugin-react": "^4.7.0",
        "@types/react": "^19.2.5",
        "@types/react-dom": "^19.2.3",
        "@types/three": "^0.181.0"
    }
}
```

Then run:

```bash
npm install
```

### 3. Configure Vite

Update `vite.config.js` in Zone:

```javascript
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                // Add the parking visualization entry point
                '../zone-parking-3d/resources/js/parking-visualization/main.tsx',
            ],
            refresh: true,
        }),
        tailwindcss(),
        react(),
    ],
    resolve: {
        alias: {
            // Alias for the package
            '@parking-3d': '../zone-parking-3d/resources/js/parking-visualization',
        },
    },
});
```

### 4. Configure Tailwind

Add to `tailwind.config.js` (or CSS file for Tailwind v4):

```javascript
// For Tailwind v3
module.exports = {
    content: [
        // ... existing paths
        '../zone-parking-3d/resources/views/**/*.blade.php',
        '../zone-parking-3d/resources/js/**/*.{js,ts,jsx,tsx}',
    ],
};
```

For Tailwind v4, add to your CSS file:

```css
@source "../zone-parking-3d/resources/views/**/*.blade.php";
@source "../zone-parking-3d/resources/js/**/*.{js,ts,jsx,tsx}";
```

### 5. Register Filament Page

In your Filament Panel provider, register the page:

```php
use Zone\Parking3D\Filament\Pages\ParkingVisualization;

public function panel(Panel $panel): Panel
{
    return $panel
        // ...
        ->pages([
            ParkingVisualization::class,
        ]);
}
```

### 6. Dispatch Events (Optional)

To enable real-time updates, dispatch events from your `ParkSessionObserver` or service:

```php
use Zone\Parking3D\Events\VehicleEntered;
use Zone\Parking3D\Events\VehicleExited;

// When a vehicle enters
VehicleEntered::dispatch(
    $session->park_id,
    $session->session_uid,
    $session->plate_txt,
    $session->entryRecord?->photo_vehicle,
    $session->vehicle_class_id?->value ?? 1
);

// When a vehicle exits
VehicleExited::dispatch(
    $session->park_id,
    $session->session_uid
);
```

## Build & Run

```bash
# Development
npm run dev

# Production
npm run build
```

## File Structure

```
zone-parking-3d/
├── composer.json
├── src/
│   ├── Parking3DServiceProvider.php
│   ├── Filament/Pages/ParkingVisualization.php
│   └── Events/
│       ├── VehicleEntered.php
│       └── VehicleExited.php
└── resources/
    ├── views/pages/parking-visualization.blade.php
    └── js/parking-visualization/
        ├── main.tsx
        ├── App.tsx
        ├── types.ts
        ├── stores/useTrafficStore.ts
        ├── hooks/useRealtimeSync.ts
        └── components/
            ├── ParkingLot.tsx
            ├── Vehicle.tsx
            └── VehicleManager.tsx
```

## License

MIT
