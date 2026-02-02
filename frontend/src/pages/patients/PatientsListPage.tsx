// ============================================================================
// HMS Frontend - Patients List Page
// Patient search and listing
// ============================================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn, calculateAge, formatPhone } from '@/lib/utils';
import {
    Search,
    Plus,
    Filter,
    ChevronLeft,
    ChevronRight,
    Eye,
    Edit,
    Loader2,
} from 'lucide-react';

interface Patient {
    id: string;
    uhid: string;
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string;
    mobilePrimary: string;
    city: string;
    patientType: string;
    allergies: string[];
    createdAt: string;
}

interface PatientsResponse {
    patients: Patient[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export default function PatientsListPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;

    const { data, isLoading, error } = useQuery({
        queryKey: ['patients', search, page],
        queryFn: async () => {
            const response = await api.get<PatientsResponse>('/patients', {
                params: { search, page, limit },
            });
            return response;
        },
    });

    const patients = data?.data?.patients || [];
    const meta = data?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
                    <p className="text-muted-foreground">
                        Search and manage patient records
                    </p>
                </div>
                <Link
                    to="/patients/register"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Register Patient
                </Link>
            </div>

            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by name, UHID, or mobile number..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors">
                    <Filter className="w-4 h-4" />
                    Filters
                </button>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-64 text-destructive">
                        Failed to load patients. Please try again.
                    </div>
                ) : patients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <p className="text-lg font-medium">No patients found</p>
                        <p className="text-sm">Try adjusting your search or register a new patient.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Patient
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            UHID
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Contact
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Age/Gender
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Allergies
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {patients.map((patient: Patient) => (
                                        <tr
                                            key={patient.id}
                                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/patients/${patient.id}`)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <span className="text-primary font-medium text-sm">
                                                            {patient.firstName.charAt(0)}
                                                            {patient.lastName.charAt(0)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">
                                                            {patient.firstName} {patient.lastName}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {patient.city}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-sm">{patient.uhid}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm">
                                                    {formatPhone(patient.mobilePrimary)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm">
                                                    {calculateAge(patient.dateOfBirth)} yrs / {patient.gender.charAt(0)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={cn(
                                                        'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                                                        patient.patientType === 'CASH' && 'bg-gray-100 text-gray-700',
                                                        patient.patientType === 'INSURANCE' && 'bg-blue-100 text-blue-700',
                                                        patient.patientType === 'PMJAY' && 'bg-green-100 text-green-700',
                                                        patient.patientType === 'CORPORATE' && 'bg-purple-100 text-purple-700'
                                                    )}
                                                >
                                                    {patient.patientType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {patient.allergies.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {patient.allergies.slice(0, 2).map((allergy, i) => (
                                                            <span key={i} className="allergy-badge">
                                                                {allergy}
                                                            </span>
                                                        ))}
                                                        {patient.allergies.length > 2 && (
                                                            <span className="text-xs text-muted-foreground">
                                                                +{patient.allergies.length - 2}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">None</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/patients/${patient.id}`);
                                                        }}
                                                        className="p-1.5 rounded-md hover:bg-muted"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/patients/${patient.id}/edit`);
                                                        }}
                                                        className="p-1.5 rounded-md hover:bg-muted"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                            <p className="text-sm text-muted-foreground">
                                Showing {((meta.page ?? 1) - 1) * (meta.limit ?? 10) + 1} to{' '}
                                {Math.min((meta.page ?? 1) * (meta.limit ?? 10), meta.total ?? 0)} of {meta.total ?? 0} patients
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-md border border-input hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm">
                                    Page {meta.page} of {meta.totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(meta.totalPages ?? 1, p + 1))}
                                    disabled={page === meta.totalPages}
                                    className="p-2 rounded-md border border-input hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
