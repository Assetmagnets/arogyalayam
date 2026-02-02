import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsListPage from './pages/patients/PatientsListPage';
import PatientRegistrationPage from './pages/patients/PatientRegistrationPage';
import PatientDetailsPage from './pages/patients/PatientDetailsPage';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import QueueDisplayPage from './pages/appointments/QueueDisplayPage';
import UsersPage from './pages/users/UsersPage';
import EMRPage from './pages/emr/EMRPage';
import PharmacyPage from './pages/pharmacy/PharmacyPage';
import LaboratoryPage from './pages/lab/LaboratoryPage';
import BillingPage from './pages/billing/BillingPage';
import SettingsPage from './pages/settings/SettingsPage';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Auth Routes */}
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                </Route>

                {/* Protected Routes */}
                <Route
                    element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Patients */}
                    <Route path="/patients" element={<PatientsListPage />} />
                    <Route path="/patients/register" element={<PatientRegistrationPage />} />
                    <Route path="/patients/:id" element={<PatientDetailsPage />} />

                    {/* Appointments */}
                    <Route path="/appointments" element={<AppointmentsPage />} />

                    {/* Users */}
                    <Route path="/users" element={<UsersPage />} />

                    {/* EMR */}
                    <Route path="/emr" element={<EMRPage />} />

                    {/* Pharmacy */}
                    <Route path="/pharmacy" element={<PharmacyPage />} />

                    {/* Laboratory */}
                    <Route path="/lab" element={<LaboratoryPage />} />

                    {/* Billing */}
                    <Route path="/billing" element={<BillingPage />} />

                    {/* Settings */}
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Public Routes */}
                <Route path="/queue-display" element={<QueueDisplayPage />} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <Toaster />
        </AuthProvider>
    );
}

export default App;
