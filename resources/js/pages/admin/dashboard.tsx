import AdminLayout from '@/layouts/admin-layout';
import { StatCard } from '@/components/admin/stat-card';
import { InfoBox } from '@/components/admin/info-box';
import { Head, router } from '@inertiajs/react';
import {
    Truck,
    Package,
    DollarSign,
    TrendingUp,
    Users,
    MapPin,
    AlertTriangle,
    CheckCircle,
    Clock,
    Filter,
    RotateCcw,
} from 'lucide-react';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Area, AreaChart, ReferenceLine, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback, useRef } from 'react';

interface Province {
    id: number;
    name: string;
}

interface ProvinceSummaryItem {
    province: string;
    sales: number;
    rate: number;
    loss: number;
    percentage: number;
}

interface RecentDelivery {
    id: number;
    code: string;
    client: string;
    status: string;
    date: string;
    amount: number;
}

interface SalesChartItem {
    period: string;
    [key: string]: string | number;
}

interface OpportunityLossItem {
    period: string;
    loss: number;
    gain: number;
}

interface KpiDataItem {
    period: string;
    target: number;
    [key: string]: string | number;
}

interface Props {
    stats: {
        totalSales: number;
        truckRate: number;
        opportunityLoss: number;
        opportunityType: 'loss' | 'gain';
        kpiPercentage: number;
        totalDeliveries: number;
        pendingDeliveries: number;
        completedToday: number;
        totalClients: number;
    };
    changes: {
        salesChange: number;
        rateChange: number;
        opportunityChange: number;
    };
    provinceSummary: ProvinceSummaryItem[];
    recentDeliveries: RecentDelivery[];
    salesChartData: SalesChartItem[];
    opportunityLossData: OpportunityLossItem[];
    kpiData: KpiDataItem[];
    provinces: Province[];
    filters: {
        view: string;
        province_id: number | null;
        year: number;
        start_date: string | null;
        end_date: string | null;
    };
    currentMonth: string;
}

