// ============================================================================
// HMS Frontend - Doctor Consultation Page (Admin Link)
// Admin/Staff view to perform consultation on behalf of a doctor
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
    Stethoscope,
    Play,
    CheckCircle2,
    SkipForward,
    Clock,
    User,
    FileText,
    Phone,
    RefreshCw,
    LogIn,
    BedDouble
} from 'lucide-react';

interface QueueItem {
    id: string;
    tokenNumber: string;
    status: string;
    position: number;
    checkInTime: string;
    estimatedWait: number;
    patient: {
        id: string;
        uhid: string;
        firstName: string;
        lastName: string;
        gender: string;
        dateOfBirth: string;
        mobilePrimary: string;
        bloodGroup: string;
    };
    appointment: {
        id: string;
        consultationType: string;
        chiefComplaint: string;
        appointmentDate: string;
    };
    patientAge: number;
}

interface DoctorInfo {
    id: string;
    user: { firstName: string; lastName: string };
    department: { name: string };
}

export default function DoctorConsultationPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Doctor Selection
    const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState<DoctorInfo | null>(null);

    // Queue & Patient
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [currentPatient, setCurrentPatient] = useState<QueueItem | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Consultation notes
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [prescription, setPrescription] = useState('');
    const [advice, setAdvice] = useState('');

    // Vitals state
    const [vitals, setVitals] = useState({
        bpSystolic: '',
        bpDiastolic: '',
        pulseRate: '',
        temperatureF: '',
        spO2: '',
        weightKg: '',
        heightCm: '',
    });

    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            const response = await api.get<DoctorInfo[]>('/doctors');
            if (response.success) {
                setDoctors(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch doctors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQueue = useCallback(async () => {
        if (!selectedDoctorId) return;
        try {
            const queueRes = await api.get<{ queue: QueueItem[] }>(`/opd/queue/${selectedDoctorId}`);
            if (queueRes.success) {
                setQueue(queueRes.data.queue);
                setCurrentPatient(
                    queueRes.data.queue.find((q) => q.status === 'IN_CONSULTATION') || null
                );
            }
        } catch (error) {
            console.error('Failed to fetch queue:', error);
        }
    }, [selectedDoctorId]);

    useEffect(() => {
        if (selectedDoctorId) {
            const doc = doctors.find(d => d.id === selectedDoctorId);
            setSelectedDoctor(doc || null);
            fetchQueue();
        } else {
            setQueue([]);
            setCurrentPatient(null);
            setSelectedDoctor(null);
        }
    }, [selectedDoctorId, doctors, fetchQueue]);

    // Auto-refresh every 30 seconds if doctor selected
    useEffect(() => {
        if (!selectedDoctorId) return;
        const interval = setInterval(fetchQueue, 30000);
        return () => clearInterval(interval);
    }, [selectedDoctorId, fetchQueue]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchQueue();
        setRefreshing(false);
    };

    const handleCallNext = async () => {
        if (!selectedDoctorId) return;
        try {
            await api.post(`/opd/call-next/${selectedDoctorId}`, {});
            await fetchQueue();
        } catch (error) {
            console.error('Failed to call next:', error);
        }
    };

    const handleComplete = async () => {
        if (!currentPatient) return;
        setCompleting(true);
        try {
            await api.post(`/opd/complete/${currentPatient.id}`, {
                clinicalNotes: clinicalNotes || undefined,
                diagnosis: diagnosis || undefined,
                prescription: prescription || undefined,
                advice: advice || undefined,
                vitals: {
                    bpSystolic: vitals.bpSystolic ? parseInt(vitals.bpSystolic) : undefined,
                    bpDiastolic: vitals.bpDiastolic ? parseInt(vitals.bpDiastolic) : undefined,
                    pulseRate: vitals.pulseRate ? parseInt(vitals.pulseRate) : undefined,
                    temperatureF: vitals.temperatureF ? parseFloat(vitals.temperatureF) : undefined,
                    spO2: vitals.spO2 ? parseInt(vitals.spO2) : undefined,
                    weightKg: vitals.weightKg ? parseFloat(vitals.weightKg) : undefined,
                    heightCm: vitals.heightCm ? parseFloat(vitals.heightCm) : undefined,
                }
            });
            setClinicalNotes('');
            setDiagnosis('');
            setPrescription('');
            setAdvice('');
            setVitals({
                bpSystolic: '',
                bpDiastolic: '',
                pulseRate: '',
                temperatureF: '',
                spO2: '',
                weightKg: '',
                heightCm: '',
            });
            await fetchQueue();
        } catch (error) {
            console.error('Failed to complete consultation:', error);
        } finally {
            setCompleting(false);
        }
    };

    const handleSkip = async (queueId: string) => {
        try {
            await api.post(`/opd/skip/${queueId}`, { reason: 'Skipped by admin/doctor' });
            await fetchQueue();
        } catch (error) {
            console.error('Failed to skip:', error);
        }
    };

    const handleAdmit = () => {
        if (!currentPatient) return;
        // Redirect to Admit Page with patientId and appointmentId
        navigate(`/ipd/admit?patientId=${currentPatient.patient.id}&appointmentId=${currentPatient.appointment.id}`);
    };

    const waitingQueue = (queue || []).filter((q) => q.status === 'WAITING');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Stethoscope className="w-7 h-7 text-primary" />
                        Doctor Consultation
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Admin/Staff view to manage OPD queue and consultation
                    </p>
                </div>

                <div className="w-full md:w-72">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Select Doctor</label>
                    <select
                        className="w-full p-2 border border-border rounded-lg bg-background"
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                    >
                        <option value="">-- Start Consultation For --</option>
                        {doctors.map(doc => (
                            <option key={doc.id} value={doc.id}>
                                Dr. {doc.user.firstName} {doc.user.lastName} ({doc.department.name})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedDoctorId ? (
                <div className="bg-muted/30 border border-dashed border-border rounded-xl p-12 text-center">
                    <LogIn className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Select a Doctor</h3>
                    <p className="text-muted-foreground">Please select a doctor to load their queue and workstation.</p>
                </div>
            ) : (
                <>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh Queue
                        </button>
                        {!currentPatient && waitingQueue.length > 0 && (
                            <button
                                onClick={handleCallNext}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Play className="w-4 h-4" />
                                Call Next
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Current Patient / Consultation */}
                        <div className="lg:col-span-2 space-y-4">
                            {currentPatient ? (
                                <>
                                    {/* Current Patient Info */}
                                    <div className="bg-card rounded-xl border-2 border-primary p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="font-semibold text-primary flex items-center gap-2">
                                                <User className="w-5 h-5" />
                                                Current Patient
                                            </h2>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleAdmit}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors"
                                                    title="Convert to IPD Admission"
                                                >
                                                    <BedDouble className="w-4 h-4" /> Admit
                                                </button>
                                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                                                    Token: {currentPatient.tokenNumber}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Name</p>
                                                <p className="font-medium">
                                                    {currentPatient.patient.firstName} {currentPatient.patient.lastName}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">UHID</p>
                                                <p className="font-medium">{currentPatient.patient.uhid}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Age / Gender</p>
                                                <p className="font-medium">{currentPatient.patientAge}Y / {currentPatient.patient.gender}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Chief Complaint</p>
                                                <p className="font-medium">{currentPatient.appointment.chiefComplaint || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                                            <Phone className="w-3 h-3" />
                                            {currentPatient.patient.mobilePrimary}
                                            {currentPatient.patient.bloodGroup && (
                                                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">
                                                    {currentPatient.patient.bloodGroup}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Consultation Notes */}
                                    <div className="bg-card rounded-xl border border-border p-4 space-y-4">
                                        <h3 className="font-semibold flex items-center gap-2 mb-3">
                                            <Stethoscope className="w-5 h-5" />
                                            Vitals
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">BP (Sys)</label>
                                                <input
                                                    type="number"
                                                    value={vitals.bpSystolic}
                                                    onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })}
                                                    placeholder="120"
                                                    className="w-full px-2 py-1.5 border border-border rounded bg-background text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">BP (Dia)</label>
                                                <input
                                                    type="number"
                                                    value={vitals.bpDiastolic}
                                                    onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })}
                                                    placeholder="80"
                                                    className="w-full px-2 py-1.5 border border-border rounded bg-background text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Pulse</label>
                                                <input
                                                    type="number"
                                                    value={vitals.pulseRate}
                                                    onChange={(e) => setVitals({ ...vitals, pulseRate: e.target.value })}
                                                    placeholder="72"
                                                    className="w-full px-2 py-1.5 border border-border rounded bg-background text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Temp (°F)</label>
                                                <input
                                                    type="number"
                                                    value={vitals.temperatureF}
                                                    onChange={(e) => setVitals({ ...vitals, temperatureF: e.target.value })}
                                                    placeholder="98.6"
                                                    step="0.1"
                                                    className="w-full px-2 py-1.5 border border-border rounded bg-background text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">SpO2 (%)</label>
                                                <input
                                                    type="number"
                                                    value={vitals.spO2}
                                                    onChange={(e) => setVitals({ ...vitals, spO2: e.target.value })}
                                                    placeholder="98"
                                                    className="w-full px-2 py-1.5 border border-border rounded bg-background text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Weight (kg)</label>
                                                <input
                                                    type="number"
                                                    value={vitals.weightKg}
                                                    onChange={(e) => setVitals({ ...vitals, weightKg: e.target.value })}
                                                    placeholder="70"
                                                    step="0.1"
                                                    className="w-full px-2 py-1.5 border border-border rounded bg-background text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Height (cm)</label>
                                                <input
                                                    type="number"
                                                    value={vitals.heightCm}
                                                    onChange={(e) => setVitals({ ...vitals, heightCm: e.target.value })}
                                                    placeholder="170"
                                                    className="w-full px-2 py-1.5 border border-border rounded bg-background text-sm"
                                                />
                                            </div>
                                        </div>

                                        <h3 className="font-semibold flex items-center gap-2">
                                            <FileText className="w-5 h-5" />
                                            Consultation Notes
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Clinical Notes</label>
                                                <textarea
                                                    value={clinicalNotes}
                                                    onChange={(e) => setClinicalNotes(e.target.value)}
                                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none"
                                                    rows={3}
                                                    placeholder="History, examination findings..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Diagnosis</label>
                                                <textarea
                                                    value={diagnosis}
                                                    onChange={(e) => setDiagnosis(e.target.value)}
                                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none"
                                                    rows={3}
                                                    placeholder="Final diagnosis..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Prescription</label>
                                                <textarea
                                                    value={prescription}
                                                    onChange={(e) => setPrescription(e.target.value)}
                                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none"
                                                    rows={3}
                                                    placeholder="Medications..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Advice</label>
                                                <textarea
                                                    value={advice}
                                                    onChange={(e) => setAdvice(e.target.value)}
                                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none"
                                                    rows={3}
                                                    placeholder="Follow-up instructions..."
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleComplete}
                                                disabled={completing}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                            >
                                                {completing ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                )}
                                                Complete Consultation
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-card rounded-xl border border-border p-12 text-center">
                                    <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-lg text-muted-foreground">No patient in consultation</p>
                                    {waitingQueue.length > 0 ? (
                                        <button
                                            onClick={handleCallNext}
                                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                                        >
                                            <Play className="w-4 h-4" />
                                            Call Next Patient ({waitingQueue.length} waiting)
                                        </button>
                                    ) : (
                                        <p className="text-sm text-muted-foreground mt-2">No patients waiting</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Waiting Queue */}
                        <div className="space-y-4">
                            <div className="bg-card rounded-xl border border-border">
                                <div className="p-4 border-b border-border">
                                    <h2 className="font-semibold flex items-center gap-2">
                                        <Clock className="w-5 h-5" />
                                        Waiting Queue
                                        <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs rounded-full">
                                            {waitingQueue.length}
                                        </span>
                                    </h2>
                                </div>
                                {waitingQueue.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                                        <p>All clear!</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border max-h-96 overflow-y-auto">
                                        {(waitingQueue || []).map((item) => (
                                            <div key={item.id} className="p-3 hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                                            {item.tokenNumber}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {item.patient.firstName} {item.patient.lastName}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {item.patientAge}Y • {item.patient.gender}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleSkip(item.id)}
                                                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                                                        title="Skip patient"
                                                    >
                                                        <SkipForward className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {item.appointment.chiefComplaint && (
                                                    <p className="text-xs text-muted-foreground mt-1 ml-11 line-clamp-1">
                                                        {item.appointment.chiefComplaint}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
