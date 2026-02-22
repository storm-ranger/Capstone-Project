<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify enum to add 'advance_delivery' option
        DB::statement("ALTER TABLE delivery_orders MODIFY COLUMN additional_rate_type ENUM('none', 'drop_same_zone', 'drop_other_zone', 'advance_delivery') DEFAULT 'none'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original enum values
        DB::statement("ALTER TABLE delivery_orders MODIFY COLUMN additional_rate_type ENUM('none', 'drop_same_zone', 'drop_other_zone') DEFAULT 'none'");
    }
};
