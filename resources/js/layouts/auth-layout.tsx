import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
}

export default function AuthLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="relative grid min-h-screen lg:grid-cols-5">
            {/* Left Side - Cover Image (60% = 3/5) */}
            <div className="relative hidden lg:col-span-3 lg:block">
                <img
                    src="/images/cover-photo.jpg"
                    alt="DSS Logistics"
                    className="absolute inset-0 h-full w-full object-cover object-left"
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute bottom-10 left-10 right-10 z-10">
                    <h2 className="text-3xl font-bold text-white">
                        Decision Support System
                    </h2>
                    <p className="mt-2 text-lg text-gray-200">
                        Optimize your logistics operations with data-driven insights
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form (40% = 2/5) */}
            <div className="flex flex-col items-center justify-center bg-gray-50 px-6 py-12 lg:col-span-2">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="mb-8 flex flex-col items-center">
                        <Link href="/">
                            <img
                                src="/images/logo.png"
                                alt="DSS Logo"
                                className="h-[120px] w-auto"
                            />
                        </Link>
                        <h1 className="mt-4 text-2xl font-bold text-gray-900">
                            {title}
                        </h1>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            {description}
                        </p>
                    </div>

                    {/* Form Card */}
                    <div className="rounded-xl bg-white p-8 shadow-lg">
                        {children}
                    </div>

                    {/* Footer */}
                    <p className="mt-8 text-center text-xs text-gray-500">
                        © {new Date().getFullYear()} DSS Logistics. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
