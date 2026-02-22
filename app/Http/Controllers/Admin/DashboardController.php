<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\DeliveryOrder;
use App\Models\Province;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $viewType = $request->get('view', 'monthly');
        $provinceId = $request->get('province_id');
        $year = $request->get('year', Carbon::now()->year);
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        // Get provinces for filter
        $provinces = Province::orderBy('name')->get(['id', 'name']);

        // Get current month stats
        $currentMonth = Carbon::now();
        $startOfMonth = $currentMonth->copy()->startOfMonth();
        $endOfMonth = $currentMonth->copy()->endOfMonth();

        // Build base query for completed deliveries
        $completedStatuses = ['on_time', 'delayed'];

        // Total Sales (current month)
        $currentMonthQuery = DeliveryOrder::whereIn('status', $completedStatuses)
            ->whereNotNull('actual_date')
            ->whereBetween('actual_date', [$startOfMonth, $endOfMonth]);
        
        if ($provinceId) {
            $currentMonthQuery->whereHas('client', fn($q) => $q->where('province_id', $provinceId));
        }
        
        $totalSales = (clone $currentMonthQuery)->sum('total_amount');
        $totalRate = (clone $currentMonthQuery)->sum('total_rate');
        $targetSales = $totalRate * 50;
        $opportunity = $targetSales - $totalSales;
        $kpiPercentage = $totalSales > 0 ? ($totalRate / $totalSales) * 100 : 0;

        // Delivery counts
        $totalDeliveries = DeliveryOrder::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->when($provinceId, fn($q) => $q->whereHas('client', fn($q2) => $q2->where('province_id', $provinceId)))
            ->count();
        
        $pendingDeliveries = DeliveryOrder::whereIn('status', ['pending', 'confirmed'])
            ->when($provinceId, fn($q) => $q->whereHas('client', fn($q2) => $q2->where('province_id', $provinceId)))
            ->count();
        
        $completedToday = DeliveryOrder::whereIn('status', $completedStatuses)
            ->whereDate('actual_date', Carbon::today())
            ->when($provinceId, fn($q) => $q->whereHas('client', fn($q2) => $q2->where('province_id', $provinceId)))
            ->count();
        
        $activeClients = Client::whereHas('deliveryOrders', function ($q) use ($startOfMonth, $endOfMonth) {
                $q->whereBetween('created_at', [$startOfMonth, $endOfMonth]);
            })
            ->when($provinceId, fn($q) => $q->where('province_id', $provinceId))
            ->count();

        // Province Summary (current month)
        $provinceSummary = Province::withCount(['clients' => function ($q) use ($startOfMonth, $endOfMonth) {
                $q->whereHas('deliveryOrders', fn($q2) => $q2->whereBetween('created_at', [$startOfMonth, $endOfMonth]));
            }])
            ->get()
            ->map(function ($province) use ($completedStatuses, $startOfMonth, $endOfMonth) {
                $deliveries = DeliveryOrder::whereIn('status', $completedStatuses)
                    ->whereNotNull('actual_date')
                    ->whereBetween('actual_date', [$startOfMonth, $endOfMonth])
                    ->whereHas('client', fn($q) => $q->where('province_id', $province->id))
                    ->get();

                $sales = $deliveries->sum('total_amount');
                $rate = $deliveries->sum('total_rate');
                $target = $rate * 50;
                $loss = $target - $sales;
                $percentage = $sales > 0 ? ($rate / $sales) * 100 : 0;

                return [
                    'province' => $province->name,
                    'sales' => $sales,
                    'rate' => $rate,
                    'loss' => $loss,
                    'percentage' => $percentage,
                ];
            })
            ->filter(fn($p) => $p['sales'] > 0)
            ->values();

        // Recent Deliveries
        $recentDeliveries = DeliveryOrder::with(['client'])
            ->when($provinceId, fn($q) => $q->whereHas('client', fn($q2) => $q2->where('province_id', $provinceId)))
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'code' => $d->do_number,
                'client' => $d->client->code ?? 'Unknown',
                'status' => $this->formatStatus($d->status),
                'date' => $d->actual_date?->format('Y-m-d') ?? $d->scheduled_date?->format('Y-m-d') ?? '-',
                'amount' => $d->total_amount,
            ]);

        // Chart Data - Monthly Trucking Sales by Province
        $salesChartData = $this->getSalesChartData($viewType, $provinceId, $year, $completedStatuses, $startDate, $endDate);

        // Opportunity Loss Trend
        $opportunityLossData = $this->getOpportunityLossData($viewType, $provinceId, $year, $completedStatuses, $startDate, $endDate);

        // KPI Trend Data
        $kpiData = $this->getKpiData($viewType, $provinceId, $year, $completedStatuses, $startDate, $endDate);

        // Stats object
        $stats = [
            'totalSales' => $totalSales,
            'truckRate' => $totalRate,
            'opportunityLoss' => abs($opportunity),
            'opportunityType' => $opportunity >= 0 ? 'loss' : 'gain',
            'kpiPercentage' => $kpiPercentage,
            'totalDeliveries' => $totalDeliveries,
            'pendingDeliveries' => $pendingDeliveries,
            'completedToday' => $completedToday,
            'totalClients' => $activeClients,
        ];

        // Calculate previous month for comparison
        $prevMonthStart = $currentMonth->copy()->subMonth()->startOfMonth();
        $prevMonthEnd = $currentMonth->copy()->subMonth()->endOfMonth();
        
        $prevMonthSales = DeliveryOrder::whereIn('status', $completedStatuses)
            ->whereNotNull('actual_date')
            ->whereBetween('actual_date', [$prevMonthStart, $prevMonthEnd])
            ->when($provinceId, fn($q) => $q->whereHas('client', fn($q2) => $q2->where('province_id', $provinceId)))
            ->sum('total_amount');
        
        $prevMonthRate = DeliveryOrder::whereIn('status', $completedStatuses)
            ->whereNotNull('actual_date')
            ->whereBetween('actual_date', [$prevMonthStart, $prevMonthEnd])
            ->when($provinceId, fn($q) => $q->whereHas('client', fn($q2) => $q2->where('province_id', $provinceId)))
            ->sum('total_rate');
        
        $prevMonthOpportunity = abs(($prevMonthRate * 50) - $prevMonthSales);

        $changes = [
            'salesChange' => $prevMonthSales > 0 ? (($totalSales - $prevMonthSales) / $prevMonthSales) * 100 : 0,
            'rateChange' => $prevMonthRate > 0 ? (($totalRate - $prevMonthRate) / $prevMonthRate) * 100 : 0,
            'opportunityChange' => $prevMonthOpportunity > 0 ? ((abs($opportunity) - $prevMonthOpportunity) / $prevMonthOpportunity) * 100 : 0,
        ];

        return Inertia::render('admin/dashboard', [
            'stats' => $stats,
            'changes' => $changes,
            'provinceSummary' => $provinceSummary,
            'recentDeliveries' => $recentDeliveries,
            'salesChartData' => $salesChartData,
            'opportunityLossData' => $opportunityLossData,
            'kpiData' => $kpiData,
            'provinces' => $provinces,
            'filters' => [
                'view' => $viewType,
                'province_id' => $provinceId,
                'year' => $year,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'currentMonth' => $currentMonth->format('F Y'),
        ]);
    }

    private function getSalesChartData(string $viewType, ?int $provinceId, int $year, array $completedStatuses, ?string $filterStartDate = null, ?string $filterEndDate = null): array
    {
        $provinces = Province::all();
        $data = [];

        // Get date range based on view type or custom dates
        if ($filterStartDate && $filterEndDate) {
            $startDate = Carbon::parse($filterStartDate);
            $endDate = Carbon::parse($filterEndDate);
        } else {
            $startDate = Carbon::createFromDate($year, 1, 1)->startOfYear();
            $endDate = Carbon::createFromDate($year, 12, 31)->endOfYear();

            if ($viewType === 'daily') {
                // Last 30 days
                $startDate = Carbon::now()->subDays(30);
                $endDate = Carbon::now();
            } elseif ($viewType === 'weekly') {
                // Last 12 weeks
                $startDate = Carbon::now()->subWeeks(12)->startOfWeek();
                $endDate = Carbon::now();
            }
        }

        $deliveries = DeliveryOrder::with('client.province')
            ->whereIn('status', $completedStatuses)
            ->whereNotNull('actual_date')
            ->whereBetween('actual_date', [$startDate, $endDate])
            ->when($provinceId, fn($q) => $q->whereHas('client', fn($q2) => $q2->where('province_id', $provinceId)))
            ->get();

        // Group by period
        $grouped = $deliveries->groupBy(function ($order) use ($viewType) {
            return match($viewType) {
                'daily' => $order->actual_date->format('Y-m-d'),
                'weekly' => $order->actual_date->startOfWeek()->format('Y-m-d'),
                'monthly' => $order->actual_date->format('Y-m'),
            };
        })->sortKeys();

        foreach ($grouped as $period => $orders) {
            $row = [
                'period' => $this->formatPeriodLabel($period, $viewType),
            ];

            // Group by province
            $byProvince = $orders->groupBy(fn($o) => $o->client->province->name ?? 'Unknown');
            
            foreach ($provinces as $province) {
                $provinceName = strtolower(str_replace(' ', '_', $province->name));
                $row[$provinceName] = $byProvince->get($province->name)?->sum('total_amount') ?? 0;
            }

            $data[] = $row;
        }

        return $data;
    }

    private function getOpportunityLossData(string $viewType, ?int $provinceId, int $year, array $completedStatuses, ?string $filterStartDate = null, ?string $filterEndDate = null): array
    {
        // Get date range based on view type or custom dates
        if ($filterStartDate && $filterEndDate) {
            $startDate = Carbon::parse($filterStartDate);
            $endDate = Carbon::parse($filterEndDate);
        } else {
            $startDate = Carbon::createFromDate($year, 1, 1)->startOfYear();
            $endDate = Carbon::createFromDate($year, 12, 31)->endOfYear();

            if ($viewType === 'daily') {
                $startDate = Carbon::now()->subDays(30);
                $endDate = Carbon::now();
            } elseif ($viewType === 'weekly') {
                $startDate = Carbon::now()->subWeeks(12)->startOfWeek();
                $endDate = Carbon::now();
            }
        }

        $deliveries = DeliveryOrder::whereIn('status', $completedStatuses)
            ->whereNotNull('actual_date')
            ->whereBetween('actual_date', [$startDate, $endDate])
            ->when($provinceId, fn($q) => $q->whereHas('client', fn($q2) => $q2->where('province_id', $provinceId)))
            ->get();

        $grouped = $deliveries->groupBy(function ($order) use ($viewType) {
            return match($viewType) {
                'daily' => $order->actual_date->format('Y-m-d'),
                'weekly' => $order->actual_date->startOfWeek()->format('Y-m-d'),
                'monthly' => $order->actual_date->format('Y-m'),
            };
        })->sortKeys();

        $data = [];
        foreach ($grouped as $period => $orders) {
            $sales = $orders->sum('total_amount');
            $rate = $orders->sum('total_rate');
            $target = $rate * 50;
            $opportunity = $target - $sales;

            $data[] = [
                'period' => $this->formatPeriodLabel($period, $viewType),
                'loss' => $opportunity >= 0 ? $opportunity : 0,
                'gain' => $opportunity < 0 ? abs($opportunity) : 0,
            ];
        }

        return $data;
    }

    private function getKpiData(string $viewType, ?int $provinceId, int $year, array $completedStatuses, ?string $filterStartDate = null, ?string $filterEndDate = null): array
    {
        $provinces = Province::all();
        
        // Get date range based on view type or custom dates
        if ($filterStartDate && $filterEndDate) {
            $startDate = Carbon::parse($filterStartDate);
            $endDate = Carbon::parse($filterEndDate);
        } else {
            $startDate = Carbon::createFromDate($year, 1, 1)->startOfYear();
            $endDate = Carbon::createFromDate($year, 12, 31)->endOfYear();

            if ($viewType === 'daily') {
                $startDate = Carbon::now()->subDays(30);
                $endDate = Carbon::now();
            } elseif ($viewType === 'weekly') {
                $startDate = Carbon::now()->subWeeks(12)->startOfWeek();
                $endDate = Carbon::now();
            }
        }

        $deliveries = DeliveryOrder::with('client.province')
            ->whereIn('status', $completedStatuses)
            ->whereNotNull('actual_date')
            ->whereBetween('actual_date', [$startDate, $endDate])
            ->when($provinceId, fn($q) => $q->whereHas('client', fn($q2) => $q2->where('province_id', $provinceId)))
            ->get();

        $grouped = $deliveries->groupBy(function ($order) use ($viewType) {
            return match($viewType) {
                'daily' => $order->actual_date->format('Y-m-d'),
                'weekly' => $order->actual_date->startOfWeek()->format('Y-m-d'),
                'monthly' => $order->actual_date->format('Y-m'),
            };
        })->sortKeys();

        $data = [];
        foreach ($grouped as $period => $orders) {
            $row = [
                'period' => $this->formatPeriodLabel($period, $viewType),
                'target' => 2,
            ];

            // Calculate KPI per province
            $byProvince = $orders->groupBy(fn($o) => $o->client->province->name ?? 'Unknown');
            
            foreach ($provinces as $province) {
                $provinceName = strtolower(str_replace(' ', '_', $province->name));
                $provinceOrders = $byProvince->get($province->name);
                
                if ($provinceOrders) {
                    $sales = $provinceOrders->sum('total_amount');
                    $rate = $provinceOrders->sum('total_rate');
                    $row[$provinceName] = $sales > 0 ? round(($rate / $sales) * 100, 2) : 0;
                } else {
                    $row[$provinceName] = 0;
                }
            }

            $data[] = $row;
        }

        return $data;
    }

    private function formatPeriodLabel(string $period, string $viewType): string
    {
        return match($viewType) {
            'daily' => Carbon::parse($period)->format('M d'),
            'weekly' => 'W' . Carbon::parse($period)->weekOfYear,
            'monthly' => Carbon::parse($period . '-01')->format('M'),
        };
    }

    private function formatStatus(string $status): string
    {
        return match($status) {
            'on_time' => 'Delivered',
            'delayed' => 'Delivered (Late)',
            'in_transit' => 'In Transit',
            'confirmed' => 'Confirmed',
            'pending' => 'Pending',
            'cancelled' => 'Cancelled',
            default => ucfirst($status),
        };
    }
}
