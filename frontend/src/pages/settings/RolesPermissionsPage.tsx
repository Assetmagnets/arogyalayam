// ============================================================================
// HMS Frontend - Roles & Permissions Page
// Manage user roles and access control
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
    Shield,
    ArrowLeft,
    Users,
    Key,
    Loader2,
    Check,
    Lock,
} from 'lucide-react';

interface Role {
    id: string;
    name: string;
    code: string;
    description: string | null;
    isSystemRole: boolean;
    userCount: number;
    permissionCount: number;
}

interface Permission {
    id: string;
    action: string;
    description: string | null;
}

interface PermissionsByModule {
    [module: string]: Permission[];
}

interface RolePermissions {
    roleId: string;
    roleName: string;
    roleCode: string;
    isSystemRole: boolean;
    permissions: Array<{
        id: string;
        module: string;
        action: string;
        description: string | null;
    }>;
}

interface AllPermissions {
    permissions: Array<{
        id: string;
        module: string;
        action: string;
        description: string | null;
    }>;
    byModule: PermissionsByModule;
}

export default function RolesPermissionsPage() {
    const navigate = useNavigate();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [_rolePermissions, setRolePermissions] = useState<RolePermissions | null>(null);
    const [allPermissions, setAllPermissions] = useState<AllPermissions | null>(null);
    const [loadingPermissions, setLoadingPermissions] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchRoles();
        fetchAllPermissions();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await api.get<Role[]>('/settings/roles');
            if (response.success) {
                setRoles(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch roles:', err);
            setError('Failed to load roles');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllPermissions = async () => {
        try {
            const response = await api.get<AllPermissions>('/settings/permissions');
            if (response.success) {
                setAllPermissions(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch permissions:', err);
        }
    };

    const selectRole = async (role: Role) => {
        setSelectedRole(role);
        setLoadingPermissions(true);
        setError('');

        try {
            const response = await api.get<RolePermissions>(`/settings/roles/${role.id}/permissions`);
            if (response.success) {
                setRolePermissions(response.data);
                setSelectedPermissionIds(new Set(response.data.permissions.map((p) => p.id)));
            }
        } catch (err) {
            console.error('Failed to fetch role permissions:', err);
            setError('Failed to load role permissions');
        } finally {
            setLoadingPermissions(false);
        }
    };

    const togglePermission = (permissionId: string) => {
        if (selectedRole?.isSystemRole) return;

        setSelectedPermissionIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(permissionId)) {
                newSet.delete(permissionId);
            } else {
                newSet.add(permissionId);
            }
            return newSet;
        });
    };

    const toggleModulePermissions = (_module: string, permissions: Permission[]) => {
        if (selectedRole?.isSystemRole) return;

        const modulePermissionIds = permissions.map((p) => p.id);
        const allSelected = modulePermissionIds.every((id) => selectedPermissionIds.has(id));

        setSelectedPermissionIds((prev) => {
            const newSet = new Set(prev);
            if (allSelected) {
                modulePermissionIds.forEach((id) => newSet.delete(id));
            } else {
                modulePermissionIds.forEach((id) => newSet.add(id));
            }
            return newSet;
        });
    };

    const savePermissions = async () => {
        if (!selectedRole || selectedRole.isSystemRole) return;

        setSaving(true);
        setError('');

        try {
            const response = await api.put<{ message: string }>(
                `/settings/roles/${selectedRole.id}/permissions`,
                { permissionIds: Array.from(selectedPermissionIds) }
            );

            if (response.success) {
                setSuccess('Permissions updated successfully');
                fetchRoles(); // Refresh to update permission counts
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to save permissions';
            setError(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'read':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'update':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'delete':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
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
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/settings')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Shield className="w-7 h-7 text-primary" />
                        Roles & Permissions
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage user roles and access control
                    </p>
                </div>
            </div>

            {/* Success/Error Messages */}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Roles List */}
                <div className="lg:col-span-1">
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-semibold">Roles</h3>
                            <p className="text-sm text-muted-foreground">Select a role to view/edit permissions</p>
                        </div>
                        <div className="divide-y divide-border">
                            {roles.map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => selectRole(role)}
                                    className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${selectedRole?.id === role.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{role.name}</p>
                                                {role.isSystemRole && (
                                                    <Lock className="w-3 h-3 text-muted-foreground" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">{role.code}</p>
                                            {role.description && (
                                                <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {role.userCount} users
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Key className="w-3 h-3" />
                                            {role.permissionCount} permissions
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Permissions Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">
                                    {selectedRole ? `Permissions for ${selectedRole.name}` : 'Select a Role'}
                                </h3>
                                {selectedRole?.isSystemRole && (
                                    <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
                                        <Lock className="w-3 h-3" />
                                        System roles cannot be modified
                                    </p>
                                )}
                            </div>
                            {selectedRole && !selectedRole.isSystemRole && (
                                <button
                                    onClick={savePermissions}
                                    disabled={saving}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        <div className="p-4">
                            {!selectedRole ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Select a role from the list to view and edit its permissions</p>
                                </div>
                            ) : loadingPermissions ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : allPermissions ? (
                                <div className="space-y-6">
                                    {Object.entries(allPermissions.byModule).map(([module, permissions]) => {
                                        const modulePermissionIds = permissions.map((p) => p.id);
                                        const selectedCount = modulePermissionIds.filter((id) =>
                                            selectedPermissionIds.has(id)
                                        ).length;
                                        const allSelected = selectedCount === permissions.length;
                                        const someSelected = selectedCount > 0 && selectedCount < permissions.length;

                                        return (
                                            <div key={module} className="border border-border rounded-lg overflow-hidden">
                                                <div
                                                    className="p-4 bg-muted/30 flex items-center justify-between cursor-pointer"
                                                    onClick={() => toggleModulePermissions(module, permissions)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedRole.isSystemRole
                                                                ? 'cursor-not-allowed opacity-50'
                                                                : ''
                                                                } ${allSelected
                                                                    ? 'bg-primary border-primary'
                                                                    : someSelected
                                                                        ? 'bg-primary/50 border-primary'
                                                                        : 'border-border'
                                                                }`}
                                                        >
                                                            {(allSelected || someSelected) && (
                                                                <Check className="w-3 h-3 text-white" />
                                                            )}
                                                        </div>
                                                        <span className="font-medium capitalize">{module}</span>
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        {selectedCount}/{permissions.length} selected
                                                    </span>
                                                </div>
                                                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {permissions.map((perm) => {
                                                        const isSelected = selectedPermissionIds.has(perm.id);
                                                        return (
                                                            <button
                                                                key={perm.id}
                                                                onClick={() => togglePermission(perm.id)}
                                                                disabled={selectedRole.isSystemRole}
                                                                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${selectedRole.isSystemRole
                                                                    ? 'cursor-not-allowed'
                                                                    : 'cursor-pointer'
                                                                    } ${isSelected
                                                                        ? getActionColor(perm.action)
                                                                        : 'bg-muted/30 text-muted-foreground border-border hover:border-primary/50'
                                                                    }`}
                                                            >
                                                                {perm.action}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
