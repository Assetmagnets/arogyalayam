// Toaster component placeholder - using default React implementation
// In production, use shadcn/ui toast component

import { createContext, useContext, useState, ReactNode } from 'react';

interface Toast {
    id: string;
    message: string;
    type?: 'default' | 'success' | 'error' | 'warning';
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (message: string, type?: Toast['type']) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (message: string, type: Toast['type'] = 'default') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 5000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        return { toast: () => { } };
    }
    return {
        toast: (options: { title?: string; description?: string; variant?: string }) => {
            context.addToast(options.description || options.title || '');
        },
    };
}

export function Toaster() {
    // Simple placeholder - toasts would render here
    return null;
}
