// ============================================================================
// HMS Frontend - Settings Page
// Application settings and configuration
// ============================================================================

import { Settings, Building2, Users, Shield, Bell, Palette, Globe } from 'lucide-react';

const settingsSections = [
    {
        icon: Building2,
        title: 'Hospital Settings',
        description: 'Configure hospital information, branding, and contact details',
    },
    {
        icon: Users,
        title: 'Department Management',
        description: 'Add, edit, or remove hospital departments',
    },
    {
        icon: Shield,
        title: 'Roles & Permissions',
        description: 'Manage user roles and access control',
    },
    {
        icon: Bell,
        title: 'Notifications',
        description: 'Configure SMS, WhatsApp, and email notifications',
    },
    {
        icon: Palette,
        title: 'Appearance',
        description: 'Customize theme, colors, and display preferences',
    },
    {
        icon: Globe,
        title: 'Localization',
        description: 'Language, timezone, and regional settings',
    },
];

export default function SettingsPage() {
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
                        className="bg-card rounded-xl border border-border p-6 text-left hover:border-primary/50 hover:shadow-md transition-all group"
                    >
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
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
