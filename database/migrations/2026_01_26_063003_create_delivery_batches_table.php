<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('delivery_batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_number', 30)->unique();
            $table->date('planned_date');
            $table->date('actual_date')->nullable();
            $table->foreignId('area_group_id')->nullable()->constrained('area_groups')->nullOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained('vehicles')->nullOnDelete();
            $table->enum('vehicle_type', ['l300', 'truck'])->default('l300');
            $table->integer('order_count')->default(0);
            $table->integer('total_items')->default(0);
            $table->decimal('total_value', 12, 2)->default(0);
            $table->decimal('total_rate', 10, 2)->default(0);
            $table->decimal('total_distance_km', 8, 2)->default(0);
            $table->enum('status', ['planned', 'in_transit', 'completed', 'cancelled'])->default('planned');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['planned_date', 'status']);
            $table->index('area_group_id');
        });
        
        // Add batch_id to delivery_orders
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->foreignId('batch_id')->nullable()->after('province_id')->constrained('delivery_batches')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->dropForeign(['batch_id']);
            $table->dropColumn('batch_id');
        });
        
        Schema::dropIfExists('delivery_batches');
    }
};
