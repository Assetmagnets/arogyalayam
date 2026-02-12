// ============================================================================
// HMS Frontend - Admit Patient Page
// Form to admit a patient to a ward/bed
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import {
    BedDouble,
    ArrowLeft,
    Search,
    UserPlus,
    Loader2,
} from 'lucide-react';

interface PatientResult {
    id: string;
    uhid: string;
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string;
    mobilePrimary: string;
}

interface DoctorResult {
    id: string;
    user: { firstName: string; lastName: string };
    department: { name: string };
    specialization: string;
}

interface Ward {
    id: string;
    name: string;
    code: string;
    type: string;
    dailyRate: number;
}

interface Bed {
    id: string;
    bedNumber: string;
    bedType: string;
    status: string;
    dailyRate: number | null;
    ward: { id: string; name: string; code: string; type: string };
}

export default function AdmitPatientPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryPatientId = searchParams.get('patientId');
    const queryAppointmentId = searchParams.get('appointmentId');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Patient search
    const [patientSearch, setPatientSearch] = useState('');
    const [patients, setPatients] = useState<PatientResult[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
    const [searchingPatients, setSearchingPatients] = useState(false);

    // Doctor list
    const [doctors, setDoctors] = useState<DoctorResult[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');

    // Ward & Bed
    const [wards, setWards] = useState<Ward[]>([]);
    const [selectedWardId, setSelectedWardId] = useState('');
    const [beds, setBeds] = useState<Bed[]>([]);
    const [selectedBedId, setSelectedBedId] = useState('');

    // Admission details
    const [admissionType, setAdmissionType] = useState('ELECTIVE');
    const [admissionReason, setAdmissionReason] = useState('');
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
    const [expectedStayDays, setExpectedStayDays] = useState('');

    useEffect(() => {
        fetchDoctors();
        fetchWards();
        if (queryPatientId) {
            fetchPatientDetails(queryPatientId);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (selectedWardId) {
            fetchBeds(selectedWardId);
        } else {
            setBeds([]);
            setSelectedBedId('');
        }
    }, [selectedWardId]);

    const fetchPatientDetails = async (id: string) => {
        try {
            const response = await api.get<PatientResult>(`/patients/${id}`);
            if (response.success) {
                setSelectedPatient(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch patient details:', error);
        }
    };

    const fetchDoctors = async () => {
        try {
            const response = await api.get<DoctorResult[]>('/doctors');
            if (response.success) {
                setDoctors(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch doctors:', err);
        }
    };

    const fetchWards = async () => {
        try {
            const response = await api.get<Ward[]>('/ipd/wards');
            if (response.success) {
                setWards(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch wards:', err);
        }
    };

    const fetchBeds = async (wardId: string) => {
        try {
            const response = await api.get<Bed[]>('/ipd/beds', { params: { wardId, status: 'AVAILABLE' } });
            if (response.success) {
                setBeds(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch beds:', err);
        }
    };

    const searchPatients = async (query: string) => {
        if (query.length < 2) {
            setPatients([]);
            return;
        }
        setSearchingPatients(true);
        try {
            const response = await api.get<PatientResult[]>('/patients', { params: { search: query } });
            if (response.success) {
                setPatients(response.data);
            }
        } catch (err) {
            console.error('Failed to search patients:', err);
        } finally {
            setSearchingPatients(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (patientSearch) searchPatients(patientSearch);
        }, 300);
        return () => clearTimeout(debounce);
    }, [patientSearch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient || !selectedDoctorId || !selectedBedId || !admissionReason) {
            setError('Please fill all required fields');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const payload: any = {
                patientId: selectedPatient.id,
                admittingDoctorId: selectedDoctorId,
                bedId: selectedBedId,
                admissionType,
                admissionReason,
                chiefComplaint: chiefComplaint || undefined,
                provisionalDiagnosis: provisionalDiagnosis || undefined,
                expectedStayDays: expectedStayDays ? parseInt(expectedStayDays) : undefined,
            };

            if (queryAppointmentId) {
                payload.appointmentId = queryAppointmentId;
            }

            const response = await api.post<{ id: string }>('/ipd/admit', payload);

            if (response.success) {
                navigate(`/ipd/patient/${response.data.id}`); // Redirect to patient details
            } else {
                setError(response.error?.message || 'Failed to admit patient');
            }
        } catch (err) {
            setError('Failed to admit patient');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/ipd')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <UserPlus className="w-7 h-7 text-primary" />
                        New Admission
                    </h1>
                    <p className="text-muted-foreground mt-1">Admit a patient to the hospital</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Selection */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="text-lg font-semibold mb-4">Patient</h2>

                    {selectedPatient ? (
                        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-4">
                            <div>
                                <p className="font-medium text-foreground">
                                    {selectedPatient.firstName} {selectedPatient.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {selectedPatient.uhid} • {selectedPatient.gender} • {selectedPatient.mobilePrimary}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedPatient(null);
                                    setPatientSearch('');
                                    setPatients([]);
                                    // Also clear URL params if user manually changes patient? 
                                    // Maybe just let them clear selection.
                                    navigate('/ipd/admit', { replace: true });
                                }}
                                className="text-sm text-primary hover:underline"
                            >
                                Change
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search by UHID, name, or mobile number..."
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                                {searchingPatients && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                                )}
                            </div>
                            {patients.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
                                    {patients.map((patient) => (
                                        <button
                                            type="button"
                                            key={patient.id}
                                            onClick={() => {
                                                setSelectedPatient(patient);
                                                setPatients([]);
                                                setPatientSearch('');
                                            }}
                                            className="w-full p-3 text-left hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                                        >
                                            <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {patient.uhid} • {patient.gender} • {patient.mobilePrimary}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Doctor & Admission Type */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="text-lg font-semibold mb-4">Admission Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Admitting Doctor *</label>
                            <select
                                value={selectedDoctorId}
                                onChange={(e) => setSelectedDoctorId(e.target.value)}
                                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
                                required
                            >
                                <option value="">Select Doctor</option>
                                {doctors.map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                        Dr. {doc.user.firstName} {doc.user.lastName} - {doc.department.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Admission Type *</label>
                            <select
                                value={admissionType}
                                onChange={(e) => setAdmissionType(e.target.value)}
                                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
                            >
                                <option value="ELECTIVE">Elective</option>
                                <option value="EMERGENCY">Emergency</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Reason for Admission *</label>
                            <textarea
                                value={admissionReason}
                                onChange={(e) => setAdmissionReason(e.target.value)}
                                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary resize-none"
                                rows={2}
                                required
                                placeholder="Reason for admission..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Chief Complaint</label>
                            <input
                                type="text"
                                value={chiefComplaint}
                                onChange={(e) => setChiefComplaint(e.target.value)}
                                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
                                placeholder="e.g., Chest pain"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Provisional Diagnosis</label>
                            <input
                                type="text"
                                value={provisionalDiagnosis}
                                onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
                                placeholder="e.g., Acute Myocardial Infarction"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Expected Stay (days)</label>
                            <input
                                type="number"
                                value={expectedStayDays}
                                onChange={(e) => setExpectedStayDays(e.target.value)}
                                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
                                min="1"
                                placeholder="e.g., 5"
                            />
                        </div>
                    </div>
                </div>

                {/* Ward & Bed Selection */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BedDouble className="w-5 h-5" />
                        Ward & Bed
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Ward *</label>
                            <select
                                value={selectedWardId}
                                onChange={(e) => {
                                    setSelectedWardId(e.target.value);
                                    setSelectedBedId('');
                                }}
                                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
                                required
                            >
                                <option value="">Select Ward</option>
                                {wards.map((ward) => (
                                    <option key={ward.id} value={ward.id}>
                                        {ward.name} ({ward.type.replace('_', ' ')}) - ₹{ward.dailyRate}/day
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Select Bed *</label>
                            <select
                                value={selectedBedId}
                                onChange={(e) => setSelectedBedId(e.target.value)}
                                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
                                required
                                disabled={!selectedWardId}
                            >
                                <option value="">
                                    {!selectedWardId
                                        ? 'Select a ward first'
                                        : beds.length === 0
                                            ? 'No available beds'
                                            : 'Select Bed'}
                                </option>
                                {beds.map((bed) => (
                                    <option key={bed.id} value={bed.id}>
                                        Bed {bed.bedNumber} - {bed.bedType}
                                        {bed.dailyRate ? ` (₹${bed.dailyRate}/day)` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {beds.length === 0 && selectedWardId && (
                        <p className="mt-3 text-sm text-yellow-600">
                            No available beds in this ward. Please select a different ward.
                        </p>
                    )}
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/ipd')}
                        className="px-6 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !selectedPatient || !selectedDoctorId || !selectedBedId}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Admit Patient
                    </button>
                </div>
            </form>
        </div>
    );
}
