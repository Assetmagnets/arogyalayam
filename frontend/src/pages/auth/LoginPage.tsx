// ============================================================================
// HMS Frontend - Login Page (Redesigned)
// Tech-Savvy, Professional, AI-Themed Interface
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Eye,
    EyeOff,
    Loader2,
    Activity,
    ShieldCheck,
    Cpu,
    Lock,
    Mail,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        setError(null);
        try {
            await login(data.email, data.password);
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Login failed:', err);
            setError(err.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full grid lg:grid-cols-2">
            {/* Left Panel - Tech/Brand Showcase */}
            <div className="hidden lg:flex relative flex-col items-center justify-center p-12 overflow-hidden bg-slate-950 text-white">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-slate-950 opacity-80" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay" />

                {/* Animated Tech Grid Overlay (Simulated) */}
                <div className="absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}></div>

                {/* Content */}
                <div className="relative z-10 max-w-lg text-center space-y-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 shadow-2xl shadow-blue-500/20 mb-6 group transition-transform hover:scale-105 duration-500">
                        <Activity className="w-10 h-10 text-white" />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-200">
                        AROGYALAYAM
                    </h1>

                    <p className="text-lg text-slate-300/90 leading-relaxed font-light">
                        Next-generation healthcare management powered by advanced intelligence.
                        Streamlining operations for a healthier tomorrow.
                    </p>

                    <div className="grid grid-cols-2 gap-4 pt-8">
                        <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors">
                            <ShieldCheck className="w-6 h-6 text-cyan-400" />
                            <span className="text-sm font-medium">Secure EMR</span>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors">
                            <Cpu className="w-6 h-6 text-purple-400" />
                            <span className="text-sm font-medium">AI Analytics</span>
                        </div>
                    </div>
                </div>

                {/* Footer Copyright on Left */}
                <div className="absolute bottom-6 text-xs text-slate-500">
                    © 2026 Assetmagnets. All rights reserved.
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex flex-col justify-center items-center p-6 sm:p-12 bg-background relative">
                {/* Mobile Background Accent (Visible only on small screens) */}
                <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-slate-900 to-slate-800 -z-10" />

                <div className="w-full max-w-md space-y-10 bg-card/95 lg:bg-transparent p-8 lg:p-0 rounded-2xl shadow-2xl lg:shadow-none backdrop-blur-md lg:backdrop-blur-none border border-white/10 lg:border-none">
                    <div className="text-center space-y-2 lg:text-left">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex justify-center mb-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 shadow-lg">
                                <Activity className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-slate-900 dark:text-white">
                            Welcome Back
                        </h2>
                        <p className="text-muted-foreground lg:text-slate-500">
                            Enter your credentials to access your dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-2.5 text-muted-foreground">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <input
                                        {...register('email')}
                                        id="email"
                                        type="email"
                                        placeholder="admin@hospital.com"
                                        className={cn(
                                            "flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                                            errors.email && "border-red-500 focus-visible:ring-red-500"
                                        )}
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-sm text-red-500">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                                        Password
                                    </label>
                                    <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                                        Forgot password?
                                    </a>
                                </div>
                                <div className="relative">
                                    <div className="absolute left-3 top-2.5 text-muted-foreground">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        {...register('password')}
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className={cn(
                                            "flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                                            errors.password && "border-red-500 focus-visible:ring-red-500"
                                        )}
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                        disabled={isLoading}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-sm text-red-500">{errors.password.message}</p>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full inline-flex items-center justify-center h-11 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    Sign In <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
