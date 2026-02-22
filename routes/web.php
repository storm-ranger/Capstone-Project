<?php

use App\Http\Controllers\Admin\ProvinceController;
use App\Http\Controllers\Admin\AreaController;
use App\Http\Controllers\Admin\AreaGroupController;
use App\Http\Controllers\Admin\ClientController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\DeliveryOrderController;
use App\Http\Controllers\Admin\DeliveryOrderExportController;
use App\Http\Controllers\Admin\RoutePlannerController;
use App\Http\Controllers\Admin\AllocationPlannerController;
use App\Http\Controllers\Admin\SalesTrackingController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\BackupController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect('/admin/dashboard');
    }
    return Inertia::render('auth/login', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

// Admin Routes
Route::middleware(['auth', 'permission'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Operations Routes - Delivery Monitoring
    Route::resource('delivery-orders', DeliveryOrderController::class);
    
    // Export delivery orders to Excel
    Route::get('delivery-orders-export', [DeliveryOrderExportController::class, 'export'])
        ->name('delivery-orders.export');
    
    // Route Planner
    Route::get('route-planner', [RoutePlannerController::class, 'index'])
        ->name('route-planner.index');
    Route::post('route-planner/calculate', [RoutePlannerController::class, 'calculateRoute'])
        ->name('route-planner.calculate');
    Route::post('route-planner/confirm/{order}', [RoutePlannerController::class, 'confirmDelivery'])
        ->name('route-planner.confirm');
    Route::post('route-planner/confirm-bulk', [RoutePlannerController::class, 'confirmBulkDelivery'])
        ->name('route-planner.confirm-bulk');
    
    // Allocation Planner
    Route::get('allocation-planner', [AllocationPlannerController::class, 'index'])
        ->name('allocation-planner.index');
    Route::post('allocation-planner/allocate', [AllocationPlannerController::class, 'allocate'])
        ->name('allocation-planner.allocate');
    Route::post('allocation-planner/batches/{batch}/start', [AllocationPlannerController::class, 'startDelivery'])
        ->name('allocation-planner.batches.start');
    Route::post('allocation-planner/batches/{batch}/complete', [AllocationPlannerController::class, 'completeBatch'])
        ->name('allocation-planner.batches.complete');
    Route::delete('allocation-planner/batches/{batch}', [AllocationPlannerController::class, 'deleteBatch'])
        ->name('allocation-planner.batches.delete');
    Route::post('allocation-planner/orders/{order}/remove', [AllocationPlannerController::class, 'removeFromBatch'])
        ->name('allocation-planner.orders.remove');
    
    // Sales Tracking
    Route::get('sales-tracking', [SalesTrackingController::class, 'index'])
        ->name('sales-tracking.index');
    Route::get('sales-tracking/export', [SalesTrackingController::class, 'export'])
        ->name('sales-tracking.export');
    
    // Notifications (no permission check - everyone can see their notifications)
    Route::get('notifications', [NotificationController::class, 'index'])
        ->name('notifications.index');
    Route::get('notifications/recent', [NotificationController::class, 'recent'])
        ->name('notifications.recent');
    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])
        ->name('notifications.mark-all-read');
    Route::delete('notifications/clear-read', [NotificationController::class, 'destroyRead'])
        ->name('notifications.destroy-read');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead'])
        ->name('notifications.read');
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy'])
        ->name('notifications.destroy');
    
    // API endpoint for getting client products
    Route::get('clients/{client}/products', [DeliveryOrderController::class, 'getClientProducts'])
        ->name('clients.products');
    
    // Critical Path / Milestone Routes
    Route::prefix('delivery-orders/{delivery_order}')->name('delivery-orders.')->group(function () {
        Route::post('milestones/initialize', [DeliveryOrderController::class, 'initializeMilestones'])
            ->name('milestones.initialize');
        Route::post('milestones/advance', [DeliveryOrderController::class, 'advanceMilestone'])
            ->name('milestones.advance');
        Route::put('milestones/{milestone}', [DeliveryOrderController::class, 'updateMilestone'])
            ->name('milestones.update');
        Route::get('critical-path', [DeliveryOrderController::class, 'criticalPathAnalysis'])
            ->name('critical-path');
    });

    // Master Data Routes
    Route::prefix('master-data')->name('master-data.')->group(function () {
        Route::resource('provinces', ProvinceController::class);
        Route::resource('area-groups', AreaGroupController::class);
        Route::resource('areas', AreaController::class);
        Route::resource('clients', ClientController::class);
        Route::resource('products', ProductController::class);
        
        // API endpoint for dependent dropdown
        Route::get('provinces/{province}/areas', [ClientController::class, 'getAreasByProvince'])
            ->name('provinces.areas');
    });

    // System Routes (admin only for user management)
    Route::prefix('system')->name('system.')->group(function () {
        Route::resource('users', UserController::class);
        
        // Backup routes (admin only)
        Route::get('backup', [BackupController::class, 'index'])->name('backup.index');
        Route::post('backup', [BackupController::class, 'create'])->name('backup.create');
        Route::get('backup/{filename}/download', [BackupController::class, 'download'])->name('backup.download');
        Route::delete('backup/{filename}', [BackupController::class, 'destroy'])->name('backup.destroy');
    });
});
