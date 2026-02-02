// ============================================================================
// HMS Frontend - EMR Page
// Electronic Medical Records management
// ============================================================================

import { FileText, Search, FolderOpen } from 'lucide-react';

export default function EMRPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <FileText className="w-7 h-7 text-primary" />
                        Electronic Medical Records
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage patient medical records
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by patient name or UHID..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            {/* Placeholder Content */}
            <div className="bg-card rounded-xl border border-border p-12 text-center">
                <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-medium text-foreground mb-2">
                    EMR Module
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Search for a patient to view their medical records, consultation history,
                    prescriptions, and lab results. Access comprehensive health information
                    for clinical decision making.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card rounded-xl border border-border p-6">
                    <p className="text-sm text-muted-foreground">Today's Consultations</p>
                    <p className="text-3xl font-bold text-foreground mt-1">24</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6">
                    <p className="text-sm text-muted-foreground">Pending Records</p>
                    <p className="text-3xl font-bold text-foreground mt-1">8</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-6">
                    <p className="text-sm text-muted-foreground">Total Records</p>
                    <p className="text-3xl font-bold text-foreground mt-1">12,450</p>
                </div>
            </div>
        </div>
    );
}
