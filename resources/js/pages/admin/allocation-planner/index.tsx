import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Truck,
  MapPin,
  AlertTriangle,
  ChevronDown,
  Package,
  CheckCircle2,
  Loader2,
  Play,
  Trash2,
  BoxIcon,
  Settings2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface Order {
  id: number;
  po_number: string;
  po_date: string;
  scheduled_date: string;

  client_code: string;
  client_name: string;
  province_name: string;
  area_name: string;
  zone_name: string;
  zone_code: string;

  // ✅ added from controller (for selection compute)
  client_id: number;
  area_id: number;
  base_rate: number;

  area_group_id: number;
  distance_km: number;

  total_items: number;
  total_amount: number;

  // precomputed (backend list display)
  drop_cost: number;

  is_overdue: boolean;
}

interface ProvinceSummary {
  name: string;
  count: number;
}

interface ZoneSummary {
  name: string;
  code: string;
  count: number;
}

interface Zone {
  id: string;
  order_count: number;
  total_items: number;
  total_value: number;
  batch_cost: number;
  recommended_vehicle: string;
  recommended_vehicle_label: string;
  overdue_count: number;
  province_summary: ProvinceSummary[];
  zone_summary: ZoneSummary[];
  orders: Order[];
}

interface BatchOrder {
  id: number;
  po_number: string;
  client_code: string;
  total_amount: number;
  province_name: string | null;
}

interface Batch {
  id: number;
  batch_number: string;
  planned_date: string;
  area_group_name: string;
  area_group_code: string;
  vehicle_type: string;
  vehicle_type_label: string;
  vehicle_name: string | null;
  order_count: number;
  total_items: number;
  total_value: number;
  total_rate: number;
  status: string;
  province_names: string[];
  orders: BatchOrder[];
}

interface Vehicle {
  id: number;
  code: string;
  name: string;
  type: string;
  plate_number: string | null;
  max_value: number;
}

interface Summary {
  unallocated_zones: number;
  unallocated_orders: number;
  unallocated_value: number;
  allocated_batches: number;
  allocated_orders: number;
  allocated_value: number;
}

interface Props {
  zones: Zone[];
  batches: Batch[];
  vehicles: Vehicle[];
  summary: Summary;
  selectedDate: string;
}

