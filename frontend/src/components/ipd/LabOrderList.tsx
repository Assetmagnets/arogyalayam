import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, FlaskConical, Clock, Trash2, Loader2, IndianRupee } from 'lucide-react';

interface LabOrder {
    id: string;
    testName: string;
    category?: string;
    price?: number;
    status: string; // PENDING, COMPLETED etc
    createdAt: string;
}

interface LabOrderListProps {
    admissionId: string;
    patientId: string;
    medicalRecordId?: string;
}

export default function LabOrderList({ admissionId, patientId, medicalRecordId }: LabOrderListProps) {
    const [orders, setOrders] = useState<LabOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [tests, setTests] = useState<{ testName: string; category: string; price: string }[]>([{ testName: '', category: '', price: '' }]);

    useEffect(() => {
        fetchOrders();
    }, [admissionId]);

    const fetchOrders = async () => {
        try {
            const response = await api.get<LabOrder[]>(`/ipd/clinical/lab-orders/${admissionId}`);
            if (response.success) {
                setOrders(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch lab orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTest = () => {
        setTests([...tests, { testName: '', category: '', price: '' }]);
    };

    const handleRemoveTest = (index: number) => {
        const newTests = [...tests];
        newTests.splice(index, 1);
        setTests(newTests);
    };

    const handleTestChange = (index: number, field: string, value: string) => {
        const newTests = [...tests];
        (newTests[index] as any)[field] = value;
        setTests(newTests);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const validTests = tests.filter(t => t.testName);
            if (validTests.length === 0) {
                setSubmitting(false);
                return;
            }

            const payload = {
                patientId,
                admissionId,
                medicalRecordId,
                tests: validTests.map(t => ({
                    testName: t.testName,
                    category: t.category,
                    price: t.price ? parseFloat(t.price) : undefined
                }))
            };

            const response = await api.post('/ipd/clinical/lab-orders', payload);
            if (response.success) {
                setShowForm(false);
                setTests([{ testName: '', category: '', price: '' }]);
                fetchOrders();
            }
        } catch (error) {
            console.error('Failed to create lab orders:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Lab Orders</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4" /> New Lab Order
                </button>
            </div>

            {showForm && (
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                    <div className="space-y-2">
                        {tests.map((test, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end border-b border-border pb-2">
                                <div className="col-span-5">
                                    <label className="text-xs font-medium">Test Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded text-sm bg-background"
                                        value={test.testName}
                                        onChange={(e) => handleTestChange(index, 'testName', e.target.value)}
                                        placeholder="CBC, Lipid Profile..."
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-xs font-medium">Category</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded text-sm bg-background"
                                        value={test.category}
                                        onChange={(e) => handleTestChange(index, 'category', e.target.value)}
                                        placeholder="Hematology"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-xs font-medium">Price (Optional)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded text-sm bg-background"
                                        value={test.price}
                                        onChange={(e) => handleTestChange(index, 'price', e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    <button
                                        onClick={() => handleRemoveTest(index)}
                                        className="text-destructive hover:bg-destructive/10 p-2 rounded"
                                        disabled={tests.length === 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleAddTest}
                        className="text-sm text-primary flex items-center gap-1 hover:underline"
                    >
                        <Plus className="w-3 h-3" /> Add Another Test
                    </button>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 border rounded text-sm hover:bg-muted"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                            Save Orders
                        </button>
                    </div>
                </div>
            )}

            <div className="grid gap-3">
                {orders.map(order => (
                    <div key={order.id} className="border border-border rounded-lg p-3 flex justify-between items-center bg-card">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-700 p-2 rounded-full">
                                <FlaskConical className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{order.testName}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    {order.category && <span>{order.category}</span>}
                                    <span>• <Clock className="w-3 h-3 inline" /> {new Date(order.createdAt).toLocaleString()}</span>
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            {order.price && (
                                <p className="text-sm font-medium flex items-center justify-end gap-0.5">
                                    <IndianRupee className="w-3 h-3" /> {order.price}
                                </p>
                            )}
                            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full uppercase">
                                {order.status || 'ORDERED'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            {orders.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                    No lab orders found.
                </div>
            )}
        </div>
    );
}
