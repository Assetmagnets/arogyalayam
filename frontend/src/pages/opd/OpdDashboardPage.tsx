// ============================================================================
// HMS Frontend - OPD Dashboard Page
// Outpatient department overview with queue management
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
    Stethoscope,
    Users,
    Clock,
    CheckCircle2,
    UserCheck,
    AlertCircle,
    RefreshCw,
    Play,
    Search,
} from 'lucide-react';

interface DashboardData {
    date: string;
    appointments: {
        total: number;
        byStatus: Record<string, number>;
    };
    queue: {
        total: number;
        byStatus: Record<string, number>;
    };
    doctorQueues: Array<{
        doctorId: string;
        doctorName: string;
        department: string;
        waitingCount: number;
    }>;
}

interface QueuePatient {
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
        mobilePrimary: string;
    };
    appointment: {
        consultationType: string;
        chiefComplaint: string;
    };
    patientAge: number;
}

export default function OpdDashboardPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
    const [queue, setQueue] = useState<QueuePatient[]>([]);
    const [queueLoading, setQueueLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchDashboard();
    }, []);

    useEffect(() => {
        if (selectedDoctor) {
            fetchQueue(selectedDoctor);
        }
    }, [selectedDoctor]);

    const fetchDashboard = async () => {
        try {
            const response = await api.get<DashboardData>('/opd/dashboard');
            if (response.success) {
                setDashboard(response.data);
                // Auto-select first doctor with waiting patients
                const firstDoctor = response.data.doctorQueues.find((d) => d.waitingCount > 0);
                if (firstDoctor && !selectedDoctor) {
                    setSelectedDoctor(firstDoctor.doctorId);
                }
            }
        } catch (error) {
            console.error('Failed to fetch OPD dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQueue = async (doctorId: string) => {
        setQueueLoading(true);
        try {
            const response = await api.get<{ queue: QueuePatient[] }>(`/opd/queue/${doctorId}`);
            if (response.success) {
                setQueue(response.data.queue);
            }
        } catch (error) {
            console.error('Failed to fetch queue:', error);
        } finally {
            setQueueLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchDashboard();
        if (selectedDoctor) {
            await fetchQueue(selectedDoctor);
        }
        setRefreshing(false);
    };

    const handleCallNext = async (doctorId: string) => {
        try {
            await api.post(`/opd/call-next/${doctorId}`, {});
            await fetchQueue(doctorId);
            await fetchDashboard();
        } catch (error) {
            console.error('Failed to call next patient:', error);
        }
    };

    const handleComplete = async (queueId: string) => {
        try {
            await api.post(`/opd/complete/${queueId}`, {});
            if (selectedDoctor) {
                await fetchQueue(selectedDoctor);
            }
            await fetchDashboard();
        } catch (error) {
            console.error('Failed to complete consultation:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'WAITING':
                return 'bg-yellow-100 text-yellow-800';
            case 'IN_CONSULTATION':
                return 'bg-blue-100 text-blue-800';
            case 'COMPLETED':
                return 'bg-green-100 text-green-800';
            case 'SKIPPED':
            case 'NO_SHOW':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Stethoscope className="w-7 h-7 text-primary" />
                        OPD Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {dashboard?.date || new Date().toLocaleDateString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => navigate('/appointments')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Search className="w-4 h-4" />
                        Book Appointment
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{dashboard?.appointments.total || 0}</p>
                            <p className="text-sm text-muted-foreground">Today's Appointments</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{dashboard?.queue.byStatus?.WAITING || 0}</p>
                            <p className="text-sm text-muted-foreground">Waiting</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{dashboard?.queue.byStatus?.IN_CONSULTATION || 0}</p>
                            <p className="text-sm text-muted-foreground">In Consultation</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{dashboard?.queue.byStatus?.COMPLETED || 0}</p>
                            <p className="text-sm text-muted-foreground">Completed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Doctor Queues & Patient List */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Doctor List */}
                <div className="lg:col-span-1">
                    <div className="bg-card rounded-xl border border-border p-4">
                        <h2 className="font-semibold text-foreground mb-4">Doctor Queues</h2>
                        <div className="space-y-2">
                            {dashboard?.doctorQueues.map((doctor) => (
                                <button
                                    key={doctor.doctorId}
                                    onClick={() => setSelectedDoctor(doctor.doctorId)}
                                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedDoctor === doctor.doctorId
                                            ? 'bg-primary/10 border-2 border-primary'
                                            : 'bg-muted hover:bg-muted/80'
                                        }`}
                                >
                                    <p className="font-medium text-foreground">{doctor.doctorName}</p>
                                    <p className="text-sm text-muted-foreground">{doctor.department}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                            <Clock className="w-3 h-3" />
                                            {doctor.waitingCount} waiting
                                        </span>
                                    </div>
                                </button>
                            ))}
                            {dashboard?.doctorQueues.length === 0 && (
                                <p className="text-muted-foreground text-sm text-center py-4">
                                    No active doctors today
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Queue List */}
                <div className="lg:col-span-3">
                    <div className="bg-card rounded-xl border border-border">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h2 className="font-semibold text-foreground">Patient Queue</h2>
                            {selectedDoctor && (
                                <button
                                    onClick={() => handleCallNext(selectedDoctor)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    <Play className="w-4 h-4" />
                                    Call Next
                                </button>
                            )}
                        </div>

                        {queueLoading ? (
                            <div className="flex items-center justify-center h-48">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : !selectedDoctor ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                <AlertCircle className="w-8 h-8 mb-2" />
                                <p>Select a doctor to view queue</p>
                            </div>
                        ) : queue.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                <CheckCircle2 className="w-8 h-8 mb-2" />
                                <p>No patients in queue</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {queue.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`p-4 ${item.status === 'IN_CONSULTATION' ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                                                    {item.tokenNumber}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {item.patient.firstName} {item.patient.lastName}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {item.patient.uhid} • {item.patientAge}Y • {item.patient.gender}
                                                    </p>
                                                    {item.appointment.chiefComplaint && (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {item.appointment.chiefComplaint}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                                                    {item.status.replace('_', ' ')}
                                                </span>
                                                {item.status === 'IN_CONSULTATION' && (
                                                    <button
                                                        onClick={() => handleComplete(item.id)}
                                                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                                    >
                                                        Complete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
