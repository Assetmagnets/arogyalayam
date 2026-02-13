// ============================================================================
// HMS Frontend - Billing Page
// Billing, invoicing, and payments
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Receipt, Search, Plus, IndianRupee,
    CreditCard, Clock, FileText, Printer,
    Filter, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

// Types
interface Invoice {
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    patient: {
        firstName: string;
        lastName: string;
        uhid: string;
    };
    totalAmount: number;
    balanceAmount: number;
    status: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'CANCELLED';
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function BillingPage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    // State
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState<Pagination>({
        page: 1, limit: 10, total: 0, totalPages: 1
    });

    // Fetch Invoices
    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params: any = {
                page: pagination.page,
                limit: pagination.limit,
                search: search || undefined,
                status: statusFilter || undefined,
            };

            const response = await api.get<Invoice[]>('/billing/invoices', { params });
            if (response.success) {
                setInvoices(response.data);
                if (response.pagination) {
                    setPagination(prev => ({ ...prev, ...response.pagination }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch invoices', error);
            toast({
                title: 'Error',
                description: 'Failed to load invoices.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPagination(prev => ({ ...prev, page: 1 }));
            fetchInvoices();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, statusFilter]);

    // Pagination change
    useEffect(() => {
        fetchInvoices();
    }, [pagination.page]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-green-100 text-green-700';
            case 'PARTIALLY_PAID': return 'bg-yellow-100 text-yellow-700';
            case 'PENDING': return 'bg-red-100 text-red-700';
            case 'CANCELLED': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

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
                <button
                    onClick={() => navigate('/billing/new')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    New Invoice
                </button>
            </div>

            {/* Quick Stats - Static for now */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">Today's Collection</p>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <IndianRupee className="w-4 h-4 text-green-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-2">₹1,24,500</p>
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        ↑ 12% from yesterday
                    </p>
                </div>
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Clock className="w-4 h-4 text-yellow-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-2">₹45,200</p>
                    <p className="text-xs text-muted-foreground mt-1">15 invoices pending</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">Insurance Claims</p>
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-2">₹2,30,000</p>
                    <p className="text-xs text-muted-foreground mt-1">8 claims processing</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">Invoices Today</p>
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Receipt className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-foreground mt-2">48</p>
                </div>
            </div>

            {/* Invoices List */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search invoice number, patient, or UHID..."
                            className="w-full h-10 pl-10 pr-4 rounded-lg bg-background border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-10 pl-10 pr-8 rounded-lg bg-background border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none cursor-pointer"
                            >
                                <option value="">All Status</option>
                                <option value="PAID">Paid</option>
                                <option value="PARTIALLY_PAID">Partial</option>
                                <option value="PENDING">Pending</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Invoice No</th>
                                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Patient</th>
                                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Amount</th>
                                <th className="px-6 py-3 text-center font-medium text-muted-foreground">Status</th>
                                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                                            Loading invoices...
                                        </div>
                                    </td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="w-8 h-8 opacity-20" />
                                            No invoices found matching your search.
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-6 py-3 font-medium text-primary">
                                            {invoice.invoiceNo}
                                        </td>
                                        <td className="px-6 py-3 text-muted-foreground">
                                            {formatDate(invoice.invoiceDate)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-medium">{invoice.patient.firstName} {invoice.patient.lastName}</div>
                                            <div className="text-xs text-muted-foreground">{invoice.patient.uhid}</div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-semibold">
                                            {formatCurrency(invoice.totalAmount)}
                                            {invoice.status === 'PARTIALLY_PAID' && (
                                                <div className="text-xs text-red-500 font-normal">
                                                    Due: {formatCurrency(invoice.balanceAmount)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={cn(
                                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                getStatusColor(invoice.status)
                                            )}>
                                                {invoice.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => navigate(`/billing/invoices/${invoice.id}`)}
                                                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/billing/invoices/${invoice.id}`)}
                                                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary"
                                                    title="Print Invoice"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1}
                            className="p-1 hover:bg-muted rounded disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span>Page {pagination.page} of {pagination.totalPages}</span>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                            disabled={pagination.page >= pagination.totalPages}
                            className="p-1 hover:bg-muted rounded disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
