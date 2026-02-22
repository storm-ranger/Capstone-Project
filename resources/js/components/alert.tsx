import * as React from "react"
import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react"

// Alert Types
export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface AlertMessage {
    id: string
    type: AlertType
    title: string
    message?: string
    duration?: number
    dismissible?: boolean
}

// Context
interface AlertContextType {
    alerts: AlertMessage[]
    showAlert: (alert: Omit<AlertMessage, 'id'>) => void
    success: (title: string, message?: string) => void
    error: (title: string, message?: string) => void
    warning: (title: string, message?: string) => void
    info: (title: string, message?: string) => void
    dismiss: (id: string) => void
    dismissAll: () => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

// Hook to use alerts
export function useAlert() {
    const context = useContext(AlertContext)
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider')
    }
    return context
}

// Provider Component
interface AlertProviderProps {
    children: ReactNode
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
    maxAlerts?: number
}

export function AlertProvider({ 
    children, 
    position = 'top-right',
    maxAlerts = 5 
}: AlertProviderProps) {
    const [alerts, setAlerts] = useState<AlertMessage[]>([])

    const dismiss = useCallback((id: string) => {
        setAlerts(prev => prev.filter(alert => alert.id !== id))
    }, [])

    const dismissAll = useCallback(() => {
        setAlerts([])
    }, [])

    const showAlert = useCallback((alert: Omit<AlertMessage, 'id'>) => {
        const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newAlert: AlertMessage = {
            id,
            duration: 5000,
            dismissible: true,
            ...alert,
        }

        setAlerts(prev => {
            const updated = [newAlert, ...prev]
            return updated.slice(0, maxAlerts)
        })

        // Auto dismiss after duration
        if (newAlert.duration && newAlert.duration > 0) {
            setTimeout(() => {
                dismiss(id)
            }, newAlert.duration)
        }
    }, [maxAlerts, dismiss])

    const success = useCallback((title: string, message?: string) => {
        showAlert({ type: 'success', title, message })
    }, [showAlert])

    const error = useCallback((title: string, message?: string) => {
        showAlert({ type: 'error', title, message, duration: 8000 })
    }, [showAlert])

    const warning = useCallback((title: string, message?: string) => {
        showAlert({ type: 'warning', title, message, duration: 6000 })
    }, [showAlert])

    const info = useCallback((title: string, message?: string) => {
        showAlert({ type: 'info', title, message })
    }, [showAlert])

    const positionClasses = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'top-center': 'top-4 left-1/2 -translate-x-1/2',
    }

    return (
        <AlertContext.Provider value={{ alerts, showAlert, success, error, warning, info, dismiss, dismissAll }}>
            {children}
            {/* Alert Container */}
            <div 
                className={cn(
                    "fixed z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none",
                    positionClasses[position]
                )}
            >
                {alerts.map((alert) => (
                    <AlertToast 
                        key={alert.id} 
                        alert={alert} 
                        onDismiss={() => dismiss(alert.id)} 
                    />
                ))}
            </div>
        </AlertContext.Provider>
    )
}

// Individual Alert Toast Component
interface AlertToastProps {
    alert: AlertMessage
    onDismiss: () => void
}

function AlertToast({ alert, onDismiss }: AlertToastProps) {
    const config = {
        success: {
            icon: CheckCircle,
            bgClass: 'bg-green-50 border-green-200',
            iconClass: 'text-green-500',
            titleClass: 'text-green-800',
            messageClass: 'text-green-700',
        },
        error: {
            icon: XCircle,
            bgClass: 'bg-red-50 border-red-200',
            iconClass: 'text-red-500',
            titleClass: 'text-red-800',
            messageClass: 'text-red-700',
        },
        warning: {
            icon: AlertTriangle,
            bgClass: 'bg-yellow-50 border-yellow-200',
            iconClass: 'text-yellow-500',
            titleClass: 'text-yellow-800',
            messageClass: 'text-yellow-700',
        },
        info: {
            icon: Info,
            bgClass: 'bg-blue-50 border-blue-200',
            iconClass: 'text-blue-500',
            titleClass: 'text-blue-800',
            messageClass: 'text-blue-700',
        },
    }

    const { icon: Icon, bgClass, iconClass, titleClass, messageClass } = config[alert.type]

    return (
        <div
            className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-right-full",
                bgClass
            )}
            role="alert"
        >
            <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconClass)} />
            <div className="flex-1 space-y-1">
                <p className={cn("text-sm font-medium", titleClass)}>
                    {alert.title}
                </p>
                {alert.message && (
                    <p className={cn("text-sm", messageClass)}>
                        {alert.message}
                    </p>
                )}
            </div>
            {alert.dismissible && (
                <button
                    onClick={onDismiss}
                    className={cn(
                        "shrink-0 rounded-md p-1 hover:bg-black/5 transition-colors",
                        titleClass
                    )}
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}

// Inline Alert Component (for use within page content)
interface InlineAlertProps {
    type: AlertType
    title: string
    message?: string
    onDismiss?: () => void
    className?: string
}

export function InlineAlert({ type, title, message, onDismiss, className }: InlineAlertProps) {
    const config = {
        success: {
            icon: CheckCircle,
            bgClass: 'bg-green-50 border-green-200',
            iconClass: 'text-green-500',
            titleClass: 'text-green-800',
            messageClass: 'text-green-700',
        },
        error: {
            icon: XCircle,
            bgClass: 'bg-red-50 border-red-200',
            iconClass: 'text-red-500',
            titleClass: 'text-red-800',
            messageClass: 'text-red-700',
        },
        warning: {
            icon: AlertTriangle,
            bgClass: 'bg-yellow-50 border-yellow-200',
            iconClass: 'text-yellow-500',
            titleClass: 'text-yellow-800',
            messageClass: 'text-yellow-700',
        },
        info: {
            icon: Info,
            bgClass: 'bg-blue-50 border-blue-200',
            iconClass: 'text-blue-500',
            titleClass: 'text-blue-800',
            messageClass: 'text-blue-700',
        },
    }

    const { icon: Icon, bgClass, iconClass, titleClass, messageClass } = config[type]

    return (
        <div
            className={cn(
                "flex items-start gap-3 rounded-lg border p-4",
                bgClass,
                className
            )}
            role="alert"
        >
            <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconClass)} />
            <div className="flex-1 space-y-1">
                <p className={cn("text-sm font-medium", titleClass)}>
                    {title}
                </p>
                {message && (
                    <p className={cn("text-sm", messageClass)}>
                        {message}
                    </p>
                )}
            </div>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className={cn(
                        "shrink-0 rounded-md p-1 hover:bg-black/5 transition-colors",
                        titleClass
                    )}
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}

export { AlertContext }
