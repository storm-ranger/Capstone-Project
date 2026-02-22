import { Head, Link, useForm } from '@inertiajs/react';
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
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import * as routes from '@/routes/admin/delivery-orders';

interface Province {
    id: number;
    name: string;
}

interface AreaGroup {
    id: number;
    name: string;
    code: string;
    base_rate: string;
}

interface Area {
    id: number;
    name: string;
    area_group_id: number;
    area_group?: AreaGroup;
}

interface Client {
    id: number;
    code: string;
    province_id: number;
    area_id: number;
    province?: Province;
    area?: Area;
}

interface Product {
    id: number;
    part_number: string;
    description: string | null;
    unit_price: number;
}

interface OrderItem {
    id?: number;
    product_id: string;
    part_number: string;
    description: string;
    unit_price: string;
    quantity: string;
}

interface Props {
    provinces: Province[];
    clients: Client[];
}

export default function DeliveryOrdersCreate({ clients }: Props) {
    const [items, setItems] = useState<OrderItem[]>([]);
    const [clientProducts, setClientProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        po_number: '',
        po_date: new Date().toISOString().split('T')[0],
        scheduled_date: '',
        actual_date: '',
        client_id: '',
        delivery_type: '',
        remarks: '',
        items: items,
    });

    // Fetch client-linked products when client changes (for dropdown options only)
    useEffect(() => {
        if (data.client_id) {
            setLoadingProducts(true);
            fetch(`/admin/clients/${data.client_id}/products`)
                .then(res => res.json())
                .then((products: Product[]) => {
                    setClientProducts(products);
                    setLoadingProducts(false);
                })
                .catch(() => {
                    setClientProducts([]);
                    setLoadingProducts(false);
                });
        } else {
            setClientProducts([]);
        }
    }, [data.client_id]);

    const addItem = () => {
        const newItems = [...items, { product_id: '', part_number: '', description: '', unit_price: '', quantity: '' }];
        setItems(newItems);
        setData('items', newItems);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
        setData('items', newItems);
    };

    const updateItem = (index: number, field: keyof OrderItem, value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        
        // Auto-fill from product selection
        if (field === 'product_id' && value) {
            const product = clientProducts.find(p => p.id.toString() === value);
            if (product) {
                newItems[index].part_number = product.part_number;
                newItems[index].description = product.description || '';
                newItems[index].unit_price = product.unit_price.toString();
            }
        }
        
        setItems(newItems);
        setData('items', newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(routes.store.url());
    };

    const calculateItemTotal = (item: OrderItem) => {
        const price = parseFloat(item.unit_price) || 0;
        const qty = parseFloat(item.quantity) || 0;
        return price * qty;
    };

    const calculateGrandTotal = () => {
        return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };

    // Memoized client options for combobox
    const clientOptions: ComboboxOption[] = useMemo(() => {
        return clients.map((client) => ({
            value: client.id.toString(),
            label: client.code,
            sublabel: client.province?.name,
        }));
    }, [clients]);

    // Memoized product options for combobox (with disabled state for already-added items)
    const getProductOptions = (currentIndex: number): ComboboxOption[] => {
        return clientProducts.map((product) => {
            const isAlreadyAdded = items.some(
                (i, idx) => idx !== currentIndex && i.product_id === product.id.toString()
            );
            return {
                value: product.id.toString(),
                label: product.part_number,
                sublabel: product.description || undefined,
                disabled: isAlreadyAdded,
            };
        });
    };

    return (
        <AdminLayout>
            <Head title="New Delivery Order" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={routes.index.url()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">New Delivery Order</h1>
                        <p className="text-muted-foreground">
                            Create a new delivery order with multiple items
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6">
                        {/* Order Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Information</CardTitle>
                                <CardDescription>
                                    Enter the purchase order details
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="client_id">Client *</Label>
                                    <Combobox
                                        options={clientOptions}
                                        value={data.client_id}
                                        onValueChange={(value) => setData('client_id', value)}
                                        placeholder="Select client..."
                                        searchPlaceholder="Search client..."
                                        emptyMessage="No clients found."
                                    />
                                    {errors.client_id && (
                                        <p className="text-sm text-destructive">{errors.client_id}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="po_number">PO Number *</Label>
                                    <Input
                                        id="po_number"
                                        value={data.po_number}
                                        onChange={(e) => setData('po_number', e.target.value)}
                                        placeholder="e.g., PO-2025-001"
                                    />
                                    {errors.po_number && (
                                        <p className="text-sm text-destructive">{errors.po_number}</p>
                                    )}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="po_date">PO Date *</Label>
                                        <Input
                                            id="po_date"
                                            type="date"
                                            value={data.po_date}
                                            onChange={(e) => setData('po_date', e.target.value)}
                                        />
                                        {errors.po_date && (
                                            <p className="text-sm text-destructive">{errors.po_date}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="scheduled_date">Scheduled Delivery *</Label>
                                        <Input
                                            id="scheduled_date"
                                            type="date"
                                            value={data.scheduled_date}
                                            onChange={(e) => setData('scheduled_date', e.target.value)}
                                        />
                                        {errors.scheduled_date && (
                                            <p className="text-sm text-destructive">{errors.scheduled_date}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="actual_date">Actual Delivery Date</Label>
                                    <Input
                                        id="actual_date"
                                        type="date"
                                        value={data.actual_date}
                                        onChange={(e) => setData('actual_date', e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave blank if not yet delivered
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="delivery_type">Delivery Type</Label>
                                    <Select
                                        value={data.delivery_type}
                                        onValueChange={(value) => setData('delivery_type', value)}
                                    >
                                        <SelectTrigger id="delivery_type">
                                            <SelectValue placeholder="Select delivery type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Drop Off">Drop Off</SelectItem>
                                            <SelectItem value="Pickup">Pickup</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="remarks">Remarks</Label>
                                    <Textarea
                                        id="remarks"
                                        value={data.remarks}
                                        onChange={(e) => setData('remarks', e.target.value)}
                                        placeholder="Additional notes..."
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Order Items */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Order Items</CardTitle>
                                    <CardDescription>
                                        Add items to this delivery order manually
                                    </CardDescription>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={addItem}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Item
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {errors.items && (
                                    <p className="text-sm text-destructive mb-4">{errors.items}</p>
                                )}
                                
                                {loadingProducts ? (
                                    <div className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                        <span className="text-muted-foreground">Loading products...</span>
                                    </div>
                                ) : items.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No items added. Click "Add Item" to add products to this order.
                                    </div>
                                ) : (
                                <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[250px] max-w-[250px]">Product</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="w-[120px]">Unit Price</TableHead>
                                            <TableHead className="w-[100px]">Quantity</TableHead>
                                            <TableHead className="w-[120px] text-right">Total</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="max-w-[250px]">
                                                    {clientProducts.length === 0 ? (
                                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                            {data.client_id ? 'No products available' : 'Select a client first'}
                                                        </div>
                                                    ) : (
                                                        <Combobox
                                                            options={getProductOptions(index)}
                                                            value={item.product_id || ''}
                                                            onValueChange={(value) => updateItem(index, 'product_id', value)}
                                                            placeholder="Select product..."
                                                            searchPlaceholder="Search product..."
                                                            emptyMessage="No products found."
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.description}
                                                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                        placeholder="Description"
                                                        readOnly
                                                        className="bg-muted"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.unit_price}
                                                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(calculateItemTotal(item))}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeItem(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                <div className="mt-4 flex justify-end">
                                    <div className="w-[300px] space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Items:</span>
                                            <span>{items.length}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Quantity:</span>
                                            <span>{items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                                            <span>Grand Total:</span>
                                            <span>{formatCurrency(calculateGrandTotal())}</span>
                                        </div>
                                    </div>
                                </div>
                                </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex justify-end gap-3">
                        <Button type="button" variant="outline" asChild>
                            <Link href={routes.index.url()}>Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="mr-2 h-4 w-4" />
                            Create Order
                        </Button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
