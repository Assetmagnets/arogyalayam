import { useState } from 'react';
import { X, CreditCard, Banknote, Building2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payment: { amount: number; mode: string; reference?: string; notes?: string }) => void;
    totalAmount: number;
    balanceDue: number;
}

const PAYMENT_MODES = [
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'CARD', label: 'Card', icon: CreditCard },
    { id: 'UPI', label: 'UPI', icon: Wallet },
    { id: 'NETBANKING', label: 'Net Banking', icon: Building2 },
];

export function PaymentModal({ isOpen, onClose, onConfirm, totalAmount, balanceDue }: PaymentModalProps) {
    const [amount, setAmount] = useState(balanceDue.toString());
    const [mode, setMode] = useState('CASH');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg">Record Payment</h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Amount Display */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-muted/30 p-3 rounded-lg">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Bill</div>
                            <div className="text-xl font-bold text-foreground">₹{totalAmount.toFixed(2)}</div>
                        </div>
                        <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                            <div className="text-xs text-primary uppercase tracking-wider font-semibold">Balance Due</div>
                            <div className="text-xl font-bold text-primary">₹{balanceDue.toFixed(2)}</div>
                        </div>
                    </div>

                    {/* Payment Mode */}
                    <div className="grid grid-cols-2 gap-3">
                        {PAYMENT_MODES.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setMode(m.id)}
                                className={cn(
                                    "flex items-center gap-2 p-3 border rounded-lg transition-all",
                                    mode === m.id
                                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                                        : "hover:border-primary/50 hover:bg-muted/50"
                                )}
                            >
                                <m.icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{m.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Payment Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2.5 bg-background border rounded-md focus:ring-2 focus:ring-primary/20 transition-all font-semibold text-lg"
                                />
                            </div>
                        </div>

                        {(mode === 'CARD' || mode === 'UPI' || mode === 'NETBANKING') && (
                            <div className="animate-in slide-in-from-top-2">
                                <label className="text-sm font-medium mb-1.5 block">Reference Number / Transaction ID</label>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="Enter reference number"
                                    className="w-full px-4 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Notes (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary/20 resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 border-t bg-muted/20">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-background border hover:bg-muted text-foreground rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm({
                            amount: parseFloat(amount) || 0,
                            mode,
                            reference,
                            notes
                        })}
                        disabled={!amount || parseFloat(amount) <= 0}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                        Confirm Payment
                    </button>
                </div>
            </div>
        </div>
    );
}
