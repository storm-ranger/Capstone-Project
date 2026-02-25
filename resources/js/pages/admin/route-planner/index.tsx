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
    Truck,
    MapPin,
    Clock,
    AlertTriangle,
    ChevronDown,
    Route,
    DollarSign,
    Package,
    Calendar,
    Navigation,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface Order {
    id: number;
    po_number: string;
    po_date: string;
    scheduled_date: string;
    client_code: string;
    client_id: number;
    province_name: string;
    area_name: string;
    zone_name: string;
    zone_code: string;
    distance_km: number;
    leg_distance_km: number;
    cutoff_time: string | null;
    total_items: number;
    total_quantity: number;
    total_amount: number;
    base_rate: number;
    drop_cost: number;
    is_overdue: boolean;
    days_until_due: number | null;
    days_since_po: number | null;
    route_sequence: number;
    primary_product: string;
    products: string;
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
    total_quantity: number;
    total_amount: number;
    estimated_cost: number;
    total_route_km: number;
    max_distance: number;
    overdue_count: number;
    oldest_po_date: string | null;
    province_summary: ProvinceSummary[];
    zone_summary: ZoneSummary[];
    orders: Order[];
}

interface AreaGroup {
    id: number;
    name: string;
    code: string; // e.g. LGN, BTG
    base_rate: number;
}

interface Summary {
    total_pending: number;
    total_zones: number;
    total_estimated_cost: number;
    total_route_km: number;
    overdue_orders: number;
    due_today: number;
    oldest_po: string | null;
}

interface UpcomingOrder {
    id: number;
    po_number: string;
    po_date: string;
    client_code: string;
    province_name: string;
    area_name: string;
    zone_name: string;
    total_amount: number;
    total_items: number;
    drop_cost: number;
}

interface UpcomingDate {
    date: string;
    day_name: string;
    formatted_date: string;
    days_from_now: number;
    order_count: number;
    total_amount: number;
    zone_count: number;
    zones: Record<string, number>;
    orders: UpcomingOrder[];
}

interface Props {
    zones: Zone[];
    summary: Summary;
    upcomingOrders: UpcomingDate[];
    areaGroups: AreaGroup[];
    selectedDate: string;
}

