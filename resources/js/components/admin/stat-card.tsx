import { LucideIcon } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
    change?: {
        value: number;
        label: string;
    };
    link?: {
        href: string;
        label: string;
    };
}

const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
};

const lightColorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    cyan: 'bg-cyan-100 text-cyan-600',
};

export function StatCard({ title, value, icon: Icon, color, change, link }: StatCardProps) {
    return (
        <div className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow">
            <div className="flex-1 p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${lightColorClasses[color]}`}>
                            <Icon className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <dl>
                            <dt className="truncate text-sm font-medium text-gray-500">
                                {title}
                            </dt>
                            <dd className="text-2xl font-bold text-gray-900">
                                {value}
                            </dd>
                        </dl>
                    </div>
                </div>
                {change && (
                    <div className="mt-4">
                        <span className={`text-sm font-medium ${change.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change.value >= 0 ? '↑' : '↓'} {Math.abs(change.value).toFixed(2)}%
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                            {change.label}
                        </span>
                    </div>
                )}
            </div>
            {link && (
                <div className={`${colorClasses[color]} mt-auto px-5 py-3`}>
                    <Link href={link.href} className="flex items-center justify-between text-sm font-medium text-white">
                        <span>{link.label}</span>
                        <span>→</span>
                    </Link>
                </div>
            )}
        </div>
    );
}
