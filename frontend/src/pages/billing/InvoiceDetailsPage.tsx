import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Building2, Phone, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toaster';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useReactToPrint } from 'react-to-print';

interface InvoiceDetails {
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    patient: {
        firstName: string;
        lastName: string;
        uhid: string;
        mobilePrimary: string;
        age?: number;
        gender?: string;
        addressLine1?: string;
        city?: string;
    };
    hospital: {
        name: string;
        addressLine1: string;
        city: string;
        state: string;
        pinCode: string;
        phone: string;
        email: string;
    };
    items: Array<{
        id: string;
        description: string;
        category: string;
        quantity: number;
        unitPrice: number;
        totalAmount: number;
        taxPercent: number;
        discountPercent: number;
    }>;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    paymentMode?: string;
    notes?: string;
}

export default function InvoiceDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: invoice ? `Invoice-${invoice.invoiceNo}` : 'Invoice',
    });

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const response = await api.get<InvoiceDetails>(`/billing/invoices/${id}`);
                if (response.success) {
                    setInvoice(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch invoice', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load invoice details.',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchInvoice();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="p-8 text-center">
                <p className="text-muted-foreground">Invoice not found.</p>
                <button
                    onClick={() => navigate('/billing')}
                    className="mt-4 text-primary hover:underline"
                >
                    Back to Billing
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/20 p-4 md:p-8">
            {/* Toolbar */}
            <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/billing')}
                        className="p-2 hover:bg-background rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold">Invoice Details</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Print Invoice
                    </button>
                </div>
            </div>

            {/* Invoice Paper */}
            <div ref={printRef} className="max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-sm print:shadow-none min-h-[800px] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-8 mb-8">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-primary">{invoice.hospital.name}</h2>
                        <div className="text-sm text-gray-500 space-y-1">
                            <p className="flex items-center gap-2"><Building2 className="w-3 h-3" /> {invoice.hospital.addressLine1}, {invoice.hospital.city}</p>
                            <p className="flex items-center gap-2"><Phone className="w-3 h-3" /> {invoice.hospital.phone}</p>
                            <p className="flex items-center gap-2"><Mail className="w-3 h-3" /> {invoice.hospital.email}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h3 className="text-lg font-bold">INVOICE</h3>
                        <p className="text-gray-500 font-mono mt-1">#{invoice.invoiceNo}</p>
                        <div className="mt-4 text-sm">
                            <p className="text-gray-500">Date Issued</p>
                            <p className="font-semibold">{formatDate(invoice.invoiceDate)}</p>
                        </div>
                    </div>
                </div>

                {/* Patient Info */}
                <div className="flex justify-between mb-12 bg-gray-50 p-6 rounded-lg print:bg-transparent print:p-0">
                    <div>
                        <p className="text-xs text-uppercase text-gray-500 font-semibold mb-2">BILL TO</p>
                        <h4 className="font-bold text-lg">{invoice.patient.firstName} {invoice.patient.lastName}</h4>
                        <p className="text-sm text-gray-600 mt-1">UHID: {invoice.patient.uhid}</p>
                        <p className="text-sm text-gray-600">{invoice.patient.mobilePrimary}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-uppercase text-gray-500 font-semibold mb-2">STATUS</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700 print:text-green-700' :
                            invoice.status === 'PENDING' ? 'bg-red-100 text-red-700 print:text-red-700' : 'bg-yellow-100 text-yellow-700 print:text-yellow-700'
                            }`}>
                            {invoice.status}
                        </span>
                    </div>
                </div>

                {/* Items Table */}
                <div className="flex-1">
                    <table className="w-full text-sm mb-8">
                        <thead>
                            <tr className="border-b-2 border-gray-100">
                                <th className="text-left py-3 font-semibold text-gray-600">Description</th>
                                <th className="text-right py-3 font-semibold text-gray-600">Qr.</th>
                                <th className="text-right py-3 font-semibold text-gray-600">Price</th>
                                <th className="text-right py-3 font-semibold text-gray-600">Tax</th>
                                <th className="text-right py-3 font-semibold text-gray-600">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {invoice.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="py-4">
                                        <div className="font-medium text-gray-900">{item.description}</div>
                                        <div className="text-xs text-gray-500">{item.category}</div>
                                    </td>
                                    <td className="py-4 text-right text-gray-600">{item.quantity}</td>
                                    <td className="py-4 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                                    <td className="py-4 text-right text-gray-600">{item.taxPercent}%</td>
                                    <td className="py-4 text-right font-medium text-gray-900">{formatCurrency(item.totalAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Totals */}
                <div className="border-t pt-8 flex flex-col items-end">
                    <div className="w-72 space-y-2 text-sm">
                        <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                            <span>Discount</span>
                            <span>-{formatCurrency(invoice.discountAmount)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                            <span>Tax</span>
                            <span>{formatCurrency(invoice.taxAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-4 border-t border-gray-100">
                            <span>Total</span>
                            <span>{formatCurrency(invoice.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-green-600 pt-2 font-medium">
                            <span>Paid</span>
                            <span>{formatCurrency(invoice.paidAmount)}</span>
                        </div>
                        <div className="flex justify-between text-red-600 font-medium">
                            <span>Balance Due</span>
                            <span>{formatCurrency(invoice.balanceAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Notes */}
                <div className="mt-12 pt-8 border-t text-xs text-gray-400 text-center">
                    <p>Computer generated invoice. No signature required.</p>
                    <p className="mt-1">Thank you for choosing AROGYALAYAM.</p>
                </div>
            </div>
        </div>
    );
}
