<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Admin User
        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@dss.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        // Create Staff User (with all permissions)
        User::factory()->create([
            'name' => 'Staff User',
            'email' => 'staff@dss.com',
            'password' => bcrypt('password'),
            'role' => 'staff',
            'permissions' => [
                'dashboard',
                'delivery-orders',
                'route-planner',
                'allocation-planner',
                'sales-tracking',
                'master-data.provinces',
                'master-data.area-groups',
                'master-data.areas',
                'master-data.clients',
                'master-data.products',
            ],
        ]);

        // Seed Master Data (Area Groups, Provinces, Areas, Rate Settings)
        $this->call(MasterDataSeeder::class);

        // Seed Vehicles
        $this->call(VehicleSeeder::class);

        // Seed Clients and Products
        $this->call(ClientProductSeeder::class);

        // Seed Delivery Orders (sample data)
       $this->call(DeliveryOrderSeeder::class);

        // Seed Delivery Batches (assign orders to batches with vehicles)
        $this->call(DeliveryBatchSeeder::class);

        // Seed Notifications (sample data)
        $this->call(NotificationSeeder::class);
    }
}
