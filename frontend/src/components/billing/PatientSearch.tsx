import { useState, useEffect } from 'react';
import { Search, Loader2, User } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    uhid: string;
    mobilePrimary: string;
    city: string;
}

interface PatientSearchProps {
    onSelect: (patient: Patient) => void;
    className?: string;
}

export function PatientSearch({ onSelect, className }: PatientSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const searchPatients = async () => {
            if (!query && !open) return;
            // Only search if 3+ chars for performance
            if (query.length < 3) return;

            setLoading(true);
            try {
                // Determine if query is mobile or name
                const params: any = { limit: 5 };
                if (/^\d+$/.test(query)) {
                    params.mobile = query;
                } else if (query.startsWith('HOS') || query.startsWith('PAT')) {
                    params.uhid = query;
                } else {
                    params.name = query;
                }

                const response = await api.get<Patient[]>('/patients', { params });
                if (response.success) {
                    setResults(response.data);
                }
            } catch (error) {
                console.error('Failed to search patients', error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(searchPatients, 400);
        return () => clearTimeout(debounce);
    }, [query, open]);

    return (
        <div className={cn("relative", className)}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 200)}
                    placeholder="Search patient by Name, Mobile, or UHID..."
                    className="w-full pl-9 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {open && results.length > 0 && query.length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto">
                    {results.map((patient) => (
                        <button
                            key={patient.id}
                            className="w-full text-left px-4 py-3 hover:bg-muted flex items-start gap-3 group border-b last:border-0"
                            onClick={() => {
                                onSelect(patient);
                                setQuery('');
                                setOpen(false);
                            }}
                        >
                            <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0">
                                <User className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="font-medium text-foreground">{patient.firstName} {patient.lastName}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                    <span className="font-mono bg-muted px-1 rounded">{patient.uhid}</span>
                                    <span>•</span>
                                    <span>{patient.mobilePrimary}</span>
                                    <span>•</span>
                                    <span>{patient.city}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
