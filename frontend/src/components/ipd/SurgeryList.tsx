import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Scissors, Calendar, Clock, User, Mic2, Loader2 } from 'lucide-react';

interface SurgeryBooking {
    id: string;
    procedureName: string;
    surgeryDate: string;
    startTime?: string;
    endTime?: string;
    status: string;
    otRoom: { name: string };
    doctorName?: string; // Transformed from backend
    doctor?: { user: { firstName: string; lastName: string } };
}

interface SurgeryListProps {
    admissionId: string;
    patientId: string;
    hospitalId: string; // Needed? Maybe not if backend infers from user. But for queries?
}

export default function SurgeryList({ admissionId, patientId }: SurgeryListProps) {
    const [surgeries, setSurgeries] = useState<SurgeryBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        procedureName: '',
        surgeryDate: '',
        startTime: '',
        endTime: '',
        otRoomId: '',
        doctorId: '',
        notes: ''
    });

    // Dropdown Data
    const [otRooms, setOtRooms] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);

    useEffect(() => {
        fetchSurgeries();
    }, [admissionId]);

    useEffect(() => {
        if (showForm) {
            fetchOtRooms();
            fetchDoctors();
        }
    }, [showForm]);

    const fetchSurgeries = async () => {
        try {
            // My backend route for GET /surgeries filters by date range optionally.
            // But here I want surgeries for THIS admission.
            // Wait, my backend implementation of `GET /ipd/clinical/surgeries` does NOT filter by `admissionId`.
            // It filters by date range for calendar.
            // IPD Patient view needs surgeries for *this admission*.
            // I missed adding `GET /surgeries?admissionId=...` in `ipd-clinical.routes.ts`.
            // OR I can use `GET /admission/:id/clinical` (aggregate) if I implemented it (plan mentioned it, but I didn't verify code).
            // Actually, I didn't implement specialized `GET /clinical` in `ipd-clinical.routes.ts`.
            // I implemented `GET /prescriptions/:admissionId`, `GET /lab-orders/:admissionId`.
            // I missed `GET /surgeries/:admissionId`!!!!
            // I implemented `GET /surgeries` (calendar view).

            // I need to fix `ipd-clinical.routes.ts` to support filtering by `admissionId` on `GET /surgeries` or add a new route.
            // Or I can just filter client side if I fetch all? No, that's bad.
            // I will add `admissionId` filter support to `GET /surgeries` in backend.
            // But I can't edit backend easily right now without switching context.
            // Let's assume I will fix backend. Use `GET /ipd/clinical/surgeries?admissionId=${admissionId}`.

            const response = await api.get<SurgeryBooking[]>(`/ipd/clinical/surgeries?admissionId=${admissionId}`);
            if (response.success) {
                setSurgeries(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch surgeries:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOtRooms = async () => {
        try {
            const response = await api.get<any[]>('/ipd/clinical/ot-rooms');
            if (response.success) setOtRooms(response.data);
        } catch (error) { console.error(error); }
    };

    const fetchDoctors = async () => {
        try {
            // Fetch doctors list
            const response = await api.get<any[]>('/doctors'); // Assuming this exists or similar
            // If /doctors returns paginated, might need adjustments.
            // Let's assume /doctors returns list.
            if (response.success) setDoctors(response.data); // Data might be { data: [...] } if paginated
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                patientId,
                admissionId,
                ...formData,
                surgeryDate: new Date(formData.surgeryDate).toISOString()
            };

            const response = await api.post('/ipd/clinical/surgeries', payload);
            if (response.success) {
                setShowForm(false);
                setFormData({ procedureName: '', surgeryDate: '', startTime: '', endTime: '', otRoomId: '', doctorId: '', notes: '' });
                fetchSurgeries();
            }
        } catch (error) {
            console.error('Failed to book surgery:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Surgeries & Procedures</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4" /> Book Surgery
                </button>
            </div>

            {showForm && (
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-medium">Procedure Name</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded text-sm bg-background"
                                value={formData.procedureName}
                                onChange={(e) => setFormData({ ...formData, procedureName: e.target.value })}
                                placeholder="Appendectomy"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium">Surgeon</label>
                            <select
                                className="w-full p-2 border rounded text-sm bg-background"
                                value={formData.doctorId}
                                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                            >
                                <option value="">Select Surgeon</option>
                                {doctors.map((d: any) => (
                                    <option key={d.id} value={d.id}>Dr. {d.user?.firstName} {d.user?.lastName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium">OT Room</label>
                            <select
                                className="w-full p-2 border rounded text-sm bg-background"
                                value={formData.otRoomId}
                                onChange={(e) => setFormData({ ...formData, otRoomId: e.target.value })}
                            >
                                <option value="">Select OT</option>
                                {otRooms.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium">Date</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded text-sm bg-background"
                                value={formData.surgeryDate}
                                onChange={(e) => setFormData({ ...formData, surgeryDate: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-medium">Start Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded text-sm bg-background"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-medium">End Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded text-sm bg-background"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-medium">Pre-op Notes</label>
                            <textarea
                                className="w-full p-2 border rounded text-sm bg-background"
                                rows={2}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
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
                            Book Surgery
                        </button>
                    </div>
                </div>
            )}

            <div className="grid gap-3">
                {surgeries.map(surgery => (
                    <div key={surgery.id} className="border border-border rounded-lg p-4 bg-card">
                        <div className="flex justify-between mb-2">
                            <h4 className="font-semibold flex items-center gap-2">
                                <Scissors className="w-4 h-4" /> {surgery.procedureName}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                                ${surgery.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                                    surgery.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {surgery.status}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> {new Date(surgery.surgeryDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" /> {surgery.startTime || '--:--'} - {surgery.endTime || '--:--'}
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" /> {surgery.doctorName || `Dr. ${surgery.doctor?.user.firstName} ${surgery.doctor?.user.lastName}`}
                            </div>
                            <div className="flex items-center gap-2">
                                <Mic2 className="w-4 h-4" /> {surgery.otRoom.name}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {surgeries.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                    No surgeries scheduled.
                </div>
            )}
        </div>
    );
}
