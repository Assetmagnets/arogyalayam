// ============================================================================
// HMS Frontend - Dashboard Page
// Overview with key metrics and quick actions
// ============================================================================

import {
    Users,
    Calendar,
    Clock,
    DollarSign,
    TrendingUp,
    UserPlus,
    CalendarPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Stats cards data
const stats = [
    {
        name: 'Total Patients',
        value: '5,234',
        change: '+12.5%',
        trend: 'up',
        icon: Users,
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    {
        name: "Today's Appointments",
        value: '48',
        change: '+5.2%',
        trend: 'up',
        icon: Calendar,
        color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
    {
        name: 'Avg. Wait Time',
        value: '12 min',
        change: '-8.3%',
        trend: 'down',
        icon: Clock,
        color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    },
    {
        name: "Today's Revenue",
        value: '₹1,24,500',
        change: '+18.7%',
        trend: 'up',
        icon: DollarSign,
        color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    },
];

// Quick action buttons
const quickActions = [
    { name: 'Register Patient', href: '/patients/register', icon: UserPlus },
    { name: 'Book Appointment', href: '/appointments?action=book', icon: CalendarPlus },
];

// Recent appointments
const recentAppointments = [
    { id: 1, patient: 'Amit Patel', doctor: 'Dr. Rajesh Sharma', time: '09:30 AM', status: 'In Progress' },
    { id: 2, patient: 'Priya Singh', doctor: 'Dr. Meena Gupta', time: '10:00 AM', status: 'Waiting' },
    { id: 3, patient: 'Rahul Kumar', doctor: 'Dr. Rajesh Sharma', time: '10:15 AM', status: 'Waiting' },
    { id: 4, patient: 'Sunita Devi', doctor: 'Dr. Amit Verma', time: '10:30 AM', status: 'Scheduled' },
    { id: 5, patient: 'Vikram Yadav', doctor: 'Dr. Meena Gupta', time: '10:45 AM', status: 'Scheduled' },
];

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back! Here's an overview of today's activity.
                    </p>
                </div>
                <div className="flex gap-2">
                    {quickActions.map((action) => (
                        <Link
                            key={action.name}
                            to={action.href}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            <action.icon className="w-4 h-4" />
                            {action.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className="bg-card rounded-xl border border-border p-6 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <div className={cn('p-3 rounded-lg', stat.color)}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 text-xs font-medium',
                                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                )}
                            >
                                {stat.change}
                                <TrendingUp
                                    className={cn('w-3 h-3', stat.trend === 'down' && 'rotate-180')}
                                />
                            </span>
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-sm text-muted-foreground">{stat.name}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main content grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Today's Queue */}
                <div className="bg-card rounded-xl border border-border shadow-sm">
                    <div className="p-6 border-b border-border">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Today's Queue</h2>
                            <Link
                                to="/appointments"
                                className="text-sm text-primary hover:underline"
                            >
                                View all
                            </Link>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {recentAppointments.map((apt) => (
                                <div
                                    key={apt.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-primary font-medium text-sm">
                                                {apt.patient.split(' ').map(n => n[0]).join('')}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{apt.patient}</p>
                                            <p className="text-xs text-muted-foreground">{apt.doctor}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{apt.time}</p>
                                        <span
                                            className={cn(
                                                'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                                                apt.status === 'In Progress' && 'status-in-progress',
                                                apt.status === 'Waiting' && 'status-waiting',
                                                apt.status === 'Scheduled' && 'bg-gray-100 text-gray-700'
                                            )}
                                        >
                                            {apt.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Activity Overview */}
                <div className="bg-card rounded-xl border border-border shadow-sm">
                    <div className="p-6 border-b border-border">
                        <h2 className="font-semibold">Department Activity</h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {[
                                { name: 'General Medicine', patients: 24, color: 'bg-blue-500' },
                                { name: 'Cardiology', patients: 18, color: 'bg-red-500' },
                                { name: 'Orthopedics', patients: 12, color: 'bg-green-500' },
                                { name: 'Pediatrics', patients: 8, color: 'bg-purple-500' },
                            ].map((dept) => (
                                <div key={dept.name} className="flex items-center gap-4">
                                    <div className={cn('w-3 h-3 rounded-full', dept.color)} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium">{dept.name}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {dept.patients} patients
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={cn('h-full rounded-full', dept.color)}
                                                style={{ width: `${(dept.patients / 24) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
