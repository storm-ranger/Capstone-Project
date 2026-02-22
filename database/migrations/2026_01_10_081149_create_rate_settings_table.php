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
        Schema::create('rate_settings', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->default('base')->comment('base, drop_same_zone, drop_other_zone');
            $table->text('description')->nullable();
            $table->decimal('rate', 12, 2);
            $table->foreignId('province_id')->nullable()->constrained()->onDelete('cascade');
            $table->json('area_ids')->nullable()->comment('Applicable area IDs');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rate_settings');
    }
};
