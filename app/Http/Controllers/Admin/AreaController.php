<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\AreaGroup;
use App\Models\Province;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class AreaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Area::with(['province', 'areaGroup'])->withCount('clients');

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        // Province filter
        if ($request->filled('province_id')) {
            $query->where('province_id', $request->province_id);
        }

        // Area Group filter
        if ($request->filled('area_group_id')) {
            $query->where('area_group_id', $request->area_group_id);
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        $areas = $query->orderBy('name')->paginate(10)->withQueryString();
        $provinces = Province::where('is_active', true)->orderBy('name')->get();
        $areaGroups = AreaGroup::where('is_active', true)->orderBy('name')->get();

        return Inertia::render('admin/master-data/areas/index', [
            'areas' => $areas,
            'provinces' => $provinces,
            'areaGroups' => $areaGroups,
            'filters' => $request->only(['search', 'province_id', 'area_group_id', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $provinces = Province::where('is_active', true)->orderBy('name')->get();
        $areaGroups = AreaGroup::where('is_active', true)->orderBy('name')->get();
        
        return Inertia::render('admin/master-data/areas/create', [
            'provinces' => $provinces,
            'areaGroups' => $areaGroups,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'province_id' => ['required', 'exists:provinces,id'],
            'area_group_id' => ['nullable', 'exists:area_groups,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:10', 'unique:areas,code'],
            'is_active' => ['boolean'],
        ]);

        Area::create($validated);

        return redirect()->route('admin.master-data.areas.index')
            ->with('success', 'Area created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Area $area)
    {
        $area->load(['province', 'areaGroup', 'clients']);
        
        return Inertia::render('admin/master-data/areas/show', [
            'area' => $area,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, Area $area)
    {
        $provinces = Province::where('is_active', true)->orderBy('name')->get();
        $areaGroups = AreaGroup::where('is_active', true)->orderBy('name')->get();
        
        return Inertia::render('admin/master-data/areas/edit', [
            'area' => $area,
            'provinces' => $provinces,
            'areaGroups' => $areaGroups,
            'currentPage' => $request->query('page', 1),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Area $area)
    {
        $validated = $request->validate([
            'province_id' => ['required', 'exists:provinces,id'],
            'area_group_id' => ['nullable', 'exists:area_groups,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:10', Rule::unique('areas')->ignore($area->id)],
            'is_active' => ['boolean'],
        ]);

        $area->update($validated);

        $page = $request->query('page', 1);
        return redirect()->route('admin.master-data.areas.index', ['page' => $page])
            ->with('success', 'Area updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Area $area)
    {
        // Check if area has clients
        if ($area->clients()->count() > 0) {
            return back()->with('error', 'Cannot delete area with existing clients.');
        }

        $area->delete();

        return redirect()->route('admin.master-data.areas.index')
            ->with('success', 'Area deleted successfully.');
    }
}
