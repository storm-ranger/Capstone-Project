<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {

    public function up(): void
    {
        DB::statement("
            ALTER TABLE delivery_orders
            MODIFY additional_rate_type
            ENUM('none','drop_same_zone','drop_other_zone','same_client')
            DEFAULT 'none'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE delivery_orders
            MODIFY additional_rate_type
            ENUM('none','drop_other_zone')
            DEFAULT 'none'
        ");
    }
};