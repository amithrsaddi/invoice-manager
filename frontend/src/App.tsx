import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Contacts from './pages/Contacts';
import Reports from './pages/Reports';
import Schedules from './pages/Schedules';
import AdditionalExpenses from './pages/AdditionalExpenses';
import Analytics from './pages/Analytics';
import Activity from './pages/Activity';
import Timesheets from './pages/Timesheets';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Generate from './pages/Generate';
import Settings from './pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="/additional-expenses" element={<AdditionalExpenses />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/activity" element={<Activity />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthProvider>
          <AuthenticatedApp />
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App