// ============================================================================
// HMS Frontend - IPD Patient Page
// View admitted patient details, nursing notes, doctor rounds
// ============================================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
    ArrowLeft,
    BedDouble,
    User,
    Stethoscope,
    ClipboardList,
    ArrowRightLeft,
    LogOut,
    Plus,
    Clock,
    Heart,
    Thermometer,
    Activity,
    Loader2,
} from 'lucide-react';

interface AdmissionDetail {
    id: string;
    admissionNo: string;
    admissionDate: string;
    admissionType: string;
    admissionReason: string;
    chiefComplaint: string;
    provisionalDiagnosis: string;
    status: string;
    expectedStayDays: number;
    expectedDischarge: string;
    dischargeDate: string;
    dischargeSummary: string;
    dischargeAdvice: string;
    dischargeType: string;
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
    admittingDoctor: {
        id: string;
        user: { firstName: string; lastName: string };
        department: { name: string };
    };
    attendingDoctor?: {
        id: string;
        user: { firstName: string; lastName: string };
    };
    bed: {
        id: string;
        bedNumber: string;
        bedType: string;
        ward: {
            id: string;
            name: string;
            type: string;
        };
    };
    nursingNotes: Array<{
        id: string;
        noteType: string;
        shift: string;
        content: string;
        temperature: number;
        bpSystolic: number;
        bpDiastolic: number;
        pulseRate: number;
        respiratoryRate: number;
        spO2: number;
        recordedAt: string;
        recordedByName: string;
    }>;
    doctorRounds: Array<{
        id: string;
        roundType: string;
        roundDate: string;
        clinicalNotes: string;
        assessment: string;
        plan: string;
        orders: string;
        reviewStatus: string;
        doctor: {
            user: { firstName: string; lastName: string };
        };
    }>;
    bedTransfers: Array<{
        id: string;
        transferDate: string;
        reason: string;
        fromBed: { bedNumber: string; ward: { name: string } };
        toBed: { bedNumber: string; ward: { name: string } };
    }>;
}