export default function RoutePlannerIndex({ zones, summary, upcomingOrders, areaGroups, selectedDate }: Props) {
    const [openUpcoming, setOpenUpcoming] = useState<string[]>([]);
    const [date, setDate] = useState(selectedDate);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; order: Order | null }>({
        open: false,
        order: null,
    });
    const [processing, setProcessing] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);

    const toNumber = (v: unknown, fallback = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };

    const toTime = (dateString: string | null | undefined) => {
        if (!dateString) return 0;
        const t = new Date(dateString).getTime();
        return Number.isFinite(t) ? t : 0;
    };

    // The single zone with all orders (or null if no pending orders)
    const allOrders = zones.length > 0 ? zones[0] : null;

    // ✅ Sort by distance (nearest -> farthest). Tie-breaker: PO Date (oldest first)
    const sortedAllOrders = useMemo(() => {
        if (!allOrders) return null;

        const sortedOrders = [...(allOrders.orders ?? [])].sort((a, b) => {
            const da = toNumber(a.distance_km, 0);
            const db = toNumber(b.distance_km, 0);
            if (da !== db) return da - db;

            const ta = toTime(a.po_date);
            const tb = toTime(b.po_date);
            return ta - tb;
        });

        return { ...allOrders, orders: sortedOrders };
    }, [allOrders]);

    /**
     * ✅ SAME LOGIC AS ALLOCATION PLANNER (FOR THE WHOLE LIST)
     * - first stop => base rate (get from areaGroups by zone_code)
     * - next stops:
     *    - if same client anywhere => 0
     *    - else if same area as previous stop => 250
     *    - else => 500
     */
    const routeComputed = useMemo(() => {
        const dropCostById: Record<number, number> = {};
        let totalCost = 0;

        if (!sortedAllOrders) return { dropCostById, totalCost };

        // base rate map: areaGroups.code = LGN/BTG -> base_rate (2750 etc.)
        const baseRateByZone: Record<string, number> = {};
        (areaGroups ?? []).forEach((g) => {
            const key = (g.code ?? '').trim().toUpperCase();
            baseRateByZone[key] = toNumber(g.base_rate, 0);
        });

        const visitedClientIds = new Set<number>();
        const visitedClientCodes = new Set<string>();
        let prevArea = '';

        sortedAllOrders.orders.forEach((o, idx) => {
            const clientId = toNumber(o.client_id, 0);
            const clientCode = (o.client_code ?? '').trim();

            const area = (o.area_name ?? '').trim().toLowerCase();
            const zoneCode = (o.zone_code ?? '').trim().toUpperCase();

            // baseRate priority:
            // 1) o.base_rate (if backend sends it)
            // 2) baseRateByZone[zone_code] (LGN/BTG -> 2750)
            // 3) fallback to o.drop_cost (last resort)
            const baseRate =
                toNumber(o.base_rate, 0) > 0
                    ? toNumber(o.base_rate, 0)
                    : (baseRateByZone[zoneCode] ?? 0) > 0
                        ? baseRateByZone[zoneCode]
                        : toNumber(o.drop_cost, 0);

            let cost = 0;

            if (idx === 0) {
                cost = baseRate;
            } else {
                const repeated =
                    (clientId !== 0 && visitedClientIds.has(clientId)) ||
                    (clientId === 0 && clientCode && visitedClientCodes.has(clientCode));

                if (repeated) {
                    cost = 0;
                } else {
                    cost = prevArea && area && prevArea === area ? 250 : 500;
                }
            }

            if (clientId !== 0) visitedClientIds.add(clientId);
            if (clientCode) visitedClientCodes.add(clientCode);

            prevArea = area;

            dropCostById[o.id] = cost;
            totalCost += cost;
        });

        return { dropCostById, totalCost };
    }, [sortedAllOrders, areaGroups]);

    const toggleUpcoming = (dateKey: string) => {
        setOpenUpcoming(prev =>
            prev.includes(dateKey)
                ? prev.filter(d => d !== dateKey)
                : [...prev, dateKey]
        );
    };

    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        router.get('/admin/route-planner', { date: newDate }, { preserveState: true });
    };

    const handleConfirmDelivery = () => {
        if (!confirmDialog.order) return;

        setProcessing(true);
        const order = confirmDialog.order;

        router.post(`/admin/route-planner/confirm/${order.id}`, {
            delivery_date: deliveryDate,
            base_rate: order.base_rate,
            drop_cost: order.base_rate,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmDialog({ open: false, order: null });
                setProcessing(false);
            },
            onError: () => setProcessing(false),
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatTime = (timeString: string | null) => {
        if (!timeString) return '-';
        const parts = timeString.split(':');
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1] || '0', 10);
        if (isNaN(hours) || isNaN(minutes)) return timeString;
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    return (
        <AdminLayout>
            <Head title="Route Planner" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Route className="h-6 w-6" />
                            Delivery Route Planner
                        </h1>
                        <p className="text-muted-foreground">
                            Plan and optimize delivery routes for all pending orders
                        </p>
                    </div>
                </div>

                {/* Overdue Alert */}
                {summary.overdue_orders > 0 && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                        <div>
                            <p className="font-semibold text-red-800">
                                {summary.overdue_orders} Overdue Delivery Order{summary.overdue_orders > 1 ? 's' : ''}!
                            </p>
                            <p className="text-sm text-red-600">
                                These orders have passed their scheduled delivery date.
                            </p>
                        </div>
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_pending}</div>
                            <p className="text-xs text-muted-foreground">
                                {summary.oldest_po && `Oldest PO: ${formatDate(summary.oldest_po)}`}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Zones Covered</CardTitle>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_zones}</div>
                            <p className="text-xs text-muted-foreground">Delivery zones</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Route</CardTitle>
                            <Navigation className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{summary.total_route_km} km</div>
                            <p className="text-xs text-muted-foreground">Est. travel distance</p>
                        </CardContent>
                    </Card>

                    <Card className={summary.overdue_orders > 0 ? 'border-red-500 bg-red-50' : ''}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                            <AlertTriangle className={`h-4 w-4 ${summary.overdue_orders > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${summary.overdue_orders > 0 ? 'text-red-600' : ''}`}>
                                {summary.overdue_orders}
                            </div>
                            <p className="text-xs text-muted-foreground">Past due date</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                            <Truck className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            {/* backend summary (optional, hindi natin pinapalitan dito) */}
                            <div className="text-2xl font-bold text-primary">
                                {formatCurrency(summary.total_estimated_cost)}
                            </div>
                            <p className="text-xs text-muted-foreground">Batched trucking cost</p>
                        </CardContent>
                    </Card>
                </div>

                {/* All Pending Deliveries */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">All Pending Deliveries</h2>
                        <div className="flex items-center gap-3">
                            <Label htmlFor="date" className="text-sm">Plan for:</Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="w-40"
                            />
                        </div>
                    </div>

                    {!sortedAllOrders ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-lg font-medium">No pending deliveries</p>
                                <p className="text-sm text-muted-foreground">
                                    All orders have been delivered or there are no orders scheduled up to {formatDate(selectedDate)}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className={sortedAllOrders.overdue_count > 0 ? 'border-red-300' : ''}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${sortedAllOrders.overdue_count > 0 ? 'bg-red-100' : 'bg-primary/10'}`}>
                                            <Package className={`h-5 w-5 ${sortedAllOrders.overdue_count > 0 ? 'text-red-600' : 'text-primary'}`} />
                                        </div>
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                All Pending Deliveries
                                                {sortedAllOrders.overdue_count > 0 && (
                                                    <Badge variant="destructive">
                                                        {sortedAllOrders.overdue_count} Overdue
                                                    </Badge>
                                                )}
                                            </CardTitle>

                                            {/* ✅ keep zone summary; removed redundant province badges */}
                                            <CardDescription className="flex flex-wrap gap-1 mt-1">
                                                {sortedAllOrders.zone_summary.map((z) => (
                                                    <Badge key={`${z.name}-${z.code}`} variant="secondary" className="text-xs">
                                                        {z.name} ({z.code}): {z.count}
                                                    </Badge>
                                                ))}
                                            </CardDescription>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-2xl font-bold">{sortedAllOrders.order_count}</p>
                                            <p className="text-xs text-muted-foreground">Orders</p>
                                        </div>

                                        <div className="text-right">
                                            {/* ✅ computed est cost */}
                                            <p className="text-2xl font-bold text-primary">
                                                {formatCurrency(routeComputed.totalCost)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Est. Cost</p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>Product</TableHead>
                                                <TableHead>PO Number</TableHead>
                                                <TableHead>PO Date</TableHead>
                                                <TableHead>Client</TableHead>
                                                <TableHead>Province</TableHead>
                                                <TableHead>Zone</TableHead>
                                                <TableHead>Area</TableHead>
                                                <TableHead className="text-right">Distance</TableHead>
                                                <TableHead>Cutoff</TableHead>
                                                <TableHead className="text-right">Drop Cost</TableHead>
                                                <TableHead className="text-right">Items</TableHead>
                                                <TableHead className="text-right">Value</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="w-20">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {sortedAllOrders.orders.map((order, idx) => {
                                                const displaySeq = idx + 1;
                                                const isFirst = idx === 0;

                                                return (
                                                    <TableRow
                                                        key={order.id}
                                                        className={order.is_overdue ? 'bg-red-50' : ''}
                                                    >
                                                        <TableCell className="font-medium">
                                                            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                                                isFirst
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'bg-muted text-muted-foreground'
                                                            }`}>
                                                                {displaySeq}
                                                            </div>
                                                        </TableCell>

                                                        <TableCell>
                                                            <span className="font-mono text-sm" title={order.products}>
                                                                {order.primary_product}
                                                            </span>
                                                        </TableCell>

                                                        <TableCell className="font-mono font-medium">
                                                            {order.po_number}
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm">{formatDate(order.po_date)}</span>
                                                                {order.days_since_po !== null && order.days_since_po > 0 && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {order.days_since_po}d ago
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="font-mono">{order.client_code}</TableCell>

                                                        <TableCell>
                                                            <span className="text-sm">{order.province_name}</span>
                                                        </TableCell>

                                                        {/* ✅ zone acronym */}
                                                        <TableCell>
                                                            <Badge variant="secondary" className="text-xs font-mono">
                                                                {order.zone_code}
                                                            </Badge>
                                                        </TableCell>

                                                        <TableCell>{order.area_name}</TableCell>

                                                        <TableCell className="text-right">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{toNumber(order.distance_km, 0).toFixed(2)} km</span>
                                                                {toNumber(order.leg_distance_km, 0) > 0 && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        +{toNumber(order.leg_distance_km, 0).toFixed(1)} km
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        <TableCell>
                                                            {order.cutoff_time ? (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {formatTime(order.cutoff_time)}
                                                                </Badge>
                                                            ) : '-'}
                                                        </TableCell>

                                                        {/* ✅ computed drop cost */}
                                                        <TableCell className="text-right">
                                                            <span className={isFirst ? 'font-medium' : 'text-muted-foreground'}>
                                                                {formatCurrency(toNumber(routeComputed.dropCostById[order.id], 0))}
                                                            </span>
                                                        </TableCell>

                                                        <TableCell className="text-right">{order.total_items}</TableCell>

                                                        <TableCell className="text-right font-medium">
                                                            {formatCurrency(order.total_amount)}
                                                        </TableCell>

                                                        <TableCell>
                                                            {order.is_overdue ? (
                                                                <Badge variant="destructive" className="gap-1">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    Overdue
                                                                </Badge>
                                                            ) : order.days_until_due === 0 ? (
                                                                <Badge variant="default" className="bg-yellow-500 gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    Today
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline">
                                                                    {order.days_until_due}d
                                                                </Badge>
                                                            )}
                                                        </TableCell>

                                                        <TableCell>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setConfirmDialog({ open: true, order })}
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-sm">
                                    <div className="flex gap-6 text-muted-foreground">
                                        <span>Route Distance: <strong>{sortedAllOrders.total_route_km} km</strong> (incl. return)</span>
                                        <span>Farthest: <strong>{sortedAllOrders.max_distance} km</strong></span>
                                        <span>Items: <strong>{sortedAllOrders.total_items}</strong></span>
                                        <span>Value: <strong>{formatCurrency(sortedAllOrders.total_amount)}</strong></span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-muted-foreground">Estimated Cost: </span>
                                        <span className="font-bold text-primary">{formatCurrency(routeComputed.totalCost)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Rate Reference */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Trucking Rate Reference
                        </CardTitle>
                        <CardDescription>
                            Partner trucking company rates by zone
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {areaGroups.map((group) => (
                                <div key={group.id} className="rounded-lg border p-4">
                                    <p className="font-medium">{group.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{group.code}</p>
                                    <p className="text-xl font-bold text-primary mt-2">
                                        {formatCurrency(group.base_rate)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-2">Additional Rates (Multi-Drop):</p>
                            <div className="flex gap-4">
                                <Badge variant="outline" className="text-sm py-1 px-3">
                                    Drop Same Area: +₱250.00
                                </Badge>
                                <Badge variant="outline" className="text-sm py-1 px-3">
                                    Drop Other Area: +₱500.00
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Upcoming Orders */}
                {upcomingOrders.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Upcoming Deliveries
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Orders scheduled for the next 7 days
                                </p>
                            </div>
                            <Badge variant="outline" className="text-sm">
                                {upcomingOrders.reduce((sum, d) => sum + d.order_count, 0)} orders
                            </Badge>
                        </div>

                        <div className="space-y-3">
                            {upcomingOrders.map((upcomingDate) => (
                                <Collapsible
                                    key={upcomingDate.date}
                                    open={openUpcoming.includes(upcomingDate.date)}
                                    onOpenChange={() => toggleUpcoming(upcomingDate.date)}
                                >
                                    <Card>
                                        <CollapsibleTrigger asChild>
                                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <ChevronDown className={`h-5 w-5 transition-transform ${openUpcoming.includes(upcomingDate.date) ? 'rotate-180' : ''}`} />
                                                        <div>
                                                            <CardTitle className="text-lg flex items-center gap-2">
                                                                {upcomingDate.day_name}
                                                                <Badge variant={upcomingDate.days_from_now === 1 ? 'default' : 'secondary'}>
                                                                    {upcomingDate.days_from_now === 1 ? 'Tomorrow' : `In ${upcomingDate.days_from_now} days`}
                                                                </Badge>
                                                            </CardTitle>
                                                            <CardDescription>
                                                                {upcomingDate.formatted_date} • {upcomingDate.order_count} order{upcomingDate.order_count > 1 ? 's' : ''} • {upcomingDate.zone_count} zone{upcomingDate.zone_count > 1 ? 's' : ''}
                                                            </CardDescription>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {Object.entries(upcomingDate.zones).map(([zoneName, count]) => (
                                                                <Badge key={zoneName} variant="outline" className="text-xs">
                                                                    {zoneName}: {count}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-semibold">{formatCurrency(upcomingDate.total_amount)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <CardContent className="pt-0">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>PO #</TableHead>
                                                            <TableHead>PO Date</TableHead>
                                                            <TableHead>Client</TableHead>
                                                            <TableHead>Province</TableHead>
                                                            <TableHead>Area</TableHead>
                                                            <TableHead>Zone</TableHead>
                                                            <TableHead className="text-right">Rate</TableHead>
                                                            <TableHead className="text-center">Items</TableHead>
                                                            <TableHead className="text-right">Amount</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {upcomingDate.orders.map((order) => (
                                                            <TableRow key={order.id}>
                                                                <TableCell className="font-mono font-medium">{order.po_number}</TableCell>
                                                                <TableCell>{formatDate(order.po_date)}</TableCell>
                                                                <TableCell className="font-mono">{order.client_code}</TableCell>
                                                                <TableCell>{order.province_name || '-'}</TableCell>
                                                                <TableCell>{order.area_name || '-'}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">{order.zone_name}</Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">{formatCurrency(order.drop_cost)}</TableCell>
                                                                <TableCell className="text-center">{order.total_items}</TableCell>
                                                                <TableCell className="text-right font-medium">{formatCurrency(order.total_amount)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </CollapsibleContent>
                                    </Card>
                                </Collapsible>
                            ))}
                        </div>
                    </div>
                )}

                {/* Single Order Confirm Dialog */}
                <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, order: null })}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Delivery</DialogTitle>
                            <DialogDescription>
                                Confirm that PO# {confirmDialog.order?.po_number} has been delivered to {confirmDialog.order?.client_code}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="delivery_date">Delivery Date</Label>
                                <Input
                                    id="delivery_date"
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    The actual date when the delivery was completed
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, order: null })}>
                                Cancel
                            </Button>
                            <Button onClick={handleConfirmDelivery} disabled={processing}>
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Delivery
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}