import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';

// Layouts
import MainLayout from './components/layout/MainLayout';
// import AuthLayout from './components/layout/AuthLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsListPage from './pages/patients/PatientsListPage';
import PatientRegistrationPage from './pages/patients/PatientRegistrationPage';
import PatientDetailsPage from './pages/patients/PatientDetailsPage';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import QueueDisplayPage from './pages/appointments/QueueDisplayPage';
// OPD
import OpdDashboardPage from './pages/opd/OpdDashboardPage';
import DoctorWorkstationPage from './pages/opd/DoctorWorkstationPage';
import DoctorConsultationPage from './pages/opd/DoctorConsultationPage';

import IpdDashboardPage from './pages/ipd/IpdDashboardPage';
import AdmitPatientPage from './pages/ipd/AdmitPatientPage';
import IpdPatientPage from './pages/ipd/IpdPatientPage';
import DischargePage from './pages/ipd/DischargePage';
import UsersPage from './pages/users/UsersPage';
import EMRPage from './pages/emr/EMRPage';
import PharmacyPage from './pages/pharmacy/PharmacyPage';
import LaboratoryPage from './pages/lab/LaboratoryPage';
import BillingPage from './pages/billing/BillingPage';
import NewInvoicePage from './pages/billing/NewInvoicePage';
import InvoiceDetailsPage from './pages/billing/InvoiceDetailsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import HospitalSettingsPage from './pages/settings/HospitalSettingsPage';
import DepartmentManagementPage from './pages/settings/DepartmentManagementPage';
import RolesPermissionsPage from './pages/settings/RolesPermissionsPage';
import ModulesSettingsPage from './pages/settings/ModulesSettingsPage';

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/queue-display" element={<QueueDisplayPage />} />

                {/* Protected Routes */}
                <Route element={<MainLayout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Patients */}
                    <Route path="/patients" element={<PatientsListPage />} />
                    <Route path="/patients/register" element={<PatientRegistrationPage />} />
                    <Route path="/patients/:id" element={<PatientDetailsPage />} />

                    {/* Appointments */}
                    <Route path="/appointments" element={<AppointmentsPage />} />

                    {/* OPD */}
                    <Route path="/opd" element={<OpdDashboardPage />} />
                    <Route path="/opd/workstation" element={<DoctorWorkstationPage />} />
                    <Route path="/opd/consultation" element={<DoctorConsultationPage />} />

                    {/* IPD */}
                    <Route path="/ipd" element={<IpdDashboardPage />} />
                    <Route path="/ipd/admit" element={<AdmitPatientPage />} />
                    <Route path="/ipd/patient/:id" element={<IpdPatientPage />} />
                    <Route path="/ipd/discharge/:id" element={<DischargePage />} />

                    {/* EMR */}
                    <Route path="/emr" element={<EMRPage />} />

                    {/* Pharmacy & Lab */}
                    <Route path="/pharmacy" element={<PharmacyPage />} />
                    <Route path="/lab" element={<LaboratoryPage />} />

                    {/* Billing */}
                    <Route path="/billing" element={<BillingPage />} />
                    <Route path="/billing/new" element={<NewInvoicePage />} />
                    <Route path="/billing/invoices/:id" element={<InvoiceDetailsPage />} />

                    {/* Reports */}
                    <Route path="/reports" element={<ReportsPage />} />

                    {/* Users */}
                    <Route path="/users" element={<UsersPage />} />

                    {/* Settings */}
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/hospital" element={<HospitalSettingsPage />} />
                    <Route path="/settings/departments" element={<DepartmentManagementPage />} />
                    <Route path="/settings/roles" element={<RolesPermissionsPage />} />
                    <Route path="/settings/modules" element={<ModulesSettingsPage />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <Toaster />
        </AuthProvider>
    );
}

export default App;
