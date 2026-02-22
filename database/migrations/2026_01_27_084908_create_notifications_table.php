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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('type'); // delivery_scheduled, kpi_alert, report_ready, delivery_completed, etc.
            $table->string('title');
            $table->text('message');
            $table->string('icon')->nullable(); // lucide icon name
            $table->string('icon_color')->default('blue'); // blue, green, yellow, red
            $table->string('link')->nullable(); // optional link to relevant page
            $table->json('data')->nullable(); // additional data
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
