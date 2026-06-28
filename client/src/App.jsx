import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import SpecialSchedule from './pages/SpecialSchedule';
import WeeklySchedule from './pages/WeeklySchedule';
import CalendarPage from './pages/Calendar';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import useNotification from './hooks/useNotification';

// Subcomponent to trigger the hooks after AuthProvider is initialized
const AppContent = () => {
  const { user, loading } = useAuth();
  
  // Initialize user notification checks in background
  useNotification();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070913]">
        <div className="flex flex-col items-center space-y-4">
          <span className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono">
            Booting Task Tracker Pro...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Dynamic navbar (only renders for logged-in users) */}
      <Navbar />
      
      <main className="relative z-10">
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" replace />}
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/" replace />}
          />
          <Route
            path="/forgot-password"
            element={!user ? <ForgotPassword /> : <Navigate to="/" replace />}
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={user ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/special-schedule"
            element={user ? <SpecialSchedule /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/weekly-schedule"
            element={user ? <WeeklySchedule /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/calendar"
            element={user ? <CalendarPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/profile"
            element={user ? <Profile /> : <Navigate to="/login" replace />}
          />

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
