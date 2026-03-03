<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Carbon\Carbon;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Force HTTPS kapag production (Railway)
        if (app()->environment('production')) {
            URL::forceScheme('https');
        }

        // Simulate system date for testing (February 2026)
        Carbon::setTestNow(Carbon::create(2026, 2, 1));
    }
}
