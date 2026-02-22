<?php

namespace Database\Seeders;

use App\Models\AreaGroup;
use App\Models\DeliveryBatch;
use App\Models\DeliveryOrder;
use App\Models\User;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DeliveryBatchSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();
        $vehicles = Vehicle::all();
        $areaGroups = AreaGroup::all();

        if ($vehicles->isEmpty()) {
            $this->command->warn('No vehicles found. Please run VehicleSeeder first.');
            return;
        }

        if ($areaGroups->isEmpty()) {
            $this->command->warn('No area groups found. Please run MasterDataSeeder first.');
            return;
        }

        // Get orders that are not pending (confirmed, in_transit, on_time, delayed)
        $orders = DeliveryOrder::whereIn('status', ['confirmed', 'in_transit', 'on_time', 'delayed'])
            ->whereNull('batch_id')
            ->with(['client.area.areaGroup'])
            ->orderBy('scheduled_date')
            ->get();

        if ($orders->isEmpty()) {
            $this->command->warn('No orders available for batch assignment.');
            return;
        }

        $batchCount = 0;
        $assignedOrders = 0;

        // Group orders by scheduled date and area group
        $groupedOrders = $orders->groupBy(function ($order) {
            $areaGroupId = $order->client?->area?->areaGroup?->id ?? 0;
            return $order->scheduled_date->format('Y-m-d') . '_' . $areaGroupId;
        });

        foreach ($groupedOrders as $key => $dateAreaOrders) {
            [$dateStr, $areaGroupId] = explode('_', $key);
            
            if ($areaGroupId == 0) {
                continue;
            }

            $areaGroup = $areaGroups->find($areaGroupId);
            if (!$areaGroup) {
                continue;
            }

            // Split orders into batches (max 8 orders per batch)
            $orderChunks = $dateAreaOrders->chunk(8);

            foreach ($orderChunks as $chunkIndex => $batchOrders) {
                // Select vehicle based on total amount (truck for larger orders)
                $totalAmount = $batchOrders->sum('total_amount');
                $vehicleType = $totalAmount > 500000 ? 'truck' : 'l300';
                
                // Find a matching vehicle
                $vehicle = $vehicles->where('type', $vehicleType)->first() 
                    ?? $vehicles->first();

                // Determine batch status based on orders
                $orderStatuses = $batchOrders->pluck('status')->unique();
                if ($orderStatuses->contains('delayed') || $orderStatuses->contains('on_time')) {
                    $batchStatus = 'completed';
                } elseif ($orderStatuses->contains('in_transit')) {
                    $batchStatus = 'in_transit';
                } else {
                    $batchStatus = 'planned';
                }

                // Calculate totals
                $totalItems = $batchOrders->sum('total_items');
                $totalValue = $batchOrders->sum('total_amount');
                $totalRate = $batchOrders->sum('total_rate');
                $totalDistance = $batchOrders->sum(function ($order) {
                    return $order->client->distance_km ?? 0;
                });

                // Generate batch number
                $batchNumber = DeliveryBatch::generateBatchNumber($dateStr, $areaGroup->code);

                // Create the batch
                $batch = DeliveryBatch::create([
                    'batch_number' => $batchNumber,
                    'planned_date' => $dateStr,
                    'actual_date' => in_array($batchStatus, ['completed']) ? $dateStr : null,
                    'area_group_id' => $areaGroup->id,
                    'vehicle_id' => $vehicle->id,
                    'vehicle_type' => $vehicle->type,
                    'order_count' => $batchOrders->count(),
                    'total_items' => $totalItems,
                    'total_value' => $totalValue,
                    'total_rate' => $totalRate,
                    'total_distance_km' => $totalDistance,
                    'status' => $batchStatus,
                    'created_by' => $admin?->id,
                    'notes' => null,
                ]);

                // Assign orders to batch
                foreach ($batchOrders as $order) {
                    $order->update(['batch_id' => $batch->id]);
                    $assignedOrders++;
                }

                $batchCount++;
            }
        }

        $this->command->info("Delivery Batch data seeded successfully!");
        $this->command->info("- {$batchCount} Batches created");
        $this->command->info("- {$assignedOrders} Orders assigned to batches");
    }
}
