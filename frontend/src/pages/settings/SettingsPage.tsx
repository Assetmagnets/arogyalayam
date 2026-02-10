// ============================================================================
// HMS Frontend - Settings Page
// Application settings and configuration
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { Settings, Building2, Users, Shield, Bell, Palette, Globe, Boxes } from 'lucide-react';

const settingsSections = [
    {
        icon: Building2,
        title: 'Hospital Settings',
        description: 'Configure hospital information, branding, and contact details',
        path: '/settings/hospital',
    },
    {
        icon: Users,
        title: 'Department Management',
        description: 'Add, edit, or remove hospital departments',
        path: '/settings/departments',
    },
    {
        icon: Shield,
        title: 'Roles & Permissions',
        description: 'Manage user roles and access control',
        path: '/settings/roles',
    },
    {
        icon: Boxes,
        title: 'Module Settings',
        description: 'Enable or disable sidebar menu items',
        path: '/settings/modules',
    },
    {
        icon: Bell,
        title: 'Notifications',
        description: 'Configure SMS, WhatsApp, and email notifications',
        path: '/settings/notifications',
        comingSoon: true,
    },
    {
        icon: Palette,
        title: 'Appearance',
        description: 'Customize theme, colors, and display preferences',
        path: '/settings/appearance',
        comingSoon: true,
    },
    {
        icon: Globe,
        title: 'Localization',
        description: 'Language, timezone, and regional settings',
        path: '/settings/localization',
        comingSoon: true,
    },
];

export default function SettingsPage() {
    const navigate = useNavigate();

    const handleClick = (section: typeof settingsSections[0]) => {
        if (section.comingSoon) {
            return;
        }
        navigate(section.path);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Settings className="w-7 h-7 text-primary" />
                    Settings
                </h1>
                <p className="text-muted-foreground mt-1">
                    Manage your hospital and application settings
                </p>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {settingsSections.map((section) => (
                    <button
                        key={section.title}
                        onClick={() => handleClick(section)}
                        disabled={section.comingSoon}
                        className={`bg-card rounded-xl border border-border p-6 text-left transition-all group relative ${section.comingSoon
                            ? 'opacity-60 cursor-not-allowed'
                            : 'hover:border-primary/50 hover:shadow-md'
                            }`}
                    >
                        {section.comingSoon && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                                Coming Soon
                            </span>
                        )}
                        <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 transition-colors ${!section.comingSoon ? 'group-hover:bg-primary/20' : ''
                            }`}>
                            <section.icon className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">
                            {section.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {section.description}
                        </p>
                    </button>
                ))}
            </div>

            {/* System Info */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Version</p>
                        <p className="font-medium">HMS v1.0.0</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Environment</p>
                        <p className="font-medium">Development</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Last Updated</p>
                        <p className="font-medium">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
