import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Package, Eye, Clock, CheckCircle, AlertTriangle, Timer, ShoppingCart, ArrowUpDown, Download, Truck } from 'lucide-react';
import { useState, useCallback } from 'react';
import debounce from 'lodash/debounce';
import * as routes from '@/routes/admin/delivery-orders';

interface Province {
    id: number;
    name: string;
}

interface Client {
    id: number;
    code: string;
    distance_km: number | null;
}

interface OrderItem {
    id: number;
    part_number: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface Vehicle {
    id: number;
    type: 'l300' | 'truck';
}

interface DeliveryBatch {
    id: number;
    vehicle: Vehicle | null;
    vehicle_type: 'l300' | 'truck' | null;
}

interface DeliveryOrder {
    id: number;
    po_number: string;
    po_date: string;
    scheduled_date: string;
    actual_date: string | null;
    client_id: number;
    province_id: number;
    status: 'pending' | 'on_time' | 'delayed';
    delivery_type: string | null;
    total_items: number;
    total_quantity: number;
    total_amount: number;
    remarks: string | null;
    items_count: number;
    client: Client;
    province: Province;
    items: OrderItem[];
    batch: DeliveryBatch | null;
}

interface Summary {
    total_orders: number;
    total_value: number;
    total_items: number;
    pending_count: number;
    confirmed_count: number;
    in_transit_count: number;
    on_time_count: number;
    delayed_count: number;
    on_time_percentage: number;
}

interface PaginatedData<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Props {
    orders: PaginatedData<DeliveryOrder>;
    provinces: Province[];
    clients: Client[];
    summary: Summary;
    filters: {
        search?: string;
        province_id?: string;
        client_id?: string;
        status?: string;
        delivery_type?: string;
        date_from?: string;
        date_to?: string;
        sort?: string;
    };
}

export default function DeliveryOrdersIndex({ orders, provinces, clients, summary, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<DeliveryOrder | null>(null);
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [exportFilters, setExportFilters] = useState({
        province_id: 'all',
        client_id: 'all',
        status: 'all',
        delivery_type: 'all',
        date_from: '',
        date_to: '',
    });

    const handleExport = () => {
        const params = new URLSearchParams();
        Object.entries(exportFilters).forEach(([key, value]) => {
            if (value && value !== 'all') {
                params.append(key, value);
            }
        });
        
        window.location.href = `/admin/delivery-orders-export?${params.toString()}`;
        setExportDialogOpen(false);
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            router.get(
                routes.index.url(),
                { ...filters, search: value },
                { preserveState: true, replace: true }
            );
        }, 300),
        [filters]
    );

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: string, value: string) => {
        router.get(
            routes.index.url(),
            { ...filters, [key]: value },
            { preserveState: true, replace: true }
        );
    };

    const handleDelete = () => {
        if (orderToDelete) {
            router.delete(routes.destroy.url({ delivery_order: orderToDelete.id }), {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setOrderToDelete(null);
                },
            });
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode }> = {
            pending: { variant: 'secondary', label: 'Pending', icon: <Timer className="h-3 w-3" /> },
            confirmed: { variant: 'outline', label: 'Confirmed', icon: <CheckCircle className="h-3 w-3" /> },
            in_transit: { variant: 'default', label: 'In Transit', icon: <Truck className="h-3 w-3" /> },
            on_time: { variant: 'default', label: 'On Time', icon: <CheckCircle className="h-3 w-3" /> },
            delayed: { variant: 'destructive', label: 'Delayed', icon: <AlertTriangle className="h-3 w-3" /> },

        };
        const { variant, label, icon } = config[status] || config.pending;
        return (
            <Badge variant={variant} className="gap-1">
                {icon}
                {label}
            </Badge>
        );
    };

    return (
        <AdminLayout>
            <Head title="Delivery Monitoring" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Delivery Monitoring</h1>
                        <p className="text-muted-foreground">
                            Track delivery orders and on-time performance
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                        <Button asChild>
                            <Link href={routes.create.url()}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Order
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="overflow-x-auto pb-2">
                    <div className="flex gap-4 min-w-max">
                        <Card className="min-w-[220px] flex-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_orders}</div>
                            <p className="text-xs text-muted-foreground">
                                {summary.total_items} line items
                            </p>
                        </CardContent>
                        </Card>
                        <Card className="min-w-[240px] flex-1">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate" title={formatCurrency(summary.total_value)}>{formatCurrency(summary.total_value)}</div>
                        </CardContent>
                        </Card>
                        <Card className="min-w-[220px] flex-1">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                            <Timer className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{summary.pending_count}</div>
                            <p className="text-xs text-muted-foreground">
                                Awaiting confirmation
                            </p>
                        </CardContent>
                        </Card>
                        <Card className="min-w-[220px] flex-1">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">In Transit</CardTitle>
                            <Truck className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">{summary.in_transit_count}</div>
                            <p className="text-xs text-muted-foreground">
                                On the way
                            </p>
                        </CardContent>
                        </Card>
                        <Card className="min-w-[220px] flex-1">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">On Time</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{summary.on_time_count}</div>
                            <p className="text-xs text-muted-foreground">
                                Delivered on schedule
                            </p>
                        </CardContent>
                        </Card>
                        <Card className="min-w-[220px] flex-1">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Delayed</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{summary.delayed_count}</div>
                            <p className="text-xs text-muted-foreground">
                                Past scheduled date
                            </p>
                        </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
                            <div className="relative lg:col-span-2">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search PO#, Part#, Client..."
                                    value={search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select
                                value={filters.sort || 'fifo'}
                                onValueChange={(value) => handleFilterChange('sort', value)}
                            >
                                <SelectTrigger>
                                    <ArrowUpDown className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Sort By" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fifo">Oldest PO First</SelectItem>
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="scheduled_asc">Scheduled Date (Earliest)</SelectItem>
                                    <SelectItem value="scheduled_desc">Scheduled Date (Latest)</SelectItem>
                                    <SelectItem value="urgent">Urgent (Due Soon)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.client_id || 'all'}
                                onValueChange={(value) => handleFilterChange('client_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Clients" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Clients</SelectItem>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id.toString()}>
                                            {client.code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.province_id || 'all'}
                                onValueChange={(value) => handleFilterChange('province_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Provinces" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Provinces</SelectItem>
                                    {provinces.map((province) => (
                                        <SelectItem key={province.id} value={province.id.toString()}>
                                            {province.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(value) => handleFilterChange('status', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_transit">In Transit</SelectItem>
                                    <SelectItem value="on_time">On Time</SelectItem>
                                    <SelectItem value="delayed">Delayed</SelectItem>

                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                value={filters.date_from || ''}
                                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                            />
                            <Input
                                type="date"
                                value={filters.date_to || ''}
                                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Orders Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="min-w-max">
                                <TableHeader>
                                <TableRow>
                                    <TableHead className="text-center">PO #</TableHead>
                                    <TableHead className="text-center">PO Date</TableHead>
                                    <TableHead className="text-center">Scheduled</TableHead>
                                    <TableHead className="text-center">Actual</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-center">Client</TableHead>
                                    <TableHead className="text-center">Province</TableHead>
                                    <TableHead className="text-center">KM</TableHead>
                                    <TableHead className="text-center">Items</TableHead>
                                    <TableHead className="text-center">Total Qty</TableHead>
                                    <TableHead className="text-center">Amount</TableHead>
                                    <TableHead className="text-center">Delivery Type</TableHead>
                                    <TableHead className="text-center">Vehicle Type</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={14} className="text-center py-8">
                                            <div className="flex flex-col items-center gap-2">
                                                <Package className="h-8 w-8 text-muted-foreground" />
                                                <p className="text-muted-foreground">No delivery orders found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.data.map((order) => (
                                        <TableRow key={order.id} className={order.status === 'delayed' ? 'bg-red-50' : ''}>
                                            <TableCell className="text-center font-mono font-medium">
                                                {order.po_number}
                                            </TableCell>
                                            <TableCell className="text-center">{formatDate(order.po_date)}</TableCell>
                                            <TableCell className="text-center">{formatDate(order.scheduled_date)}</TableCell>
                                            <TableCell className="text-center">
                                                {order.actual_date ? formatDate(order.actual_date) : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-mono">{order.client.code}</span>
                                            </TableCell>
                                            <TableCell className="text-center">{order.province.name}</TableCell>
                                            <TableCell className="text-center">
                                                {order.client.distance_km ? (
                                                    <span className="text-muted-foreground">{order.client.distance_km}</span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="outline" className="cursor-help">{order.total_items}</Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-xs">
                                                        <div className="text-xs">
                                                            <p className="font-semibold mb-1">Part Numbers:</p>
                                                            <ul className="space-y-0.5">
                                                                {order.items.map((item) => (
                                                                    <li key={item.id} className="font-mono">
                                                                        {item.part_number} <span className="text-muted-foreground">×{item.quantity}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell className="text-center">{order.total_quantity.toLocaleString()}</TableCell>
                                            <TableCell className="text-center font-medium">
                                                {formatCurrency(order.total_amount)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {order.delivery_type && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {order.delivery_type}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {order.batch?.vehicle_type ? (
                                                    <Badge variant="secondary" className="text-xs uppercase">
                                                        {order.batch.vehicle_type}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center gap-1">
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link href={routes.show.url({ delivery_order: order.id })}>
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link href={routes.edit.url({ delivery_order: order.id })}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setOrderToDelete(order);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {orders.last_page > 1 && (
                    <div className="flex justify-center">
                        <Pagination links={orders.links} />
                    </div>
                )}
            </div>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Delivery Order</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete PO# {orderToDelete?.po_number}? This will also delete all {orderToDelete?.total_items} line items. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Export Dialog */}
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Export to Excel</DialogTitle>
                        <DialogDescription>
                            Select filters to export delivery orders. Leave all filters to export all data.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Province</Label>
                                <Select
                                    value={exportFilters.province_id}
                                    onValueChange={(value) => setExportFilters({ ...exportFilters, province_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Provinces" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Provinces</SelectItem>
                                        {provinces.map((province) => (
                                            <SelectItem key={province.id} value={province.id.toString()}>
                                                {province.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Client</Label>
                                <Select
                                    value={exportFilters.client_id}
                                    onValueChange={(value) => setExportFilters({ ...exportFilters, client_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Clients" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Clients</SelectItem>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id.toString()}>
                                                {client.code}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={exportFilters.status}
                                    onValueChange={(value) => setExportFilters({ ...exportFilters, status: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in_transit">In Transit</SelectItem>
                                        <SelectItem value="on_time">On Time</SelectItem>
                                        <SelectItem value="delayed">Delayed</SelectItem>

                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Delivery Type</Label>
                                <Select
                                    value={exportFilters.delivery_type}
                                    onValueChange={(value) => setExportFilters({ ...exportFilters, delivery_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="Drop Off">Drop Off</SelectItem>
                                        <SelectItem value="Pickup">Pickup</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date From (PO Date)</Label>
                                <Input
                                    type="date"
                                    value={exportFilters.date_from}
                                    onChange={(e) => setExportFilters({ ...exportFilters, date_from: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Date To (PO Date)</Label>
                                <Input
                                    type="date"
                                    value={exportFilters.date_to}
                                    onChange={(e) => setExportFilters({ ...exportFilters, date_to: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export to Excel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
