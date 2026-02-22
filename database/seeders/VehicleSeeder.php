<?php

namespace Database\Seeders;

use App\Models\Vehicle;
use Illuminate\Database\Seeder;

class VehicleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $vehicles = [
            // L300 Vans
            [
                'code' => 'L300-01',
                'name' => 'L300 Van Unit 1',
                'type' => 'l300',
                'plate_number' => 'ABC 1234',
                'max_value' => 150000,
                'max_weight_kg' => 1000,
                'is_active' => true,
            ],
            [
                'code' => 'L300-02',
                'name' => 'L300 Van Unit 2',
                'type' => 'l300',
                'plate_number' => 'DEF 5678',
                'max_value' => 150000,
                'max_weight_kg' => 1000,
                'is_active' => true,
            ],
            // Trucks
            [
                'code' => 'TRK-01',
                'name' => 'Truck Unit 1',
                'type' => 'truck',
                'plate_number' => 'GHI 9012',
                'max_value' => 500000,
                'max_weight_kg' => 5000,
                'is_active' => true,
            ],
            [
                'code' => 'TRK-02',
                'name' => 'Truck Unit 2',
                'type' => 'truck',
                'plate_number' => 'JKL 3456',
                'max_value' => 500000,
                'max_weight_kg' => 5000,
                'is_active' => true,
            ],
        ];

        foreach ($vehicles as $vehicle) {
            Vehicle::updateOrCreate(
                ['code' => $vehicle['code']],
                $vehicle
            );
        }
    }
}
