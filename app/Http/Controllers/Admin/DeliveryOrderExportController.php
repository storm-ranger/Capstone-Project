<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryOrder;
use App\Models\DeliveryBatch;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DeliveryOrderExportController extends Controller
{
    /**
     * Export delivery orders to Excel, grouped by batch with separator totals.
     */
    public function export(Request $request): StreamedResponse
    {
        $query = DeliveryOrder::with(['client.area', 'province', 'items.product', 'batch']);

        // Apply filters
        if ($request->filled('province_id') && $request->province_id !== 'all') {
            $query->where('province_id', $request->province_id);
        }

        if ($request->filled('client_id') && $request->client_id !== 'all') {
            $query->where('client_id', $request->client_id);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('delivery_type') && $request->delivery_type !== 'all') {
            $query->where('delivery_type', $request->delivery_type);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('po_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('po_date', '<=', $request->date_to);
        }

        // Sort by batch first (batched orders together), then by PO date
        $query->orderByRaw('batch_id IS NULL ASC')
            ->orderBy('batch_id', 'asc')
            ->orderBy('po_date', 'asc')
            ->orderBy('created_at', 'asc');

        $orders = $query->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Delivery Orders');

        // Header style
        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4F46E5'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                ],
            ],
        ];

        // Data style
        $dataStyle = [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                ],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ];

        // Batch separator style
        $batchSeparatorStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E40AF'],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                ],
            ],
        ];

        // Set headers (removed Base Rate, merged rate into single column)
        $headers = [
            'PO Number',       // A
            'PO Date',         // B
            'Scheduled Date',  // C
            'Actual Date',     // D
            'Client',          // E
            'Province',        // F
            'Area',            // G
            'Delivery Type',   // H
            'Status',          // I
            'Part Number',     // J
            'Quantity',        // K
            'Unit Price',      // L
            'Total Price',     // M
            'Total Price per PO#', // N
            'Rate',            // O
            'Remarks',         // P
        ];

        $lastCol = 'P';

        $col = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($col . '1', $header);
            $col++;
        }

        // Apply header style
        $sheet->getStyle("A1:{$lastCol}1")->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(25);

        // Group orders by batch
        $grouped = $orders->groupBy(function ($order) {
            return $order->batch_id ?? 'unbatched';
        });

        $row = 2;
        $batchSeparatorRows = [];

        foreach ($grouped as $batchKey => $batchOrders) {
            $batchTotalRate = 0;
            $batchTotalValue = 0;

            foreach ($batchOrders as $order) {
                $orderDropCost = $order->drop_cost;
                $batchTotalRate += $orderDropCost;
                $batchTotalValue += $order->total_amount;

                if ($order->items->count() > 0) {
                    foreach ($order->items as $index => $item) {
                        $sheet->setCellValue('A' . $row, $order->po_number);
                        $sheet->setCellValue('B' . $row, $order->po_date?->format('Y-m-d'));
                        $sheet->setCellValue('C' . $row, $order->scheduled_date?->format('Y-m-d'));
                        $sheet->setCellValue('D' . $row, $order->actual_date?->format('Y-m-d') ?? '');
                        $sheet->setCellValue('E' . $row, $order->client?->code ?? '');
                        $sheet->setCellValue('F' . $row, $order->province?->name ?? '');
                        $sheet->setCellValue('G' . $row, $order->client?->area?->name ?? '');
                        $sheet->setCellValue('H' . $row, $order->delivery_type ?? '');
                        $sheet->setCellValue('I' . $row, ucfirst(str_replace('_', ' ', $order->status)));
                        $sheet->setCellValue('J' . $row, $item->part_number);
                        $sheet->setCellValue('K' . $row, $item->quantity);
                        $sheet->setCellValue('L' . $row, $item->unit_price);
                        $sheet->setCellValue('M' . $row, $item->quantity * $item->unit_price);
                        $sheet->setCellValue('N' . $row, $index === 0 ? $order->total_amount : '');
                        $sheet->setCellValue('O' . $row, $index === 0 ? $orderDropCost : '');
                        $sheet->setCellValue('P' . $row, $index === 0 ? $order->remarks : '');
                        $row++;
                    }
                } else {
                    // Order with no items
                    $sheet->setCellValue('A' . $row, $order->po_number);
                    $sheet->setCellValue('B' . $row, $order->po_date?->format('Y-m-d'));
                    $sheet->setCellValue('C' . $row, $order->scheduled_date?->format('Y-m-d'));
                    $sheet->setCellValue('D' . $row, $order->actual_date?->format('Y-m-d') ?? '');
                    $sheet->setCellValue('E' . $row, $order->client?->code ?? '');
                    $sheet->setCellValue('F' . $row, $order->province?->name ?? '');
                    $sheet->setCellValue('G' . $row, $order->client?->area?->name ?? '');
                    $sheet->setCellValue('H' . $row, $order->delivery_type ?? '');
                    $sheet->setCellValue('I' . $row, ucfirst(str_replace('_', ' ', $order->status)));
                    $sheet->setCellValue('J' . $row, '');
                    $sheet->setCellValue('K' . $row, '');
                    $sheet->setCellValue('L' . $row, '');
                    $sheet->setCellValue('M' . $row, '');
                    $sheet->setCellValue('N' . $row, $order->total_amount);
                    $sheet->setCellValue('O' . $row, $orderDropCost);
                    $sheet->setCellValue('P' . $row, $order->remarks);
                    $row++;
                }
            }

            // Add batch separator/total row
            if ($batchKey !== 'unbatched') {
                $batch = $batchOrders->first()->batch;
                $batchLabel = $batch ? $batch->batch_number : "Batch #{$batchKey}";
                $sheet->setCellValue('A' . $row, $batchLabel);
                $sheet->setCellValue('N' . $row, $batchTotalValue);
                $sheet->setCellValue('O' . $row, $batchTotalRate);
                $batchSeparatorRows[] = $row;
                $row++;
            }
        }

        // Apply data style to all data rows
        if ($row > 2) {
            $sheet->getStyle("A2:{$lastCol}" . ($row - 1))->applyFromArray($dataStyle);
        }

        // Apply batch separator style to total rows
        foreach ($batchSeparatorRows as $sepRow) {
            $sheet->getStyle("A{$sepRow}:{$lastCol}{$sepRow}")->applyFromArray($batchSeparatorStyle);
            $sheet->getStyle("N{$sepRow}:O{$sepRow}")->getNumberFormat()->setFormatCode('#,##0.00');
        }

        // Format currency columns
        if ($row > 2) {
            $sheet->getStyle('L2:O' . ($row - 1))->getNumberFormat()->setFormatCode('#,##0.00');
        }

        // Auto-size columns
        foreach (range('A', $lastCol) as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        // Freeze the header row
        $sheet->freezePane('A2');

        // Generate filename
        $filename = 'delivery_orders_' . date('Y-m-d_His') . '.xlsx';

        $writer = new Xlsx($spreadsheet);

        return new StreamedResponse(function () use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
