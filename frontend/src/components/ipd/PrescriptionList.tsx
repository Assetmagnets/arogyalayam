import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Pill, Clock, FileText, Loader2, Trash2 } from 'lucide-react';

interface PrescriptionItem {
    id: string;
    drugName: string;
    dosage?: string;
    frequency: string;
    route?: string;
    duration: number;
    quantity: number;
    instructions?: string;
}

interface Prescription {
    id: string;
    prescriptionNo: string;
    createdAt: string;
    doctorName?: string; // If backend provides it
    items: PrescriptionItem[];
    generalInstructions?: string;
}

interface PrescriptionListProps {
    admissionId: string;
    patientId: string;
}

export default function PrescriptionList({ admissionId, patientId }: PrescriptionListProps) {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [items, setItems] = useState<Partial<PrescriptionItem>[]>([{ drugName: '', frequency: 'OD', duration: 1, quantity: 1, route: 'ORAL' }]);
    const [generalInstructions, setGeneralInstructions] = useState('');

    useEffect(() => {
        fetchPrescriptions();
    }, [admissionId]);

    const fetchPrescriptions = async () => {
        try {
            const response = await api.get<Prescription[]>(`/ipd/clinical/prescriptions/${admissionId}`);
            if (response.success) {
                setPrescriptions(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch prescriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setItems([...items, { drugName: '', frequency: 'OD', duration: 1, quantity: 1, route: 'ORAL' }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: keyof PrescriptionItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Validate items
            const validItems = items.filter(i => i.drugName);
            if (validItems.length === 0) {
                // Show validation error (could use toast)
                setSubmitting(false);
                return;
            }

            const payload = {
                patientId,
                admissionId,
                items: validItems.map(item => ({
                    drugId: 'TEMP-' + Math.random(), // Backend needs drugId, but if free text? Backend schema allows free text if we handle it? 
                    // Wait, schema has DrugMaster? Or just string?
                    // Schema: `drugId String` but also `drugName String`. 
                    // `drugId` usually refs `DrugMaster`. If not using master, we might need a workaround or valid ID.
                    // For now, I'll assume we need a valid ID or the backend handles ad-hoc if `drugId` is not strictly enforced as FK to a master that MUST exist?
                    // `DrugMaster` existence is likely enforced if it's a relation. 
                    // My backend route said `drugId: z.string().min(1)`.
                    // The schema: `drugId String`, `drug DrugMaster @relation(...)`. So it MUST exist.
                    // I need a drug search. Or I need to create a drug on the fly?
                    // For this MVP, maybe I should list drugs? 
                    // Or cheat and use a known drug ID? 
                    // I'll fetch drugs first? Or just hardcode a known ID for "Generic" if exists?
                    // Actually, I should probably search drugs.
                    // BUT, I don't have a drug search API ready in `ipd-clinical`.
                    // `DrugMaster` is in schema.
                    // I will fail if I send random string.
                    // Verification plan says "Add Rx".
                    // I'll look for `GET /api/v1/pharmacy/drugs` or similar?
                    // Let's assume for now I can pass a dummy ID or I need to fetch drugs.
                    // I'll add a drug search later. For now, I'll fail if I send junk.
                    // Wait, `PrescriptionItem` has `drugId`. `DrugMaster` is unrelated to `PrescriptionItem`?
                    // Schema: `model PrescriptionItem { drugId String, drug DrugMaster @relation... }`. Yes exact FK.

                    // QUICK FIX: I will implement a Drug Search in the form? 
                    // Or since I can't easily do that in one step without backend support, 
                    // I will check if there is a "General" drug or I can create one?
                    // Or I assume the user selects from a dropdown of ALL drugs (if few)?
                    // I'll add a fetch for drugs.
                    drugId: item.drugId || 'MISSING_ID',
                    drugName: item.drugName,
                    dosage: item.dosage,
                    frequency: item.frequency,
                    route: item.route,
                    duration: parseInt(item.duration?.toString() || '1'),
                    quantity: parseInt(item.quantity?.toString() || '1'),
                    instructions: item.instructions
                })),
                generalInstructions
            };

            const response = await api.post('/ipd/clinical/prescriptions', payload);
            if (response.success) {
                setShowForm(false);
                setItems([{ drugName: '', frequency: 'OD', duration: 1, quantity: 1, route: 'ORAL' }]);
                setGeneralInstructions('');
                fetchPrescriptions();
            }
        } catch (error) {
            console.error('Failed to create prescription:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // We need drugs for the dropdown.
    const [drugs, setDrugs] = useState<any[]>([]);
    useEffect(() => {
        if (showForm) {
            // Fetch drugs
            api.get('/pharmacy/inventory/search?query=').then((res: any) => {
                if (res.success) setDrugs(res.data);
            }).catch(() => { });
        }
    }, [showForm]);


    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Prescriptions</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4" /> New Prescription
                </button>
            </div>

            {showForm && (
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end border-b border-border pb-2">
                                <div className="col-span-3">
                                    <label className="text-xs font-medium">Drug</label>
                                    <select
                                        className="w-full p-2 border rounded text-sm bg-background"
                                        value={item.drugId || ''}
                                        onChange={(e) => {
                                            const drug = drugs.find(d => d.id === e.target.value);
                                            handleItemChange(index, 'drugId', e.target.value);
                                            handleItemChange(index, 'drugName', drug?.name || '');
                                        }}
                                    >
                                        <option value="">Select Drug</option>
                                        {drugs.map(d => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.genericName})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium">Dosage</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded text-sm bg-background"
                                        value={item.dosage || ''}
                                        onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                                        placeholder="500mg"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium">Frequency</label>
                                    <select
                                        className="w-full p-2 border rounded text-sm bg-background"
                                        value={item.frequency}
                                        onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                                    >
                                        <option value="OD">1-0-0 (OD)</option>
                                        <option value="BD">1-0-1 (BD)</option>
                                        <option value="TDS">1-1-1 (TDS)</option>
                                        <option value="QID">1-1-1-1 (QID)</option>
                                        <option value="SOS">SOS</option>
                                        <option value="HS">0-0-1 (HS)</option>
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-medium">Days</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded text-sm bg-background"
                                        value={item.duration}
                                        onChange={(e) => handleItemChange(index, 'duration', parseInt(e.target.value))}
                                        min="1"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-medium">Qty</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded text-sm bg-background"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                                        min="1"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium">Instruction</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded text-sm bg-background"
                                        value={item.instructions || ''}
                                        onChange={(e) => handleItemChange(index, 'instructions', e.target.value)}
                                        placeholder="After food"
                                    />
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    <button
                                        onClick={() => handleRemoveItem(index)}
                                        className="text-destructive hover:bg-destructive/10 p-2 rounded"
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleAddItem}
                        className="text-sm text-primary flex items-center gap-1 hover:underline"
                    >
                        <Plus className="w-3 h-3" /> Add Another Drug
                    </button>

                    <div>
                        <label className="text-sm font-medium">General Instructions</label>
                        <textarea
                            className="w-full p-2 border rounded text-sm bg-background mt-1"
                            rows={3}
                            value={generalInstructions}
                            onChange={(e) => setGeneralInstructions(e.target.value)}
                        />
                    </div>

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
                            Save Prescription
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {prescriptions.map(rx => (
                    <div key={rx.id} className="border border-border rounded-lg p-4 bg-card">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-semibold">{rx.prescriptionNo}</h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> {new Date(rx.createdAt).toLocaleString()}
                                    {rx.doctorName && <span>• Dr. {rx.doctorName}</span>}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {rx.items.map(item => (
                                <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                                    <div className="flex items-center gap-2">
                                        <Pill className="w-4 h-4 text-primary" />
                                        <span className="font-medium">{item.drugName}</span>
                                        <span className="text-muted-foreground">({item.dosage})</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="bg-background px-2 py-0.5 rounded border">{item.frequency}</span>
                                        <span>{item.duration} Days</span>
                                        <span className="font-medium">Qty: {item.quantity}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {rx.generalInstructions && (
                            <div className="mt-3 text-sm bg-yellow-50/50 p-2 rounded text-yellow-800 flex gap-2">
                                <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>{rx.generalInstructions}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {prescriptions.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                    No prescriptions found for this admission.
                </div>
            )}
        </div>
    );
}
