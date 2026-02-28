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
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { 
    DollarSign, 
    TrendingUp, 
    TrendingDown,
    Target,
    Percent,
    Download,
    Calendar,
    Filter,
    AlertTriangle,
    CheckCircle2,
    Truck,
    MapPin,
    RotateCcw,
    FileSpreadsheet
} from 'lucide-react';
import { useState } from 'react';

interface SalesRecord {
    date: string;
    formatted_date: string;
    order_count: number;
    actual_sales: number;
    rate: number;
    target_sales: number;
    opportunity: number;
    opportunity_type: 'loss' | 'gain';
    percentage: number;
    exceeds_kpi: boolean;
}

interface Totals {
    order_count: number;
    actual_sales: number;
    rate: number;
    target_sales: number;
    opportunity: number;
    opportunity_type: 'loss' | 'gain';
    percentage: number;
    exceeds_kpi: boolean;
}

interface ProvinceBreakdown {
    province: string;
    order_count: number;
    actual_sales: number;
    rate: number;
    target_sales: number;
    opportunity: number;
    percentage: number;
    exceeds_kpi: boolean;
}

interface Province {
    id: number;
    name: string;
}

interface Filters {
    start_date: string;
    end_date: string;
    province_id: number | null;
    view: string;
}

interface Props {
    salesData: SalesRecord[];
    totals: Totals;
    provinceBreakdown: ProvinceBreakdown[];
    provinces: Province[];
    filters: Filters;
}

