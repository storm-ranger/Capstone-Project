<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryOrder;
use App\Models\AreaGroup;
use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class RoutePlannerController extends Controller
{
    /**
     * Display the route planner dashboard.
     */
    public function index(Request $request)
    {
        $date = $request->get('date', Carbon::today()->toDateString());

        // Get pending deliveries due on or before selected date (for immediate planning)
        // Exclude pickup orders as they are collected directly at the company
        $pendingOrders = DeliveryOrder::with(['client.area.areaGroup', 'client.province', 'items'])
            ->where('status', 'pending')
            ->where(function ($query) {
                $query->whereNull('delivery_type')
                    ->orWhere('delivery_type', '!=', 'Pickup');
            })
            ->whereDate('scheduled_date', '<=', $date)
            ->orderBy('po_date', 'asc') // Oldest PO first
            ->orderBy('scheduled_date', 'asc')
            ->get();

        // Get upcoming orders (scheduled after selected date, next 7 days)
        // Exclude pickup orders as they are collected directly at the company
        $upcomingOrders = DeliveryOrder::with(['client.area.areaGroup', 'client.province'])
            ->where('status', 'pending')
            ->where(function ($query) {
                $query->whereNull('delivery_type')
                    ->orWhere('delivery_type', '!=', 'Pickup');
            })
            ->whereDate('scheduled_date', '>', $date)
            ->whereDate('scheduled_date', '<=', Carbon::parse($date)->addDays(7))
            ->orderBy('scheduled_date', 'asc')
            ->orderBy('po_date', 'asc')
            ->get();

        // Group upcoming orders by scheduled date
        $upcomingByDate = $upcomingOrders->groupBy(function ($order) {
            return $order->scheduled_date->format('Y-m-d');
        })->map(function ($orders, $dateKey) {
            $areaGroupIds = $orders->pluck('client.area.areaGroup.id')->unique()->filter()->values();
            
            // Calculate drop costs for each order based on sequence
            $ordersArray = $orders->values()->all();
            $ordersWithCost = [];
            $previousAreaId = null;
            
            foreach ($ordersArray as $index => $order) {
                $baseRate = $order->client?->area?->areaGroup?->base_rate ?? 0;
                $currentAreaId = $order->client?->area?->id;
                
                if ($index === 0) {
                    // First order gets base rate
                    $dropCost = $baseRate;
                } else {
                    // Compare to previous order's area
                    if ($currentAreaId && $previousAreaId && $currentAreaId === $previousAreaId) {
                        $dropCost = 250; // Same area as previous
                    } else {
                        $dropCost = 500; // Different area from previous
                    }
                }
                
                $previousAreaId = $currentAreaId;
                
                $ordersWithCost[] = [
                    'id' => $order->id,
                    'po_number' => $order->po_number,
                    'po_date' => $order->po_date?->format('Y-m-d'),
                    'client_code' => $order->client?->code,
                    'province_name' => $order->client?->province?->name ?? 'Unknown',
                    'area_name' => $order->client?->area?->name,
                    'zone_name' => $order->client?->area?->areaGroup?->name ?? 'Unassigned',
                    'base_rate' => $baseRate,
                    'drop_cost' => $dropCost,
                    'total_amount' => $order->total_amount,
                    'total_items' => $order->total_items,
                ];
            }
            
            return [
                'date' => $dateKey,
                'day_name' => Carbon::parse($dateKey)->format('l'),
                'formatted_date' => Carbon::parse($dateKey)->format('M d, Y'),
                'days_from_now' => Carbon::today()->diffInDays(Carbon::parse($dateKey)),
                'order_count' => $orders->count(),
                'total_amount' => $orders->sum('total_amount'),
                'total_rate' => collect($ordersWithCost)->sum('drop_cost'),
                'zone_count' => $areaGroupIds->count(),
                'zones' => $orders->groupBy(fn($o) => $o->client?->area?->areaGroup?->name ?? 'Unassigned')
                    ->map(fn($zoneOrders) => $zoneOrders->count())
                    ->toArray(),
                'orders' => $ordersWithCost,
            ];
        })->values();

        // Build a single zone with all pending orders (no zone grouping)
        // This matches the allocation planner — all deliveries in one card
        $zones = [];
        if ($pendingOrders->isNotEmpty()) {
            // Sort orders: By PO date (oldest first), then by distance (nearest first)
            $sortedOrders = $pendingOrders->sort(function ($a, $b) {
                $poCompare = $a->po_date <=> $b->po_date;
                if ($poCompare !== 0) {
                    return $poCompare;
                }
                return ($a->client?->distance_km ?? 999) <=> ($b->client?->distance_km ?? 999);
            });

            // Build optimized route sequence by distance
            $remainingOrders = $sortedOrders->values()->all();
            $routeSequence = [];
            $currentDistance = 0;
            
            while (count($remainingOrders) > 0) {
                $nearestIndex = 0;
                $nearestDistance = PHP_INT_MAX;
                
                foreach ($remainingOrders as $index => $order) {
                    $orderDistance = $order->client?->distance_km ?? 0;
                    $distanceFromCurrent = abs($orderDistance - $currentDistance);
                    
                    if ($order->scheduled_date && $order->scheduled_date->lt(Carbon::today())) {
                        $distanceFromCurrent = 0;
                    }
                    
                    if ($distanceFromCurrent < $nearestDistance) {
                        $nearestDistance = $distanceFromCurrent;
                        $nearestIndex = $index;
                    }
                }
                
                $nextOrder = $remainingOrders[$nearestIndex];
                $routeSequence[] = $nextOrder;
                $currentDistance = $nextOrder->client?->distance_km ?? 0;
                array_splice($remainingOrders, $nearestIndex, 1);
            }

            // Calculate drop costs using cross-zone logic
            $previousAreaId = null;
            $mappedOrders = collect($routeSequence)->map(function ($order, $index) use ($routeSequence, &$previousAreaId) {
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

                // Calculate distance from previous stop
                $prevDistance = $index > 0 ? ($routeSequence[$index - 1]->client?->distance_km ?? 0) : 0;
                $currentDistanceKm = $order->client?->distance_km ?? 0;
                $legDistance = abs($currentDistanceKm - $prevDistance);

                // Get product info from items
                $primaryProduct = $order->items->first();
                $productNames = $order->items->pluck('part_number')->unique()->implode(', ');

                return [
                    'id' => $order->id,
                    'po_number' => $order->po_number,
                    'po_date' => $order->po_date?->format('Y-m-d'),
                    'scheduled_date' => $order->scheduled_date?->format('Y-m-d'),
                    'client_code' => $order->client?->code,
                    'client_id' => $order->client_id,
                    'province_name' => $order->client?->province?->name ?? 'Unknown',
                    'area_name' => $order->client?->area?->name,
                    'zone_name' => $order->client?->area?->areaGroup?->name ?? 'Unassigned',
                    'zone_code' => $order->client?->area?->areaGroup?->code ?? '-',
                    'distance_km' => $currentDistanceKm,
                    'leg_distance_km' => $legDistance,
                    'cutoff_time' => $order->client?->cutoff_time,
                    'total_items' => $order->total_items,
                    'total_quantity' => $order->total_quantity,
                    'total_amount' => $order->total_amount,
                    'base_rate' => $order->base_rate ?? $baseRate,
                    'drop_cost' => $dropCost,
                    'is_overdue' => $order->scheduled_date && $order->scheduled_date->lt(Carbon::today()),
                    'days_until_due' => $order->scheduled_date ? Carbon::today()->diffInDays($order->scheduled_date, false) : null,
                    'days_since_po' => $order->po_date ? Carbon::today()->diffInDays($order->po_date) : null,
                    'route_sequence' => $index + 1,
                    'primary_product' => $primaryProduct?->part_number ?? '-',
                    'products' => $productNames ?: '-',
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
            $zoneSummary = $pendingOrders->groupBy(function ($order) {
                return $order->client?->area?->areaGroup?->name ?? 'Unassigned';
            })->map(function ($zoneOrders, $zoneName) {
                $firstOrder = $zoneOrders->first();
                return [
                    'name' => $zoneName,
                    'code' => $firstOrder->client?->area?->areaGroup?->code ?? '-',
                    'count' => $zoneOrders->count(),
                ];
            })->values();

            $totalBatchedCost = $mappedOrders->sum('drop_cost');
            $maxDistance = $mappedOrders->max('distance_km') ?? 0;
            $totalRouteKm = $mappedOrders->sum('leg_distance_km') + $maxDistance;
            $overdueCount = $mappedOrders->where('is_overdue', true)->count();

            $zones[] = [
                'id' => 'all-orders',
                'order_count' => $mappedOrders->count(),
                'total_items' => $mappedOrders->sum('total_items'),
                'total_quantity' => $mappedOrders->sum('total_quantity'),
                'total_amount' => $mappedOrders->sum('total_amount'),
                'estimated_cost' => $totalBatchedCost,
                'total_route_km' => round($totalRouteKm, 1),
                'max_distance' => $maxDistance,
                'overdue_count' => $overdueCount,
                'oldest_po_date' => $sortedOrders->first()?->po_date?->format('Y-m-d'),
                'province_summary' => $provinceSummary,
                'zone_summary' => $zoneSummary,
                'orders' => $mappedOrders,
            ];
        }

        $totalBatchedCost = collect($zones)->sum('estimated_cost');
        
        $summary = [
            'total_pending' => $pendingOrders->count(),
            'total_zones' => $pendingOrders->pluck('client.area.areaGroup.id')->unique()->filter()->count(),
            'total_estimated_cost' => $totalBatchedCost,
            'total_route_km' => collect($zones)->sum('total_route_km'),
            'overdue_orders' => $pendingOrders->filter(fn($o) => $o->scheduled_date?->lt(Carbon::today()))->count(),
            'due_today' => $pendingOrders->filter(fn($o) => $o->scheduled_date?->isToday())->count(),
            'oldest_po' => $pendingOrders->min('po_date')?->format('Y-m-d'),
        ];

        // Get area groups for filter
        $areaGroups = AreaGroup::where('is_active', true)->orderBy('name')->get();

        return Inertia::render('admin/route-planner/index', [
            'zones' => $zones,
            'summary' => $summary,
            'upcomingOrders' => $upcomingByDate,
            'areaGroups' => $areaGroups,
            'selectedDate' => $date,
        ]);
    }

    /**
     * Calculate optimal route for a batch of orders.
     */
    public function calculateRoute(Request $request)
    {
        $orderIds = $request->input('order_ids', []);
        
        $orders = DeliveryOrder::with(['client.area.areaGroup'])
            ->whereIn('id', $orderIds)
            ->orderBy('po_date', 'asc') // Oldest PO first
            ->get();

        // Group by zone first, then sort by PO date within zone
        $zoneGroups = $orders->groupBy(fn($o) => $o->client?->area?->areaGroup?->id);
        
        $totalCost = 0;
        $routeDetails = [];
        $sequence = 0;
        $previousAreaId = null;

        foreach ($zoneGroups as $zoneId => $zoneOrders) {
            $sortedZoneOrders = $zoneOrders->sortBy('po_date');
            
            foreach ($sortedZoneOrders as $order) {
                $sequence++;
                $baseRate = $order->client?->area?->areaGroup?->base_rate ?? 0;
                $currentAreaId = $order->client?->area?->id;
                
                if ($sequence === 1) {
                    // First order in entire batch gets base rate
                    $dropCost = $baseRate;
                } else {
                    // Check if same area as PREVIOUS order
                    if ($currentAreaId && $previousAreaId && $currentAreaId === $previousAreaId) {
                        $dropCost = 250; // Same area as previous = +₱250
                    } else {
                        $dropCost = 500; // Different area from previous = +₱500
                    }
                }
                
                $previousAreaId = $currentAreaId;
                $totalCost += $dropCost;
                
                $routeDetails[] = [
                    'sequence' => $sequence,
                    'order_id' => $order->id,
                    'po_number' => $order->po_number,
                    'po_date' => $order->po_date?->format('Y-m-d'),
                    'client_code' => $order->client?->code,
                    'area' => $order->client?->area?->name,
                    'zone' => $order->client?->area?->areaGroup?->name,
                    'distance_km' => $order->client?->distance_km ?? 0,
                    'drop_cost' => $dropCost,
                    'cumulative_cost' => $totalCost,
                ];
            }
        }

        return response()->json([
            'route' => $routeDetails,
            'total_cost' => $totalCost,
            'total_orders' => count($routeDetails),
            'zones_covered' => count($zoneGroups),
        ]);
    }

    /**
     * Confirm delivery of an order - updates actual_date to current date.
     * Single confirm = full base rate (no batch discount)
     */
    public function confirmDelivery(Request $request, DeliveryOrder $order)
    {
        $request->validate([
            'delivery_date' => 'nullable|date',
            'base_rate' => 'nullable|numeric',
            'drop_cost' => 'nullable|numeric',
        ]);

        $deliveryDate = $request->input('delivery_date', Carbon::today()->toDateString());
        $baseRate = $request->input('base_rate', $order->client?->area?->areaGroup?->base_rate ?? 0);
        $dropCost = $request->input('drop_cost', $baseRate);
        
        // Determine additional rate type based on delivery timing
        $isEarly = Carbon::parse($deliveryDate)->lt($order->scheduled_date);
        $additionalRateType = 'none';
        $additionalRate = 0;
        
        // For advance delivery (delivered before scheduled date), we could apply a different rate
        // Currently using 'none' for single deliveries since no batch discount
        
        $order->update([
            'actual_date' => $deliveryDate,
            'status' => Carbon::parse($deliveryDate)->lte($order->scheduled_date) ? 'on_time' : 'delayed',
            'base_rate' => $baseRate,
            'additional_rate_type' => $additionalRateType,
            'additional_rate' => $additionalRate,
            'total_rate' => $dropCost,
        ]);

        return back()->with('success', "Delivery confirmed for PO# {$order->po_number}");
    }

    /**
     * Confirm delivery for multiple orders at once.
     * Bulk confirm = multi-drop discount applied:
     * - 1st order = base rate
     * - Additional orders same zone as PREVIOUS order = +₱250 (drop_same_zone)
     * - Additional orders different zone from PREVIOUS order = +₱500 (drop_other_zone)
     */
    public function confirmBulkDelivery(Request $request)
    {
        $request->validate([
            'orders' => 'required|array|min:1',
            'orders.*.id' => 'required|exists:delivery_orders,id',
            'orders.*.base_rate' => 'required|numeric',
            'orders.*.drop_cost' => 'required|numeric',
            'delivery_date' => 'nullable|date',
        ]);

        $deliveryDate = $request->input('delivery_date', Carbon::today()->toDateString());
        $ordersData = collect($request->input('orders'));
        
        // Load all orders with their area group info
        $orderIds = $ordersData->pluck('id')->toArray();
        $orders = DeliveryOrder::with(['client.area.areaGroup'])
            ->whereIn('id', $orderIds)
            ->get()
            ->keyBy('id');
        
        $confirmedCount = 0;
        $previousAreaId = null;
        
        foreach ($ordersData as $index => $orderData) {
            $order = $orders->get($orderData['id']);
            if (!$order) continue;
            
            $baseRate = $orderData['base_rate'];
            $currentAreaId = $order->client?->area?->id;
            
            // Determine additional rate type
            $isFirstDrop = $index === 0;
            if ($isFirstDrop) {
                $additionalRateType = 'none';
                $additionalRate = 0;
                $dropCost = $baseRate;
            } else {
                // Check if same area as PREVIOUS order
                if ($currentAreaId && $previousAreaId && $currentAreaId === $previousAreaId) {
                    // Same area as previous = +₱250
                    $additionalRateType = 'drop_same_zone';
                    $additionalRate = 250;
                    $dropCost = 250;
                } else {
                    // Different area from previous = +₱500
                    $additionalRateType = 'drop_other_zone';
                    $additionalRate = 500;
                    $dropCost = 500;
                }
            }
            
            $previousAreaId = $currentAreaId;
            
            $order->update([
                'actual_date' => $deliveryDate,
                'status' => Carbon::parse($deliveryDate)->lte($order->scheduled_date) ? 'on_time' : 'delayed',
                'base_rate' => $baseRate,
                'additional_rate_type' => $additionalRateType,
                'additional_rate' => $additionalRate,
                'total_rate' => $dropCost,
            ]);
            
            $confirmedCount++;
        }

        return back()->with('success', "{$confirmedCount} delivery order(s) confirmed successfully");
    }
}
