
import { ArrowLeft, Plus, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NewInvoicePage() {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/billing')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-primary" />
                        Create New Invoice
                    </h1>
                    <p className="text-muted-foreground">
                        Generate a new invoice for a patient
                    </p>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <Plus className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">Invoice Generation Form</h3>
                    <p className="text-muted-foreground mt-2 mb-6 max-w-md mx-auto">
                        This module is under development. Soon you will be able to search for patients,
                        add billable items, and generate PDF invoices here.
                    </p>
                    <button
                        onClick={() => navigate('/billing')}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Return to Billing
                    </button>
                </div>
            </div>
        </div>
    );
}
