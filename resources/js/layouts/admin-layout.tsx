import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { AlertProvider, useAlert } from '@/components/alert';
import { type BreadcrumbItem } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState, useEffect, useRef, type ReactNode } from 'react';

interface FlashMessages {
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
}

interface AdminLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    title?: string;
}

export default function AdminLayout({ children, breadcrumbs, title }: AdminLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { flash } = usePage<{ flash?: FlashMessages }>().props;

    return (
        <AlertProvider position="top-right">
            <AdminLayoutContent 
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                breadcrumbs={breadcrumbs}
                title={title}
                flash={flash}
            >
                {children}
            </AdminLayoutContent>
        </AlertProvider>
    );
}

interface AdminLayoutContentProps {
    children: ReactNode;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    breadcrumbs?: BreadcrumbItem[];
    title?: string;
    flash?: FlashMessages;
}

function AdminLayoutContent({ 
    children, 
    sidebarOpen, 
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    breadcrumbs, 
    title,
    flash 
}: AdminLayoutContentProps) {
    const { success, error, warning, info } = useAlert();
    const lastFlashRef = useRef<string | null>(null);

    // Handle flash messages from Laravel
    useEffect(() => {
        // Create a unique key for current flash to prevent duplicate alerts
        const flashKey = JSON.stringify(flash);
        
        if (flashKey !== lastFlashRef.current && flash) {
            lastFlashRef.current = flashKey;
            
            if (flash.success) {
                success('Success', flash.success);
            }
            if (flash.error) {
                error('Error', flash.error);
            }
            if (flash.warning) {
                warning('Warning', flash.warning);
            }
            if (flash.info) {
                info('Info', flash.info);
            }
        }
    }, [flash, success, error, warning, info]);

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Sidebar */}
            <AdminSidebar 
                isOpen={sidebarOpen} 
                isCollapsed={sidebarCollapsed}
                onClose={() => setSidebarOpen(false)} 
            />

            {/* Main Content */}
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                {/* Header */}
                <AdminHeader 
                    onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                    onMobileMenuToggle={() => setSidebarOpen(!sidebarOpen)}
                    breadcrumbs={breadcrumbs}
                    title={title}
                />

                {/* Page Content */}
                <main className="p-4 lg:p-6">
                    {children}
                </main>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
