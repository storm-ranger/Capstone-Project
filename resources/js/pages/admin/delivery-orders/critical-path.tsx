import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, CheckCircle2, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MilestoneData {
    id: number;
    name: string;
    code: string;
    sequence: number;
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
    planned_duration_days: number;
    actual_duration_days: number | null;
    planned_start_date: string | null;
    planned_end_date: string | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
    slack_days: number;
    is_critical: boolean;
    is_delayed: boolean;
    delay_days: number;
}

interface Order {
    id: number;
    po_number: string;
    po_date: string;
    scheduled_date: string;
    actual_date: string | null;
    status: string;
    client: {
        id: number;
        code: string;
    };
}

interface Props {
    order: Order;
    milestones: MilestoneData[];
    criticalPathDuration: number;
    criticalPathDelay: number;
    isOnSchedule: boolean;
}

export default function CriticalPathAnalysis({ order, milestones, criticalPathDuration, criticalPathDelay, isOnSchedule }: Props) {
    const completedCount = milestones.filter(m => m.status === 'completed').length;
    const progressPercentage = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

    const handleInitializeMilestones = () => {
        router.post(`/admin/delivery-orders/${order.id}/milestones/initialize`);
    };

    const handleAdvanceMilestone = () => {
        router.post(`/admin/delivery-orders/${order.id}/milestones/advance`);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'in_progress':
                return <Play className="h-5 w-5 text-blue-500" />;
            case 'skipped':
                return <ChevronRight className="h-5 w-5 text-gray-400" />;
            default:
                return <Clock className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: string, isDelayed: boolean) => {
        if (isDelayed) {
            return <Badge variant="destructive">Delayed</Badge>;
        }
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-500">Completed</Badge>;
            case 'in_progress':
                return <Badge className="bg-blue-500">In Progress</Badge>;
            case 'skipped':
                return <Badge variant="secondary">Skipped</Badge>;
            default:
                return <Badge variant="outline">Not Started</Badge>;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <AdminLayout>
            <Head title={`Critical Path - ${order.po_number}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/admin/delivery-orders/${order.id}`}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">Critical Path Analysis</h1>
                            <p className="text-muted-foreground">
                                PO# {order.po_number} - {order.client.code}
                            </p>
                        </div>
                    </div>
                    {milestones.length === 0 ? (
                        <Button onClick={handleInitializeMilestones}>
                            Initialize Milestones
                        </Button>
                    ) : (
                        <Button onClick={handleAdvanceMilestone}>
                            Advance to Next Milestone
                        </Button>
                    )}
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Critical Path Duration
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{criticalPathDuration} days</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{completedCount}/{milestones.length}</p>
                            <Progress value={progressPercentage} className="mt-2" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Schedule Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isOnSchedule ? (
                                <Badge className="bg-green-500 text-lg">On Schedule</Badge>
                            ) : (
                                <Badge variant="destructive" className="text-lg">Behind Schedule</Badge>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Delay
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={cn(
                                "text-2xl font-bold",
                                criticalPathDelay > 0 ? "text-red-500" : "text-green-500"
                            )}>
                                {criticalPathDelay > 0 ? `+${criticalPathDelay}` : criticalPathDelay} days
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline */}
                {milestones.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Milestone Timeline</CardTitle>
                            <CardDescription>
                                Critical path activities are highlighted. Slack time indicates flexibility.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                {milestones.map((milestone, index) => (
                                    <div
                                        key={milestone.id}
                                        className={cn(
                                            "relative flex gap-4 pb-8",
                                            index === milestones.length - 1 && "pb-0"
                                        )}
                                    >
                                        {/* Timeline line */}
                                        {index < milestones.length - 1 && (
                                            <div
                                                className={cn(
                                                    "absolute left-[22px] top-10 h-full w-0.5",
                                                    milestone.is_critical ? "bg-red-300" : "bg-gray-200"
                                                )}
                                            />
                                        )}

                                        {/* Status icon */}
                                        <div
                                            className={cn(
                                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2",
                                                milestone.is_critical ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-50",
                                                milestone.status === 'completed' && "border-green-500 bg-green-50",
                                                milestone.status === 'in_progress' && "border-blue-500 bg-blue-50"
                                            )}
                                        >
                                            {getStatusIcon(milestone.status)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{milestone.name}</h3>
                                                    {milestone.is_critical && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            Critical
                                                        </Badge>
                                                    )}
                                                    {getStatusBadge(milestone.status, milestone.is_delayed)}
                                                </div>
                                                {milestone.is_delayed && (
                                                    <div className="flex items-center gap-1 text-red-500">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        <span className="text-sm font-medium">
                                                            {milestone.delay_days} days late
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid gap-2 text-sm md:grid-cols-4">
                                                <div>
                                                    <span className="text-muted-foreground">Duration:</span>
                                                    <span className="ml-2 font-medium">
                                                        {milestone.actual_duration_days ?? milestone.planned_duration_days} days
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Planned:</span>
                                                    <span className="ml-2 font-medium">
                                                        {formatDate(milestone.planned_start_date)} - {formatDate(milestone.planned_end_date)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Actual:</span>
                                                    <span className="ml-2 font-medium">
                                                        {formatDate(milestone.actual_start_date)} - {formatDate(milestone.actual_end_date)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Slack:</span>
                                                    <span className={cn(
                                                        "ml-2 font-medium",
                                                        milestone.slack_days === 0 ? "text-red-500" : "text-green-500"
                                                    )}>
                                                        {milestone.slack_days} days
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">No Milestones Yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Initialize milestones to start tracking the critical path.
                            </p>
                            <Button onClick={handleInitializeMilestones}>
                                Initialize Milestones
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* CPM Legend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Critical Path Method (CPM) Legend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-full bg-red-500" />
                                <span className="text-sm">Critical Path Activity (Slack = 0)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-full bg-green-500" />
                                <span className="text-sm">Non-Critical Activity (Has Slack)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">Not Started</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Play className="h-4 w-4 text-blue-500" />
                                <span className="text-sm">In Progress</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
