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
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('company_name')->nullable();
            $table->foreignId('province_id')->constrained()->onDelete('restrict');
            $table->foreignId('area_id')->constrained()->onDelete('restrict');
            $table->text('address')->nullable();
            $table->string('timezone')->nullable()->comment('Delivery cutoff time e.g. UNTIL 5PM');
            $table->decimal('distance_km', 8, 2)->nullable();
            $table->string('contact_person')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
