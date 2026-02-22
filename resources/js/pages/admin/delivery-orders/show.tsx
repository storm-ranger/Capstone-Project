import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Pencil, Trash2, Package, Calendar, MapPin, User, FileText, CheckCircle, AlertTriangle, Timer, Clock, Truck } from 'lucide-react';
import { useState } from 'react';
import * as routes from '@/routes/admin/delivery-orders';

interface Province {
    id: number;
    name: string;
}

interface Client {
    id: number;
    code: string;
}

interface Product {
    id: number;
    part_number: string;
    description: string | null;
}

interface OrderItem {
    id: number;
    product_id: number | null;
    part_number: string;
    description: string | null;
    unit_price: number;
    quantity: number;
    total_price: number;
    product: Product | null;
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
    status: 'pending' | 'on_time' | 'delayed' | 'cancelled';
    delivery_type: string | null;
    total_items: number;
    total_quantity: number;
    total_amount: number;
    remarks: string | null;
    days_variance: number | null;
    created_at: string;
    updated_at: string;
    client: Client;
    province: Province;
    items: OrderItem[];
    batch: DeliveryBatch | null;
}

interface Props {
    order: DeliveryOrder;
}

export default function DeliveryOrdersShow({ order }: Props) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleDelete = () => {
        router.delete(routes.destroy.url({ delivery_order: order.id }));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatShortDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode }> = {
            pending: { variant: 'secondary', label: 'Pending', icon: <Timer className="h-4 w-4" /> },
            confirmed: { variant: 'outline', label: 'Confirmed', icon: <CheckCircle className="h-4 w-4" /> },
            in_transit: { variant: 'default', label: 'In Transit', icon: <Truck className="h-4 w-4" /> },
            on_time: { variant: 'default', label: 'On Time', icon: <CheckCircle className="h-4 w-4" /> },
            delayed: { variant: 'destructive', label: 'Delayed', icon: <AlertTriangle className="h-4 w-4" /> },
            cancelled: { variant: 'outline', label: 'Cancelled', icon: null },
        };
        const { variant, label, icon } = config[status] || config.pending;
        return (
            <Badge variant={variant} className="gap-1 text-sm px-3 py-1">
                {icon}
                {label}
            </Badge>
        );
    };

    const getVarianceText = () => {
        if (order.days_variance === null) return null;
        if (order.days_variance === 0) return 'Delivered exactly on schedule';
        if (order.days_variance < 0) return `Delivered ${Math.abs(order.days_variance)} day(s) early`;
        return `Delivered ${order.days_variance} day(s) late`;
    };

    return (
        <AdminLayout>
            <Head title={`Order - ${order.po_number}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={routes.index.url()}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight font-mono">
                                    {order.po_number}
                                </h1>
                                {getStatusBadge(order.status)}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={routes.edit.url({ delivery_order: order.id })}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </Button>
                        <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Delivery Timeline */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Delivery Timeline
                            </CardTitle>
                            <CardDescription>
                                Track the delivery schedule and actual delivery date
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Timeline */}
                                <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                                    
                                    {/* PO Date */}
                                    <div className="relative flex gap-4 pb-6">
                                        <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <p className="text-sm font-medium">Purchase Order Created</p>
                                            <p className="text-lg font-semibold">{formatDate(order.po_date)}</p>
                                        </div>
                                    </div>

                                    {/* Scheduled Date */}
                                    <div className="relative flex gap-4 pb-6">
                                        <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${order.status === 'pending' ? 'bg-yellow-500' : 'bg-muted'} text-white`}>
                                            <Clock className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <p className="text-sm font-medium">Scheduled Delivery</p>
                                            <p className="text-lg font-semibold">{formatDate(order.scheduled_date)}</p>
                                        </div>
                                    </div>

                                    {/* Actual Date */}
                                    <div className="relative flex gap-4">
                                        <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                                            order.actual_date 
                                                ? order.status === 'on_time' ? 'bg-green-500' : 'bg-red-500'
                                                : 'bg-muted'
                                        } text-white`}>
                                            {order.actual_date 
                                                ? order.status === 'on_time' 
                                                    ? <CheckCircle className="h-4 w-4" />
                                                    : <AlertTriangle className="h-4 w-4" />
                                                : <Timer className="h-4 w-4" />
                                            }
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <p className="text-sm font-medium">Actual Delivery</p>
                                            {order.actual_date ? (
                                                <>
                                                    <p className="text-lg font-semibold">{formatDate(order.actual_date)}</p>
                                                    {order.days_variance !== null && (
                                                        <p className={`text-sm ${order.days_variance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {getVarianceText()}
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-lg text-muted-foreground">Not yet delivered</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Client & Location */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Client & Location
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Client Code</p>
                                <p className="text-lg font-mono font-semibold">{order.client.code}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Province</p>
                                <p className="text-lg font-semibold flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {order.province.name}
                                </p>
                            </div>
                            {order.delivery_type && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Delivery Type</p>
                                    <Badge variant="outline" className="mt-1">
                                        {order.delivery_type}
                                    </Badge>
                                </div>
                            )}
                            {order.batch?.vehicle_type && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Vehicle Type</p>
                                    <Badge variant="secondary" className="mt-1 uppercase">
                                        {order.batch.vehicle_type}
                                    </Badge>
                                </div>
                            )}
                            {order.remarks && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Remarks</p>
                                    <p className="text-sm mt-1 whitespace-pre-wrap">{order.remarks}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Order Items */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Order Items ({order.total_items} items)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60px]">#</TableHead>
                                        <TableHead>Part Number</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items.map((item, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell className="font-mono font-medium">{item.part_number}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                            <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Totals */}
                            <div className="mt-4 flex justify-end">
                                <div className="w-[300px] space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Items:</span>
                                        <span>{order.total_items}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Quantity:</span>
                                        <span>{order.total_quantity.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-xl border-t pt-2">
                                        <span>Grand Total:</span>
                                        <span>{formatCurrency(order.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Delivery Order</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete PO# {order.po_number}? This will also delete all {order.total_items} line items. This action cannot be undone.
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
        </AdminLayout>
    );
}
