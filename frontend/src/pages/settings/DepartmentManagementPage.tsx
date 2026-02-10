// ============================================================================
// HMS Frontend - Department Management Page
// Add, edit, or remove hospital departments
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
    Users,
    ArrowLeft,
    Plus,
    Search,
    Pencil,
    Trash2,
    X,
    Loader2,
    ToggleLeft,
    ToggleRight,
    Stethoscope,
} from 'lucide-react';

interface Department {
    id: string;
    name: string;
    code: string;
    description: string | null;
    displayOrder: number;
    isActive: boolean;
    doctorCount: number;
    createdAt: string;
    updatedAt: string;
}

export default function DepartmentManagementPage() {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        displayOrder: 0,
        isActive: true,
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchDepartments();
    }, [showInactive]);

    const fetchDepartments = async () => {
        try {
            const params: Record<string, string | boolean> = {};
            if (showInactive) {
                params.includeInactive = 'true';
            }
            const response = await api.get<Department[]>('/settings/departments', { params });
            if (response.success) {
                setDepartments(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch departments:', err);
            setError('Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingDepartment(null);
        setFormData({
            name: '',
            code: '',
            description: '',
            displayOrder: departments.length,
            isActive: true,
        });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (dept: Department) => {
        setEditingDepartment(dept);
        setFormData({
            name: dept.name,
            code: dept.code,
            description: dept.description || '',
            displayOrder: dept.displayOrder,
            isActive: dept.isActive,
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const body: Record<string, string | number | boolean> = {
                name: formData.name,
                code: formData.code.toUpperCase(),
                description: formData.description,
                displayOrder: formData.displayOrder,
            };

            if (editingDepartment) {
                body.isActive = formData.isActive;
                const response = await api.put<{ message: string }>(
                    `/settings/departments/${editingDepartment.id}`,
                    body
                );
                if (response.success) {
                    setSuccess('Department updated successfully');
                }
            } else {
                const response = await api.post<{ message: string }>('/settings/departments', body);
                if (response.success) {
                    setSuccess('Department created successfully');
                }
            }

            setShowModal(false);
            fetchDepartments();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to save department';
            setError(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (dept: Department) => {
        if (dept.doctorCount > 0) {
            alert(`Cannot delete "${dept.name}" because it has ${dept.doctorCount} doctor(s) assigned. Please reassign doctors first.`);
            return;
        }

        if (!confirm(`Are you sure you want to delete "${dept.name}"?`)) {
            return;
        }

        try {
            const response = await api.delete<{ message: string }>(`/settings/departments/${dept.id}`);
            if (response.success) {
                setSuccess('Department deleted successfully');
                fetchDepartments();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to delete department';
            setError(errorMsg);
            setTimeout(() => setError(''), 3000);
        }
    };

    const toggleActive = async (dept: Department) => {
        try {
            const response = await api.put<{ message: string }>(
                `/settings/departments/${dept.id}`,
                { isActive: !dept.isActive }
            );
            if (response.success) {
                setSuccess(`Department ${dept.isActive ? 'deactivated' : 'activated'} successfully`);
                fetchDepartments();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to update department';
            setError(errorMsg);
            setTimeout(() => setError(''), 3000);
        }
    };

    const filteredDepartments = departments.filter(
        (d) =>
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.code.toLowerCase().includes(search.toLowerCase())
    );

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
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/settings')}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Users className="w-7 h-7 text-primary" />
                            Department Management
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Add, edit, or remove hospital departments
                        </p>
                    </div>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Department
                </button>
            </div>

            {/* Success/Error Messages */}
            {success && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
                    {success}
                </div>
            )}
            {error && !showModal && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search departments..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm">Show inactive departments</span>
                </label>
            </div>

            {/* Departments Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Department
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Code
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Doctors
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Status
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Order
                                </th>
                                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredDepartments.map((dept) => (
                                <tr key={dept.id} className={`hover:bg-muted/30 transition-colors ${!dept.isActive ? 'opacity-60' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium text-foreground">{dept.name}</p>
                                            {dept.description && (
                                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                                    {dept.description}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 bg-muted rounded text-sm font-mono">
                                            {dept.code}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-sm">
                                            <Stethoscope className="w-4 h-4 text-muted-foreground" />
                                            {dept.doctorCount}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => toggleActive(dept)}
                                            className="flex items-center gap-1"
                                            title={dept.isActive ? 'Click to deactivate' : 'Click to activate'}
                                        >
                                            {dept.isActive ? (
                                                <>
                                                    <ToggleRight className="w-5 h-5 text-green-500" />
                                                    <span className="text-sm text-green-600">Active</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">Inactive</span>
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {dept.displayOrder}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(dept)}
                                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(dept)}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                                disabled={dept.doctorCount > 0}
                                            >
                                                <Trash2 className={`w-4 h-4 ${dept.doctorCount > 0 ? 'text-muted-foreground/50' : 'text-red-500'}`} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredDepartments.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        {search ? 'No departments found matching your search' : 'No departments yet. Add your first department.'}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                {editingDepartment ? 'Edit Department' : 'Add Department'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 hover:bg-muted rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">Department Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g., General Medicine"
                                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Department Code *</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    required
                                    maxLength={10}
                                    placeholder="e.g., GEN"
                                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Short unique code (max 10 characters)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    placeholder="Brief description of the department"
                                    className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Display Order</label>
                                <input
                                    type="number"
                                    value={formData.displayOrder}
                                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                                    min={0}
                                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first in lists</p>
                            </div>

                            {editingDepartment && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-4 h-4 rounded border-border"
                                    />
                                    <label htmlFor="isActive" className="text-sm">Active</label>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        editingDepartment ? 'Update' : 'Create'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