export default function IpdPatientPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [admission, setAdmission] = useState<AdmissionDetail | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'nursing' | 'rounds' | 'transfers'>('overview');

    // Nursing note form
    const [showNursingForm, setShowNursingForm] = useState(false);
    const [nursingNote, setNursingNote] = useState({
        noteType: 'ROUTINE',
        shift: '',
        content: '',
        temperature: '',
        bpSystolic: '',
        bpDiastolic: '',
        pulseRate: '',
        spO2: '',
    });
    const [savingNote, setSavingNote] = useState(false);

    useEffect(() => {
        if (id) fetchAdmission();
    }, [id]);

    const fetchAdmission = async () => {
        try {
            const response = await api.get<AdmissionDetail>(`/ipd/admissions/${id}`);
            if (response.success) {
                setAdmission(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch admission:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNursingNote = async () => {
        if (!nursingNote.content || !id) return;
        setSavingNote(true);
        try {
            const response = await api.post('/ipd/nursing-note', {
                admissionId: id,
                noteType: nursingNote.noteType,
                shift: nursingNote.shift || undefined,
                content: nursingNote.content,
                temperature: nursingNote.temperature ? parseFloat(nursingNote.temperature) : undefined,
                bpSystolic: nursingNote.bpSystolic ? parseInt(nursingNote.bpSystolic) : undefined,
                bpDiastolic: nursingNote.bpDiastolic ? parseInt(nursingNote.bpDiastolic) : undefined,
                pulseRate: nursingNote.pulseRate ? parseInt(nursingNote.pulseRate) : undefined,
                spO2: nursingNote.spO2 ? parseInt(nursingNote.spO2) : undefined,
            });
            if (response.success) {
                setShowNursingForm(false);
                setNursingNote({ noteType: 'ROUTINE', shift: '', content: '', temperature: '', bpSystolic: '', bpDiastolic: '', pulseRate: '', spO2: '' });
                fetchAdmission();
            }
        } catch (error) {
            console.error('Failed to add nursing note:', error);
        } finally {
            setSavingNote(false);
        }
    };

    const getPatientAge = () => {
        if (!admission?.patient.dateOfBirth) return '';
        const dob = new Date(admission.patient.dateOfBirth);
        return `${Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))}Y`;
    };

    const getDaysSinceAdmission = () => {
        if (!admission?.admissionDate) return 0;
        return Math.ceil((Date.now() - new Date(admission.admissionDate).getTime()) / (24 * 60 * 60 * 1000));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!admission) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Admission not found</p>
                <button onClick={() => navigate('/ipd')} className="mt-4 text-primary hover:underline">
                    Back to IPD
                </button>
            </div>
        );
    }

    const tabs = [
        { key: 'overview', label: 'Overview', icon: User },
        { key: 'nursing', label: 'Nursing Notes', icon: ClipboardList, count: (admission.nursingNotes || []).length },
        { key: 'rounds', label: 'Doctor Rounds', icon: Stethoscope, count: (admission.doctorRounds || []).length },
        { key: 'transfers', label: 'Transfers', icon: ArrowRightLeft, count: (admission.bedTransfers || []).length },
    ] as const;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/ipd')} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {admission.patient.firstName} {admission.patient.lastName}
                        </h1>
                        <p className="text-muted-foreground">
                            {admission.patient.uhid} • {getPatientAge()} • {admission.patient.gender}
                            {admission.patient.bloodGroup && ` • ${admission.patient.bloodGroup}`}
                        </p>
                    </div>
                </div>
                {admission.status === 'ADMITTED' && (
                    <button
                        onClick={() => navigate(`/ipd/discharge/${admission.id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Discharge
                    </button>
                )}
            </div>

            {/* Admission Info Banner */}
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Admission No</p>
                        <p className="font-medium">{admission.admissionNo}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Ward / Bed</p>
                        <p className="font-medium flex items-center gap-1">
                            <BedDouble className="w-4 h-4" />
                            {admission.bed.ward.name} - {admission.bed.bedNumber}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Admitting Doctor</p>
                        <p className="font-medium">
                            Dr. {admission.admittingDoctor.user.firstName} {admission.admittingDoctor.user.lastName}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Days Admitted</p>
                        <p className="font-medium">{getDaysSinceAdmission()} days</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <span className={`inline-flex px-2 py-0.5 text-sm rounded-full ${admission.status === 'ADMITTED' ? 'bg-green-100 text-green-800' :
                            admission.status === 'DISCHARGED' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                            {admission.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex border-b border-border overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {'count' in tab && tab.count > 0 && (
                                <span className="bg-muted px-1.5 py-0.5 text-xs rounded-full">{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-4">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold">Admission Details</h3>
                                <dl className="space-y-2">
                                    <div>
                                        <dt className="text-sm text-muted-foreground">Type</dt>
                                        <dd>{admission.admissionType}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-muted-foreground">Reason</dt>
                                        <dd>{admission.admissionReason}</dd>
                                    </div>
                                    {admission.chiefComplaint && (
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Chief Complaint</dt>
                                            <dd>{admission.chiefComplaint}</dd>
                                        </div>
                                    )}
                                    {admission.provisionalDiagnosis && (
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Provisional Diagnosis</dt>
                                            <dd>{admission.provisionalDiagnosis}</dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-sm text-muted-foreground">Admission Date</dt>
                                        <dd>{new Date(admission.admissionDate).toLocaleString()}</dd>
                                    </div>
                                </dl>
                            </div>
                            {admission.status === 'DISCHARGED' && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold">Discharge Details</h3>
                                    <dl className="space-y-2">
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Discharge Type</dt>
                                            <dd>{admission.dischargeType}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-muted-foreground">Discharge Date</dt>
                                            <dd>{new Date(admission.dischargeDate).toLocaleString()}</dd>
                                        </div>
                                        {admission.dischargeSummary && (
                                            <div>
                                                <dt className="text-sm text-muted-foreground">Summary</dt>
                                                <dd className="whitespace-pre-wrap">{admission.dischargeSummary}</dd>
                                            </div>
                                        )}
                                        {admission.dischargeAdvice && (
                                            <div>
                                                <dt className="text-sm text-muted-foreground">Discharge Advice</dt>
                                                <dd className="whitespace-pre-wrap">{admission.dischargeAdvice}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Nursing Notes Tab */}
                    {activeTab === 'nursing' && (
                        <div className="space-y-4">
                            {admission.status === 'ADMITTED' && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setShowNursingForm(!showNursingForm)}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Note
                                    </button>
                                </div>
                            )}

                            {showNursingForm && (
                                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <select
                                            value={nursingNote.noteType}
                                            onChange={(e) => setNursingNote({ ...nursingNote, noteType: e.target.value })}
                                            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
                                        >
                                            <option value="ROUTINE">Routine</option>
                                            <option value="VITALS">Vitals</option>
                                            <option value="MEDICATION">Medication</option>
                                            <option value="OBSERVATION">Observation</option>
                                            <option value="PROCEDURE">Procedure</option>
                                            <option value="HANDOVER">Handover</option>
                                        </select>
                                        <select
                                            value={nursingNote.shift}
                                            onChange={(e) => setNursingNote({ ...nursingNote, shift: e.target.value })}
                                            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
                                        >
                                            <option value="">Select Shift</option>
                                            <option value="Morning">Morning</option>
                                            <option value="Evening">Evening</option>
                                            <option value="Night">Night</option>
                                        </select>
                                    </div>

                                    {nursingNote.noteType === 'VITALS' && (
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            <div>
                                                <label className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Thermometer className="w-3 h-3" /> Temp (°F)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={nursingNote.temperature}
                                                    onChange={(e) => setNursingNote({ ...nursingNote, temperature: e.target.value })}
                                                    className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
                                                    placeholder="98.6"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Heart className="w-3 h-3" /> BP (sys/dia)
                                                </label>
                                                <div className="flex gap-1">
                                                    <input
                                                        type="number"
                                                        value={nursingNote.bpSystolic}
                                                        onChange={(e) => setNursingNote({ ...nursingNote, bpSystolic: e.target.value })}
                                                        className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
                                                        placeholder="120"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={nursingNote.bpDiastolic}
                                                        onChange={(e) => setNursingNote({ ...nursingNote, bpDiastolic: e.target.value })}
                                                        className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
                                                        placeholder="80"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Activity className="w-3 h-3" /> Pulse
                                                </label>
                                                <input
                                                    type="number"
                                                    value={nursingNote.pulseRate}
                                                    onChange={(e) => setNursingNote({ ...nursingNote, pulseRate: e.target.value })}
                                                    className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
                                                    placeholder="72"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground">SpO2 (%)</label>
                                                <input
                                                    type="number"
                                                    value={nursingNote.spO2}
                                                    onChange={(e) => setNursingNote({ ...nursingNote, spO2: e.target.value })}
                                                    className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
                                                    placeholder="98"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <textarea
                                        value={nursingNote.content}
                                        onChange={(e) => setNursingNote({ ...nursingNote, content: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none"
                                        rows={3}
                                        placeholder="Note content..."
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setShowNursingForm(false)}
                                            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddNursingNote}
                                            disabled={savingNote || !nursingNote.content}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg disabled:opacity-50"
                                        >
                                            {savingNote && <Loader2 className="w-3 h-3 animate-spin" />}
                                            Save Note
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(admission.nursingNotes || []).length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No nursing notes recorded</p>
                            ) : (
                                <div className="space-y-3">
                                    {(admission.nursingNotes || []).map((note) => (
                                        <div key={note.id} className="border border-border rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-muted text-xs rounded-full">{note.noteType}</span>
                                                    {note.shift && <span className="text-xs text-muted-foreground">{note.shift} Shift</span>}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(note.recordedAt).toLocaleString()}
                                                    {note.recordedByName && ` • ${note.recordedByName}`}
                                                </div>
                                            </div>
                                            <p className="text-sm">{note.content}</p>
                                            {(note.temperature || note.bpSystolic || note.pulseRate || note.spO2) && (
                                                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                                    {note.temperature && <span>🌡️ {note.temperature}°F</span>}
                                                    {note.bpSystolic && <span>💓 {note.bpSystolic}/{note.bpDiastolic}</span>}
                                                    {note.pulseRate && <span>❤️ {note.pulseRate} bpm</span>}
                                                    {note.spO2 && <span>🫁 {note.spO2}%</span>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Doctor Rounds Tab */}
                    {activeTab === 'rounds' && (
                        <div className="space-y-3">
                            {(admission.doctorRounds || []).length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No doctor rounds recorded</p>
                            ) : (
                                (admission.doctorRounds || []).map((round) => (
                                    <div key={round.id} className="border border-border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Stethoscope className="w-4 h-4 text-primary" />
                                                <span className="font-medium">
                                                    Dr. {round.doctor.user.firstName} {round.doctor.user.lastName}
                                                </span>
                                                <span className="px-2 py-0.5 bg-muted text-xs rounded-full">{round.roundType}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(round.roundDate).toLocaleString()}
                                            </span>
                                        </div>
                                        {round.reviewStatus && (
                                            <span className={`inline-flex px-2 py-0.5 text-xs rounded-full mb-2 ${round.reviewStatus === 'Critical' ? 'bg-red-100 text-red-800' :
                                                round.reviewStatus === 'Improving' ? 'bg-green-100 text-green-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                {round.reviewStatus}
                                            </span>
                                        )}
                                        {round.clinicalNotes && (
                                            <div className="mt-2">
                                                <p className="text-xs text-muted-foreground">Clinical Notes</p>
                                                <p className="text-sm">{round.clinicalNotes}</p>
                                            </div>
                                        )}
                                        {round.assessment && (
                                            <div className="mt-2">
                                                <p className="text-xs text-muted-foreground">Assessment</p>
                                                <p className="text-sm">{round.assessment}</p>
                                            </div>
                                        )}
                                        {round.plan && (
                                            <div className="mt-2">
                                                <p className="text-xs text-muted-foreground">Plan</p>
                                                <p className="text-sm">{round.plan}</p>
                                            </div>
                                        )}
                                        {round.orders && (
                                            <div className="mt-2">
                                                <p className="text-xs text-muted-foreground">Orders</p>
                                                <p className="text-sm">{round.orders}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Transfers Tab */}
                    {activeTab === 'transfers' && (
                        <div className="space-y-3">
                            {(admission.bedTransfers || []).length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No bed transfers recorded</p>
                            ) : (
                                (admission.bedTransfers || []).map((transfer) => (
                                    <div key={transfer.id} className="flex items-center gap-4 border border-border rounded-lg p-3">
                                        <div className="text-sm">
                                            <span className="font-medium">{transfer.fromBed.ward.name} - {transfer.fromBed.bedNumber}</span>
                                        </div>
                                        <ArrowRightLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <div className="text-sm">
                                            <span className="font-medium">{transfer.toBed.ward.name} - {transfer.toBed.bedNumber}</span>
                                        </div>
                                        <div className="ml-auto text-xs text-muted-foreground">
                                            {new Date(transfer.transferDate).toLocaleString()}
                                            {transfer.reason && ` • ${transfer.reason}`}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
