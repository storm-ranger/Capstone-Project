<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DeliveryOrderSeeder extends Seeder
{
    public function run(): void
    {
        $encoder = User::where('role', 'encoder')->first();
        $clients = Client::with(['products', 'area.areaGroup', 'province'])->get();

        if ($clients->isEmpty()) {
            $this->command->warn('No clients found. Please run ClientProductSeeder first.');
            return;
        }

        $orderCount = 0;
        $itemCount = 0;

        // Generate orders for the past 30 days
        $startDate = Carbon::now()->subDays(30);
        $endDate = Carbon::now();

        // Create completed deliveries (on_time and delayed) for sales tracking
        $completedStatuses = ['on_time', 'delayed'];
        
        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            // Skip weekends for more realistic data
            if ($date->isWeekend()) {
                continue;
            }

            // Generate 2-5 deliveries per day
            $deliveriesPerDay = rand(2, 5);
            $selectedClients = $clients->random(min($deliveriesPerDay, $clients->count()));

            foreach ($selectedClients as $client) {
                if ($client->products->isEmpty()) {
                    continue;
                }

                $poDate = $date->copy()->subDays(rand(1, 3));
                $scheduledDate = $date->copy();
                
                // Determine if delivery is completed, in transit, or pending
                $daysDiff = Carbon::now()->diffInDays($date, false);
                
                if ($daysDiff < -2) {
                    // Past orders - completed
                    $status = $completedStatuses[array_rand($completedStatuses)];
                    $actualDate = $status === 'on_time' 
                        ? $scheduledDate->copy() 
                        : $scheduledDate->copy()->addDays(rand(1, 2));
                } elseif ($daysDiff < 0) {
                    // Recent past - mix of completed and in_transit
                    $status = rand(0, 1) ? 'on_time' : 'in_transit';
                    $actualDate = $status === 'on_time' ? $scheduledDate->copy() : null;
                } elseif ($daysDiff == 0) {
                    // Today - confirmed or in_transit
                    $status = rand(0, 1) ? 'confirmed' : 'in_transit';
                    $actualDate = null;
                } else {
                    // Future - pending or confirmed
                    $status = rand(0, 1) ? 'pending' : 'confirmed';
                    $actualDate = null;
                }

                // Get base rate from area group
                $baseRate = $client->area?->areaGroup?->base_rate ?? 2750.00;

                // Random number of items (1-5)
                $numItems = rand(1, min(5, $client->products->count()));
                $selectedProducts = $client->products->random($numItems);

                // Calculate totals
                $totalItems = $numItems;
                $totalQuantity = 0;
                $totalAmount = 0;
                $items = [];

                // Calculate target amount for 2-3% KPI
                // KPI = Rate / Actual Sales × 100, so for 2-3%: Actual Sales = Rate / 0.02 to 0.03
                // Target amount should be Rate × 33 to Rate × 50
                $targetMultiplier = rand(35, 55); // Random between 1.8% and 2.9% KPI
                $targetAmount = $baseRate * $targetMultiplier;

                foreach ($selectedProducts as $index => $product) {
                    // Calculate quantity to reach target amount distributed across items
                    $remainingItems = $numItems - $index;
                    $remainingTarget = max(0, $targetAmount - $totalAmount);
                    
                    if ($remainingItems > 1) {
                        // Distribute remaining target among remaining items
                        $itemTarget = $remainingTarget / $remainingItems * (0.8 + (rand(0, 40) / 100));
                    } else {
                        // Last item gets whatever is needed to reach target
                        $itemTarget = $remainingTarget;
                    }
                    
                    // Calculate quantity needed for this target
                    $quantity = max(50, (int) ceil($itemTarget / $product->unit_price));
                    $quantity = min($quantity, 5000); // Cap at 5000
                    
                    $totalPrice = $product->unit_price * $quantity;
                    
                    $totalQuantity += $quantity;
                    $totalAmount += $totalPrice;

                    $items[] = [
                        'product_id' => $product->id,
                        'part_number' => $product->part_number,
                        'description' => $product->description ?? $product->part_number,
                        'unit_price' => $product->unit_price,
                        'quantity' => $quantity,
                        'total_price' => $totalPrice,
                    ];
                }

                // Randomly assign delivery type (Drop Off or Pickup)
                $deliveryType = rand(0, 1) ? 'Drop Off' : 'Pickup';

                // Calculate additional rate for multi-drop (random chance)
                $additionalRateType = null;
                $additionalRate = 0;

                if (rand(0, 3) === 0) { // 25% chance of additional rate
                    $additionalRateType = ['drop_same_zone', 'drop_other_zone', 'advance_delivery'][array_rand(['drop_same_zone', 'drop_other_zone', 'advance_delivery'])];
                    $additionalRate = match($additionalRateType) {
                        'drop_same_zone' => 250.00,
                        'drop_other_zone' => 500.00,
                        'advance_delivery' => 300.00,
                        default => 0,
                    };
                }

                $totalRate = $baseRate + $additionalRate;

                // Set rates - pending orders may not have rates confirmed yet
                if (in_array($status, ['confirmed', 'in_transit', 'on_time', 'delayed'])) {
                    $orderBaseRate = $baseRate;
                    $orderAdditionalRate = $additionalRate;
                    $orderTotalRate = $totalRate;
                } else {
                    // Pending orders - set base rate but no additional
                    $orderBaseRate = $baseRate;
                    $orderAdditionalRate = 0;
                    $orderTotalRate = $baseRate;
                    $additionalRateType = null;
                }

                // Generate PO number
                $poNumber = 'PO-' . $date->format('Ymd') . '-' . str_pad($orderCount + 1, 4, '0', STR_PAD_LEFT);

                // Create delivery order
                $order = DeliveryOrder::create([
                    'po_number' => $poNumber,
                    'po_date' => $poDate,
                    'scheduled_date' => $scheduledDate,
                    'actual_date' => $actualDate,
                    'client_id' => $client->id,
                    'province_id' => $client->province_id,
                    'status' => $status,
                    'delivery_type' => $deliveryType,
                    'base_rate' => $orderBaseRate,
                    'additional_rate_type' => $additionalRateType,
                    'additional_rate' => $orderAdditionalRate,
                    'total_rate' => $orderTotalRate,
                    'total_items' => $totalItems,
                    'total_quantity' => $totalQuantity,
                    'total_amount' => round($totalAmount, 2),
                    'remarks' => null,
                    'created_by' => $encoder?->id,
                ]);

                $orderCount++;

                // Create order items
                foreach ($items as $item) {
                    DeliveryOrderItem::create([
                        'delivery_order_id' => $order->id,
                        ...$item,
                    ]);
                    $itemCount++;
                }
            }
        }

        // Add some pending orders for the next few days
        for ($i = 1; $i <= 5; $i++) {
            $futureDate = Carbon::now()->addDays($i);
            
            if ($futureDate->isWeekend()) {
                continue;
            }

            $deliveriesPerDay = rand(2, 4);
            $selectedClients = $clients->random(min($deliveriesPerDay, $clients->count()));

            foreach ($selectedClients as $client) {
                if ($client->products->isEmpty()) {
                    continue;
                }

                $poDate = Carbon::now()->subDays(rand(0, 2));
                $scheduledDate = $futureDate->copy();
                $status = rand(0, 1) ? 'pending' : 'confirmed';

                // Get base rate from area group
                $baseRate = $client->area?->areaGroup?->base_rate ?? 2750.00;

                $numItems = rand(1, min(4, $client->products->count()));
                $selectedProducts = $client->products->random($numItems);

                $totalItems = $numItems;
                $totalQuantity = 0;
                $totalAmount = 0;
                $items = [];

                // Calculate target amount for 2-3% KPI
                $targetMultiplier = rand(35, 55);
                $targetAmount = $baseRate * $targetMultiplier;

                foreach ($selectedProducts as $index => $product) {
                    $remainingItems = $numItems - $index;
                    $remainingTarget = max(0, $targetAmount - $totalAmount);
                    
                    if ($remainingItems > 1) {
                        $itemTarget = $remainingTarget / $remainingItems * (0.8 + (rand(0, 40) / 100));
                    } else {
                        $itemTarget = $remainingTarget;
                    }
                    
                    $quantity = max(50, (int) ceil($itemTarget / $product->unit_price));
                    $quantity = min($quantity, 5000);
                    
                    $totalPrice = $product->unit_price * $quantity;
                    
                    $totalQuantity += $quantity;
                    $totalAmount += $totalPrice;

                    $items[] = [
                        'product_id' => $product->id,
                        'part_number' => $product->part_number,
                        'description' => $product->description ?? $product->part_number,
                        'unit_price' => $product->unit_price,
                        'quantity' => $quantity,
                        'total_price' => $totalPrice,
                    ];
                }

                // Randomly assign delivery type (Drop Off or Pickup)
                $deliveryType = rand(0, 1) ? 'Drop Off' : 'Pickup';

                // Set rates only for confirmed orders
                if ($status === 'confirmed') {
                    $orderBaseRate = $baseRate;
                    $orderTotalRate = $baseRate;
                    $orderAdditionalRate = 0;
                } else {
                    // Pending orders still need base rate
                    $orderBaseRate = $baseRate;
                    $orderTotalRate = $baseRate;
                    $orderAdditionalRate = 0;
                }

                $poNumber = 'PO-' . $futureDate->format('Ymd') . '-' . str_pad($orderCount + 1, 4, '0', STR_PAD_LEFT);

                $order = DeliveryOrder::create([
                    'po_number' => $poNumber,
                    'po_date' => $poDate,
                    'scheduled_date' => $scheduledDate,
                    'actual_date' => null,
                    'client_id' => $client->id,
                    'province_id' => $client->province_id,
                    'status' => $status,
                    'delivery_type' => $deliveryType,
                    'base_rate' => $orderBaseRate,
                    'additional_rate_type' => null,
                    'additional_rate' => $orderAdditionalRate,
                    'total_rate' => $orderTotalRate,
                    'total_items' => $totalItems,
                    'total_quantity' => $totalQuantity,
                    'total_amount' => round($totalAmount, 2),
                    'remarks' => null,
                    'created_by' => $encoder?->id,
                ]);

                $orderCount++;

                foreach ($items as $item) {
                    DeliveryOrderItem::create([
                        'delivery_order_id' => $order->id,
                        ...$item,
                    ]);
                    $itemCount++;
                }
            }
        }

        // Summary statistics
        $stats = DeliveryOrder::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $this->command->info('Delivery Order data seeded successfully!');
        $this->command->info("- {$orderCount} Delivery Orders created");
        $this->command->info("- {$itemCount} Delivery Order Items created");
        $this->command->info('Status breakdown:');
        foreach ($stats as $status => $count) {
            $this->command->info("  - {$status}: {$count}");
        }
    }
}
