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
        // First expand the enum to include all values we need
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'manager', 'encoder', 'viewer', 'staff') NOT NULL DEFAULT 'staff'");

        // Update existing roles to admin or staff
        DB::table('users')->where('role', 'manager')->update(['role' => 'admin']);
        DB::table('users')->where('role', 'encoder')->update(['role' => 'staff']);
        DB::table('users')->where('role', 'viewer')->update(['role' => 'staff']);

        // Now change the enum to only admin and staff
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff'");

        // Add permissions column
        Schema::table('users', function (Blueprint $table) {
            $table->json('permissions')->nullable()->after('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('permissions');
        });

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'manager', 'encoder', 'viewer') NOT NULL DEFAULT 'viewer'");
    }
};
