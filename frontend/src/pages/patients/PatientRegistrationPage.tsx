// ============================================================================
// HMS Frontend - Patient Registration Page
// Comprehensive patient registration form with Indian context
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
    UserPlus,
    ArrowLeft,
    User,
    Phone,
    MapPin,
    Shield,
    Heart,
    Save,
    Loader2,
} from 'lucide-react';

// Indian states list
const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
];

const BLOOD_GROUPS = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN'];
const BLOOD_GROUP_LABELS: Record<string, string> = {
    'A_POSITIVE': 'A+', 'A_NEGATIVE': 'A-', 'B_POSITIVE': 'B+', 'B_NEGATIVE': 'B-',
    'AB_POSITIVE': 'AB+', 'AB_NEGATIVE': 'AB-', 'O_POSITIVE': 'O+', 'O_NEGATIVE': 'O-', 'UNKNOWN': 'Unknown'
};

const PATIENT_TYPES = [
    { value: 'CASH', label: 'Cash', description: 'Self-paying patient' },
    { value: 'INSURANCE', label: 'Insurance', description: 'Private insurance' },
    { value: 'PMJAY', label: 'PMJAY', description: 'Ayushman Bharat scheme' },
    { value: 'CORPORATE', label: 'Corporate', description: 'Corporate tie-up' },
];

interface FormData {
    // Personal
    firstName: string;
    middleName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string;
    bloodGroup: string;
    maritalStatus: string;
    occupation: string;
    // Contact
    mobilePrimary: string;
    mobileSecondary: string;
    email: string;
    emergencyContact: string;
    emergencyContactName: string;
    emergencyRelation: string;
    // Address
    houseNo: string;
    street: string;
    area: string;
    landmark: string;
    city: string;
    district: string;
    state: string;
    pinCode: string;
    // Identity
    aadhaarNumber: string;
    abhaId: string;
    // Insurance
    patientType: string;
    insuranceNumber: string;
    // Medical
    allergies: string;
    chronicConditions: string;
    // Preferences
    preferredLanguage: string;
    smsConsent: boolean;
    whatsappConsent: boolean;
}

const initialFormData: FormData = {
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    bloodGroup: 'UNKNOWN',
    maritalStatus: '',
    occupation: '',
    mobilePrimary: '',
    mobileSecondary: '',
    email: '',
    emergencyContact: '',
    emergencyContactName: '',
    emergencyRelation: '',
    houseNo: '',
    street: '',
    area: '',
    landmark: '',
    city: '',
    district: '',
    state: '',
    pinCode: '',
    aadhaarNumber: '',
    abhaId: '',
    patientType: 'CASH',
    insuranceNumber: '',
    allergies: '',
    chronicConditions: '',
    preferredLanguage: 'en',
    smsConsent: true,
    whatsappConsent: false,
};

