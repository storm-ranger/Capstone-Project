<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryOrder;
use App\Models\Province;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SalesTrackingController extends Controller
{
    /**
     * Display the sales tracking dashboard.
     * 
     * Calculations:
     * - Actual Sales (Trucking Sales): Total sales amount from delivered orders
     * - Rate: Total delivery rate charged
     * - Target Sales: Rate / 2% = Rate × 50
     * - Opportunity Loss/Gain: Target Sales - Actual Sales
     * - Percentage: Rate / Actual Sales × 100 (KPI: should be ≤ 2%)
     */
    public function index(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth()->toDateString());
        $provinceId = $request->get('province_id');
        $viewType = $request->get('view', 'daily'); // daily, weekly, monthly

        // Build query for completed deliveries
        $query = DeliveryOrder::with(['client.province'])
            ->whereIn('status', ['on_time', 'delayed'])
            ->whereNotNull('actual_date')
            ->whereBetween('actual_date', [$startDate, $endDate]);

        // Filter by province if selected
        if ($provinceId) {
            $query->whereHas('client', function ($q) use ($provinceId) {
                $q->where('province_id', $provinceId);
            });
        }

        $deliveries = $query->get();

        // Group by date based on view type
        $groupedData = $deliveries->groupBy(function ($order) use ($viewType) {
            $date = $order->actual_date;
            return match($viewType) {
                'weekly' => $date->startOfWeek()->format('Y-m-d'),
                'monthly' => $date->format('Y-m'),
                default => $date->format('Y-m-d'), // daily
            };
        });

        // Calculate metrics for each period
        $salesData = $groupedData->map(function ($orders, $dateKey) use ($viewType) {
            $actualSales = $orders->sum('total_amount');
            $totalRate = $orders->sum(fn($o) => $o->drop_cost);
            
            // Target Sales = Rate / 2% = Rate × 50
            $targetSales = $totalRate * 50;
            
            // Opportunity = Target Sales - Actual Sales
            // Positive = Gain (actual > target implied by rate)
            // Negative = Loss (actual < target implied by rate)
            $opportunity = $targetSales - $actualSales;
            
            // Percentage = Rate / Actual Sales × 100
            // KPI: Should be ≤ 2%
            $percentage = $actualSales > 0 ? ($totalRate / $actualSales) * 100 : 0;
            
            // Determine if exceeding KPI limit
            $exceedsKpi = $percentage > 2;

            return [
                'date' => $dateKey,
                'formatted_date' => $this->formatDateLabel($dateKey, $viewType),
                'order_count' => $orders->count(),
                'actual_sales' => round($actualSales, 2),
                'rate' => round($totalRate, 2),
                'target_sales' => round($targetSales, 2),
                'opportunity' => round($opportunity, 2),
                'opportunity_type' => $opportunity >= 0 ? 'loss' : 'gain',
                'percentage' => round($percentage, 2),
                'exceeds_kpi' => $exceedsKpi,
            ];
        })->sortKeys()->values();

        // Calculate totals
        $totals = [
            'order_count' => $deliveries->count(),
            'actual_sales' => round($deliveries->sum('total_amount'), 2),
            'rate' => round($deliveries->sum(fn($o) => $o->drop_cost), 2),
            'target_sales' => round($deliveries->sum(fn($o) => $o->drop_cost) * 50, 2),
            'opportunity' => round(($deliveries->sum(fn($o) => $o->drop_cost) * 50) - $deliveries->sum('total_amount'), 2),
            'percentage' => $deliveries->sum('total_amount') > 0 
                ? round(($deliveries->sum(fn($o) => $o->drop_cost) / $deliveries->sum('total_amount')) * 100, 2) 
                : 0,
        ];
        $totals['opportunity_type'] = $totals['opportunity'] >= 0 ? 'loss' : 'gain';
        $totals['exceeds_kpi'] = $totals['percentage'] > 2;

        // Get provinces for filter
        $provinces = Province::orderBy('name')->get(['id', 'name']);

        // Get province breakdown
        $provinceBreakdown = $deliveries->groupBy(function ($order) {
            return $order->client?->province?->name ?? 'Unknown';
        })->map(function ($orders, $provinceName) {
            $actualSales = $orders->sum('total_amount');
            $totalRate = $orders->sum(fn($o) => $o->drop_cost);
            $targetSales = $totalRate * 50;
            $percentage = $actualSales > 0 ? ($totalRate / $actualSales) * 100 : 0;
            
            return [
                'province' => $provinceName,
                'order_count' => $orders->count(),
                'actual_sales' => round($actualSales, 2),
                'rate' => round($totalRate, 2),
                'target_sales' => round($targetSales, 2),
                'opportunity' => round($targetSales - $actualSales, 2),
                'percentage' => round($percentage, 2),
                'exceeds_kpi' => $percentage > 2,
            ];
        })->sortByDesc('actual_sales')->values();

        return Inertia::render('admin/sales-tracking/index', [
            'salesData' => $salesData,
            'totals' => $totals,
            'provinceBreakdown' => $provinceBreakdown,
            'provinces' => $provinces,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'province_id' => $provinceId,
                'view' => $viewType,
            ],
        ]);
    }

    /**
     * Format date label based on view type.
     */
    private function formatDateLabel(string $dateKey, string $viewType): string
    {
        return match($viewType) {
            'weekly' => 'Week of ' . Carbon::parse($dateKey)->format('M d, Y'),
            'monthly' => Carbon::parse($dateKey . '-01')->format('F Y'),
            default => Carbon::parse($dateKey)->format('M d, Y'),
        };
    }

    /**
     * Export sales tracking data to Excel with colored headers.
     */
    public function export(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth()->toDateString());
        $provinceId = $request->get('province_id');
        $viewType = $request->get('view', 'daily');

        // Build query
        $query = DeliveryOrder::with(['client.province'])
            ->whereIn('status', ['on_time', 'delayed'])
            ->whereNotNull('actual_date')
            ->whereBetween('actual_date', [$startDate, $endDate]);

        if ($provinceId) {
            $query->whereHas('client', function ($q) use ($provinceId) {
                $q->where('province_id', $provinceId);
            });
        }

        $deliveries = $query->orderBy('actual_date')->get();

        // Group by date based on view type
        $groupedData = $deliveries->groupBy(function ($order) use ($viewType) {
            $date = $order->actual_date;
            return match($viewType) {
                'weekly' => $date->startOfWeek()->format('Y-m-d'),
                'monthly' => $date->format('Y-m'),
                default => $date->format('Y-m-d'),
            };
        })->sortKeys();

        // Create Excel spreadsheet
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Sales Tracking');

        // Define headers with their colors
        $headers = [
            'A' => ['label' => 'Date', 'color' => '64748B'],           // Slate
            'B' => ['label' => 'Orders', 'color' => '6B7280'],         // Gray
            'C' => ['label' => 'Actual Sales', 'color' => '3B82F6'],   // Blue
            'D' => ['label' => 'Rate', 'color' => 'A855F7'],           // Purple
            'E' => ['label' => 'Target Sales', 'color' => '6366F1'],   // Indigo
            'F' => ['label' => 'Opportunity Loss/Gain', 'color' => 'F97316'], // Orange
            'G' => ['label' => 'Percentage', 'color' => 'F59E0B'],     // Amber
            'H' => ['label' => 'KPI Status', 'color' => '10B981'],     // Green
        ];

        // Set header row with colors
        foreach ($headers as $col => $header) {
            $cell = $col . '1';
            $sheet->setCellValue($cell, $header['label']);
            
            // Style header cell
            $sheet->getStyle($cell)->applyFromArray([
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => $header['color']],
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        'color' => ['rgb' => '000000'],
                    ],
                ],
            ]);
        }

        // Set column widths
        $sheet->getColumnDimension('A')->setWidth(20);
        $sheet->getColumnDimension('B')->setWidth(10);
        $sheet->getColumnDimension('C')->setWidth(18);
        $sheet->getColumnDimension('D')->setWidth(15);
        $sheet->getColumnDimension('E')->setWidth(18);
        $sheet->getColumnDimension('F')->setWidth(22);
        $sheet->getColumnDimension('G')->setWidth(12);
        $sheet->getColumnDimension('H')->setWidth(15);

        // Add data rows
        $row = 2;
        foreach ($groupedData as $dateKey => $orders) {
            $actualSales = $orders->sum('total_amount');
            $totalRate = $orders->sum(fn($o) => $o->drop_cost);
            $targetSales = $totalRate * 50;
            $opportunity = $targetSales - $actualSales;
            $percentage = $actualSales > 0 ? ($totalRate / $actualSales) * 100 : 0;

            // Format date label based on view type
            $dateLabel = match($viewType) {
                'weekly' => 'Week of ' . Carbon::parse($dateKey)->format('M d, Y'),
                'monthly' => Carbon::parse($dateKey . '-01')->format('F Y'),
                default => Carbon::parse($dateKey)->format('M d, Y'),
            };

            $sheet->setCellValue("A{$row}", $dateLabel);
            $sheet->setCellValue("B{$row}", $orders->count());
            $sheet->setCellValue("C{$row}", $actualSales);
            $sheet->setCellValue("D{$row}", $totalRate);
            $sheet->setCellValue("E{$row}", $targetSales);
            $sheet->setCellValue("F{$row}", ($opportunity >= 0 ? -1 : 1) * abs($opportunity));
            $sheet->setCellValue("G{$row}", $percentage / 100);
            $sheet->setCellValue("H{$row}", $percentage > 2 ? 'Exceeds Limit' : 'Within Limit');

            // Format numbers
            $sheet->getStyle("C{$row}:E{$row}")->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet->getStyle("F{$row}")->getNumberFormat()->setFormatCode('[Green]+#,##0.00;[Red]-#,##0.00');
            $sheet->getStyle("G{$row}")->getNumberFormat()->setFormatCode('0.00%');

            // Color KPI status cell
            $statusColor = $percentage > 2 ? 'FEE2E2' : 'DCFCE7'; // Light red or light green
            $statusTextColor = $percentage > 2 ? 'DC2626' : '16A34A';
            $sheet->getStyle("H{$row}")->applyFromArray([
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => $statusColor],
                ],
                'font' => [
                    'color' => ['rgb' => $statusTextColor],
                    'bold' => true,
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                ],
            ]);

            // Add borders to data row
            $sheet->getStyle("A{$row}:H{$row}")->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        'color' => ['rgb' => 'D1D5DB'],
                    ],
                ],
            ]);

            $row++;
        }

        // Add totals row
        $allActualSales = $groupedData->flatten()->sum('total_amount');
        $allRate = $groupedData->flatten()->sum(fn($o) => $o->drop_cost);
        $allTargetSales = $allRate * 50;
        $allOpportunity = $allTargetSales - $allActualSales;
        $allPercentage = $allActualSales > 0 ? ($allRate / $allActualSales) * 100 : 0;
        $totalOrders = $groupedData->flatten()->count();

        $row++; // Empty row before totals
        $sheet->setCellValue("A{$row}", 'TOTAL');
        $sheet->setCellValue("B{$row}", $totalOrders);
        $sheet->setCellValue("C{$row}", $allActualSales);
        $sheet->setCellValue("D{$row}", $allRate);
        $sheet->setCellValue("E{$row}", $allTargetSales);
        $sheet->setCellValue("F{$row}", ($allOpportunity >= 0 ? -1 : 1) * abs($allOpportunity));
        $sheet->setCellValue("G{$row}", $allPercentage / 100);
        $sheet->setCellValue("H{$row}", $allPercentage > 2 ? 'Exceeds Limit' : 'Within Limit');

        // Style totals row
        $sheet->getStyle("A{$row}:H{$row}")->applyFromArray([
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'F3F4F6'],
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_MEDIUM,
                    'color' => ['rgb' => '000000'],
                ],
            ],
        ]);
        $sheet->getStyle("C{$row}:E{$row}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("F{$row}")->getNumberFormat()->setFormatCode('[Green]+#,##0.00;[Red]-#,##0.00');
        $sheet->getStyle("G{$row}")->getNumberFormat()->setFormatCode('0.00%');

        // Totals KPI status color
        $statusColor = $allPercentage > 2 ? 'FEE2E2' : 'DCFCE7';
        $statusTextColor = $allPercentage > 2 ? 'DC2626' : '16A34A';
        $sheet->getStyle("H{$row}")->applyFromArray([
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => $statusColor],
            ],
            'font' => [
                'color' => ['rgb' => $statusTextColor],
                'bold' => true,
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
            ],
        ]);

        // Create file
        $filename = "sales_tracking_{$viewType}_{$startDate}_to_{$endDate}.xlsx";
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);

        // Return as download
        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
