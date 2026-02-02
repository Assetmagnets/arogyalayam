// ============================================================================
// HMS Frontend - Appointments Management Page
// Book, view, and manage OPD appointments
// ============================================================================

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
    Calendar,
    Plus,
    Search,
    Clock,
    User,
    Stethoscope,
    CheckCircle,
    XCircle,
    Play,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Loader2,
    X,
} from 'lucide-react';

interface Appointment {
    id: string;
    tokenNumber: string;
    appointmentDate: string;
    slotTime: string;
    status: string;
    consultationType: string;
    chiefComplaint: string;
    patient: {
        id: string;
        uhid: string;
        firstName: string;
        lastName: string;
        mobilePrimary: string;
        gender: string;
        dateOfBirth: string;
        allergies: string[];
    };
    doctor: {
        id: string;
        name: string;
        department: string;
        specialization: string;
    };
}

interface Doctor {
    id: string;
    name: string;
    department: { id: string; name: string };
    specialization: string;
}

interface Patient {
    id: string;
    uhid: string;
    firstName: string;
    lastName: string;
    mobilePrimary: string;
}

interface Slot {
    time: string;
    isAvailable: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Clock },
    CONFIRMED: { label: 'Confirmed', color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
    CHECKED_IN: { label: 'Checked In', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    IN_CONSULTATION: { label: 'In Consultation', color: 'bg-purple-100 text-purple-800', icon: Play },
    COMPLETED: { label: 'Completed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
    NO_SHOW: { label: 'No Show', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
};

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showBookModal, setShowBookModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Book modal state
    const [patientSearch, setPatientSearch] = useState('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [selectedBookDoctor, setSelectedBookDoctor] = useState('');
    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);

    useEffect(() => {
        fetchDoctors();
    }, []);

    useEffect(() => {
        fetchAppointments();
    }, [selectedDate, selectedDoctor, statusFilter]);

    const fetchDoctors = async () => {
        try {
            const response = await api.get<Doctor[]>('/doctors', { params: { limit: 100 } });
            if (response.success) {
                setDoctors(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch doctors:', err);
        }
    };

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                date: selectedDate,
                limit: 100,
            };
            if (selectedDoctor) params.doctorId = selectedDoctor;
            if (statusFilter) params.status = statusFilter;

            const response = await api.get<Appointment[]>('/appointments', { params });
            if (response.success) {
                setAppointments(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    const searchPatients = async (query: string) => {
        if (query.length < 2) {
            setPatients([]);
            return;
        }
        try {
            const response = await api.get<{ patients: Patient[] }>('/patients', {
                params: { search: query, limit: 10 },
            });
            if (response.success) {
                setPatients(response.data.patients);
            }
        } catch (err) {
            console.error('Failed to search patients:', err);
        }
    };

    const fetchSlots = async (doctorId: string) => {
        try {
            const response = await api.get<{ slots: Slot[] }>('/appointments/slots', {
                params: { doctorId, date: selectedDate },
            });
            if (response.success) {
                setSlots(response.data.slots);
            }
        } catch (err) {
            console.error('Failed to fetch slots:', err);
            setSlots([]);
        }
    };

    const handleCheckIn = async (appointment: Appointment) => {
        try {
            const response = await api.patch<{ message: string }>(`/appointments/${appointment.id}/check-in`);
            if (response.success) {
                setSuccess('Patient checked in successfully');
                fetchAppointments();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Check-in failed';
            setError(errorMsg);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleCancel = async (appointment: Appointment) => {
        const reason = prompt('Enter cancellation reason:');
        if (!reason) return;

        try {
            const response = await api.patch<{ message: string }>(`/appointments/${appointment.id}/cancel`, { reason });
            if (response.success) {
                setSuccess('Appointment cancelled');
                fetchAppointments();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Cancellation failed';
            setError(errorMsg);
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleBookAppointment = async () => {
        if (!selectedPatient || !selectedBookDoctor || !selectedSlot) {
            setError('Please select patient, doctor, and time slot');
            return;
        }

        setBookingLoading(true);
        try {
            const response = await api.post<{ tokenNumber: string }>('/appointments', {
                patientId: selectedPatient.id,
                doctorId: selectedBookDoctor,
                appointmentDate: selectedDate,
                slotTime: selectedSlot,
                consultationType: 'NEW',
                chiefComplaint: chiefComplaint || undefined,
            });

            if (response.success) {
                setSuccess(`Appointment booked! Token: ${response.data.tokenNumber}`);
                setShowBookModal(false);
                resetBookModal();
                fetchAppointments();
                setTimeout(() => setSuccess(''), 5000);
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Booking failed';
            setError(errorMsg);
        } finally {
            setBookingLoading(false);
        }
    };

    const resetBookModal = () => {
        setPatientSearch('');
        setPatients([]);
        setSelectedPatient(null);
        setSelectedBookDoctor('');
        setSlots([]);
        setSelectedSlot('');
        setChiefComplaint('');
    };

    const changeDate = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const calculateAge = (dob: string) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Calendar className="w-7 h-7 text-primary" />
                        Appointments
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Schedule and manage OPD appointments
                    </p>
                </div>
                <button
                    onClick={() => setShowBookModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Book Appointment
                </button>
            </div>

            {/* Success/Error */}
            {success && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
                    {success}
                </div>
            )}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                    {error}
                </div>
            )}

            {/* Date Navigation & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => changeDate(-1)}
                        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                        onClick={() => changeDate(1)}
                        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                        className="px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                </div>
                <div className="flex gap-2 flex-1 flex-wrap">
                    <select
                        value={selectedDoctor}
                        onChange={(e) => setSelectedDoctor(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="">All Doctors</option>
                        {doctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                                {doc.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="">All Status</option>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>
                                {config.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Date Display */}
            <div className="text-lg font-medium">{formatDate(selectedDate)}</div>

            {/* Appointments List */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Calendar className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-lg font-medium">No appointments</p>
                        <p className="text-sm">No appointments found for this date</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {appointments.map((apt) => {
                            const statusConfig = STATUS_CONFIG[apt.status] || STATUS_CONFIG.SCHEDULED;
                            return (
                                <div
                                    key={apt.id}
                                    className="p-4 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        {/* Time & Token */}
                                        <div className="flex items-center gap-4 md:w-32">
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-primary">{apt.slotTime}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Token: {apt.tokenNumber}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Patient Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                    <User className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">
                                                        {apt.patient.firstName} {apt.patient.lastName}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {apt.patient.uhid} • {calculateAge(apt.patient.dateOfBirth)}Y / {apt.patient.gender.charAt(0)}
                                                    </p>
                                                </div>
                                            </div>
                                            {apt.patient.allergies?.length > 0 && (
                                                <div className="mt-2 flex gap-1 flex-wrap">
                                                    {apt.patient.allergies.map((allergy, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                                            ⚠️ {allergy}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Doctor & Status */}
                                        <div className="flex flex-col md:items-end gap-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Stethoscope className="w-4 h-4 text-muted-foreground" />
                                                <span>{apt.doctor.name}</span>
                                                <span className="text-muted-foreground">• {apt.doctor.department}</span>
                                            </div>
                                            <span className={cn('px-2 py-1 rounded text-xs font-medium', statusConfig.color)}>
                                                {statusConfig.label}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {['SCHEDULED', 'CONFIRMED'].includes(apt.status) && (
                                                <button
                                                    onClick={() => handleCheckIn(apt)}
                                                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                    Check In
                                                </button>
                                            )}
                                            {!['COMPLETED', 'CANCELLED', 'IN_CONSULTATION'].includes(apt.status) && (
                                                <button
                                                    onClick={() => handleCancel(apt)}
                                                    className="px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {apt.chiefComplaint && (
                                        <p className="mt-2 text-sm text-muted-foreground ml-14">
                                            Chief Complaint: {apt.chiefComplaint}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(STATUS_CONFIG).slice(0, 5).map(([status, config]) => {
                    const count = appointments.filter(a => a.status === status).length;
                    return (
                        <div key={status} className="bg-card rounded-lg border border-border p-4">
                            <p className="text-sm text-muted-foreground">{config.label}</p>
                            <p className="text-2xl font-bold">{count}</p>
                        </div>
                    );
                })}
            </div>

            {/* Book Appointment Modal */}
            {showBookModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Book Appointment</h2>
                            <button
                                onClick={() => {
                                    setShowBookModal(false);
                                    resetBookModal();
                                }}
                                className="p-1 rounded hover:bg-muted"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Appointment Date</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Patient Search */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Patient *</label>
                                {selectedPatient ? (
                                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                                        <div>
                                            <p className="font-medium">
                                                {selectedPatient.firstName} {selectedPatient.lastName}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedPatient.uhid} • {selectedPatient.mobilePrimary}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedPatient(null)}
                                            className="text-sm text-primary hover:underline"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={patientSearch}
                                            onChange={(e) => {
                                                setPatientSearch(e.target.value);
                                                searchPatients(e.target.value);
                                            }}
                                            placeholder="Search by name, UHID, or mobile..."
                                            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                        {patients.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {patients.map((p) => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => {
                                                            setSelectedPatient(p);
                                                            setPatients([]);
                                                            setPatientSearch('');
                                                        }}
                                                        className="w-full px-4 py-2 text-left hover:bg-muted"
                                                    >
                                                        <p className="font-medium">
                                                            {p.firstName} {p.lastName}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {p.uhid} • {p.mobilePrimary}
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Doctor Selection */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Doctor *</label>
                                <select
                                    value={selectedBookDoctor}
                                    onChange={(e) => {
                                        setSelectedBookDoctor(e.target.value);
                                        setSelectedSlot('');
                                        if (e.target.value) {
                                            fetchSlots(e.target.value);
                                        } else {
                                            setSlots([]);
                                        }
                                    }}
                                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Select Doctor</option>
                                    {doctors.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name} - {doc.department.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Time Slots */}
                            {selectedBookDoctor && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Select Time Slot *</label>
                                    {slots.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            No slots available for this doctor on selected date
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-2">
                                            {slots.map((slot) => (
                                                <button
                                                    key={slot.time}
                                                    type="button"
                                                    disabled={!slot.isAvailable}
                                                    onClick={() => setSelectedSlot(slot.time)}
                                                    className={cn(
                                                        'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                                        !slot.isAvailable
                                                            ? 'bg-muted text-muted-foreground cursor-not-allowed line-through'
                                                            : selectedSlot === slot.time
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'border border-border hover:border-primary'
                                                    )}
                                                >
                                                    {slot.time}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Chief Complaint */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Chief Complaint</label>
                                <textarea
                                    value={chiefComplaint}
                                    onChange={(e) => setChiefComplaint(e.target.value)}
                                    rows={2}
                                    placeholder="e.g., Fever, Cold, Follow-up..."
                                    className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowBookModal(false);
                                        resetBookModal();
                                    }}
                                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBookAppointment}
                                    disabled={bookingLoading || !selectedPatient || !selectedBookDoctor || !selectedSlot}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {bookingLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Booking...
                                        </span>
                                    ) : (
                                        'Book Appointment'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
