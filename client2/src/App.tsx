import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { Toaster } from "@/components/ui/sonner"

// Layout components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import GroomerDashboardPage from './pages/GroomerDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import PetPage from './pages/PetPage';
import AppointmentPage from './pages/AppointmentPage';
import AppointmentDetailPage from './pages/AppointmentDetailPage';
import GroomerClientPage from './pages/GroomerClientPage';
import GroomerCalendarPage from './pages/GroomerCalendarPage';
import PetDetailPage from './pages/PetDetailPage';
import ServiceRatesPage from './pages/ServiceRatesPage';
import GroomingPolicyPage from './pages/GroomingPolicyPage';
import ProfilePage from './pages/ProfilePage';
import AdminClientsPage from './pages/AdminClientsPage';
import AdminClientDetailPage from './pages/AdminClientDetailPage';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Dashboard route component to handle role-based rendering
const Dashboard = () => {
  const { user } = useAuthStore();
  if (user?.role === 'admin') return <AdminDashboardPage />;
  return user?.role === 'groomer' ? <GroomerDashboardPage /> : <DashboardPage />;
};

const ClientsEntry = () => {
  const { user } = useAuthStore();
  if (user?.role === 'admin') {
    return <Navigate to="/admin/clients" replace />;
  }
  return <GroomerClientPage />;
};

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <main className="flex-1">
            <Routes>
              {/* Public routes - accessible to everyone */}
              <Route path="/" element={<HomePage />} />
              <Route path="/service-rates" element={<ServiceRatesPage />} />
              <Route path="/grooming-policy" element={<GroomingPolicyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              
              {/* Protected routes for all authenticated users */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>
              
              {/* Protected routes for pet owners only */}
              <Route element={<ProtectedRoute allowedRoles={["owner"]} />}>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/pets" element={<PetPage />} />
                <Route path="/appointments" element={<AppointmentPage />} />
                <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
              </Route>

              {/* Pet detail is shared so admins can update avatar from detail view */}
              <Route element={<ProtectedRoute allowedRoles={["owner", "admin"]} />}>
                <Route path="/pets/:petId" element={<PetDetailPage />} />
              </Route>
              
              {/* Protected routes for groomers only */}
              <Route element={<ProtectedRoute allowedRoles={["groomer", "admin"]} />}>
                <Route path="/clients" element={<ClientsEntry />} />
                <Route path="/calendar" element={<GroomerCalendarPage />} />
              </Route>

              {/* Protected routes for admins only (future expansion) */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/clients" element={<AdminClientsPage />} />
                <Route path="/admin/clients/:userId" element={<AdminClientDetailPage />} />
              </Route>
              
              {/* Fallback route - redirect to home for unauthenticated, dashboard for authenticated */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Toaster />
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
