<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryOrder;
use App\Models\DeliveryBatch;
use App\Models\Vehicle;
use App\Models\AreaGroup;
use App\Models\Province;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AllocationPlannerController extends Controller
{
    /**
     * Display the allocation planner dashboard.
     */
    public function index(Request $request)
    {
        $date = $request->get('date', Carbon::today()->toDateString());

        // Get pending deliveries that are NOT yet assigned to a batch
        // Exclude pickup orders as they are collected directly at the company
        $pendingOrders = DeliveryOrder::with(['client.area.areaGroup', 'client.province', 'items'])
            ->where('status', 'pending')
            ->whereNull('batch_id')
            ->where(function ($query) {
                $query->whereNull('delivery_type')
                    ->orWhere('delivery_type', '!=', 'Pickup');
            })
            ->whereDate('scheduled_date', '<=', $date)
            ->orderBy('po_date', 'asc')
            ->get();

        // Build a single zone with all pending orders (no province grouping)
        // This allows combining orders from different provinces into one truck
        $zones = [];
        if ($pendingOrders->isNotEmpty()) {
            $ordersArray = $pendingOrders->values()->all();
            $ordersWithCost = [];
            $previousAreaId = null;

            foreach ($ordersArray as $index => $order) {
                $baseRate = $order->client?->area?->areaGroup?->base_rate ?? 0;
                $currentAreaId = $order->client?->area?->id;

                if ($index === 0) {
                    $dropCost = $baseRate;
                } else {
                    if ($currentAreaId && $previousAreaId && $currentAreaId === $previousAreaId) {
                        $dropCost = 250; // Same area as previous
                    } else {
                        $dropCost = 500; // Different area from previous
                    }
                }

                $previousAreaId = $currentAreaId;
                $order->estimated_drop_cost = $dropCost;
                $ordersWithCost[] = $order;
            }

            // Map orders to array format
            $mappedOrders = collect($ordersWithCost)->map(function ($order) {
                return [
                    'id' => $order->id,
                    'po_number' => $order->po_number,
                    'po_date' => $order->po_date?->format('Y-m-d'),
                    'scheduled_date' => $order->scheduled_date?->format('Y-m-d'),
                    'client_code' => $order->client?->code,
                    'client_name' => $order->client?->name,
                    'province_name' => $order->client?->province?->name ?? 'Unknown',
                    'area_name' => $order->client?->area?->name,
                    'zone_name' => $order->client?->area?->areaGroup?->name ?? 'Unassigned',
                    'zone_code' => $order->client?->area?->areaGroup?->code ?? '-',
                    'area_group_id' => $order->client?->area?->areaGroup?->id,
                    'distance_km' => $order->client?->distance_km ?? 0,
                    'total_items' => $order->total_items,
                    'total_amount' => $order->total_amount,
                    'drop_cost' => $order->estimated_drop_cost,
                    'is_overdue' => $order->scheduled_date && $order->scheduled_date->lt(Carbon::today()),
                ];
            })->values();

            // Province summary for badges
            $provinceSummary = $pendingOrders->groupBy(function ($order) {
                return $order->client?->province?->name ?? 'Unknown';
            })->map(function ($provinceOrders, $provinceName) {
                return [
                    'name' => $provinceName,
                    'count' => $provinceOrders->count(),
                ];
            })->values();

            // Zone summary for badges
            $zoneSummary = collect($ordersWithCost)->groupBy(function ($order) {
                return $order->client?->area?->areaGroup?->name ?? 'Unassigned';
            })->map(function ($zoneOrders, $zoneName) {
                $firstOrder = $zoneOrders->first();
                return [
                    'name' => $zoneName,
                    'code' => $firstOrder->client?->area?->areaGroup?->code ?? '-',
                    'count' => $zoneOrders->count(),
                ];
            })->values();

            $totalValue = $pendingOrders->sum('total_amount');
            $totalRate = collect($ordersWithCost)->sum(fn($o) => $o->estimated_drop_cost);
            $recommendedVehicle = DeliveryBatch::determineVehicleType($totalValue);
            $overdueCount = $pendingOrders->filter(fn($o) => $o->scheduled_date?->lt(Carbon::today()))->count();

            $zones[] = [
                'id' => 'all-orders',
                'order_count' => $pendingOrders->count(),
                'total_items' => $pendingOrders->sum('total_items'),
                'total_value' => $totalValue,
                'batch_cost' => $totalRate,
                'recommended_vehicle' => $recommendedVehicle,
                'recommended_vehicle_label' => $recommendedVehicle === 'l300' ? 'L300 Van' : 'Truck',
                'overdue_count' => $overdueCount,
                'province_summary' => $provinceSummary,
                'zone_summary' => $zoneSummary,
                'orders' => $mappedOrders,
            ];
        }

        // Get existing batches for today (exclude completed ones)
        $todayBatches = DeliveryBatch::with(['areaGroup', 'vehicle', 'orders.client.province'])
            ->whereDate('planned_date', $date)
            ->where('status', '!=', 'completed')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($batch) {
                // Get unique province names for this batch
                $provinceNames = $batch->orders
                    ->map(fn($o) => $o->client?->province?->name)
                    ->filter()
                    ->unique()
                    ->values()
                    ->toArray();

                return [
                    'id' => $batch->id,
                    'batch_number' => $batch->batch_number,
                    'planned_date' => $batch->planned_date->format('Y-m-d'),
                    'area_group_name' => $batch->areaGroup?->name ?? 'Unknown',
                    'area_group_code' => $batch->areaGroup?->code ?? '-',
                    'vehicle_type' => $batch->vehicle_type,
                    'vehicle_type_label' => $batch->vehicle_type_label,
                    'vehicle_name' => $batch->vehicle?->name,
                    'order_count' => $batch->order_count,
                    'total_items' => $batch->total_items,
                    'total_value' => $batch->total_value,
                    'total_rate' => $batch->total_rate,
                    'status' => $batch->status,
                    'province_names' => $provinceNames,
                    'orders' => $batch->orders->map(fn($o) => [
                        'id' => $o->id,
                        'po_number' => $o->po_number,
                        'client_code' => $o->client?->code,
                        'total_amount' => $o->total_amount,
                        'province_name' => $o->client?->province?->name,
                    ]),
                ];
            });

        // Get available vehicles
        $vehicles = Vehicle::active()->get();

        // Summary - count provinces as zones
        $summary = [
            'unallocated_zones' => count($zones),
            'unallocated_orders' => $pendingOrders->count(),
            'unallocated_value' => $pendingOrders->sum('total_amount'),
            'allocated_batches' => $todayBatches->count(),
            'allocated_orders' => $todayBatches->sum('order_count'),
            'allocated_value' => $todayBatches->sum('total_value'),
        ];

        return Inertia::render('admin/allocation-planner/index', [
            'zones' => $zones,
            'batches' => $todayBatches,
            'vehicles' => $vehicles,
            'summary' => $summary,
            'selectedDate' => $date,
        ]);
    }

    /**
     * Create a delivery batch from a zone.
     */
    public function allocate(Request $request)
    {
        $request->validate([
            'order_ids' => 'required|array|min:1',
            'order_ids.*' => 'exists:delivery_orders,id',
            'planned_date' => 'required|date',
            'vehicle_type' => 'required|in:l300,truck',
            'vehicle_id' => 'nullable|exists:vehicles,id',
        ]);

        $orderIds = $request->order_ids;
        $plannedDate = $request->planned_date;

        // Get orders and calculate totals
        $orders = DeliveryOrder::with(['client.area.areaGroup'])->whereIn('id', $orderIds)->orderBy('po_date', 'asc')->get();
        
        // Get first order's area group for batch naming
        $firstOrder = $orders->first();
        $areaGroup = $firstOrder->client?->area?->areaGroup;
        
        if (!$areaGroup) {
            return back()->with('error', 'Could not determine area group from orders');
        }
        
        $totalValue = $orders->sum('total_amount');
        $totalItems = $orders->sum('total_items');
        $orderCount = $orders->count();
        
        // Calculate batch cost sequentially (matching Route Planner logic)
        $previousAreaId = null;
        $batchCost = 0;
        
        foreach ($orders as $index => $order) {
            $baseRate = $order->client?->area?->areaGroup?->base_rate ?? 0;
            $currentAreaId = $order->client?->area?->id;
            
            if ($index === 0) {
                $batchCost += $baseRate;
            } else {
                if ($currentAreaId && $previousAreaId && $currentAreaId === $previousAreaId) {
                    $batchCost += 250; // Same area as previous
                } else {
                    $batchCost += 500; // Different area from previous
                }
            }
            $previousAreaId = $currentAreaId;
        }
        
        // Calculate max distance
        $maxDistance = $orders->max(fn($o) => $o->client?->distance_km ?? 0);

        DB::transaction(function () use ($request, $areaGroup, $orders, $plannedDate, $totalValue, $totalItems, $orderCount, $batchCost, $maxDistance) {
            // Create the batch
            $batch = DeliveryBatch::create([
                'batch_number' => DeliveryBatch::generateBatchNumber($plannedDate, $areaGroup->code),
                'planned_date' => $plannedDate,
                'area_group_id' => $areaGroup->id,
                'vehicle_id' => $request->vehicle_id,
                'vehicle_type' => $request->vehicle_type,
                'order_count' => $orderCount,
                'total_items' => $totalItems,
                'total_value' => $totalValue,
                'total_rate' => $batchCost,
                'total_distance_km' => $maxDistance * 2, // Round trip
                'status' => 'planned',
                'created_by' => Auth::id(),
            ]);

            // Assign orders to batch and set rates
            // First order = base rate
            // Additional orders same zone as PREVIOUS = +₱250 (drop_same_zone)
            // Additional orders different zone from PREVIOUS = +₱500 (drop_other_zone)
            $batchAreaGroupId = $areaGroup->id;
            $previousAreaId = null;
            
            foreach ($orders as $index => $order) {
                $isFirst = $index === 0;
                $orderAreaId = $order->client?->area?->id;
                // Use the order's own area group base rate, not the batch's
                $orderBaseRate = $order->client?->area?->areaGroup?->base_rate ?? 0;
                
                if ($isFirst) {
                    $dropCost = $orderBaseRate;
                    $additionalRateType = 'none';
                    $additionalRate = 0;
                } else {
                    // Check if order is from same area as PREVIOUS order
                    if ($orderAreaId && $previousAreaId && $orderAreaId === $previousAreaId) {
                        $dropCost = 250;
                        $additionalRateType = 'drop_same_zone';
                        $additionalRate = 250;
                    } else {
                        $dropCost = 500;
                        $additionalRateType = 'drop_other_zone';
                        $additionalRate = 500;
                    }
                }
                
                $previousAreaId = $orderAreaId;
                
                $order->update([
                    'batch_id' => $batch->id,
                    'base_rate' => $orderBaseRate,
                    'additional_rate_type' => $additionalRateType,
                    'additional_rate' => $additionalRate,
                    'total_rate' => $dropCost,
                    'status' => 'confirmed', // Order is confirmed when assigned to batch
                ]);
            }
        });

        return back()->with('success', "Batch created successfully with {$orderCount} orders");
    }

    /**
     * Remove an order from a batch.
     */
    public function removeFromBatch(Request $request, DeliveryOrder $order)
    {
        $batch = $order->batch;
        
        if (!$batch) {
            return back()->with('error', 'Order is not assigned to any batch');
        }

        DB::transaction(function () use ($order, $batch) {
            // Remove order from batch
            $order->update([
                'batch_id' => null,
                'base_rate' => 0,
                'additional_rate_type' => 'none',
                'additional_rate' => 0,
                'total_rate' => 0,
                'status' => 'pending', // Reset status when removed from batch
            ]);

            // Recalculate batch totals
            $remainingOrders = $batch->orders()->with(['client.area.areaGroup'])->get();
            
            if ($remainingOrders->isEmpty()) {
                // Delete empty batch
                $batch->delete();
            } else {
                // Calculate batch cost considering zone differences (compare to PREVIOUS order)
                $totalRate = 0;
                $previousAreaId = null;
                
                foreach ($remainingOrders as $index => $remainingOrder) {
                    $isFirst = $index === 0;
                    $orderAreaId = $remainingOrder->client?->area?->id;
                    $orderBaseRate = $remainingOrder->client?->area?->areaGroup?->base_rate ?? 0;
                    
                    if ($isFirst) {
                        $dropCost = $orderBaseRate;
                        $additionalRateType = 'none';
                        $additionalRate = 0;
                    } else {
                        // Check if order is from same area as PREVIOUS order
                        if ($orderAreaId && $previousAreaId && $orderAreaId === $previousAreaId) {
                            $dropCost = 250;
                            $additionalRateType = 'drop_same_zone';
                            $additionalRate = 250;
                        } else {
                            $dropCost = 500;
                            $additionalRateType = 'drop_other_zone';
                            $additionalRate = 500;
                        }
                    }
                    
                    $previousAreaId = $orderAreaId;
                    $totalRate += $dropCost;
                    
                    $remainingOrder->update([
                        'base_rate' => $orderBaseRate,
                        'additional_rate_type' => $additionalRateType,
                        'additional_rate' => $additionalRate,
                        'total_rate' => $dropCost,
                    ]);
                }

                // Update batch totals
                $batch->update([
                    'order_count' => $remainingOrders->count(),
                    'total_items' => $remainingOrders->sum('total_items'),
                    'total_value' => $remainingOrders->sum('total_amount'),
                    'total_rate' => $totalRate,
                ]);
            }
        });

        return back()->with('success', 'Order removed from batch');
    }

    /**
     * Delete a batch and release orders.
     */
    public function deleteBatch(DeliveryBatch $batch)
    {
        DB::transaction(function () use ($batch) {
            // Release all orders and reset their status to pending
            $batch->orders()->update([
                'batch_id' => null,
                'base_rate' => 0,
                'additional_rate_type' => 'none',
                'additional_rate' => 0,
                'total_rate' => 0,
                'status' => 'pending',
            ]);

            $batch->delete();
        });

        return back()->with('success', 'Batch deleted and orders released');
    }

    /**
     * Start delivery (change batch status to in_transit).
     */
    public function startDelivery(DeliveryBatch $batch)
    {
        $batch->update(['status' => 'in_transit']);

        // Update all orders in batch to in_transit
        $batch->orders()->update(['status' => 'in_transit']);

        return back()->with('success', "Batch {$batch->batch_number} is now in transit");
    }

    /**
     * Complete delivery for entire batch.
     */
    public function completeBatch(Request $request, DeliveryBatch $batch)
    {
        $request->validate([
            'delivery_date' => 'nullable|date',
        ]);

        $deliveryDate = $request->input('delivery_date', Carbon::today()->toDateString());

        DB::transaction(function () use ($batch, $deliveryDate) {
            // Update batch status
            $batch->update([
                'status' => 'completed',
                'actual_date' => $deliveryDate,
            ]);

            // Update all orders in batch
            foreach ($batch->orders as $order) {
                $order->update([
                    'actual_date' => $deliveryDate,
                    'status' => Carbon::parse($deliveryDate)->lte($order->scheduled_date) ? 'on_time' : 'delayed',
                ]);
            }
        });

        return back()->with('success', "Batch {$batch->batch_number} completed with {$batch->order_count} orders");
    }
}
