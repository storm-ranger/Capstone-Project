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
        Schema::table('delivery_order_items', function (Blueprint $table) {
            $table->string('part_number', 255)->change();
            $table->string('description', 500)->nullable()->change();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->string('part_number', 255)->change();
            $table->string('description', 500)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_order_items', function (Blueprint $table) {
            $table->string('part_number', 100)->change();
            $table->string('description', 255)->nullable()->change();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->string('part_number', 100)->change();
            $table->string('description', 255)->nullable()->change();
        });
    }
};
