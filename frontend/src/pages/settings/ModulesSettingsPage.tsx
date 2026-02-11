// ============================================================================
// HMS Frontend - Module Settings Page
// Toggle sidebar menus on/off
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
    Boxes,
    ArrowLeft,
    Save,
    Loader2,
    LayoutDashboard,
    Users,
    Calendar,
    FileText,
    Pill,
    TestTube2,
    Receipt,
    UserCog,
    ToggleLeft,
    ToggleRight,
    Lock,
} from 'lucide-react';

interface Module {
    code: string;
    name: string;
    description: string;
    icon: string;
    alwaysEnabled?: boolean;
    isEnabled: boolean;
}

interface ModulesResponse {
    availableModules: Module[];
    enabledModules: string[];
    modules: Module[];
}

const iconMap: Record<string, React.ElementType> = {
    LayoutDashboard,
    Users,
    Calendar,
    FileText,
    Pill,
    TestTube2,
    Receipt,
    UserCog,
};

export default function ModulesSettingsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modules, setModules] = useState<Module[]>([]);
    const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [originalEnabled, setOriginalEnabled] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchModules();
    }, []);

    const fetchModules = async () => {
        try {
            const response = await api.get<ModulesResponse>('/settings/modules');
            if (response.success) {
                // Defensive check: Ensure modules is an array
                let modulesList = response.data.modules;

                // Fallback: If backend returns enabledModules but not the full modules list, construct it
                if (!Array.isArray(modulesList) && response.data.availableModules) {
                    const enabledSet = new Set(response.data.enabledModules || []);
                    modulesList = response.data.availableModules.map(m => ({
                        ...m,
                        isEnabled: m.alwaysEnabled || enabledSet.has(m.code)
                    }));
                }

                setModules(Array.isArray(modulesList) ? modulesList : []);

                const enabled = new Set(response.data.enabledModules || []);
                setEnabledModules(enabled);
                setOriginalEnabled(new Set(enabled));
            }
        } catch (err) {
            console.error('Failed to fetch modules:', err);
            setError('Failed to load module settings');
            // Set empty array to prevent map errors
            setModules([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleModule = (code: string) => {
        const module = modules.find((m) => m.code === code);
        if (module?.alwaysEnabled) return;

        setEnabledModules((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(code)) {
                newSet.delete(code);
            } else {
                newSet.add(code);
            }
            setHasChanges(!setsEqual(newSet, originalEnabled));
            return newSet;
        });
    };

    const setsEqual = (a: Set<string>, b: Set<string>) => {
        if (a.size !== b.size) return false;
        for (const item of a) {
            if (!b.has(item)) return false;
        }
        return true;
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await api.put<{ enabledModules: string[] }>('/settings/modules', {
                enabledModules: Array.from(enabledModules),
            });

            if (response.success) {
                setSuccess('Module settings updated successfully. Please refresh the page to see changes in the sidebar.');
                setOriginalEnabled(new Set(enabledModules));
                setHasChanges(false);
                setTimeout(() => setSuccess(''), 5000);
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to save settings';
            setError(errorMsg);
        } finally {
            setSaving(false);
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
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/settings')}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Boxes className="w-7 h-7 text-primary" />
                            Module Settings
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Enable or disable sidebar menu items
                        </p>
                    </div>
                </div>
                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                )}
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

            {/* Info Banner */}
            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg">
                <p className="text-sm">
                    <strong>Note:</strong> Dashboard and Settings are always visible. Disabling a module will hide it from the sidebar for all users in this hospital.
                </p>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(modules || []).map((module) => {
                    const IconComponent = iconMap[module.icon] || Boxes;
                    const isEnabled = enabledModules.has(module.code) || module.alwaysEnabled;

                    return (
                        <div
                            key={module.code}
                            className={`bg-card rounded-xl border border-border p-4 transition-all ${module.alwaysEnabled ? 'opacity-75' : 'hover:border-primary/50'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-primary/10' : 'bg-muted'
                                        }`}>
                                        <IconComponent className={`w-5 h-5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'
                                            }`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-medium ${isEnabled ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                {module.name}
                                            </h3>
                                            {module.alwaysEnabled && (
                                                <Lock className="w-3 h-3 text-muted-foreground" />
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {module.description}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleModule(module.code)}
                                    disabled={module.alwaysEnabled}
                                    className={`flex-shrink-0 ${module.alwaysEnabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                    title={module.alwaysEnabled ? 'This module is always enabled' : (isEnabled ? 'Click to disable' : 'Click to enable')}
                                >
                                    {isEnabled ? (
                                        <ToggleRight className={`w-8 h-8 ${module.alwaysEnabled ? 'text-muted-foreground' : 'text-primary'}`} />
                                    ) : (
                                        <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
