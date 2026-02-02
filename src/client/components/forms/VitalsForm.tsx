// ============================================================================
// HMS - Enterprise Hospital Management System
// Vitals Form Component
// Features: Real-time BMI calculation, shadcn/ui components, Zod validation
// ============================================================================

import React, { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ============================================================================
// ZOD VALIDATION SCHEMA
// ============================================================================

const vitalsFormSchema = z.object({
    heightCm: z.coerce
        .number()
        .min(30, 'Height must be at least 30 cm')
        .max(300, 'Height cannot exceed 300 cm')
        .optional()
        .or(z.literal('')),

    weightKg: z.coerce
        .number()
        .min(0.5, 'Weight must be at least 0.5 kg')
        .max(500, 'Weight cannot exceed 500 kg')
        .optional()
        .or(z.literal('')),

    bpSystolic: z.coerce
        .number()
        .int('Must be a whole number')
        .min(50, 'Systolic BP seems too low')
        .max(300, 'Systolic BP seems too high')
        .optional()
        .or(z.literal('')),

    bpDiastolic: z.coerce
        .number()
        .int('Must be a whole number')
        .min(30, 'Diastolic BP seems too low')
        .max(200, 'Diastolic BP seems too high')
        .optional()
        .or(z.literal('')),

    pulseRate: z.coerce
        .number()
        .int('Must be a whole number')
        .min(30, 'Pulse rate seems too low')
        .max(250, 'Pulse rate seems too high')
        .optional()
        .or(z.literal('')),

    respiratoryRate: z.coerce
        .number()
        .int('Must be a whole number')
        .min(5, 'Respiratory rate seems too low')
        .max(60, 'Respiratory rate seems too high')
        .optional()
        .or(z.literal('')),

    temperatureF: z.coerce
        .number()
        .min(90, 'Temperature seems too low')
        .max(110, 'Temperature seems too high')
        .optional()
        .or(z.literal('')),

    spO2: z.coerce
        .number()
        .int('Must be a whole number')
        .min(50, 'SpO2 seems too low')
        .max(100, 'SpO2 cannot exceed 100%')
        .optional()
        .or(z.literal('')),

    bloodSugarFasting: z.coerce.number().min(20).max(700).optional().or(z.literal('')),
    bloodSugarPP: z.coerce.number().min(20).max(700).optional().or(z.literal('')),
    bloodSugarRandom: z.coerce.number().min(20).max(700).optional().or(z.literal('')),

    painScore: z.coerce
        .number()
        .int('Must be a whole number')
        .min(0, 'Pain score cannot be negative')
        .max(10, 'Pain score cannot exceed 10')
        .optional()
        .or(z.literal('')),

    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
}).refine(
    (data: {
        bpSystolic?: number | '' | undefined;
        bpDiastolic?: number | '' | undefined;
    }) => {
        if (data.bpSystolic && data.bpDiastolic) {
            return Number(data.bpSystolic) > Number(data.bpDiastolic);
        }
        return true;
    },
    {
        message: 'Systolic BP must be greater than diastolic BP',
        path: ['bpSystolic'],
    }
);

type VitalsFormData = z.infer<typeof vitalsFormSchema>;

// ============================================================================
// BMI CALCULATION UTILITIES
// ============================================================================

type BMICategory =
    | 'Underweight'
    | 'Normal'
    | 'Overweight'
    | 'Obese Class I'
    | 'Obese Class II'
    | 'Obese Class III';

interface BMIResult {
    value: number;
    category: BMICategory;
    isHealthy: boolean;
    colorClass: string;
    bgColorClass: string;
}

/**
 * Calculate BMI and determine category
 * @param heightCm Height in centimeters
 * @param weightKg Weight in kilograms
 * @returns BMI result with value, category, and styling classes
 */
function calculateBMI(heightCm: number, weightKg: number): BMIResult | null {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
        return null;
    }

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    const roundedBmi = Math.round(bmi * 10) / 10;

    let category: BMICategory;
    let isHealthy = false;
    let colorClass: string;
    let bgColorClass: string;

    if (roundedBmi < 18.5) {
        category = 'Underweight';
        colorClass = 'text-amber-600';
        bgColorClass = 'bg-amber-50 border-amber-200';
    } else if (roundedBmi < 25) {
        category = 'Normal';
        isHealthy = true;
        colorClass = 'text-green-600';
        bgColorClass = 'bg-green-50 border-green-200';
    } else if (roundedBmi < 30) {
        category = 'Overweight';
        colorClass = 'text-orange-600';
        bgColorClass = 'bg-orange-50 border-orange-200';
    } else if (roundedBmi < 35) {
        category = 'Obese Class I';
        colorClass = 'text-red-500';
        bgColorClass = 'bg-red-50 border-red-200';
    } else if (roundedBmi < 40) {
        category = 'Obese Class II';
        colorClass = 'text-red-600';
        bgColorClass = 'bg-red-50 border-red-300';
    } else {
        category = 'Obese Class III';
        colorClass = 'text-red-700';
        bgColorClass = 'bg-red-100 border-red-400';
    }

    return { value: roundedBmi, category, isHealthy, colorClass, bgColorClass };
}