export default function Dashboard({
    stats,
    changes,
    provinceSummary,
    recentDeliveries,
    salesChartData,
    opportunityLossData,
    kpiData,
    provinces,
    filters,
    currentMonth,
}: Props) {
    const [viewType, setViewType] = useState(filters.view || 'monthly');
    const [provinceId, setProvinceId] = useState<string>(filters.province_id?.toString() || 'all');
    const [year, setYear] = useState(filters.year?.toString() || new Date().getFullYear().toString());
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const isInitialMount = useRef(true);
    const [hoveredBar, setHoveredBar] = useState<string | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatPercent = (value: number) => {
        return `${value.toFixed(2)}%`;
    };

    // Generate dynamic chart config based on provinces
    // Order: Cavite (green), Laguna (yellow), Batangas (blue)
    const provinceColors: Record<string, string> = {
        cavite: 'hsl(142, 76%, 36%)',
        laguna: 'hsl(45, 93%, 47%)',
        batangas: 'hsl(217, 91%, 60%)',
    };

    // Define the sort order for provinces (by color preference)
    const provinceSortOrder: Record<string, number> = {
        cavite: 1,
        laguna: 2,
        batangas: 3,
    };

    const salesChartConfig: ChartConfig = provinces.reduce((acc, province) => {
        const key = province.name.toLowerCase().replace(/\s+/g, '_');
        acc[key] = {
            label: province.name,
            color: provinceColors[key] || `hsl(${Math.random() * 360}, 70%, 50%)`,
        };
        return acc;
    }, {} as ChartConfig);

    const lossChartConfig: ChartConfig = {
        loss: { label: 'Opportunity Loss', color: 'hsl(0, 84%, 60%)' },
        gain: { label: 'Opportunity Gain', color: 'hsl(142, 76%, 36%)' },
    };

    const kpiChartConfig: ChartConfig = {
        ...salesChartConfig,
        target: { label: 'Target (2%)', color: 'hsl(0, 84%, 60%)' },
    };

    // Custom tooltip that only shows the hovered bar
    const SingleBarTooltip = ({ active, payload, label, formatValue }: { active?: boolean; payload?: any[]; label?: string; formatValue: (value: number) => string }) => {
        if (!active || !payload || payload.length === 0 || !hoveredBar) return null;
        
        // Find the item matching the hovered bar
        const hoveredItem = payload.find((item: any) => item.dataKey === hoveredBar);
        
        if (!hoveredItem || hoveredItem.value === undefined) return null;

        const displayName = hoveredItem.dataKey.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

        return (
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
                <p className="font-medium text-gray-900">{label}</p>
                <p className="flex items-center gap-2">
                    <span 
                        className="inline-block h-3 w-3 rounded-full" 
                        style={{ backgroundColor: hoveredItem.fill || hoveredItem.color }}
                    />
                    <span style={{ color: hoveredItem.fill || hoveredItem.color }}>
                        {displayName}: {formatValue(hoveredItem.value)}
                    </span>
                </p>
            </div>
        );
    };

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            'Delivered': 'bg-green-100 text-green-800',
            'Delivered (Late)': 'bg-yellow-100 text-yellow-800',
            'In Transit': 'bg-blue-100 text-blue-800',
            'Confirmed': 'bg-indigo-100 text-indigo-800',
            'Pending': 'bg-gray-100 text-gray-800',
            'Cancelled': 'bg-red-100 text-red-800',
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    };

    const applyFilters = useCallback(() => {
        router.get('/admin/dashboard', {
            view: viewType,
            province_id: provinceId !== 'all' ? provinceId : undefined,
            year: year,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    }, [viewType, provinceId, year, startDate, endDate]);

    // Auto-apply filters when any filter value changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const timeoutId = setTimeout(() => {
            applyFilters();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [applyFilters]);

    const resetFilters = () => {
        setViewType('monthly');
        setProvinceId('all');
        setYear(new Date().getFullYear().toString());
        setStartDate('');
        setEndDate('');
        router.get('/admin/dashboard', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Calculate totals for province summary
    const totalSales = provinceSummary.reduce((sum, p) => sum + p.sales, 0);
    const totalRate = provinceSummary.reduce((sum, p) => sum + p.rate, 0);
    const totalLoss = provinceSummary.reduce((sum, p) => sum + p.loss, 0);
    const totalPercentage = totalSales > 0 ? (totalRate / totalSales) * 100 : 0;

    // Get province keys for chart bars (sorted by color order)
    const provinceKeys = provinces
        .map(p => p.name.toLowerCase().replace(/\s+/g, '_'))
        .sort((a, b) => (provinceSortOrder[a] ?? 99) - (provinceSortOrder[b] ?? 99));

    // Generate years for filter
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <AdminLayout
            breadcrumbs={[{ title: 'Dashboard', href: '/admin/dashboard' }]}
            title="Dashboard"
        >
            <Head title="Admin Dashboard" />

            {/* Page Title */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">
                    Welcome back! Here's what's happening with your logistics today.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title={`Total Sales (${currentMonth})`}
                    value={formatCurrency(stats.totalSales)}
                    icon={DollarSign}
                    color="blue"
                    change={{ value: changes.salesChange, label: 'vs last month' }}
                    link={{ href: '/admin/sales-tracking', label: 'View Report' }}
                />
                <StatCard
                    title="Truck Rate"
                    value={formatCurrency(stats.truckRate)}
                    icon={Truck}
                    color="green"
                    change={{ value: changes.rateChange, label: 'vs last month' }}
                    link={{ href: '/admin/sales-tracking', label: 'View Details' }}
                />
                <StatCard
                    title={stats.opportunityType === 'loss' ? 'Opportunity Loss' : 'Opportunity Gain'}
                    value={formatCurrency(stats.opportunityLoss)}
                    icon={AlertTriangle}
                    color={stats.opportunityType === 'loss' ? 'yellow' : 'green'}
                    change={{ value: -changes.opportunityChange, label: 'vs last month' }}
                    link={{ href: '/admin/sales-tracking', label: 'Analyze' }}
                />
                <StatCard
                    title="KPI Rate"
                    value={formatPercent(stats.kpiPercentage)}
                    icon={TrendingUp}
                    color={stats.kpiPercentage <= 2 ? 'cyan' : 'red'}
                    link={{ href: '/admin/sales-tracking', label: 'View KPI' }}
                />
            </div>

            {/* Main Content Grid */}
            <div className="mb-6 grid gap-6 lg:grid-cols-3">
                {/* Left Column - Province Summary + Secondary Stats */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Province Summary */}
                    <div className="rounded-lg bg-white shadow">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Province Summary ({currentMonth})
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Province
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Trucking Sales
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Truck Rate
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Opportunity
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                            KPI %
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {provinceSummary.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                No delivery data available for this period
                                            </td>
                                        </tr>
                                    ) : (
                                        provinceSummary.map((row, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex items-center">
                                                        <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                                                        <span className="font-medium text-gray-900">{row.province}</span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                                                    {formatCurrency(row.sales)}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                                                    {formatCurrency(row.rate)}
                                                </td>
                                                <td className={`whitespace-nowrap px-6 py-4 text-right text-sm ${row.loss >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {row.loss >= 0 ? '-' : '+'}{formatCurrency(Math.abs(row.loss))}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right">
                                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                        row.percentage <= 2
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {formatPercent(row.percentage)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {provinceSummary.length > 0 && (
                                    <tfoot className="bg-gray-100">
                                        <tr>
                                            <td className="px-6 py-3 font-semibold text-gray-900">OVERALL</td>
                                            <td className="px-6 py-3 text-right font-semibold text-gray-900">{formatCurrency(totalSales)}</td>
                                            <td className="px-6 py-3 text-right font-semibold text-gray-900">{formatCurrency(totalRate)}</td>
                                            <td className={`px-6 py-3 text-right font-semibold ${totalLoss >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {totalLoss >= 0 ? '-' : '+'}{formatCurrency(Math.abs(totalLoss))}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                    totalPercentage <= 2 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {formatPercent(totalPercentage)}
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* Secondary Stats - Below Province Summary (2x2 grid) */}
                    <div className="grid gap-4 grid-cols-2">
                        <InfoBox
                            title="Total Deliveries"
                            value={stats.totalDeliveries}
                            icon={Package}
                            iconBg="blue"
                            subtitle="This month"
                        />
                        <InfoBox
                            title="Pending Deliveries"
                            value={stats.pendingDeliveries}
                            icon={Clock}
                            iconBg="yellow"
                            subtitle="Awaiting dispatch"
                        />
                        <InfoBox
                            title="Completed Today"
                            value={stats.completedToday}
                            icon={CheckCircle}
                            iconBg="green"
                        />
                        <InfoBox
                            title="Active Clients"
                            value={stats.totalClients}
                            icon={Users}
                            iconBg="purple"
                            subtitle="This month"
                        />
                    </div>
                </div>

                {/* Recent Deliveries */}
                <div className="lg:col-span-1">
                    <div className="rounded-lg bg-white shadow">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Recent Deliveries
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {recentDeliveries.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                    No recent deliveries
                                </div>
                            ) : (
                                recentDeliveries.map((delivery) => (
                                    <div key={delivery.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{delivery.code}</p>
                                                <p className="text-sm text-gray-500">{delivery.client}</p>
                                            </div>
                                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(delivery.status)}`}>
                                                {delivery.status}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-sm">
                                            <span className="text-gray-500">{delivery.date}</span>
                                            <span className="font-medium text-gray-900">{formatCurrency(delivery.amount)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="border-t border-gray-200 p-4">
                            <a
                                href="/admin/delivery-orders"
                                className="block w-full rounded-lg bg-gray-100 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-200"
                            >
                                View All Deliveries
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section with Filters */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Filter className="h-5 w-5" />
                                    Sales Analytics
                                </CardTitle>
                                <CardDescription>
                                    View sales performance charts with filters
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">From:</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">To:</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                            <Select value={viewType} onValueChange={setViewType}>
                                <SelectTrigger className="w-[130px]">
                                    <SelectValue placeholder="View Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={provinceId} onValueChange={setProvinceId}>
                                <SelectTrigger className="w-[150px]">
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
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((y) => (
                                        <SelectItem key={y} value={y.toString()}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={resetFilters} variant="outline" size="sm">
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reset
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Monthly Trucking Sales Chart */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        {viewType === 'daily' ? 'Daily' : viewType === 'weekly' ? 'Weekly' : 'Monthly'} Trucking Sales by Province
                    </h3>
                    {salesChartData.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                            No data available for the selected period
                        </div>
                    ) : (
                        <>
                            <ChartContainer config={salesChartConfig} className="h-[300px] w-full">
                                <BarChart data={salesChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} onMouseLeave={() => setHoveredBar(null)}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                                    <XAxis 
                                        dataKey="period" 
                                        tick={{ fill: 'currentColor' }}
                                        className="text-gray-600"
                                    />
                                    <YAxis 
                                        tick={{ fill: 'currentColor' }}
                                        className="text-gray-600"
                                        tickFormatter={(value) => `₱${(value / 1000000).toFixed(1)}M`}
                                    />
                                    <Tooltip 
                                        content={<SingleBarTooltip formatValue={(v) => `₱${v.toLocaleString()}`} />}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    {provinceKeys.map((key, index) => (
                                        <Bar 
                                            key={key}
                                            dataKey={key} 
                                            fill={`var(--color-${key})`}
                                            radius={[4, 4, 0, 0]}
                                            onMouseEnter={() => setHoveredBar(key)}
                                        />
                                    ))}
                                </BarChart>
                            </ChartContainer>
                            <div className="mt-4 flex flex-wrap justify-center gap-4">
                                {provinceKeys.map((key) => {
                                    const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                                    return (
                                        <div key={key} className="flex items-center gap-2">
                                            <div 
                                                className="h-3 w-3 rounded-full" 
                                                style={{ backgroundColor: provinceColors[key] || 'hsl(0, 0%, 50%)' }}
                                            ></div>
                                            <span className="text-sm text-gray-600">{displayName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Opportunity Loss Trend */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        Opportunity Loss/Gain Trend ({year})
                    </h3>
                    {opportunityLossData.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                            No data available for the selected period
                        </div>
                    ) : (
                        <>
                            <ChartContainer config={lossChartConfig} className="h-[300px] w-full">
                                <AreaChart data={opportunityLossData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                                    <XAxis 
                                        dataKey="period" 
                                        tick={{ fill: 'currentColor' }}
                                        className="text-gray-600"
                                    />
                                    <YAxis 
                                        tick={{ fill: 'currentColor' }}
                                        className="text-gray-600"
                                        tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
                                    />
                                    <ChartTooltip 
                                        content={<ChartTooltipContent 
                                            formatter={(value, name) => {
                                                if (value === 0) return null;
                                                return [`₱${Number(value).toLocaleString()}`, name === 'loss' ? 'Loss' : 'Gain'];
                                            }}
                                        />}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="loss" 
                                        stroke="var(--color-loss)" 
                                        fill="var(--color-loss)" 
                                        fillOpacity={0.3}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="gain" 
                                        stroke="var(--color-gain)" 
                                        fill="var(--color-gain)" 
                                        fillOpacity={0.3}
                                    />
                                </AreaChart>
                            </ChartContainer>
                            <div className="mt-4 flex justify-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                    <span className="text-sm text-gray-600">Loss</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                    <span className="text-sm text-gray-600">Gain</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* KPI Percentage Trend */}
                <div className="rounded-lg bg-white p-6 shadow lg:col-span-2">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        KPI Rate Trend by Province (Target: ≤ 2%)
                    </h3>
                    {kpiData.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                            No data available for the selected period
                        </div>
                    ) : (
                        <>
                            <ChartContainer config={kpiChartConfig} className="h-[300px] w-full">
                                <BarChart data={kpiData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} onMouseLeave={() => setHoveredBar(null)}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                                    <XAxis 
                                        dataKey="period" 
                                        tick={{ fill: 'currentColor' }}
                                        className="text-gray-600"
                                    />
                                    <YAxis 
                                        tick={{ fill: 'currentColor' }}
                                        className="text-gray-600"
                                        tickFormatter={(value) => `${value}%`}
                                        domain={[0, 3]}
                                    />
                                    <Tooltip 
                                        content={<SingleBarTooltip formatValue={(v) => `${v}%`} />}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    {provinceKeys.map((key) => (
                                        <Bar 
                                            key={key}
                                            dataKey={key} 
                                            fill={`var(--color-${key})`}
                                            radius={[4, 4, 0, 0]}
                                            onMouseEnter={() => setHoveredBar(key)}
                                        />
                                    ))}
                                    <ReferenceLine y={2} stroke="hsl(0, 84%, 60%)" strokeDasharray="5 5" strokeWidth={2} label={{ value: '2% Target', fill: 'hsl(0, 84%, 60%)', position: 'right', fontSize: 12 }} />
                                </BarChart>
                            </ChartContainer>
                            <div className="mt-4 flex flex-wrap justify-center gap-6">
                                {provinceKeys.map((key) => {
                                    const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                                    return (
                                        <div key={key} className="flex items-center gap-2">
                                            <div 
                                                className="h-3 w-3 rounded-full" 
                                                style={{ backgroundColor: provinceColors[key] || 'hsl(0, 0%, 50%)' }}
                                            ></div>
                                            <span className="text-sm text-gray-600">{displayName}</span>
                                        </div>
                                    );
                                })}
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-6 bg-red-500"></div>
                                    <span className="text-sm text-gray-600">Target (2%)</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

        </AdminLayout>
    );
}
