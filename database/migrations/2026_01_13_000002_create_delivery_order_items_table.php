<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Delivery Order Items - Line items for each order
     * Multiple items per PO/order
     */
    public function up(): void
    {
        Schema::create('delivery_order_items', function (Blueprint $table) {
            $table->id();
            
            // Parent order
            $table->foreignId('delivery_order_id')->constrained()->onDelete('cascade');
            
            // Product Information
            $table->foreignId('product_id')->nullable()->constrained()->onDelete('set null');
            $table->string('part_number', 100);       // Part number (from product or manual)
            $table->string('description')->nullable(); // Product description
            
            // Pricing
            $table->decimal('unit_price', 12, 2);
            $table->unsignedInteger('quantity');
            $table->decimal('total_price', 14, 2);    // unit_price * quantity
            
            $table->timestamps();
            
            // Indexes
            $table->index('part_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_order_items');
    }
};
