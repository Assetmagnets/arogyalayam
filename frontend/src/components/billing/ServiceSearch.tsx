import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Service {
    id: string;
    name: string;
    code: string;
    baseRate: number;
    taxPercent: number;
    category?: string;
}

interface ServiceSearchProps {
    onSelect: (service: Service) => void;
    category?: string;
    className?: string;
}

export function ServiceSearch({ onSelect, category, className }: ServiceSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Service[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const searchServices = async () => {
            if (!query && !open) return;

            setLoading(true);
            try {
                const response = await api.get<Service[]>('/billing/services', {
                    params: { q: query, category }
                });
                if (response.success) {
                    setResults(response.data);
                }
            } catch (error) {
                console.error('Failed to search services', error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(searchServices, 300);
        return () => clearTimeout(debounce);
    }, [query, category, open]);

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
                    placeholder="Search services (name or code)..."
                    className="w-full pl-9 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {open && Array.isArray(results) && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto">
                    {results.map((service) => (
                        <button
                            key={service.id}
                            className="w-full text-left px-4 py-2 hover:bg-muted flex items-center justify-between group"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSelect(service);
                                setQuery('');
                                setOpen(false);
                            }}
                        >
                            <div>
                                <div className="font-medium text-foreground">{service.name}</div>
                                <div className="text-xs text-muted-foreground">{service.code} • {service.category}</div>
                            </div>
                            <div className="text-sm font-semibold text-primary">
                                ₹{Number(service.baseRate || 0).toFixed(2)}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
