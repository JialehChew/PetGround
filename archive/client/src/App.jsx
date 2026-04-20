import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import { AuthProvider } from "./contexts/AuthContext";

// Components
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import PetPage from "./pages/PetPage";
import AppointmentPage from "./pages/AppointmentPage";
import GroomerSchedulePage from "./pages/GroomerSchedulePage";
import GroomerCalendarPage from "./pages/GroomerCalendarPage";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Protected routes for authenticated users */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
              
              {/* Protected routes for owners */}
              <Route element={<ProtectedRoute allowedRoles={["owner"]} />}>
                <Route path="/pets" element={<PetPage />} />
                <Route path="/appointments" element={<AppointmentPage />} />
              </Route>
              
              {/* Protected routes for groomers */}
              <Route element={<ProtectedRoute allowedRoles={["groomer"]} />}>
                <Route path="/schedule" element={<GroomerSchedulePage />} />
                <Route path="/calendar" element={<GroomerCalendarPage />} />
              </Route>
              
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
