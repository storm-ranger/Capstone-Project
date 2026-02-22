<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Province;
use App\Models\Area;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Client::with(['province', 'area']);

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%");
            });
        }

        // Province filter
        if ($request->filled('province_id')) {
            $query->where('province_id', $request->province_id);
        }

        // Area filter
        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        $clients = $query->orderBy('code')->paginate(10)->withQueryString();
        $provinces = Province::where('is_active', true)->orderBy('name')->get();
        $areas = Area::where('is_active', true)->orderBy('name')->get();

        return Inertia::render('admin/master-data/clients/index', [
            'clients' => $clients,
            'provinces' => $provinces,
            'areas' => $areas,
            'filters' => $request->only(['search', 'province_id', 'area_id', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $provinces = Province::where('is_active', true)->orderBy('name')->get();
        
        return Inertia::render('admin/master-data/clients/create', [
            'provinces' => $provinces,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:clients,code'],
            'province_id' => ['required', 'exists:provinces,id'],
            'area_id' => ['nullable', 'exists:areas,id'],
            'cutoff_time' => ['nullable', 'string', 'max:100'],
            'distance_km' => ['nullable', 'numeric', 'min:0'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'is_active' => ['boolean'],
        ]);

        Client::create($validated);

        return redirect()->route('admin.master-data.clients.index')
            ->with('success', 'Client created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Client $client)
    {
        $client->load(['province', 'area']);
        
        return Inertia::render('admin/master-data/clients/show', [
            'client' => $client,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, Client $client)
    {
        $provinces = Province::where('is_active', true)->orderBy('name')->get();
        
        return Inertia::render('admin/master-data/clients/edit', [
            'client' => $client,
            'provinces' => $provinces,
            'currentPage' => $request->query('page', 1),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', Rule::unique('clients')->ignore($client->id)],
            'province_id' => ['required', 'exists:provinces,id'],
            'area_id' => ['nullable', 'exists:areas,id'],
            'cutoff_time' => ['nullable', 'string', 'max:100'],
            'distance_km' => ['nullable', 'numeric', 'min:0'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'is_active' => ['boolean'],
        ]);

        $client->update($validated);

        $page = $request->query('page', 1);
        return redirect()->route('admin.master-data.clients.index', ['page' => $page])
            ->with('success', 'Client updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Client $client)
    {
        $client->delete();

        return redirect()->route('admin.master-data.clients.index')
            ->with('success', 'Client deleted successfully.');
    }

    /**
     * Get areas by province (for dependent dropdown).
     */
    public function getAreasByProvince(Province $province)
    {
        $areas = Area::where('province_id', $province->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json($areas);
    }
}
