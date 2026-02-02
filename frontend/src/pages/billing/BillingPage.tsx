// ============================================================================
// HMS Frontend - Billing Page
// Billing, invoicing, and payments
// ============================================================================

import { Receipt, Search, Plus, IndianRupee, CreditCard, Clock } from 'lucide-react';

export default function BillingPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Receipt className="w-7 h-7 text-primary" />
                        Billing & Payments
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Generate invoices and process payments
                    </p>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" />
                    New Invoice
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Today's Collection</p>
                        <IndianRupee className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-1">₹1,24,500</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Pending Payments</p>
                        <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">₹45,200</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Insurance Claims</p>
                        <CreditCard className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-1">₹2,30,000</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Invoices Today</p>
                        <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-1">48</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by invoice number, patient name, or UHID..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            {/* Placeholder Content */}
            <div className="bg-card rounded-xl border border-border p-12 text-center">
                <Receipt className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-medium text-foreground mb-2">
                    Billing Module
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Generate GST-compliant invoices, process multiple payment modes
                    (Cash, UPI, Card), manage insurance claims, and track collections.
                </p>
            </div>
        </div>
    );
}