export default function PatientRegistrationPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeSection, setActiveSection] = useState('personal');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateForm = (): string | null => {
        if (!formData.firstName.trim()) return 'First name is required';
        if (!formData.lastName.trim()) return 'Last name is required';
        if (!formData.gender) return 'Gender is required';
        if (!formData.dateOfBirth) return 'Date of birth is required';
        if (!formData.mobilePrimary.match(/^[6-9]\d{9}$/)) return 'Valid 10-digit mobile number is required';
        if (!formData.city.trim()) return 'City is required';
        if (!formData.district.trim()) return 'District is required';
        if (!formData.state) return 'State is required';
        if (!formData.pinCode.match(/^[1-9]\d{5}$/)) return 'Valid 6-digit PIN code is required (first digit cannot be 0)';
        if (formData.aadhaarNumber && !formData.aadhaarNumber.match(/^\d{12}$/)) return 'Aadhaar must be 12 digits';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        try {
            const payload = {
                firstName: formData.firstName.trim(),
                middleName: formData.middleName.trim() || undefined,
                lastName: formData.lastName.trim(),
                gender: formData.gender,
                dateOfBirth: formData.dateOfBirth,
                bloodGroup: formData.bloodGroup || undefined,
                maritalStatus: formData.maritalStatus || undefined,
                occupation: formData.occupation || undefined,
                mobilePrimary: formData.mobilePrimary,
                mobileSecondary: formData.mobileSecondary || undefined,
                email: formData.email || undefined,
                emergencyContact: formData.emergencyContact || undefined,
                emergencyContactName: formData.emergencyContactName || undefined,
                emergencyRelation: formData.emergencyRelation || undefined,
                houseNo: formData.houseNo || undefined,
                street: formData.street || undefined,
                area: formData.area || undefined,
                landmark: formData.landmark || undefined,
                city: formData.city,
                district: formData.district,
                state: formData.state,
                pinCode: formData.pinCode,
                aadhaarNumber: formData.aadhaarNumber || undefined,
                abhaId: formData.abhaId || undefined,
                patientType: formData.patientType,
                insuranceNumber: formData.insuranceNumber || undefined,
                allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : [],
                chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(',').map(c => c.trim()) : [],
                preferredLanguage: formData.preferredLanguage,
                smsConsent: formData.smsConsent,
                whatsappConsent: formData.whatsappConsent,
            };

            const response = await api.post<{ id: string; uhid: string }>('/patients', payload);

            if (response.success) {
                navigate(`/patients/${response.data.id}`, {
                    state: { message: `Patient registered successfully. UHID: ${response.data.uhid}` }
                });
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to register patient';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const sections = [
        { id: 'personal', label: 'Personal', icon: User },
        { id: 'contact', label: 'Contact', icon: Phone },
        { id: 'address', label: 'Address', icon: MapPin },
        { id: 'identity', label: 'Identity', icon: Shield },
        { id: 'medical', label: 'Medical', icon: Heart },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/patients')}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <UserPlus className="w-7 h-7 text-primary" />
                        Patient Registration
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Register a new patient in the system
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                    {error}
                </div>
            )}

            {/* Section Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {sections.map(section => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeSection === section.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                            }`}
                    >
                        <section.icon className="w-4 h-4" />
                        {section.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                    {/* Personal Details */}
                    {activeSection === 'personal' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Personal Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        required
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Middle Name</label>
                                    <input
                                        type="text"
                                        name="middleName"
                                        value={formData.middleName}
                                        onChange={handleChange}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        required
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Gender *</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        required
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">Select</option>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date of Birth *</label>
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        onChange={handleChange}
                                        required
                                        max={new Date().toISOString().split('T')[0]}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Blood Group</label>
                                    <select
                                        name="bloodGroup"
                                        value={formData.bloodGroup}
                                        onChange={handleChange}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        {BLOOD_GROUPS.map(bg => (
                                            <option key={bg} value={bg}>{BLOOD_GROUP_LABELS[bg]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Marital Status</label>
                                    <select
                                        name="maritalStatus"
                                        value={formData.maritalStatus}
                                        onChange={handleChange}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">Select</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Divorced">Divorced</option>
                                        <option value="Widowed">Widowed</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Occupation</label>
                                <input
                                    type="text"
                                    name="occupation"
                                    value={formData.occupation}
                                    onChange={handleChange}
                                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                        </div>
                    )}

                    {/* Contact Information */}
                    {activeSection === 'contact' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Phone className="w-5 h-5 text-primary" />
                                Contact Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Mobile Number *</label>
                                    <input
                                        type="tel"
                                        name="mobilePrimary"
                                        value={formData.mobilePrimary}
                                        onChange={handleChange}
                                        required
                                        placeholder="10-digit mobile"
                                        maxLength={10}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Alternate Mobile</label>
                                    <input
                                        type="tel"
                                        name="mobileSecondary"
                                        value={formData.mobileSecondary}
                                        onChange={handleChange}
                                        maxLength={10}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>
                            <div className="border-t pt-4 mt-4">
                                <h4 className="font-medium mb-3">Emergency Contact</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Contact Name</label>
                                        <input
                                            type="text"
                                            name="emergencyContactName"
                                            value={formData.emergencyContactName}
                                            onChange={handleChange}
                                            className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Contact Number</label>
                                        <input
                                            type="tel"
                                            name="emergencyContact"
                                            value={formData.emergencyContact}
                                            onChange={handleChange}
                                            maxLength={10}
                                            className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Relation</label>
                                        <select
                                            name="emergencyRelation"
                                            value={formData.emergencyRelation}
                                            onChange={handleChange}
                                            className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            <option value="">Select</option>
                                            <option value="Spouse">Spouse</option>
                                            <option value="Parent">Parent</option>
                                            <option value="Child">Child</option>
                                            <option value="Sibling">Sibling</option>
                                            <option value="Friend">Friend</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-6 pt-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="smsConsent"
                                        checked={formData.smsConsent}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-border"
                                    />
                                    <span className="text-sm">SMS Consent</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="whatsappConsent"
                                        checked={formData.whatsappConsent}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-border"
                                    />
                                    <span className="text-sm">WhatsApp Consent</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Address */}
                    {activeSection === 'address' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-primary" />
                                Address Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">House/Flat No</label>
                                    <input
                                        type="text"
                                        name="houseNo"
                                        value={formData.houseNo}
                                        onChange={handleChange}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Street</label>
                                    <input
                                        type="text"
                                        name="street"
                                        value={formData.street}
                                        onChange={handleChange}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Area/Locality</label>
                                    <input
                                        type="text"
                                        name="area"
                                        value={formData.area}
                                        onChange={handleChange}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Landmark</label>
                                    <input
                                        type="text"
                                        name="landmark"
                                        value={formData.landmark}
                                        onChange={handleChange}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">City *</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        required
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">District *</label>
                                    <input
                                        type="text"
                                        name="district"
                                        value={formData.district}
                                        onChange={handleChange}
                                        required
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">State *</label>
                                    <select
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        required
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">Select State</option>
                                        {INDIAN_STATES.map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">PIN Code *</label>
                                    <input
                                        type="text"
                                        name="pinCode"
                                        value={formData.pinCode}
                                        onChange={handleChange}
                                        required
                                        maxLength={6}
                                        placeholder="6 digits"
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Identity & Insurance */}
                    {activeSection === 'identity' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                Identity & Insurance
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Aadhaar Number</label>
                                    <input
                                        type="text"
                                        name="aadhaarNumber"
                                        value={formData.aadhaarNumber}
                                        onChange={handleChange}
                                        maxLength={12}
                                        placeholder="12-digit Aadhaar"
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ABHA ID</label>
                                    <input
                                        type="text"
                                        name="abhaId"
                                        value={formData.abhaId}
                                        onChange={handleChange}
                                        placeholder="Ayushman Bharat Health Account"
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>
                            <div className="border-t pt-4 mt-4">
                                <h4 className="font-medium mb-3">Patient Type</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {PATIENT_TYPES.map(type => (
                                        <label
                                            key={type.value}
                                            className={`flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-colors ${formData.patientType === type.value
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/50'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="patientType"
                                                value={type.value}
                                                checked={formData.patientType === type.value}
                                                onChange={handleChange}
                                                className="sr-only"
                                            />
                                            <span className="font-medium">{type.label}</span>
                                            <span className="text-xs text-muted-foreground">{type.description}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {(formData.patientType === 'INSURANCE' || formData.patientType === 'CORPORATE') && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Insurance/Policy Number</label>
                                    <input
                                        type="text"
                                        name="insuranceNumber"
                                        value={formData.insuranceNumber}
                                        onChange={handleChange}
                                        className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Medical History */}
                    {activeSection === 'medical' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Heart className="w-5 h-5 text-primary" />
                                Medical Information
                            </h3>
                            <div>
                                <label className="block text-sm font-medium mb-1">Known Allergies</label>
                                <textarea
                                    name="allergies"
                                    value={formData.allergies}
                                    onChange={handleChange}
                                    placeholder="Enter allergies separated by commas (e.g., Penicillin, Dust, Peanuts)"
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Chronic Conditions</label>
                                <textarea
                                    name="chronicConditions"
                                    value={formData.chronicConditions}
                                    onChange={handleChange}
                                    placeholder="Enter conditions separated by commas (e.g., Diabetes, Hypertension)"
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Preferred Language</label>
                                <select
                                    name="preferredLanguage"
                                    value={formData.preferredLanguage}
                                    onChange={handleChange}
                                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="en">English</option>
                                    <option value="hi">Hindi</option>
                                    <option value="mr">Marathi</option>
                                    <option value="gu">Gujarati</option>
                                    <option value="bn">Bengali</option>
                                    <option value="ta">Tamil</option>
                                    <option value="te">Telugu</option>
                                    <option value="kn">Kannada</option>
                                    <option value="ml">Malayalam</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4 mt-6">
                    <button
                        type="button"
                        onClick={() => navigate('/patients')}
                        className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Registering...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Register Patient
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
