<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Province;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class ProvinceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Province::withCount('areas');

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        $provinces = $query->orderBy('name')->paginate(10)->withQueryString();

        return Inertia::render('admin/master-data/provinces/index', [
            'provinces' => $provinces,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('admin/master-data/provinces/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:provinces,name'],
            'code' => ['required', 'string', 'max:10', 'unique:provinces,code'],
            'is_active' => ['boolean'],
        ]);

        Province::create($validated);

        return redirect()->route('admin.master-data.provinces.index')
            ->with('success', 'Province created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Province $province)
    {
        $province->load('areas');
        
        return Inertia::render('admin/master-data/provinces/show', [
            'province' => $province,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, Province $province)
    {
        return Inertia::render('admin/master-data/provinces/edit', [
            'province' => $province,
            'currentPage' => $request->query('page', 1),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Province $province)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('provinces')->ignore($province->id)],
            'code' => ['required', 'string', 'max:10', Rule::unique('provinces')->ignore($province->id)],
            'is_active' => ['boolean'],
        ]);

        $province->update($validated);

        $page = $request->query('page', 1);
        return redirect()->route('admin.master-data.provinces.index', ['page' => $page])
            ->with('success', 'Province updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Province $province)
    {
        // Check if province has areas
        if ($province->areas()->count() > 0) {
            return back()->with('error', 'Cannot delete province with existing areas.');
        }

        $province->delete();

        return redirect()->route('admin.master-data.provinces.index')
            ->with('success', 'Province deleted successfully.');
    }
}
