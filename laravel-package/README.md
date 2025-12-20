# Filament Parking Visualization

3D Otopark Görselleştirmesi - Laravel Filament Plugin

## Kurulum

### 1. Composer ile kurulum

```bash
composer require polat/filament-parking-visualization
```

### 2. Asset'leri yayınlama

```bash
php artisan vendor:publish --provider="Polat\ParkingVisualization\ParkingVisualizationServiceProvider"
```

### 3. JavaScript dosyasını kopyalama

React uygulamasını derleyip Laravel projesine kopyalayın:

```bash
# React projesinde
npm run build:lib

# Oluşan dosyaları Laravel'e kopyala
cp dist/lib/parking-lot.iife.js /path/to/laravel/public/vendor/parking-visualization/
cp dist/lib/parking-lot.css /path/to/laravel/public/vendor/parking-visualization/
```

## Kullanım

### Temel Kullanım

```blade
<livewire:parking-visualization 
    :capacity="30"
    :vehicles="$parkedVehicles"
/>
```

### Tüm Parametreler

```blade
<livewire:parking-visualization 
    :capacity="30"
    :vehicles="$parkedVehicles"
    height="600px"
    :autoTimeOfDay="true"
    timeOfDay="Day"
/>
```

| Parametre | Tip | Varsayılan | Açıklama |
|-----------|-----|------------|----------|
| `capacity` | int | 20 | Otopark kapasitesi |
| `vehicles` | array | [] | Başlangıçta park etmiş araçlar |
| `height` | string | "500px" | Bileşen yüksekliği |
| `autoTimeOfDay` | bool | true | Otomatik gece/gündüz |
| `timeOfDay` | string | null | Manuel gece/gündüz ("Day" veya "Night") |

### Araç Veri Formatı

```php
$vehicles = [
    [
        'id' => 'uuid-1234',          // Benzersiz ID
        'type' => 1,                   // 1=CAR, 2=MINIBUS, 3=BUS, 4=PICKUP, 5=TRUCK, 6=HEAVYTRUCK, 7=MOTORCYCLE
        'plate' => '34 ABC 123',       // Plaka
        'entryTime' => 1703116800000,  // Giriş zamanı (milisaniye timestamp)
        'image' => '/path/to/image.jpg', // Opsiyonel
    ],
    // ...
];
```

### Araç Tipleri

| Değer | Tip | 3D Model |
|-------|-----|----------|
| 1 | CAR | Hatchback, Sedan, SUV, vb. |
| 2 | MINIBUS | Van |
| 3 | BUS | Bus |
| 4 | PICKUP | Pickup |
| 5 | TRUCK | Truck |
| 6 | HEAVYTRUCK | Truck (büyük) |
| 7 | MOTORCYCLE | Hatchback (küçük) |

## Olaylar (Events)

### Livewire Olayları

Görselleştirmeden gelen olayları dinleyebilirsiniz:

```php
// Filament Page veya Livewire Component'te

use Livewire\Attributes\On;

#[On('vehicleParked')]
public function handleVehicleParked(array $vehicle): void
{
    // Araç park etti
    Log::info('Vehicle parked', $vehicle);
}

#[On('vehicleExited')]
public function handleVehicleExited(string $vehicleId): void
{
    // Araç çıkış yaptı
    Log::info('Vehicle exited', ['id' => $vehicleId]);
}

#[On('parkingFull')]
public function handleParkingFull(): void
{
    // Otopark doldu
    Notification::make()
        ->title('Otopark doldu!')
        ->warning()
        ->send();
}
```

### Araç Ekleme (Giriş)

```php
// Controller veya Livewire Component'te
public function newVehicleEntry()
{
    $vehicle = Vehicle::create([
        'plate_number' => '34 XYZ 789',
        'vehicle_type' => VehicleType::CAR->value,
        'entry_time' => now(),
    ]);

    // 3D görselleştirmeye araç ekle
    $this->dispatch('parking-add-vehicle', [
        'id' => (string) $vehicle->id,
        'type' => $vehicle->vehicle_type,
        'plate' => $vehicle->plate_number,
        'entryTime' => $vehicle->entry_time->timestamp * 1000,
    ]);
}
```

### Araç Çıkışı Tetikleme

```php
public function vehicleExit(string $vehicleId)
{
    // Veritabanında çıkış işle
    $vehicle = Vehicle::findOrFail($vehicleId);
    $vehicle->exit_time = now();
    $vehicle->save();

    // 3D görselleştirmede çıkış animasyonu
    $this->dispatch('parking-trigger-exit', $vehicleId);
}
```

## JavaScript API

Doğrudan JavaScript üzerinden de kontrol edebilirsiniz:

```javascript
// Araç ekle
window.ParkingLot.addVehicle({
    id: 'abc-123',
    type: 1,
    plate: '34 ABC 123',
    entryTime: Date.now()
});

// Çıkış tetikle
window.ParkingLot.triggerExit('abc-123');

// Park etmiş araçları al
const parked = window.ParkingLot.getParkedVehicles();

// Boş yer sayısı
const available = window.ParkingLot.getAvailableSpots();

// Otopark dolu mu?
const isFull = window.ParkingLot.isFull();

// Gece/gündüz değiştir
window.ParkingLot.setTimeOfDay('Night');
```

## Filament Widget Örneği

```php
<?php

namespace App\Filament\Widgets;

use App\Models\Vehicle;
use Filament\Widgets\Widget;

class ParkingLotWidget extends Widget
{
    protected static string $view = 'filament.widgets.parking-lot';

    public function getParkedVehicles(): array
    {
        return Vehicle::whereNull('exit_time')
            ->get()
            ->map(fn ($v) => [
                'id' => (string) $v->id,
                'type' => $v->vehicle_type,
                'plate' => $v->plate_number,
                'entryTime' => $v->entry_time->timestamp * 1000,
            ])
            ->toArray();
    }
}
```

```blade
{{-- resources/views/filament/widgets/parking-lot.blade.php --}}
<x-filament::widget>
    <x-filament::card>
        <livewire:parking-visualization 
            :capacity="config('parking-visualization.default_capacity')"
            :vehicles="$this->getParkedVehicles()"
            height="400px"
        />
    </x-filament::card>
</x-filament::widget>
```

## Konfigürasyon

`config/parking-visualization.php`:

```php
return [
    'default_capacity' => 20,
    'auto_time_of_day' => true,
    'default_height' => '500px',
    'asset_base_url' => null, // CDN URL
];
```
