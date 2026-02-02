// ============================================================================
// HMS Frontend - Pharmacy Page
// Pharmacy and inventory management
// ============================================================================

import { Pill, Search, Package, AlertTriangle, TrendingUp } from 'lucide-react';

export default function PharmacyPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Pill className="w-7 h-7 text-primary" />
                        Pharmacy & Inventory
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage drug inventory, dispensing, and stock
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Total Items</p>
                        <Package className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-1">1,245</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Low Stock</p>
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    </div>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">23</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Expiring Soon</p>
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-3xl font-bold text-red-600 mt-1">12</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Today's Sales</p>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-1">₹24,500</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search drugs by name, batch, or barcode..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            {/* Placeholder Content */}
            <div className="bg-card rounded-xl border border-border p-12 text-center">
                <Pill className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-medium text-foreground mb-2">
                    Pharmacy Module
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Manage drug inventory with FEFO dispensing, track batch numbers,
                    monitor expiry dates, and process prescriptions efficiently.
                </p>
            </div>
        </div>
    );
}
