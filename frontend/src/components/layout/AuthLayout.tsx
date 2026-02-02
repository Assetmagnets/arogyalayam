// ============================================================================
// HMS Frontend - Auth Layout
// Layout for login and other auth pages
// ============================================================================

import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthLayout() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Redirect to dashboard if already authenticated
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-primary/10 via-background to-secondary/20">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-primary p-12 flex-col justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">HMS</span>
                        </div>
                        <div>
                            <h1 className="text-white text-2xl font-bold">Hospital Management</h1>
                            <p className="text-white/70 text-sm">Enterprise System</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <blockquote className="text-white/90 text-xl italic">
                        "Streamlining healthcare operations with intelligent management solutions."
                    </blockquote>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/10 rounded-lg p-4">
                            <p className="text-white text-2xl font-bold">5000+</p>
                            <p className="text-white/70 text-sm">Patients Managed</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-4">
                            <p className="text-white text-2xl font-bold">50+</p>
                            <p className="text-white/70 text-sm">Active Doctors</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-4">
                            <p className="text-white text-2xl font-bold">99%</p>
                            <p className="text-white/70 text-sm">Uptime</p>
                        </div>
                    </div>
                </div>

                <div className="text-white/50 text-sm">
                    © 2026 HMS - Enterprise Hospital Management System
                </div>
            </div>

            {/* Right side - Auth form */}
            <div className="flex-1 flex items-center justify-center p-4 lg:p-12">
                <div className="w-full max-w-md">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
