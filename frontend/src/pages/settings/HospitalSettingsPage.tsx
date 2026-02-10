// ============================================================================
// HMS Frontend - Hospital Settings Page
// Configure hospital information, branding, and contact details
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
    Building2,
    ArrowLeft,
    Save,
    Loader2,
    MapPin,
    Phone,
    Mail,
    Globe,
    FileText,
} from 'lucide-react';

interface HospitalSettings {
    id: string;
    name: string;
    code: string;
    registrationNo: string | null;
    licenseNo: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    pinCode: string | null;
    country: string;
    timezone: string;
    currency: string;
    gstNumber: string | null;
    panNumber: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
}

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

export default function HospitalSettingsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState<Partial<HospitalSettings>>({});

    useEffect(() => {
        fetchHospitalSettings();
    }, []);

    const fetchHospitalSettings = async () => {
        try {
            const response = await api.get<HospitalSettings>('/settings/hospital');
            if (response.success) {
                setFormData(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch hospital settings:', err);
            setError('Failed to load hospital settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const updateData = {
                name: formData.name,
                registrationNo: formData.registrationNo || null,
                licenseNo: formData.licenseNo || null,
                email: formData.email || null,
                phone: formData.phone || null,
                website: formData.website || null,
                addressLine1: formData.addressLine1 || null,
                addressLine2: formData.addressLine2 || null,
                city: formData.city || null,
                district: formData.district || null,
                state: formData.state || null,
                pinCode: formData.pinCode || null,
                gstNumber: formData.gstNumber || null,
                panNumber: formData.panNumber || null,
                primaryColor: formData.primaryColor || null,
                timezone: formData.timezone,
            };

            const response = await api.put<HospitalSettings>('/settings/hospital', updateData);
            if (response.success) {
                setSuccess('Hospital settings updated successfully');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to update settings';
            setError(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof HospitalSettings, value: string | null) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
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
                        <Building2 className="w-7 h-7 text-primary" />
                        Hospital Settings
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure hospital information, branding, and contact details
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

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Hospital Name *</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => handleChange('name', e.target.value)}
                                required
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Hospital Code</label>
                            <input
                                type="text"
                                value={formData.code || ''}
                                disabled
                                className="w-full h-10 px-3 rounded-lg border border-border bg-muted text-muted-foreground cursor-not-allowed"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Code cannot be changed</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Registration Number</label>
                            <input
                                type="text"
                                value={formData.registrationNo || ''}
                                onChange={(e) => handleChange('registrationNo', e.target.value)}
                                placeholder="Hospital registration number"
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">License Number</label>
                            <input
                                type="text"
                                value={formData.licenseNo || ''}
                                onChange={(e) => handleChange('licenseNo', e.target.value)}
                                placeholder="Healthcare license number"
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-primary" />
                        Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                <Mail className="w-4 h-4 inline mr-1" />
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="contact@hospital.com"
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                <Phone className="w-4 h-4 inline mr-1" />
                                Phone
                            </label>
                            <input
                                type="tel"
                                value={formData.phone || ''}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder="10-digit mobile number"
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                <Globe className="w-4 h-4 inline mr-1" />
                                Website
                            </label>
                            <input
                                type="url"
                                value={formData.website || ''}
                                onChange={(e) => handleChange('website', e.target.value)}
                                placeholder="https://www.hospital.com"
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Address
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Address Line 1</label>
                            <input
                                type="text"
                                value={formData.addressLine1 || ''}
                                onChange={(e) => handleChange('addressLine1', e.target.value)}
                                placeholder="Building, Street"
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Address Line 2</label>
                            <input
                                type="text"
                                value={formData.addressLine2 || ''}
                                onChange={(e) => handleChange('addressLine2', e.target.value)}
                                placeholder="Area, Landmark"
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">City</label>
                            <input
                                type="text"
                                value={formData.city || ''}
                                onChange={(e) => handleChange('city', e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">District</label>
                            <input
                                type="text"
                                value={formData.district || ''}
                                onChange={(e) => handleChange('district', e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">State</label>
                            <select
                                value={formData.state || ''}
                                onChange={(e) => handleChange('state', e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Select State</option>
                                {INDIAN_STATES.map((state) => (
                                    <option key={state} value={state}>
                                        {state}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">PIN Code</label>
                            <input
                                type="text"
                                value={formData.pinCode || ''}
                                onChange={(e) => handleChange('pinCode', e.target.value)}
                                placeholder="6-digit PIN"
                                maxLength={6}
                                pattern="\d{6}"
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>
                </div>

                {/* Tax Information */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Tax Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">GST Number</label>
                            <input
                                type="text"
                                value={formData.gstNumber || ''}
                                onChange={(e) => handleChange('gstNumber', e.target.value.toUpperCase())}
                                placeholder="22AAAAA0000A1Z5"
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">PAN Number</label>
                            <input
                                type="text"
                                value={formData.panNumber || ''}
                                onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                                placeholder="AAAAA0000A"
                                maxLength={10}
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>
                </div>

                {/* Branding */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">Branding</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Primary Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={formData.primaryColor || '#3b82f6'}
                                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                                    className="w-12 h-10 rounded-lg border border-border cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={formData.primaryColor || '#3b82f6'}
                                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                                    className="flex-1 h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Used for accent colors in the interface</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Logo URL</label>
                            <input
                                type="url"
                                value={formData.logoUrl || ''}
                                onChange={(e) => handleChange('logoUrl', e.target.value)}
                                placeholder="https://example.com/logo.png"
                                className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/settings')}
                        className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                </div>
            </form>
        </div>
    );
}
