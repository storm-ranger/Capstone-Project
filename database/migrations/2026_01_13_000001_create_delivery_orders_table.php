<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Delivery Monitoring - Order header table
     * One PO can have multiple items (line items)
     */
    public function up(): void
    {
        Schema::create('delivery_orders', function (Blueprint $table) {
            $table->id();
            
            // PO/Order Information
            $table->string('po_number', 50);          // PO # from Excel
            $table->date('po_date');                  // P.O/DS DATE - Order date
            $table->date('scheduled_date');           // DS/P.O DEL DATE - Scheduled delivery date
            $table->date('actual_date')->nullable();  // ACTUAL DEL DATE
            
            // Client & Location
            $table->foreignId('client_id')->constrained()->onDelete('restrict');
            $table->foreignId('province_id')->constrained()->onDelete('restrict');
            
            // Status - On Time or Delayed (based on actual vs scheduled date)
            $table->enum('status', ['pending', 'on_time', 'delayed', 'cancelled'])->default('pending');
            
            // Type (PICK UP, ADD, PPMY, PASCZ, etc.)
            $table->string('delivery_type', 50)->nullable();
            
            // Totals (calculated from items)
            $table->unsignedInteger('total_items')->default(0);
            $table->unsignedInteger('total_quantity')->default(0);
            $table->decimal('total_amount', 14, 2)->default(0);
            
            // Additional info
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            
            // Indexes
            $table->index('po_number');
            $table->index('po_date');
            $table->index('scheduled_date');
            $table->index('actual_date');
            $table->index('status');
            $table->index(['client_id', 'po_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_orders');
    }
};
