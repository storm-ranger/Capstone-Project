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
        // Define standard milestones for delivery process
        Schema::create('delivery_milestone_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., "PO Received", "Processing", "Dispatched"
            $table->string('code')->unique(); // e.g., "po_received", "processing", "dispatched"
            $table->integer('sequence')->default(0); // Order of milestone
            $table->integer('standard_duration_days')->default(1); // Expected duration to next milestone
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Track actual milestones for each delivery order
        Schema::create('delivery_order_milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('milestone_template_id')->constrained('delivery_milestone_templates')->cascadeOnDelete();
            $table->integer('sequence')->default(0);
            $table->integer('planned_duration_days')->default(1); // Planned duration to next milestone
            $table->integer('actual_duration_days')->nullable(); // Actual duration (calculated when completed)
            $table->date('planned_start_date')->nullable();
            $table->date('planned_end_date')->nullable();
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->enum('status', ['not_started', 'in_progress', 'completed', 'skipped'])->default('not_started');
            $table->integer('slack_days')->default(0); // Float/slack time
            $table->boolean('is_critical')->default(false); // On critical path?
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['delivery_order_id', 'milestone_template_id'], 'order_milestone_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_order_milestones');
        Schema::dropIfExists('delivery_milestone_templates');
    }
};
