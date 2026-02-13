import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Trash2, Save,
    CreditCard, FileText, User,
    Building2, Ticket
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { ServiceSearch } from '@/components/billing/ServiceSearch';
import { PatientSearch } from '@/components/billing/PatientSearch';
import { PaymentModal } from '@/components/billing/PaymentModal';

interface InvoiceItem {
    id: string; // temp id for UI key
    serviceId?: string;
    description: string;
    category: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxPercent: number;
}

interface PatientDetails {
    id: string;
    firstName: string;
    lastName: string;
    uhid: string;
    mobilePrimary: string;
    email?: string;
    addressLine1?: string;
    city?: string;
    insurancePlan?: {
        id: string;
        planName: string;
        tpaName: string;
    };
    admissions?: any[]; // Simplified
}

const TABS = ['Consultation', 'Pharmacy', 'Lab', 'Procedures', 'Room', 'Other'];

export default function NewInvoicePage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    // State
    const [patient, setPatient] = useState<PatientDetails | null>(null);
    const [activeTab, setActiveTab] = useState('Consultation');
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [notes, setNotes] = useState('');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initial Payment State (temporarily held until final save)
    const [initialPayment, setInitialPayment] = useState<{
        amount: number;
        mode: string;
        reference: string;
        notes: string;
    } | null>(null);

    // Derived Calculations
    const totals = useMemo(() => {
        let subtotal = 0;
        let taxAmount = 0;
        let discountAmount = 0;

        items.forEach(item => {
            const baseTotal = item.quantity * item.unitPrice;
            const discount = baseTotal * (item.discountPercent / 100);
            const taxable = baseTotal - discount;
            const tax = taxable * (item.taxPercent / 100);

            subtotal += baseTotal;
            discountAmount += discount;
            taxAmount += tax;
        });

        const totalAmount = subtotal - discountAmount + taxAmount;
        const balanceDue = totalAmount - (initialPayment?.amount || 0);

        return { subtotal, taxAmount, discountAmount, totalAmount, balanceDue };
    }, [items, initialPayment]);

    // Handlers
    const handlePatientSelect = async (p: any) => {
        try {
            const response = await api.get<PatientDetails>(`/billing/patient-details/${p.id}`);
            if (response.success) {
                setPatient(response.data);
            }
        } catch (error) {
            toast({
                title: 'Error fetching details',
                description: 'Could not load extended patient details.',
                variant: 'destructive',
            });
            // Fallback to basic info if API fails
            setPatient(p);
        }
    };

    const addItem = (service: any) => {
        setItems(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            serviceId: service.id,
            description: service.name,
            category: service.category || 'Other',
            quantity: 1,
            unitPrice: Number(service.baseRate),
            taxPercent: Number(service.taxPercent) || 0,
            discountPercent: 0,
        }]);
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const deleteItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSaveInvoice = async () => {
        if (!patient) return;
        if (items.length === 0) {
            toast({
                title: "Empty Invoice",
                description: "Please add at least one item to the invoice.",
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patientId: patient.id,
                items: items.map(item => ({
                    serviceId: item.serviceId,
                    description: item.description,
                    category: item.category,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountPercent: item.discountPercent,
                    taxPercent: item.taxPercent,
                    totalAmount: (item.quantity * item.unitPrice) * (1 - item.discountPercent / 100) * (1 + item.taxPercent / 100)
                })),
                subtotal: totals.subtotal,
                discountAmount: totals.discountAmount,
                taxAmount: totals.taxAmount,
                totalAmount: totals.totalAmount,
                notes,
                initialPayment: initialPayment ? {
                    amount: initialPayment.amount,
                    paymentMode: initialPayment.mode,
                    referenceNo: initialPayment.reference,
                    notes: initialPayment.notes,
                } : undefined
            };

            const response = await api.post('/billing/invoices', payload);

            if (response.success) {
                toast({
                    title: "Invoice Created",
                    description: "Invoice and payment recorded successfully.",
                });
                navigate('/billing'); // Or navigate to details/print page
            }
        } catch (error: any) {
            toast({
                title: "Validation Error",
                description: error.message || "Failed to create invoice",
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/billing')} className="p-2 hover:bg-muted rounded-lg border">
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            Create New Invoice
                        </h1>
                        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSaveInvoice}
                        disabled={loading || !patient}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
                        Finalize Invoice
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 overflow-hidden">
                {/* Left Panel: Patient & Items */}
                <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden">

                    {/* Patient Card */}
                    <div className="bg-card border rounded-xl p-4 shrink-0 shadow-sm">
                        {!patient ? (
                            <div className="py-8 text-center space-y-4">
                                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg">Select Patient</h3>
                                    <p className="text-muted-foreground text-sm">Search detailed patient records to begin billing</p>
                                </div>
                                <div className="max-w-md mx-auto">
                                    <PatientSearch onSelect={handlePatientSelect} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                                        {patient.firstName[0]}{patient.lastName[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{patient.firstName} {patient.lastName}</h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {patient.uhid}</span>
                                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {patient.mobilePrimary}</span>
                                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {patient.city || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {patient.insurancePlan ? (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                            <Ticket className="w-3 h-3" />
                                            {patient.insurancePlan.tpaName} - {patient.insurancePlan.planName}
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                                            Cash Patient
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setPatient(null)}
                                        className="block mt-2 text-xs text-primary hover:underline ml-auto"
                                    >
                                        Change Patient
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Billing Tabs & Search */}
                    <div className="bg-card border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
                        <div className="p-4 border-b space-y-4">
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {TABS.map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                                            activeTab === tab
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <ServiceSearch
                                onSelect={addItem}
                                category={activeTab !== 'Other' ? activeTab : undefined}
                                className="w-full"
                            />
                        </div>

                        {/* Items Table */}
                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                                    <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                                        <th className="px-4 py-3 font-medium">Service / Item</th>
                                        <th className="px-4 py-3 font-medium w-24">Price</th>
                                        <th className="px-4 py-3 font-medium w-20">Qty</th>
                                        <th className="px-4 py-3 font-medium w-20">Disc %</th>
                                        <th className="px-4 py-3 font-medium w-20">Tax %</th>
                                        <th className="px-4 py-3 font-medium w-28 text-right">Total</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                                No items added. Search above to add services.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item) => (
                                            <tr key={item.id} className="group hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{item.description}</div>
                                                    <div className="text-xs text-muted-foreground">{item.category}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                        className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => item.quantity > 1 && updateItem(item.id, 'quantity', item.quantity - 1)}
                                                            className="w-5 h-5 flex items-center justify-center bg-muted rounded hover:bg-muted/80"
                                                        >-</button>
                                                        <span className="w-8 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)}
                                                            className="w-5 h-5 flex items-center justify-center bg-muted rounded hover:bg-muted/80"
                                                        >+</button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={item.discountPercent}
                                                        onChange={(e) => updateItem(item.id, 'discountPercent', Number(e.target.value))}
                                                        className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={item.taxPercent}
                                                        onChange={(e) => updateItem(item.id, 'taxPercent', Number(e.target.value))}
                                                        className="w-full bg-transparent border-b border-transparent focus:border-primary focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold">
                                                    ₹{((item.quantity * item.unitPrice) * (1 - item.discountPercent / 100) * (1 + item.taxPercent / 100)).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => deleteItem(item.id)}
                                                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Summary */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="bg-card border rounded-xl p-5 shadow-sm sticky top-4 space-y-6">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Billing Summary
                        </h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span>₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Discount</span>
                                <span className="text-green-600">-₹{totals.discountAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Tax (GST)</span>
                                <span>+₹{totals.taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-3 flex justify-between font-bold text-lg">
                                <span>Total Payable</span>
                                <span>₹{totals.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between text-sm items-center">
                                <span className="font-medium">Initial Payment</span>
                                {initialPayment ? (
                                    <button onClick={() => setInitialPayment(null)} className="text-xs text-red-500 hover:underline">Remove</button>
                                ) : (
                                    <button
                                        onClick={() => setIsPaymentModalOpen(true)}
                                        disabled={totals.totalAmount <= 0}
                                        className="text-xs text-primary hover:underline font-medium"
                                    >
                                        + Add Payment
                                    </button>
                                )}
                            </div>

                            {initialPayment ? (
                                <div className="flex justify-between items-center text-sm font-semibold text-green-700">
                                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {initialPayment.mode}</span>
                                    <span>-₹{initialPayment.amount.toFixed(2)}</span>
                                </div>
                            ) : (
                                <div className="text-center text-xs text-muted-foreground py-2 border border-dashed rounded">
                                    No payment Recorded
                                </div>
                            )}

                            <div className="border-t border-dashed pt-3 flex justify-between font-bold text-primary">
                                <span>Balance Due</span>
                                <span>₹{totals.balanceDue.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="text-xs font-semibold mb-1 block">Invoice Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full text-sm p-2 border rounded resize-none bg-background"
                                rows={2}
                                placeholder="Add notes here..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onConfirm={(payment) => {
                    setInitialPayment({
                        amount: payment.amount,
                        mode: payment.mode,
                        reference: payment.reference || '',
                        notes: payment.notes || ''
                    });
                    setIsPaymentModalOpen(false);
                }}
                totalAmount={totals.totalAmount}
                balanceDue={totals.balanceDue}
            />
        </div>
    );
}