export default function SalesTracking({ salesData, totals, provinceBreakdown, provinces, filters }: Props) {
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [provinceId, setProvinceId] = useState<string>(filters.province_id?.toString() || '');
    const [viewType, setViewType] = useState(filters.view);

    const applyFilters = (newStartDate: string, newEndDate: string, newProvinceId: string, newViewType: string) => {
        router.get('/admin/sales-tracking', {
            start_date: newStartDate,
            end_date: newEndDate,
            province_id: newProvinceId && newProvinceId !== 'all' ? newProvinceId : undefined,
            view: newViewType,
        }, { preserveState: true });
    };

    // Export modal states
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState(filters.start_date);
    const [exportEndDate, setExportEndDate] = useState(filters.end_date);
    const [exportProvinceId, setExportProvinceId] = useState<string>(filters.province_id?.toString() || '');
    const [exportViewType, setExportViewType] = useState(filters.view);

    // Get default dates (start of month to today)
    const getDefaultStartDate = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    };

    const getDefaultEndDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    const handleStartDateChange = (newDate: string) => {
        setStartDate(newDate);
        applyFilters(newDate, endDate, provinceId, viewType);
    };

    const handleEndDateChange = (newDate: string) => {
        setEndDate(newDate);
        applyFilters(startDate, newDate, provinceId, viewType);
    };

    const handleProvinceChange = (newProvinceId: string) => {
        setProvinceId(newProvinceId);
        applyFilters(startDate, endDate, newProvinceId, viewType);
    };

    const handleViewChange = (newViewType: string) => {
        setViewType(newViewType);
        applyFilters(startDate, endDate, provinceId, newViewType);
    };

    const handleReset = () => {
        const defaultStart = getDefaultStartDate();
        const defaultEnd = getDefaultEndDate();
        
        setStartDate(defaultStart);
        setEndDate(defaultEnd);
        setProvinceId('');
        setViewType('daily');
        
        router.get('/admin/sales-tracking', {
            start_date: defaultStart,
            end_date: defaultEnd,
            view: 'daily',
        }, { preserveState: true });
    };

    const handleOpenExportModal = () => {
        // Pre-fill with current filter values
        setExportStartDate(startDate);
        setExportEndDate(endDate);
        setExportProvinceId(provinceId);
        setExportViewType(viewType);
        setExportModalOpen(true);
    };

    const handleExport = () => {
        const params = new URLSearchParams({
            start_date: exportStartDate,
            end_date: exportEndDate,
            view: exportViewType,
        });
        if (exportProvinceId && exportProvinceId !== 'all') {
            params.append('province_id', exportProvinceId);
        }
        
        window.location.href = `/admin/sales-tracking/export?${params.toString()}`;
        setExportModalOpen(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };

    const formatPercent = (value: number) => {
        return `${value.toFixed(2)}%`;
    };

    return (
        <AdminLayout>
            <Head title="Sales Tracking" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Sales Tracking</h1>
                        <p className="text-muted-foreground">
                            Track delivery performance and opportunity analysis
                        </p>
                    </div>
                    <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" onClick={handleOpenExportModal}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Export Data
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Export Sales Data</DialogTitle>
                                <DialogDescription>
                                    Configure the filters for your export
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Start Date</Label>
                                        <Input
                                            type="date"
                                            value={exportStartDate}
                                            onChange={(e) => setExportStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Date</Label>
                                        <Input
                                            type="date"
                                            value={exportEndDate}
                                            onChange={(e) => setExportEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Province</Label>
                                    <Select value={exportProvinceId} onValueChange={setExportProvinceId}>
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
                                    <Label>View Type</Label>
                                    <Select value={exportViewType} onValueChange={setExportViewType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setExportModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleExport}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => handleStartDateChange(e.target.value)}
                                    className="w-40"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => handleEndDateChange(e.target.value)}
                                    className="w-40"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Province</Label>
                                <Select value={provinceId} onValueChange={handleProvinceChange}>
                                    <SelectTrigger className="w-44">
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
                                <Label>View</Label>
                                <Select value={viewType} onValueChange={handleViewChange}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button variant="outline" onClick={handleReset}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reset
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="overflow-x-auto pb-2">
                    <div className="flex gap-4 min-w-max">
                    <Card className="min-w-[220px] flex-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Actual Sales</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate" title={formatCurrency(totals.actual_sales)}>{formatCurrency(totals.actual_sales)}</div>
                            <p className="text-xs text-muted-foreground">
                                {totals.order_count} deliveries completed
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="min-w-[220px] flex-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Rate</CardTitle>
                            <Truck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate" title={formatCurrency(totals.rate)}>{formatCurrency(totals.rate)}</div>
                            <p className="text-xs text-muted-foreground">
                                Delivery charges collected
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="min-w-[220px] flex-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Target Sales</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate" title={formatCurrency(totals.target_sales)}>{formatCurrency(totals.target_sales)}</div>
                            <p className="text-xs text-muted-foreground">
                                Rate ÷ 2% quota
                            </p>
                        </CardContent>
                    </Card>

                    <Card className={`min-w-[220px] flex-1 ${totals.opportunity_type === 'loss' ? 'border-red-200' : 'border-green-200'}`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Opportunity {totals.opportunity_type === 'loss' ? 'Loss' : 'Gain'}
                            </CardTitle>
                            {totals.opportunity_type === 'loss' ? (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold truncate ${totals.opportunity_type === 'loss' ? 'text-red-600' : 'text-green-600'}`} title={formatCurrency(Math.abs(totals.opportunity))}>
                                {formatCurrency(Math.abs(totals.opportunity))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Target - Actual Sales
                            </p>
                        </CardContent>
                    </Card>

                    <Card className={`min-w-[220px] flex-1 ${totals.exceeds_kpi ? 'border-red-200' : 'border-green-200'}`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">KPI Percentage</CardTitle>
                            {totals.exceeds_kpi ? (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${totals.exceeds_kpi ? 'text-red-600' : 'text-green-600'}`}>
                                {formatPercent(totals.percentage)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {totals.exceeds_kpi ? 'Exceeds 2% limit' : 'Within 2% limit'}
                            </p>
                        </CardContent>
                    </Card>
                    </div>
                </div>

                {/* Sales Performance Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Sales Performance
                        </CardTitle>
                        <CardDescription>
                            {viewType === 'daily' ? 'Daily' : viewType === 'weekly' ? 'Weekly' : 'Monthly'} breakdown of sales and KPI metrics
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {salesData.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No completed deliveries found for the selected period</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center">Date</TableHead>
                                            <TableHead className="text-center">Actual Sales</TableHead>
                                            <TableHead className="text-center">Rate</TableHead>
                                            <TableHead className="text-center">Target Sales</TableHead>
                                            <TableHead className="text-center">Opportunity Loss/Gain</TableHead>
                                            <TableHead className="text-center">Percentage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {salesData.map((record) => (
                                            <TableRow key={record.date}>
                                                <TableCell className="text-center font-medium">
                                                    {record.formatted_date}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {formatCurrency(record.actual_sales)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {formatCurrency(record.rate)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {formatCurrency(record.target_sales)}
                                                </TableCell>
                                                <TableCell className={`text-center ${record.opportunity_type === 'loss' ? 'text-red-600' : 'text-green-600'}`}>
                                                    {record.opportunity_type === 'gain' && '+'}
                                                    {formatCurrency(record.opportunity_type === 'gain' ? Math.abs(record.opportunity) : -Math.abs(record.opportunity))}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={record.exceeds_kpi ? 'destructive' : 'outline'} className={!record.exceeds_kpi ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                                                        {formatPercent(record.percentage)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow className="bg-muted/50 font-bold">
                                            <TableCell className="text-center">TOTAL</TableCell>
                                            <TableCell className="text-center">
                                                {formatCurrency(totals.actual_sales)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {formatCurrency(totals.rate)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {formatCurrency(totals.target_sales)}
                                            </TableCell>
                                            <TableCell className={`text-center ${totals.opportunity_type === 'loss' ? 'text-red-600' : 'text-green-600'}`}>
                                                {totals.opportunity_type === 'gain' && '+'}
                                                {formatCurrency(totals.opportunity_type === 'gain' ? Math.abs(totals.opportunity) : -Math.abs(totals.opportunity))}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={totals.exceeds_kpi ? 'destructive' : 'outline'} className={!totals.exceeds_kpi ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                                                    {formatPercent(totals.percentage)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Performance by Province */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Performance by Province
                        </CardTitle>
                        <CardDescription>
                            Sales and KPI breakdown by province
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {provinceBreakdown.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No data available for the selected period</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center">Province</TableHead>
                                            <TableHead className="text-center">Orders</TableHead>
                                            <TableHead className="text-center">Actual Sales</TableHead>
                                            <TableHead className="text-center">Rate</TableHead>
                                            <TableHead className="text-center">Target Sales</TableHead>
                                            <TableHead className="text-center">Opportunity</TableHead>
                                            <TableHead className="text-center">Percentage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {provinceBreakdown.map((record) => (
                                            <TableRow key={record.province}>
                                                <TableCell className="text-center font-medium">
                                                    {record.province}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {record.order_count}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {formatCurrency(record.actual_sales)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {formatCurrency(record.rate)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {formatCurrency(record.target_sales)}
                                                </TableCell>
                                                <TableCell className={`text-center ${record.opportunity >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {record.opportunity < 0 && '+'}
                                                    {formatCurrency(record.opportunity < 0 ? Math.abs(record.opportunity) : -Math.abs(record.opportunity))}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={record.exceeds_kpi ? 'destructive' : 'outline'} className={!record.exceeds_kpi ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                                                        {formatPercent(record.percentage)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* KPI Explanation Card */}
                <Card className="bg-muted/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">KPI Calculation Guide</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <p className="font-medium">Actual Sales (Trucking Sales)</p>
                                <p className="text-muted-foreground">Total sales amount from completed deliveries</p>
                            </div>
                            <div>
                                <p className="font-medium">Target Sales</p>
                                <p className="text-muted-foreground">Rate ÷ 2%</p>
                            </div>
                            <div>
                                <p className="font-medium">Opportunity Loss/Gain</p>
                                <p className="text-muted-foreground">Target Sales − Actual Sales</p>
                            </div>
                            <div>
                                <p className="font-medium">Percentage (KPI)</p>
                                <p className="text-muted-foreground">Rate ÷ Actual Sales × 100 (Limit: ≤ 2%)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
