<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderItem;
use App\Models\Client;
use App\Models\Province;
use App\Models\Product;
use App\Models\DeliveryMilestoneTemplate;
use App\Models\DeliveryOrderMilestone;
use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DeliveryOrderController extends Controller
{
    /**
     * Display a listing of delivery orders.
     */
    public function index(Request $request)
    {
        $query = DeliveryOrder::with(['client', 'province', 'items', 'batch.vehicle'])
            ->withCount('items');

        // Apply sorting based on filter (oldest PO first is default)
        $sort = $request->input('sort', 'fifo');
        switch ($sort) {
            case 'fifo':
                // Oldest PO date first
                $query->orderBy('po_date', 'asc')->orderBy('created_at', 'asc');
                break;
            case 'scheduled_asc':
                // Earliest scheduled date first
                $query->orderBy('scheduled_date', 'asc')->orderBy('po_number', 'asc');
                break;
            case 'scheduled_desc':
                // Latest scheduled date first
                $query->orderBy('scheduled_date', 'desc')->orderBy('po_number', 'desc');
                break;
            case 'urgent':
                // Pending orders with earliest scheduled date (due soon)
                $query->where('status', 'pending')
                    ->orderBy('scheduled_date', 'asc')
                    ->orderBy('po_date', 'asc');
                break;
            case 'newest':
            default:
                // Newest PO date first
                $query->orderBy('po_date', 'desc')->orderBy('created_at', 'desc');
                break;
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('po_number', 'like', "%{$search}%")
                    ->orWhereHas('client', function ($q) use ($search) {
                        $q->where('code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('items', function ($q) use ($search) {
                        $q->where('part_number', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%");
                    });
            });
        }

        // Province filter
        if ($request->filled('province_id') && $request->province_id !== 'all') {
            $query->where('province_id', $request->province_id);
        }

        // Client filter
        if ($request->filled('client_id') && $request->client_id !== 'all') {
            $query->where('client_id', $request->client_id);
        }

        // Status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Delivery Type filter
        if ($request->filled('delivery_type') && $request->delivery_type !== 'all') {
            $query->where('delivery_type', $request->delivery_type);
        }

        // Date range filter (scheduled date)
        if ($request->filled('date_from')) {
            $query->whereDate('scheduled_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('scheduled_date', '<=', $request->date_to);
        }

        $orders = $query->paginate(20)->withQueryString();

        // Calculate summary statistics
        $summaryQuery = DeliveryOrder::query();
        if ($request->filled('province_id') && $request->province_id !== 'all') {
            $summaryQuery->where('province_id', $request->province_id);
        }
        if ($request->filled('client_id') && $request->client_id !== 'all') {
            $summaryQuery->where('client_id', $request->client_id);
        }
        if ($request->filled('date_from')) {
            $summaryQuery->whereDate('scheduled_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $summaryQuery->whereDate('scheduled_date', '<=', $request->date_to);
        }

        $summary = [
            'total_orders' => $summaryQuery->count(),
            'total_value' => $summaryQuery->sum('total_amount'),
            'total_items' => $summaryQuery->sum('total_items'),
            'pending_count' => (clone $summaryQuery)->pending()->count(),
            'confirmed_count' => (clone $summaryQuery)->where('status', 'confirmed')->count(),
            'in_transit_count' => (clone $summaryQuery)->where('status', 'in_transit')->count(),
            'on_time_count' => (clone $summaryQuery)->onTime()->count(),
            'delayed_count' => (clone $summaryQuery)->delayed()->count(),
        ];

        // Calculate on-time percentage
        $completedCount = $summary['on_time_count'] + $summary['delayed_count'];
        $summary['on_time_percentage'] = $completedCount > 0
            ? round(($summary['on_time_count'] / $completedCount) * 100, 1)
            : 0;

        return Inertia::render('admin/delivery-orders/index', [
            'orders' => $orders,
            'provinces' => Province::where('is_active', true)->orderBy('name')->get(),
            'clients' => Client::where('is_active', true)->orderBy('code')->get(['id', 'code']),
            'summary' => $summary,
            'filters' => $request->only(['search', 'province_id', 'client_id', 'status', 'delivery_type', 'date_from', 'date_to', 'sort']),
        ]);
    }

    /**
     * Show the form for creating a new delivery order.
     */
    public function create()
    {
        return Inertia::render('admin/delivery-orders/create', [
            'clients' => Client::with(['province', 'area.areaGroup'])
                ->where('is_active', true)
                ->orderBy('code')
                ->get(),
            'provinces' => Province::where('is_active', true)->orderBy('name')->get(),
        ]);
    }

    /**
     * Store a newly created delivery order.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'po_number' => 'required|string|max:50',
            'po_date' => 'required|date',
            'scheduled_date' => 'required|date',
            'actual_date' => 'nullable|date',
            'client_id' => 'required|exists:clients,id',
            'delivery_type' => 'nullable|string|max:50',
            'remarks' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.part_number' => 'required|string|max:100',
            'items.*.description' => 'nullable|string|max:255',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        // Get province from client
        $client = Client::findOrFail($validated['client_id']);
        $order = null;

        DB::transaction(function () use ($validated, $client, &$order) {
            // Create order
            $order = DeliveryOrder::create([
                'po_number' => $validated['po_number'],
                'po_date' => $validated['po_date'],
                'scheduled_date' => $validated['scheduled_date'],
                'actual_date' => $validated['actual_date'] ?? null,
                'client_id' => $validated['client_id'],
                'province_id' => $client->province_id,
                'delivery_type' => $validated['delivery_type'] ?? null,
                'remarks' => $validated['remarks'] ?? null,
                'created_by' => Auth::id(),
            ]);

            // Determine status
            if ($order->actual_date) {
                $order->status = $order->actual_date <= $order->scheduled_date ? 'on_time' : 'delayed';
                $order->save();
            }

            // Create items
            foreach ($validated['items'] as $itemData) {
                $order->items()->create([
                    'product_id' => $itemData['product_id'] ?? null,
                    'part_number' => $itemData['part_number'],
                    'description' => $itemData['description'] ?? null,
                    'unit_price' => $itemData['unit_price'],
                    'quantity' => $itemData['quantity'],
                    'total_price' => $itemData['unit_price'] * $itemData['quantity'],
                ]);
            }

            // Recalculate totals
            $order->recalculateTotals();
        });

        // Create notification for new delivery order (global - null user_id means all users see it)
        if ($order) {
            Notification::deliveryScheduled($order);
        }

        return redirect()->route('admin.delivery-orders.index')
            ->with('success', 'Delivery order created successfully.');
    }

    /**
     * Display the specified delivery order.
     */
    public function show(DeliveryOrder $deliveryOrder)
    {
        $deliveryOrder->load(['client', 'province', 'items.product', 'creator', 'batch.vehicle']);

        return Inertia::render('admin/delivery-orders/show', [
            'order' => $deliveryOrder,
        ]);
    }

    /**
     * Show the form for editing the specified delivery order.
     */
    public function edit(DeliveryOrder $deliveryOrder)
    {
        return Inertia::render('admin/delivery-orders/edit', [
            'order' => $deliveryOrder->load(['client.area.areaGroup', 'province', 'items.product']),
            'clients' => Client::with(['province', 'area.areaGroup'])
                ->where('is_active', true)
                ->orderBy('code')
                ->get(),
            'provinces' => Province::where('is_active', true)->orderBy('name')->get(),
        ]);
    }

    /**
     * Update the specified delivery order.
     */
    public function update(Request $request, DeliveryOrder $deliveryOrder)
    {
        $validated = $request->validate([
            'po_number' => 'required|string|max:50',
            'po_date' => 'required|date',
            'scheduled_date' => 'required|date',
            'actual_date' => 'nullable|date',
            'client_id' => 'required|exists:clients,id',
            'delivery_type' => 'nullable|string|max:50',
            'remarks' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|exists:delivery_order_items,id',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.part_number' => 'required|string|max:100',
            'items.*.description' => 'nullable|string|max:255',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        // Get province from client
        $client = Client::findOrFail($validated['client_id']);

        DB::transaction(function () use ($validated, $client, $deliveryOrder) {
            // Update order
            $deliveryOrder->update([
                'po_number' => $validated['po_number'],
                'po_date' => $validated['po_date'],
                'scheduled_date' => $validated['scheduled_date'],
                'actual_date' => $validated['actual_date'] ?? null,
                'client_id' => $validated['client_id'],
                'province_id' => $client->province_id,
                'delivery_type' => $validated['delivery_type'] ?? null,
                'remarks' => $validated['remarks'] ?? null,
            ]);

            // Determine status based on dates
            if ($deliveryOrder->actual_date) {
                $deliveryOrder->status = $deliveryOrder->actual_date <= $deliveryOrder->scheduled_date ? 'on_time' : 'delayed';
            } else {
                $deliveryOrder->status = 'pending';
            }
            $deliveryOrder->save();

            // Get existing item IDs
            $existingItemIds = $deliveryOrder->items()->pluck('id')->toArray();
            $updatedItemIds = [];

            // Update or create items
            foreach ($validated['items'] as $itemData) {
                if (!empty($itemData['id'])) {
                    // Update existing item
                    $item = DeliveryOrderItem::find($itemData['id']);
                    if ($item && (int) $item->delivery_order_id === (int) $deliveryOrder->id) {
                        $item->update([
                            'product_id' => !empty($itemData['product_id']) ? $itemData['product_id'] : null,
                            'part_number' => $itemData['part_number'],
                            'description' => $itemData['description'] ?? null,
                            'unit_price' => $itemData['unit_price'],
                            'quantity' => $itemData['quantity'],
                        ]);
                        $updatedItemIds[] = $item->id;
                    }
                } else {
                    // Create new item
                    $newItem = $deliveryOrder->items()->create([
                        'product_id' => !empty($itemData['product_id']) ? $itemData['product_id'] : null,
                        'part_number' => $itemData['part_number'],
                        'description' => $itemData['description'] ?? null,
                        'unit_price' => $itemData['unit_price'],
                        'quantity' => $itemData['quantity'],
                    ]);
                    $updatedItemIds[] = $newItem->id;
                }
            }

            // Delete removed items
            $itemsToDelete = array_diff($existingItemIds, $updatedItemIds);
            if (!empty($itemsToDelete)) {
                DeliveryOrderItem::whereIn('id', $itemsToDelete)->delete();
            }

            // Recalculate totals
            $deliveryOrder->recalculateTotals();
        });

        return redirect()->route('admin.delivery-orders.index')
            ->with('success', 'Delivery order updated successfully.');
    }

    /**
     * Remove the specified delivery order.
     */
    public function destroy(DeliveryOrder $deliveryOrder)
    {
        $deliveryOrder->delete(); // Items will cascade delete

        return redirect()->route('admin.delivery-orders.index')
            ->with('success', 'Delivery order deleted successfully.');
    }

    // ==========================================
    // CRITICAL PATH / MILESTONE METHODS
    // ==========================================

    /**
     * Initialize milestones for an order.
     */
    public function initializeMilestones(DeliveryOrder $deliveryOrder)
    {
        if ($deliveryOrder->milestones()->count() > 0) {
            return back()->with('error', 'Milestones already initialized for this order.');
        }

        $deliveryOrder->initializeMilestones();

        return back()->with('success', 'Milestones initialized successfully.');
    }

    /**
     * Advance to next milestone.
     */
    public function advanceMilestone(DeliveryOrder $deliveryOrder)
    {
        $next = $deliveryOrder->advanceToNextMilestone();

        if ($next) {
            return back()->with('success', "Advanced to milestone: {$next->template->name}");
        }

        return back()->with('success', 'All milestones completed. Order marked as delivered.');
    }

    /**
     * Update a specific milestone.
     */
    public function updateMilestone(Request $request, DeliveryOrder $deliveryOrder, DeliveryOrderMilestone $milestone)
    {
        $validated = $request->validate([
            'status' => 'required|in:not_started,in_progress,completed,skipped',
            'actual_start_date' => 'nullable|date',
            'actual_end_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $milestone->update($validated);

        // If completed, calculate actual duration
        if ($validated['status'] === 'completed' && $milestone->actual_start_date && $milestone->actual_end_date) {
            $milestone->actual_duration_days = $milestone->actual_start_date->diffInDays($milestone->actual_end_date);
            $milestone->save();
        }

        // Recalculate critical path
        $deliveryOrder->calculateCriticalPath();

        return back()->with('success', 'Milestone updated successfully.');
    }

    /**
     * Get critical path analysis for an order.
     */
    public function criticalPathAnalysis(DeliveryOrder $deliveryOrder)
    {
        $deliveryOrder->load(['client', 'province', 'items.product', 'milestones.template']);

        return Inertia::render('admin/delivery-orders/critical-path', [
            'order' => $deliveryOrder,
            'milestones' => $deliveryOrder->getMilestonesWithStatus(),
            'criticalPathDuration' => $deliveryOrder->critical_path_duration,
            'criticalPathDelay' => $deliveryOrder->getCriticalPathDelay(),
            'isOnSchedule' => $deliveryOrder->isOnCriticalPathSchedule(),
        ]);
    }

    /**
     * Get products linked to a specific client.
     */
    public function getClientProducts(Client $client)
    {
        $products = $client->products()
            ->where('is_active', true)
            ->orderBy('part_number')
            ->get(['products.id', 'products.part_number', 'products.description', 'products.unit_price']);

        return response()->json($products);
    }
}