/**
 * Get vital status color based on value and normal ranges
 */
function getVitalStatusColor(type: string, value: number): string {
    switch (type) {
        case 'bp':
            // BP classification based on AHA guidelines
            if (value < 120) return 'text-green-600';
            if (value < 130) return 'text-yellow-600';
            if (value < 140) return 'text-orange-600';
            return 'text-red-600';
        case 'pulse':
            if (value >= 60 && value <= 100) return 'text-green-600';
            if (value >= 50 && value <= 110) return 'text-yellow-600';
            return 'text-red-600';
        case 'spO2':
            if (value >= 95) return 'text-green-600';
            if (value >= 90) return 'text-yellow-600';
            return 'text-red-600';
        case 'temp':
            if (value >= 97 && value <= 99) return 'text-green-600';
            if (value >= 95 && value <= 100.4) return 'text-yellow-600';
            return 'text-red-600';
        default:
            return 'text-gray-900';
    }
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface VitalsFormProps {
    /** Initial values for the form */
    defaultValues?: Partial<VitalsFormData>;
    /** Callback when form is submitted */
    onSubmit: (data: VitalsFormData) => void | Promise<void>;
    /** Callback when form is cancelled */
    onCancel?: () => void;
    /** Whether the form is in a loading/submitting state */
    isLoading?: boolean;
    /** Patient ID for context */
    patientId?: string;
    /** Whether to show extended fields (blood sugar, pain score) */
    showExtendedFields?: boolean;
    /** Custom class name for the form container */
    className?: string;
}

// ============================================================================
// FORM FIELD COMPONENT
// ============================================================================

interface FormFieldProps {
    label: string;
    name: keyof VitalsFormData;
    type?: 'text' | 'number' | 'textarea';
    placeholder?: string;
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
    error?: string;
    register: ReturnType<typeof useForm<VitalsFormData>>['register'];
    valueColorClass?: string;
    halfWidth?: boolean;
}

function FormField({
    label,
    name,
    type = 'number',
    placeholder,
    unit,
    min,
    max,
    step = 1,
    error,
    register,
    valueColorClass,
    halfWidth = false,
}: FormFieldProps) {
    const baseInputClass = `
    flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm
    ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium
    placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2
    focus-visible:ring-blue-500 focus-visible:ring-offset-2
    disabled:cursor-not-allowed disabled:opacity-50
    ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}
    ${valueColorClass || ''}
  `;

    return (
        <div className={`space-y-2 ${halfWidth ? 'w-1/2' : 'w-full'}`}>
            <label
                htmlFor={name as string}
                className="text-sm font-medium leading-none text-gray-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
                {label}
                {unit && <span className="ml-1 text-xs text-gray-500">({unit})</span>}
            </label>

            {type === 'textarea' ? (
                <textarea
                    id={name}
                    placeholder={placeholder}
                    className={`${baseInputClass} min-h-[80px] resize-none`}
                    {...register(name)}
                />
            ) : (
                <input
                    id={name}
                    type={type}
                    placeholder={placeholder}
                    min={min}
                    max={max}
                    step={step}
                    className={baseInputClass}
                    {...register(name)}
                />
            )}

            {error && (
                <p className="text-sm font-medium text-red-500">{error}</p>
            )}
        </div>
    );
}

// ============================================================================
// BMI DISPLAY COMPONENT
// ============================================================================

interface BMIDisplayProps {
    bmi: BMIResult | null;
}

function BMIDisplay({ bmi }: BMIDisplayProps) {
    if (!bmi) {
        return (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                <div className="text-center">
                    <p className="text-sm text-gray-500">
                        Enter height and weight to calculate BMI
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-lg border-2 p-4 transition-all ${bmi.bgColorClass}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">Body Mass Index</p>
                    <p className={`text-3xl font-bold ${bmi.colorClass}`}>
                        {bmi.value.toFixed(1)}
                    </p>
                </div>
                <div className="text-right">
                    <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${bmi.colorClass} ${bmi.bgColorClass}`}
                    >
                        {bmi.isHealthy ? '✓ ' : ''}{bmi.category}
                    </span>
                </div>
            </div>

            {/* BMI Scale Indicator */}
            <div className="mt-4">
                <div className="flex h-2 overflow-hidden rounded-full bg-gray-200">
                    <div className="w-[18.5%] bg-amber-400" title="Underweight" />
                    <div className="w-[6.5%] bg-green-500" title="Normal" />
                    <div className="w-[5%] bg-orange-400" title="Overweight" />
                    <div className="w-[5%] bg-red-400" title="Obese I" />
                    <div className="w-[5%] bg-red-500" title="Obese II" />
                    <div className="flex-1 bg-red-600" title="Obese III" />
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>0</span>
                    <span>18.5</span>
                    <span>25</span>
                    <span>30</span>
                    <span>35</span>
                    <span>40+</span>
                </div>
                {/* Position indicator */}
                <div className="relative mt-1">
                    <div
                        className={`absolute h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white ${bmi.colorClass.replace('text-', 'bg-')} shadow`}
                        style={{
                            left: `${Math.min(Math.max((bmi.value / 45) * 100, 2), 98)}%`,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN VITALS FORM COMPONENT
// ============================================================================

export function VitalsForm({
    defaultValues,
    onSubmit,
    onCancel,
    isLoading = false,
    showExtendedFields = false,
    className = '',
}: VitalsFormProps) {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<VitalsFormData>({
        resolver: zodResolver(vitalsFormSchema),
        defaultValues: {
            heightCm: '',
            weightKg: '',
            bpSystolic: '',
            bpDiastolic: '',
            pulseRate: '',
            respiratoryRate: '',
            temperatureF: '',
            spO2: '',
            bloodSugarFasting: '',
            bloodSugarPP: '',
            bloodSugarRandom: '',
            painScore: '',
            notes: '',
            ...defaultValues,
        },
    });

    // Watch height and weight for real-time BMI calculation
    const heightCm = useWatch({ control, name: 'heightCm' });
    const weightKg = useWatch({ control, name: 'weightKg' });
    const bpSystolic = useWatch({ control, name: 'bpSystolic' });
    const pulseRate = useWatch({ control, name: 'pulseRate' });
    const spO2 = useWatch({ control, name: 'spO2' });
    const temperatureF = useWatch({ control, name: 'temperatureF' });

    // Calculate BMI in real-time (client-side only, no server request)
    const bmiResult = useMemo(() => {
        const h = typeof heightCm === 'number' ? heightCm : parseFloat(String(heightCm));
        const w = typeof weightKg === 'number' ? weightKg : parseFloat(String(weightKg));

        if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
            return null;
        }

        return calculateBMI(h, w);
    }, [heightCm, weightKg]);

    // Get dynamic color classes for vitals
    const bpColorClass = bpSystolic && !isNaN(Number(bpSystolic))
        ? getVitalStatusColor('bp', Number(bpSystolic))
        : '';
    const pulseColorClass = pulseRate && !isNaN(Number(pulseRate))
        ? getVitalStatusColor('pulse', Number(pulseRate))
        : '';
    const spO2ColorClass = spO2 && !isNaN(Number(spO2))
        ? getVitalStatusColor('spO2', Number(spO2))
        : '';
    const tempColorClass = temperatureF && !isNaN(Number(temperatureF))
        ? getVitalStatusColor('temp', Number(temperatureF))
        : '';

    const handleFormSubmit = async (data: VitalsFormData) => {
        // Add calculated BMI to the submission
        const submissionData = {
            ...data,
            bmiValue: bmiResult?.value,
            bmiCategory: bmiResult?.category,
        };
        await onSubmit(submissionData as VitalsFormData);
    };

    const buttonDisabled = isLoading || isSubmitting;

    return (
        <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className={`space-y-6 ${className}`}
        >
            {/* Section: Anthropometry & BMI */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Anthropometry
                </h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <FormField
                                label="Height"
                                name="heightCm"
                                unit="cm"
                                placeholder="170"
                                min={30}
                                max={300}
                                error={errors.heightCm?.message}
                                register={register}
                                halfWidth
                            />
                            <FormField
                                label="Weight"
                                name="weightKg"
                                unit="kg"
                                placeholder="70"
                                min={0.5}
                                max={500}
                                step={0.1}
                                error={errors.weightKg?.message}
                                register={register}
                                halfWidth
                            />
                        </div>
                    </div>

                    <BMIDisplay bmi={bmiResult} />
                </div>
            </div>

            {/* Section: Cardiovascular */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Cardiovascular
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField
                        label="BP Systolic"
                        name="bpSystolic"
                        unit="mmHg"
                        placeholder="120"
                        min={50}
                        max={300}
                        error={errors.bpSystolic?.message}
                        register={register}
                        valueColorClass={bpColorClass}
                    />
                    <FormField
                        label="BP Diastolic"
                        name="bpDiastolic"
                        unit="mmHg"
                        placeholder="80"
                        min={30}
                        max={200}
                        error={errors.bpDiastolic?.message}
                        register={register}
                    />
                    <FormField
                        label="Pulse Rate"
                        name="pulseRate"
                        unit="bpm"
                        placeholder="72"
                        min={30}
                        max={250}
                        error={errors.pulseRate?.message}
                        register={register}
                        valueColorClass={pulseColorClass}
                    />
                    <FormField
                        label="SpO2"
                        name="spO2"
                        unit="%"
                        placeholder="98"
                        min={50}
                        max={100}
                        error={errors.spO2?.message}
                        register={register}
                        valueColorClass={spO2ColorClass}
                    />
                </div>
            </div>

            {/* Section: Respiratory & Temperature */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Respiratory & Temperature
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                        label="Respiratory Rate"
                        name="respiratoryRate"
                        unit="breaths/min"
                        placeholder="16"
                        min={5}
                        max={60}
                        error={errors.respiratoryRate?.message}
                        register={register}
                    />
                    <FormField
                        label="Temperature"
                        name="temperatureF"
                        unit="°F"
                        placeholder="98.6"
                        min={90}
                        max={110}
                        step={0.1}
                        error={errors.temperatureF?.message}
                        register={register}
                        valueColorClass={tempColorClass}
                    />
                </div>
            </div>

            {/* Section: Extended Fields (Blood Sugar, Pain) */}
            {showExtendedFields && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        Blood Sugar & Pain Assessment
                    </h3>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <FormField
                            label="Fasting Blood Sugar"
                            name="bloodSugarFasting"
                            unit="mg/dL"
                            placeholder="90"
                            min={20}
                            max={700}
                            error={errors.bloodSugarFasting?.message}
                            register={register}
                        />
                        <FormField
                            label="Post-Prandial (PP)"
                            name="bloodSugarPP"
                            unit="mg/dL"
                            placeholder="140"
                            min={20}
                            max={700}
                            error={errors.bloodSugarPP?.message}
                            register={register}
                        />
                        <FormField
                            label="Random Blood Sugar"
                            name="bloodSugarRandom"
                            unit="mg/dL"
                            placeholder="110"
                            min={20}
                            max={700}
                            error={errors.bloodSugarRandom?.message}
                            register={register}
                        />
                        <FormField
                            label="Pain Score"
                            name="painScore"
                            unit="0-10"
                            placeholder="0"
                            min={0}
                            max={10}
                            error={errors.painScore?.message}
                            register={register}
                        />
                    </div>
                </div>
            )}

            {/* Section: Notes */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Additional Notes
                </h3>

                <FormField
                    label="Notes"
                    name="notes"
                    type="textarea"
                    placeholder="Any additional observations..."
                    error={errors.notes?.message}
                    register={register}
                />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={buttonDisabled}
                        className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={buttonDisabled}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isLoading || isSubmitting ? (
                        <>
                            <svg
                                className="mr-2 h-4 w-4 animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Saving...
                        </>
                    ) : (
                        'Save Vitals'
                    )}
                </button>
            </div>
        </form>
    );
}

export default VitalsForm;
