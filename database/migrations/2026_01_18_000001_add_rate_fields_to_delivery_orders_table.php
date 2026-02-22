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
        Schema::table('delivery_orders', function (Blueprint $table) {
            // Rate fields
            $table->decimal('base_rate', 10, 2)->default(0)->after('delivery_type');
            $table->enum('additional_rate_type', ['none', 'drop_same_zone', 'drop_other_zone'])->default('none')->after('base_rate');
            $table->decimal('additional_rate', 10, 2)->default(0)->after('additional_rate_type');
            $table->decimal('total_rate', 10, 2)->default(0)->after('additional_rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->dropColumn(['base_rate', 'additional_rate_type', 'additional_rate', 'total_rate']);
        });
    }
};
