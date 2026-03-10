import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import BillboardBrowse from './pages/BillboardBrowse';
import BillboardDetail from './pages/BillboardDetail';
import CreateListing from './pages/CreateListing';
import Negotiation from './pages/Negotiation';
import InviteAccept from './pages/InviteAccept';
import RepPerformance from './pages/RepPerformance';
import Campaigns from './pages/Campaigns';

import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-500 text-sm">Loading ClearDeal...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-500 text-sm">Loading ClearDeal...</p>
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/auth" element={user ? <Navigate to={user.company_id ? "/dashboard" : "/onboarding"} replace /> : <Auth />} />
      <Route path="/invite/:inviteId" element={<InviteAccept />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/browse" element={<ProtectedRoute><BillboardBrowse /></ProtectedRoute>} />
      <Route path="/billboards/new" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
      <Route path="/billboards/:id" element={<ProtectedRoute><BillboardDetail /></ProtectedRoute>} />
      <Route path="/deals/:id" element={<ProtectedRoute><Negotiation /></ProtectedRoute>} />
      <Route path="/rep-performance" element={<ProtectedRoute><RepPerformance /></ProtectedRoute>} />
      <Route path="/rep-performance/:repId" element={<ProtectedRoute><RepPerformance /></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
