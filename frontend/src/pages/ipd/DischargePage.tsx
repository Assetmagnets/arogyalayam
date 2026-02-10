// ============================================================================
// HMS Frontend - Discharge Patient Page
// Form to discharge an admitted patient
// ============================================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
    ArrowLeft,
    LogOut,
    Loader2,
    AlertTriangle,
} from 'lucide-react';

interface AdmissionSummary {
    id: string;
    admissionNo: string;
    admissionDate: string;
    admissionReason: string;
    patient: {
        uhid: string;
        firstName: string;
        lastName: string;
        gender: string;
    };
    bed: {
        bedNumber: string;
        ward: { name: string };
    };
    admittingDoctor: {
        user: { firstName: string; lastName: string };
    };
}

export default function DischargePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [admission, setAdmission] = useState<AdmissionSummary | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [dischargeType, setDischargeType] = useState('NORMAL');
    const [dischargeSummary, setDischargeSummary] = useState('');
    const [dischargeAdvice, setDischargeAdvice] = useState('');
    const [followUpDays, setFollowUpDays] = useState('');

    useEffect(() => {
        if (id) fetchAdmission();
    }, [id]);

    const fetchAdmission = async () => {
        try {
            const response = await api.get<AdmissionSummary>(`/ipd/admissions/${id}`);
            if (response.success) {
                setAdmission(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch admission:', err);
        } finally {
            setLoading(false);
        }
    };

    const getDaysSinceAdmission = () => {
        if (!admission?.admissionDate) return 0;
        return Math.ceil((Date.now() - new Date(admission.admissionDate).getTime()) / (24 * 60 * 60 * 1000));
    };

    const handleDischarge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !dischargeSummary) {
            setError('Discharge summary is required');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const followUpDate = followUpDays
                ? new Date(Date.now() + parseInt(followUpDays) * 24 * 60 * 60 * 1000).toISOString()
                : undefined;

            const response = await api.post(`/ipd/discharge/${id}`, {
                dischargeType,
                dischargeSummary,
                dischargeAdvice: dischargeAdvice || undefined,
                followUpDate,
            });

            if (response.success) {
                navigate('/ipd');
            } else {
                setError(response.error?.message || 'Failed to discharge patient');
            }
        } catch (err) {
            setError('Failed to discharge patient');
        } finally {
            setSubmitting(false);
        }
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

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(`/ipd/patient/${id}`)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <LogOut className="w-7 h-7 text-yellow-600" />
                        Discharge Patient
                    </h1>
                    <p className="text-muted-foreground mt-1">Complete discharge process</p>
                </div>
            </div>

            {/* Patient Summary */}
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Patient</p>
                        <p className="font-medium">{admission.patient.firstName} {admission.patient.lastName}</p>
                        <p className="text-xs text-muted-foreground">{admission.patient.uhid}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Admission No</p>
                        <p className="font-medium">{admission.admissionNo}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Ward / Bed</p>
                        <p className="font-medium">{admission.bed.ward.name} - {admission.bed.bedNumber}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Stay Duration</p>
                        <p className="font-medium">{getDaysSinceAdmission()} days</p>
                    </div>
                </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                    <p className="font-medium text-yellow-800">Are you sure you want to discharge this patient?</p>
                    <p className="text-sm text-yellow-700 mt-1">
                        This action will mark the patient as discharged and free the bed. Ensure all pending items are settled.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <form onSubmit={handleDischarge} className="space-y-6">
                <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Discharge Type *</label>
                        <select
                            value={dischargeType}
                            onChange={(e) => setDischargeType(e.target.value)}
                            className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
                        >
                            <option value="NORMAL">Normal Discharge</option>
                            <option value="REFERRAL">Referral to Another Hospital</option>
                            <option value="LAMA">LAMA (Left Against Medical Advice)</option>
                            <option value="ABSCONDED">Absconded</option>
                            <option value="EXPIRED">Expired</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Discharge Summary *</label>
                        <textarea
                            value={dischargeSummary}
                            onChange={(e) => setDischargeSummary(e.target.value)}
                            className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary resize-none"
                            rows={5}
                            required
                            placeholder="Comprehensive discharge summary including diagnosis, treatment given, condition at discharge..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Discharge Advice / Instructions</label>
                        <textarea
                            value={dischargeAdvice}
                            onChange={(e) => setDischargeAdvice(e.target.value)}
                            className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary resize-none"
                            rows={3}
                            placeholder="Medications, dietary restrictions, follow-up instructions..."
                        />
                    </div>

                    <div className="max-w-xs">
                        <label className="block text-sm font-medium mb-1">Follow-up After (days)</label>
                        <input
                            type="number"
                            value={followUpDays}
                            onChange={(e) => setFollowUpDays(e.target.value)}
                            className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
                            min="1"
                            placeholder="e.g., 7"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(`/ipd/patient/${id}`)}
                        className="px-6 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !dischargeSummary}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm Discharge
                    </button>
                </div>
            </form>
        </div>
    );
}
