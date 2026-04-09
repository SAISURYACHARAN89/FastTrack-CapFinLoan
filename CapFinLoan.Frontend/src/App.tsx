import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ApplicantDashboard } from './pages/applicant/Dashboard';
import { ApplicantApplications } from './pages/applicant/Applications';
import { NewApplication } from './pages/applicant/NewApplication';
import { ApplicationDetail } from './pages/applicant/ApplicationDetail';
import { ApplicantProfile } from './pages/applicant/Profile';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminDecision } from './pages/admin/AdminDecision';
import { AdminApplications } from './pages/admin/AdminApplications';
import { AdminReports } from './pages/admin/AdminReports';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* Applicant Routes */}
          <Route element={<ProtectedRoute allowedRole="APPLICANT" />}>
            <Route path="/dashboard" element={<ApplicantDashboard />} />
            <Route path="/applications" element={<ApplicantApplications />} />
            <Route path="/applications/new" element={<NewApplication />} />
            <Route path="/applications/:id" element={<ApplicationDetail />} />
            <Route path="/profile" element={<ApplicantProfile />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRole="ADMIN" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/applications/:id" element={<AdminDecision />} />
            <Route path="/admin/reports" element={<AdminReports />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<div className="p-8 text-on-surface">404 Not Found</div>} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
