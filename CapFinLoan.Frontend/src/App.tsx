import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { Landing } from './pages/public/Landing';
import { ApplicantDashboard } from './pages/applicant/Dashboard';
import { ApplicantApplications } from './pages/applicant/Applications';
import { NewApplication } from './pages/applicant/NewApplication';
import { ApplicationDetail } from './pages/applicant/ApplicationDetail';
import { ApplicantProfile } from './pages/applicant/Profile';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminDecision } from './pages/admin/AdminDecision';
import { AdminApplications } from './pages/admin/AdminApplications';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminPayments } from './pages/admin/AdminPayments';
import { ApplicantWallet } from './pages/applicant/Wallet';
import { ChatBot } from './components/ChatBot';

function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  // Zero-latency motion values instead of react state -> tween
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      cursorX.set(e.clientX - 6);
      cursorY.set(e.clientY - 6);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', updateMousePosition);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isVisible, cursorX, cursorY]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-3 h-3 bg-primary rounded-full pointer-events-none z-[9999] mix-blend-screen shadow-[0_0_10px_rgba(76,215,246,0.8)]"
      style={{
        x: cursorX,
        y: cursorY,
        opacity: isVisible ? 1 : 0
      }}
      transition={{ opacity: { duration: 0.2 } }}
    />
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* Applicant Routes */}
        <Route element={<ProtectedRoute allowedRole="APPLICANT" />}>
          <Route path="/dashboard" element={<ApplicantDashboard />} />
          <Route path="/applications" element={<ApplicantApplications />} />
          <Route path="/applications/new" element={<NewApplication />} />
          <Route path="/applications/:id" element={<ApplicationDetail />} />
          <Route path="/profile" element={<ApplicantProfile />} />
          <Route path="/wallet" element={<ApplicantWallet />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRole="ADMIN" />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/applications" element={<AdminApplications />} />
          <Route path="/admin/applications/:id" element={<AdminDecision />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
        </Route>

        {/* Fallback */}
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<div className="p-8 text-on-surface">404 Not Found</div>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CustomCursor />
        <BrowserRouter>
          <AnimatedRoutes />
          <ChatBot />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
