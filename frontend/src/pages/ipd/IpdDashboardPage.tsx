// ============================================================================
// HMS Frontend - IPD Dashboard Page
// Inpatient department overview with bed management
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
    BedDouble,
    Users,
    UserPlus,
    UserMinus,
    Building2,
    RefreshCw,
    Plus,
    ChevronRight,
    AlertCircle,
} from 'lucide-react';

interface DashboardData {
    beds: {
        total: number;
        byStatus: Record<string, number>;
    };
    admissions: {
        currentlyAdmitted: number;
        todayAdmissions: number;
        todayDischarges: number;
    };
    wardOccupancy: Array<{
        id: string;
        name: string;
        type: string;
        totalBeds: number;
        occupiedBeds: number;
        occupancyRate: number;
    }>;
}

interface Admission {
    id: string;
    admissionNo: string;
    admissionDate: string;
    status: string;
    admissionReason: string;
    patient: {
        id: string;
        uhid: string;
        firstName: string;
        lastName: string;
        gender: string;
        mobilePrimary: string;
    };
    admittingDoctor: {
        id: string;
        user: { firstName: string; lastName: string };
        department: { name: string };
    };
    bed: {
        id: string;
        bedNumber: string;
        ward: { name: string; type: string };
    };
}

export default function IpdDashboardPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [admissions, setAdmissions] = useState<Admission[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [dashboardRes, admissionsRes] = await Promise.all([
                api.get<DashboardData>('/ipd/dashboard'),
                api.get<Admission[]>('/ipd/admissions', { params: { status: 'ADMITTED', limit: 10 } }),
            ]);

            if (dashboardRes.success) {
                const data = dashboardRes.data as any;
                // Map backend wardStats to frontend wardOccupancy if needed
                if (data.wardStats && !data.wardOccupancy) {
                    data.wardOccupancy = data.wardStats.map((ward: any) => ({
                        id: ward.id,
                        name: ward.name,
                        type: ward.type,
                        totalBeds: ward.totalBeds,
                        occupiedBeds: ward.occupiedBeds,
                        occupancyRate: ward.totalBeds > 0 ? Math.round((ward.occupiedBeds / ward.totalBeds) * 100) : 0
                    }));
                }
                setDashboard(data);
            }
            if (admissionsRes.success) {
                setAdmissions(admissionsRes.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch IPD data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const getWardTypeColor = (type: string) => {
        switch (type) {
            case 'ICU':
            case 'CCU':
                return 'bg-red-100 text-red-800';
            case 'PRIVATE':
                return 'bg-purple-100 text-purple-800';
            case 'SEMI_PRIVATE':
                return 'bg-blue-100 text-blue-800';
            case 'GENERAL':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getOccupancyColor = (rate: number) => {
        if (rate >= 90) return 'bg-red-500';
        if (rate >= 70) return 'bg-yellow-500';
        return 'bg-green-500';
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
                        <BedDouble className="w-7 h-7 text-primary" />
                        IPD Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Ward and bed management
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
                        onClick={() => navigate('/ipd/admit')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Admission
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <BedDouble className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{dashboard?.beds.total || 0}</p>
                            <p className="text-sm text-muted-foreground">Total Beds</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <BedDouble className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{dashboard?.beds.byStatus?.AVAILABLE || 0}</p>
                            <p className="text-sm text-muted-foreground">Available</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{dashboard?.admissions.currentlyAdmitted || 0}</p>
                            <p className="text-sm text-muted-foreground">Admitted</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{dashboard?.admissions.todayAdmissions || 0}</p>
                            <p className="text-sm text-muted-foreground">Today's Admissions</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                            <UserMinus className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{dashboard?.admissions.todayDischarges || 0}</p>
                            <p className="text-sm text-muted-foreground">Today's Discharges</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ward Occupancy & Recent Admissions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ward Occupancy */}
                <div className="bg-card rounded-xl border border-border">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Ward Occupancy
                        </h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {(dashboard?.wardOccupancy || []).map((ward) => (
                            <div key={ward.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{ward.name}</span>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${getWardTypeColor(ward.type)}`}>
                                            {ward.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {ward.occupiedBeds}/{ward.totalBeds} beds
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getOccupancyColor(ward.occupancyRate)} transition-all`}
                                        style={{ width: `${ward.occupancyRate}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {(!dashboard?.wardOccupancy || dashboard.wardOccupancy.length === 0) && (
                            <div className="flex flex-col items-center py-8 text-muted-foreground">
                                <AlertCircle className="w-8 h-8 mb-2" />
                                <p>No wards configured</p>
                                <button
                                    onClick={() => navigate('/settings/departments')}
                                    className="mt-2 text-primary text-sm hover:underline"
                                >
                                    Configure Wards
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Admissions */}
                <div className="bg-card rounded-xl border border-border">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Current Admissions
                        </h2>
                        <button
                            onClick={() => navigate('/ipd/admissions')}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                            View All <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="divide-y divide-border">
                        {admissions.slice(0, 5).map((admission) => (
                            <button
                                key={admission.id}
                                onClick={() => navigate(`/ipd/patient/${admission.id}`)}
                                className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {admission.patient.firstName} {admission.patient.lastName}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {admission.patient.uhid} • {admission.admissionNo}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">
                                            {admission.bed.ward.name} - {admission.bed.bedNumber}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Dr. {admission.admittingDoctor.user.firstName} {admission.admittingDoctor.user.lastName}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                        {admissions.length === 0 && (
                            <div className="flex flex-col items-center py-8 text-muted-foreground">
                                <BedDouble className="w-8 h-8 mb-2" />
                                <p>No active admissions</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
