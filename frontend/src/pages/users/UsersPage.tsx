// ============================================================================
// HMS Frontend - Users Management Page
// List, create, edit, and manage users
// ============================================================================

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
    UserCog,
    Plus,
    Search,
    Pencil,
    Trash2,
    Shield,
    Mail,
    Phone,
    Eye,
    EyeOff,
    Key,
    X,
    Loader2,
} from 'lucide-react';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
    role: { id: string; name: string; code: string };
    lastLoginAt: string | null;
    createdAt: string;
}

interface Role {
    id: string;
    name: string;
    code: string;
    description: string | null;
}

interface Permission {
    id: string;
    module: string;
    action: string;
}

interface UserPermissions {
    roleName: string;
    roleCode: string;
    permissions: Permission[];
    permissionIds: string[];
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        roleCode: '',
        status: 'ACTIVE',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [permissionUser, setPermissionUser] = useState<User | null>(null);
    const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get<User[]>('/users', { params: { limit: 100 } });
            if (response.success) {
                setUsers(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await api.get<Role[]>('/users/roles');
            if (response.success) {
                setRoles(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch roles:', err);
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            phone: '',
            roleCode: roles[0]?.code || '',
            status: 'ACTIVE',
        });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '',
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone || '',
            roleCode: user.role.code,
            status: user.status,
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const body: Record<string, string> = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                roleCode: formData.roleCode,
            };

            if (formData.phone) body.phone = formData.phone;
            if (formData.password) body.password = formData.password;
            if (editingUser) body.status = formData.status;

            let response;
            if (editingUser) {
                response = await api.put<{ message: string }>(`/users/${editingUser.id}`, body);
            } else {
                response = await api.post<{ message: string }>('/users', body);
            }

            if (response.success) {
                setSuccess(editingUser ? 'User updated successfully' : 'User created successfully');
                setShowModal(false);
                fetchUsers();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to save user';
            setError(errorMsg);
        }
    };

    const handleDelete = async (user: User) => {
        if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
            return;
        }

        try {
            const response = await api.delete<{ message: string }>(`/users/${user.id}`);

            if (response.success) {
                setSuccess('User deleted successfully');
                fetchUsers();
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to delete user';
            setError(errorMsg);
            setTimeout(() => setError(''), 3000);
        }
    };

    const filteredUsers = users.filter(
        (u) =>
            u.firstName.toLowerCase().includes(search.toLowerCase()) ||
            u.lastName.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
    );

    const openPermissionModal = async (user: User) => {
        setPermissionUser(user);
        setShowPermissionModal(true);
        setLoadingPermissions(true);
        try {
            const response = await api.get<UserPermissions>(`/users/${user.id}/permissions`);
            if (response.success) {
                setUserPermissions(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch permissions:', err);
        } finally {
            setLoadingPermissions(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800';
            case 'INACTIVE':
                return 'bg-gray-100 text-gray-800';
            case 'SUSPENDED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
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
                        <UserCog className="w-7 h-7 text-primary" />
                        User Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage system users and their roles
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add User
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

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                    User
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Contact
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Role
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Status
                                </th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Last Login
                                </th>
                                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="text-primary font-medium">
                                                    {user.firstName.charAt(0)}
                                                    {user.lastName.charAt(0)}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Mail className="w-3 h-3" />
                                                {user.email}
                                            </div>
                                            {user.phone && (
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Phone className="w-3 h-3" />
                                                    {user.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                                            <Shield className="w-3 h-3" />
                                            {user.role.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                                user.status
                                            )}`}
                                        >
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {user.lastLoginAt
                                            ? new Date(user.lastLoginAt).toLocaleDateString()
                                            : 'Never'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openPermissionModal(user)}
                                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                title="View Permissions"
                                            >
                                                <Key className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No users found
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border">
                            <h2 className="text-lg font-semibold">
                                {editingUser ? 'Edit User' : 'Create User'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        First Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, firstName: e.target.value })
                                        }
                                        required
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Last Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, lastName: e.target.value })
                                        }
                                        required
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    required
                                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Password {editingUser ? '' : '*'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                        required={!editingUser}
                                        placeholder={editingUser ? 'Leave blank to keep current' : ''}
                                        className="w-full h-10 px-3 pr-10 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) =>
                                        setFormData({ ...formData, phone: e.target.value })
                                    }
                                    placeholder="10-digit mobile number"
                                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Role *</label>
                                <select
                                    value={formData.roleCode}
                                    onChange={(e) =>
                                        setFormData({ ...formData, roleCode: e.target.value })
                                    }
                                    required
                                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.code}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {editingUser && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) =>
                                            setFormData({ ...formData, status: e.target.value })
                                        }
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="SUSPENDED">Suspended</option>
                                    </select>
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
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    {editingUser ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Permission Modal */}
            {showPermissionModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">User Permissions</h2>
                                {permissionUser && (
                                    <p className="text-sm text-muted-foreground">
                                        {permissionUser.firstName} {permissionUser.lastName} ({permissionUser.email})
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setShowPermissionModal(false);
                                    setUserPermissions(null);
                                    setPermissionUser(null);
                                }}
                                className="p-1 rounded hover:bg-muted"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            {loadingPermissions ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : userPermissions ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                                        <Shield className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="font-medium">{userPermissions.roleName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {userPermissions.permissions.length} permissions assigned via role
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-medium mb-3">Permissions by Module</h3>
                                        <div className="space-y-4">
                                            {Object.entries(
                                                userPermissions.permissions.reduce((acc, perm) => {
                                                    if (!acc[perm.module]) {
                                                        acc[perm.module] = [];
                                                    }
                                                    acc[perm.module].push(perm.action);
                                                    return acc;
                                                }, {} as Record<string, string[]>)
                                            ).map(([module, actions]) => (
                                                <div
                                                    key={module}
                                                    className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg"
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium capitalize">{module}</p>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {actions.map((action) => (
                                                                <span
                                                                    key={action}
                                                                    className={`px-2 py-0.5 rounded text-xs font-medium ${action === 'create'
                                                                            ? 'bg-green-100 text-green-800'
                                                                            : action === 'read'
                                                                                ? 'bg-blue-100 text-blue-800'
                                                                                : action === 'update'
                                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                                    : 'bg-red-100 text-red-800'
                                                                        }`}
                                                                >
                                                                    {action}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground">
                                        To modify permissions, change the user's role or edit the role permissions.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    Failed to load permissions
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