export default function AllocationPlanner({ zones, batches, vehicles, summary, selectedDate }: Props) {
  const [date, setDate] = useState(selectedDate);
  const [openBatches, setOpenBatches] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);

  const [allocateDialog, setAllocateDialog] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; batch: Batch | null }>({
    open: false,
    batch: null,
  });

  const [completeDialog, setCompleteDialog] = useState<{ open: boolean; batch: Batch | null }>({
    open: false,
    batch: null,
  });

  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);

  // =============================
  // HELPERS
  // =============================
  const toNumber = (v: unknown, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Planned
          </Badge>
        );
      case 'in_transit':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            In Transit
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        );
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // =============================
  // ✅ ALL ORDERS (SORTED BY DISTANCE)
  // =============================
  const allOrders = useMemo(() => {
    if (zones.length === 0) return null;

    const z = zones[0];

    // ✅ sort orders by distance (nearest -> farthest)
    const sortedOrders = [...(z.orders ?? [])].sort(
      (a, b) => toNumber(a.distance_km, 0) - toNumber(b.distance_km, 0)
    );

    return { ...z, orders: sortedOrders };
  }, [zones]);

  // =============================
  // ORDER SELECTION
  // =============================
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());

  const toggleOrder = (id: number) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelected = () => setSelectedOrderIds(new Set<number>());

  const allOrderIds = allOrders ? allOrders.orders.map((o) => o.id) : [];
  const allSelected = allOrderIds.length > 0 && allOrderIds.every((id) => selectedOrderIds.has(id));

  const toggleAllOrders = () => {
    setSelectedOrderIds(() => {
      if (allSelected) return new Set<number>();
      return new Set<number>(allOrderIds);
    });
  };

  // Selected orders in the same list order (important for sequential compute)
  const selectedOrders = useMemo(() => {
    if (!allOrders) return [];
    return allOrders.orders.filter((o) => selectedOrderIds.has(o.id));
  }, [allOrders, selectedOrderIds]);

  const selectedCount = selectedOrders.length;

  // =============================
  // ✅ HYBRID RATE CALC (ONLY FOR SELECTED)
  // =============================
  const selectionComputed = useMemo(() => {
    /**
     * returns:
     * - dropCostById: { [orderId]: dropCost }
     * - totalCost
     */
    const dropCostById: Record<number, number> = {};
    let totalCost = 0;

    const visitedClientIds = new Set<number>();
    let prevAreaId = 0;

    selectedOrders.forEach((o, idx) => {
      const clientId = toNumber(o.client_id, 0);
      const areaId = toNumber(o.area_id, 0);
      const baseRate = toNumber(o.base_rate, 0);

      let cost = 0;

      if (idx === 0) {
        cost = baseRate;
      } else {
        // repeat client anywhere => 0
        if (clientId !== 0 && visitedClientIds.has(clientId)) {
          cost = 0;
        } else {
          // same area vs other area (compare to previous selected stop)
          if (areaId !== 0 && prevAreaId !== 0 && areaId === prevAreaId) cost = 250;
          else cost = 500;
        }
      }

      if (clientId !== 0) visitedClientIds.add(clientId);
      prevAreaId = areaId;

      dropCostById[o.id] = cost;
      totalCost += cost;
    });

    return { dropCostById, totalCost };
  }, [selectedOrders]);

  const selectedBatchCost = selectionComputed.totalCost;

  // =============================
  // SELECTED SUMMARY (ONLY WHEN CHECKED)
  // =============================
  const selectedTotalValue = selectedOrders.reduce((sum, o) => sum + toNumber(o.total_amount, 0), 0);
  const selectedTotalItems = selectedOrders.reduce((sum, o) => sum + toNumber(o.total_items, 0), 0);
  const selectedOverdueCount = selectedOrders.reduce((sum, o) => sum + (o.is_overdue ? 1 : 0), 0);

  const selectedProvinceSummary = selectedOrders.reduce<Record<string, number>>((acc, o) => {
    const key = o.province_name || 'Unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const selectedProvinceSummaryList = Object.entries(selectedProvinceSummary)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Recommended vehicle based on selected total value
  const selectedRecommendedVehicle = selectedTotalValue > 150000 ? 'truck' : 'l300';
  const selectedRecommendedVehicleLabel = selectedRecommendedVehicle === 'truck' ? 'Truck' : 'L300 Van';

  // display values:
  // - If selectedCount > 0 => show computed totals
  // - Else => show dashes (as requested)
  const displayTotalValue = selectedCount > 0 ? selectedTotalValue : null;
  const displayBatchCost = selectedCount > 0 ? selectedBatchCost : null;
  const displayRecommendedVehicle = selectedCount > 0 ? selectedRecommendedVehicle : null;
  const displayRecommendedVehicleLabel = selectedCount > 0 ? selectedRecommendedVehicleLabel : null;
  const displayOverdueCount = selectedCount > 0 ? selectedOverdueCount : 0;
  const displayProvinceSummary = selectedCount > 0 ? selectedProvinceSummaryList : allOrders?.province_summary ?? [];

  // KPI (Rate/Value) %
  const kpiPercent =
    selectedCount > 0 && selectedTotalValue > 0 ? (selectedBatchCost / selectedTotalValue) * 100 : 0;

  const kpiIsBad = selectedCount > 0 && kpiPercent >= 2;

  // =============================
  // ACTIONS
  // =============================
  const toggleBatch = (batchId: number) => {
    setOpenBatches((prev) => (prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]));
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    clearSelected();
    router.get('/admin/allocation-planner', { date: newDate }, { preserveState: true });
  };

  const handleAutoAllocate = () => {
    if (!allOrders) return;

    const orderIds = Array.from(selectedOrderIds);
    if (orderIds.length === 0) return;

    setProcessing(true);

    router.post(
      '/admin/allocation-planner/allocate',
      {
        order_ids: orderIds,
        planned_date: date,
        vehicle_type: displayRecommendedVehicle ?? selectedRecommendedVehicle,
        vehicle_id: null,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setProcessing(false);
          clearSelected();
        },
        onError: () => setProcessing(false),
      }
    );
  };

  const handleManualAllocate = () => {
    if (!allOrders) return;

    const orderIds = Array.from(selectedOrderIds);
    if (orderIds.length === 0) return;

    setProcessing(true);

    router.post(
      '/admin/allocation-planner/allocate',
      {
        order_ids: orderIds,
        planned_date: date,
        vehicle_type: selectedVehicleType,
        vehicle_id: selectedVehicleId || null,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setAllocateDialog(false);
          setProcessing(false);
          clearSelected();
        },
        onError: () => setProcessing(false),
      }
    );
  };

  const handleStartDelivery = (batchId: number) => {
    router.post(
      `/admin/allocation-planner/batches/${batchId}/start`,
      {},
      {
        preserveScroll: true,
      }
    );
  };

  const handleDeleteBatch = () => {
    if (!deleteDialog.batch) return;

    setProcessing(true);
    router.delete(`/admin/allocation-planner/batches/${deleteDialog.batch.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        setDeleteDialog({ open: false, batch: null });
        setProcessing(false);
      },
      onError: () => setProcessing(false),
    });
  };

  const handleCompleteBatch = () => {
    if (!completeDialog.batch) return;

    setProcessing(true);
    router.post(
      `/admin/allocation-planner/batches/${completeDialog.batch.id}/complete`,
      {
        delivery_date: deliveryDate,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCompleteDialog({ open: false, batch: null });
          setProcessing(false);
        },
        onError: () => setProcessing(false),
      }
    );
  };

  return (
    <AdminLayout>
      <Head title="Allocation Planner" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Allocation Planner</h1>
            <p className="text-muted-foreground">Assign vehicles to delivery batches based on goods value</p>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="date" className="text-sm">
              Plan for:
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unallocated Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.unallocated_orders}</div>
              <p className="text-xs text-muted-foreground">
                {summary.unallocated_zones} zones • {formatCurrency(toNumber(summary.unallocated_value, 0))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Allocated Batches</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.allocated_batches}</div>
              <p className="text-xs text-muted-foreground">
                {summary.allocated_orders} orders • {formatCurrency(toNumber(summary.allocated_value, 0))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">L300 Capacity</CardTitle>
              <BoxIcon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Up to ₱150,000</div>
              <p className="text-xs text-muted-foreground">Use L300 Van for batches within this value range</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Truck Capacity</CardTitle>
              <Truck className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Up to ₱250,000</div>
              <p className="text-xs text-muted-foreground">Use Truck for batches beyond L300 capacity</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Unallocated Orders */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Unallocated Orders
            </h2>

            {!allOrders ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-3" />
                  <p className="text-lg font-medium">All orders allocated!</p>
                  <p className="text-sm text-muted-foreground">No pending orders need vehicle assignment</p>
                </CardContent>
              </Card>
            ) : (
              <Card className={displayOverdueCount > 0 ? 'border-red-300' : ''}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                          <span>All Pending Deliveries</span>
                          <Badge variant="secondary" className="text-xs">
                            {selectedCount > 0 ? `${selectedCount} selected` : `${allOrders.order_count} orders`}
                          </Badge>
                          {displayOverdueCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {displayOverdueCount} Overdue
                            </Badge>
                          )}
                        </CardTitle>

                        <CardDescription className="text-xs">
                          {selectedCount > 0 && displayTotalValue !== null ? (
                            <>
                              {formatCurrency(displayTotalValue)} • {displayRecommendedVehicleLabel}
                            </>
                          ) : null}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleAutoAllocate} disabled={processing || selectedCount === 0}>
                        {processing ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Truck className="h-3 w-3 mr-1" />
                        )}
                        Allocate ({selectedCount})
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="px-2" disabled={selectedCount === 0}>
                            <Settings2 className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={selectedCount === 0}
                            onClick={() => {
                              setSelectedVehicleType(selectedRecommendedVehicle);
                              setSelectedVehicleId('');
                              setAllocateDialog(true);
                            }}
                          >
                            <Settings2 className="h-4 w-4 mr-2" />
                            Manual Assignment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 pb-3">
                  {/* Province badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {displayProvinceSummary.map((ps) => (
                      <Badge key={ps.name} variant="outline" className="text-xs">
                        {ps.name}: {ps.count}
                      </Badge>
                    ))}
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input type="checkbox" checked={allSelected} onChange={toggleAllOrders} />
                        </TableHead>

                        {/* ✅ replaced PO Number -> Distance */}
                        <TableHead className="text-right">Distance</TableHead>

                        {/* ✅ Client now includes PO Number (small) */}
                        <TableHead>Client</TableHead>

                        <TableHead>Province</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {allOrders.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="w-10">
                            <input
                              type="checkbox"
                              checked={selectedOrderIds.has(order.id)}
                              onChange={() => toggleOrder(order.id)}
                            />
                          </TableCell>

                          {/* ✅ Distance column */}
                          <TableCell className="text-right font-medium">
                            {toNumber(order.distance_km, 0).toFixed(2)} km
                          </TableCell>

                          {/* ✅ Client column with PO underneath */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{order.client_code}</span>
                              {order.is_overdue && <AlertTriangle className="inline h-3 w-3 text-red-500" />}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">{order.po_number}</div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {order.province_name}
                            </Badge>
                          </TableCell>

                          <TableCell>{order.area_name}</TableCell>

                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {order.zone_name}
                            </Badge>
                          </TableCell>

                          {/* ✅ Rate should only show when checked */}
                          <TableCell className="text-right font-medium">
                            {selectedOrderIds.has(order.id)
                              ? formatCurrency(toNumber(selectionComputed.dropCostById[order.id], 0))
                              : '—'}
                          </TableCell>

                          <TableCell className="text-right">{toNumber(order.total_items, 0)}</TableCell>

                          <TableCell className="text-right">{formatCurrency(toNumber(order.total_amount, 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* ✅ Decision-making KPI line */}
                  <div className="mt-3 flex items-center justify-between text-sm">
                    {selectedCount === 0 ? (
                      <span className="text-muted-foreground">Tip: Check orders to compute totals</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Selected: <span className="font-medium text-foreground">{selectedCount}</span>
                          &nbsp;• Items: <span className="font-medium text-foreground">{selectedTotalItems}</span>
                          &nbsp;• Value:{' '}
                          <span className="font-medium text-foreground">{formatCurrency(selectedTotalValue)}</span>
                        </span>

                        <Badge
                          variant="outline"
                          className={
                            kpiIsBad
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : 'border-green-300 bg-green-50 text-green-700'
                          }
                        >
                          {formatPercent(kpiPercent)} KPI
                        </Badge>

                        {kpiIsBad ? (
                          <span className="text-red-600 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Above 2% KPI
                          </span>
                        ) : (
                          <span className="text-green-700 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Within 2% KPI
                          </span>
                        )}
                      </div>
                    )}

                    {selectedCount > 0 && (
                      <Button size="sm" variant="outline" onClick={clearSelected}>
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* ✅ Bottom footer: show only when selected, else dash */}
                  <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">
                        Batch Cost:{' '}
                        <span className="font-medium text-foreground">
                          {displayBatchCost === null ? '—' : formatCurrency(displayBatchCost)}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Recommended:{' '}
                        <span className="font-medium text-foreground">{displayRecommendedVehicleLabel ?? '—'}</span>
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      Total Value:{' '}
                      <span className="font-medium text-foreground">
                        {displayTotalValue === null ? '—' : formatCurrency(displayTotalValue)}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Allocated Batches */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Allocated Batches
            </h2>

            {batches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Truck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-lg font-medium">No batches yet</p>
                  <p className="text-sm text-muted-foreground">Allocate zones to create delivery batches</p>
                </CardContent>
              </Card>
            ) : (
              batches.map((batch) => (
                <Collapsible key={batch.id} open={openBatches.includes(batch.id)} onOpenChange={() => toggleBatch(batch.id)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                batch.vehicle_type === 'truck' ? 'bg-orange-100' : 'bg-blue-100'
                              }`}
                            >
                              <Truck
                                className={`h-4 w-4 ${
                                  batch.vehicle_type === 'truck' ? 'text-orange-600' : 'text-blue-600'
                                }`}
                              />
                            </div>
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {batch.batch_number}
                                {getStatusBadge(batch.status)}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {batch.province_names.length > 1 ? batch.province_names.join(' + ') : batch.area_group_name} •{' '}
                                {batch.vehicle_type_label} • {batch.order_count} orders
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{formatCurrency(toNumber(batch.total_value, 0))}</span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                openBatches.includes(batch.id) ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>PO Number</TableHead>
                              <TableHead>Client</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {batch.orders.map((order) => (
                              <TableRow key={order.id}>
                                <TableCell className="font-mono text-sm">{order.po_number}</TableCell>
                                <TableCell>{order.client_code}</TableCell>
                                <TableCell className="text-right">{formatCurrency(toNumber(order.total_amount, 0))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        <div className="mt-3 pt-3 border-t flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Rate: <span className="font-medium text-foreground">{formatCurrency(toNumber(batch.total_rate, 0))}</span>
                          </span>

                          <div className="flex gap-2">
                            {batch.status === 'planned' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleStartDelivery(batch.id)}>
                                  <Play className="h-3 w-3 mr-1" />
                                  Start
                                </Button>

                                <Button size="sm" variant="destructive" onClick={() => setDeleteDialog({ open: true, batch })}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}

                            {batch.status === 'in_transit' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setDeliveryDate(new Date().toISOString().split('T')[0]);
                                  setCompleteDialog({ open: true, batch });
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Allocate Dialog */}
      <Dialog open={allocateDialog} onOpenChange={(open) => !open && setAllocateDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Vehicle</DialogTitle>
            <DialogDescription>Assign a vehicle type to {selectedCount} selected orders</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Selected Orders:</span>
                <span className="ml-2 font-medium">{selectedCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Value:</span>
                <span className="ml-2 font-medium">{selectedCount > 0 ? formatCurrency(selectedTotalValue) : '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Batch Cost:</span>
                <span className="ml-2 font-medium">{selectedCount > 0 ? formatCurrency(selectedBatchCost) : '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Recommended:</span>
                <span className="ml-2 font-medium">{selectedCount > 0 ? selectedRecommendedVehicleLabel : '—'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="l300">L300 Van (Up to ₱150,000)</SelectItem>
                  <SelectItem value="truck">Truck (Up to ₱250,000)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {vehicles.length > 0 && selectedVehicleType && (
              <div className="space-y-2">
                <Label>Assign Specific Vehicle (Optional)</Label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles
                      .filter((v) => v.type === selectedVehicleType)
                      .map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                          {vehicle.name} {vehicle.plate_number && `(${vehicle.plate_number})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedVehicleType && selectedCount > 0 && (
              <div
                className={`p-3 rounded-lg ${
                  selectedVehicleType === selectedRecommendedVehicle ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                }`}
              >
                {selectedVehicleType === selectedRecommendedVehicle ? (
                  <p className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Vehicle type matches recommendation
                  </p>
                ) : (
                  <p className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Different from recommended ({selectedRecommendedVehicleLabel})
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualAllocate} disabled={processing || !selectedVehicleType || selectedCount === 0}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, batch: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Batch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete batch {deleteDialog.batch?.batch_number}? All {deleteDialog.batch?.order_count} orders will be released back to unallocated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, batch: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBatch} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeDialog.open} onOpenChange={(open) => !open && setCompleteDialog({ open: false, batch: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Delivery</DialogTitle>
            <DialogDescription>
              Mark batch {completeDialog.batch?.batch_number} as completed with {completeDialog.batch?.order_count} orders.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog({ open: false, batch: null })}>
              Cancel
            </Button>
            <Button onClick={handleCompleteBatch} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Complete Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}