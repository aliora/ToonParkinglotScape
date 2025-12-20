<?php

namespace Zone\Parking3D;

use Illuminate\Support\ServiceProvider;

class Parking3DServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Load views with namespace 'parking-3d'
        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'parking-3d');

        // Publish views (optional)
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../resources/views' => resource_path('views/vendor/parking-3d'),
            ], 'parking-3d-views');
        }
    }
}
