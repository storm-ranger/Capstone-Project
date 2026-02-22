<?php

namespace Database\Seeders;

use App\Models\DeliveryMilestoneTemplate;
use Illuminate\Database\Seeder;

class DeliveryMilestoneTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Standard delivery process milestones for Critical Path analysis.
     */
    public function run(): void
    {
        $milestones = [
            [
                'name' => 'PO Received',
                'code' => 'po_received',
                'sequence' => 1,
                'standard_duration_days' => 1,
            ],
            [
                'name' => 'Order Processing',
                'code' => 'order_processing',
                'sequence' => 2,
                'standard_duration_days' => 2,
            ],
            [
                'name' => 'Stock Allocation',
                'code' => 'stock_allocation',
                'sequence' => 3,
                'standard_duration_days' => 1,
            ],
            [
                'name' => 'Packing',
                'code' => 'packing',
                'sequence' => 4,
                'standard_duration_days' => 1,
            ],
            [
                'name' => 'Quality Check',
                'code' => 'quality_check',
                'sequence' => 5,
                'standard_duration_days' => 1,
            ],
            [
                'name' => 'Dispatched',
                'code' => 'dispatched',
                'sequence' => 6,
                'standard_duration_days' => 1,
            ],
            [
                'name' => 'In Transit',
                'code' => 'in_transit',
                'sequence' => 7,
                'standard_duration_days' => 3,
            ],
            [
                'name' => 'Delivered',
                'code' => 'delivered',
                'sequence' => 8,
                'standard_duration_days' => 1,
            ],
        ];

        foreach ($milestones as $milestone) {
            DeliveryMilestoneTemplate::updateOrCreate(
                ['code' => $milestone['code']],
                $milestone
            );
        }
    }
}
