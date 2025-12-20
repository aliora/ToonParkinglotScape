<?php

namespace Polat\ToonParkingLot;

use Filament\Support\Assets\Js;
use Filament\Support\Assets\Css;
use Filament\Support\Facades\FilamentAsset;
use Livewire\Livewire;
use Polat\ToonParkingLot\Livewire\ToonParkingLotVisualization;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class ToonParkingLotServiceProvider extends PackageServiceProvider
{
    public static string $name = 'toon-parking-lot';

    public function configurePackage(Package $package): void
    {
        $package
            ->name(static::$name)
            ->hasViews()
            ->hasAssets()
            ->hasConfigFile();
    }

    public function packageBooted(): void
    {
        parent::packageBooted();

        // Register Livewire component
        Livewire::component('toon-parking-lot', ToonParkingLotVisualization::class);

        // Register Filament assets
        FilamentAsset::register([
            Js::make('toon-parking-lot', __DIR__ . '/../resources/dist/toon-parking-lot.iife.js'),
            Css::make('toon-parking-lot', __DIR__ . '/../resources/dist/toon-parking-lot.css'),
        ], package: 'polat/toon-parking-lot');
    }
}

