// ============================================================================
// HMS Frontend - Laboratory Page
// Lab tests and results management
// ============================================================================

import { TestTube2, Search, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function LaboratoryPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <TestTube2 className="w-7 h-7 text-primary" />
                        Laboratory
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage lab orders, samples, and test results
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Pending Orders</p>
                        <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-1">18</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">In Progress</p>
                        <TestTube2 className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-1">12</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Completed Today</p>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-green-600 mt-1">45</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Critical Results</p>
                        <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-3xl font-bold text-red-600 mt-1">3</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by patient name, UHID, or test name..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            {/* Placeholder Content */}
            <div className="bg-card rounded-xl border border-border p-12 text-center">
                <TestTube2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-medium text-foreground mb-2">
                    Laboratory Module
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Process lab orders, collect samples, record test results,
                    and generate reports. Integrates with EMR for seamless workflow.
                </p>
            </div>
        </div>
    );
}
