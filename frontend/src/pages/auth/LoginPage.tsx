// ============================================================================
// HMS Frontend - Login Page
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        try {
            setError('');
            await login(data.email, data.password);
            navigate('/dashboard');
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Login failed. Please check your credentials.'
            );
        }
    };

    return (
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold">HMS</span>
                </div>
                <div>
                    <h1 className="font-bold text-lg">Hospital Management</h1>
                    <p className="text-muted-foreground text-xs">Enterprise System</p>
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
                <p className="text-muted-foreground mt-1">
                    Please enter your credentials to access the system.
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="admin@hms-hospital.com"
                        className={cn(
                            'w-full h-11 px-4 rounded-lg border bg-background text-sm transition-colors',
                            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                            errors.email
                                ? 'border-destructive focus:ring-destructive'
                                : 'border-input'
                        )}
                        {...register('email')}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className={cn(
                                'w-full h-11 px-4 pr-11 rounded-lg border bg-background text-sm transition-colors',
                                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                                errors.password
                                    ? 'border-destructive focus:ring-destructive'
                                    : 'border-input'
                            )}
                            {...register('password')}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <EyeOff className="w-5 h-5" />
                            ) : (
                                <Eye className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                </div>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                        />
                        <span className="text-sm text-muted-foreground">Remember me</span>
                    </label>
                    <a
                        href="#"
                        className="text-sm text-primary hover:underline font-medium"
                    >
                        Forgot password?
                    </a>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                        'w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium transition-colors',
                        'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'flex items-center justify-center gap-2'
                    )}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        'Sign in'
                    )}
                </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">Demo Credentials:</p>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">Admin</span>
                        <span className="font-mono">admin@hms-hospital.com / Admin@123</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">Reception</span>
                        <span className="font-mono">reception@hms-hospital.com / Reception@123</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
