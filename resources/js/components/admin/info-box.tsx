import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface InfoBoxProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    iconBg: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
    subtitle?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

const bgClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
};

export function InfoBox({ title, value, icon: Icon, iconBg, subtitle, trend }: InfoBoxProps) {
    return (
        <div className="flex items-center rounded-lg bg-white p-4 shadow">
            <div className={`flex h-14 w-14 items-center justify-center rounded-lg ${bgClasses[iconBg]}`}>
                <Icon className="h-7 w-7 text-white" />
            </div>
            <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {trend && (
                        <span className={`flex items-center text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                            {Math.abs(trend.value)}%
                        </span>
                    )}
                </div>
                {subtitle && (
                    <p className="text-xs text-gray-400">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
