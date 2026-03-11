import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Clock, Mail, ArrowRight, LogOut } from 'lucide-react';

const RepWaiting = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>
            ClearDeal
          </h1>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Public Sans', sans-serif" }}>
            Welcome, {user?.full_name}!
          </h2>
          
          <p className="text-slate-600 mb-6">
            You're registered as a <span className="font-semibold text-blue-600">Negotiation Rep</span>.
            To start working, you need to be invited by a company.
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">How to join a company:</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <p className="text-sm text-slate-600">
                  Contact a <strong>Billboard Owner</strong> or <strong>Brand Manager</strong> you work with
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">2</span>
                </div>
                <p className="text-sm text-slate-600">
                  Ask them to invite you from their <strong>Dashboard → Invite Rep</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">3</span>
                </div>
                <p className="text-sm text-slate-600">
                  They'll enter your email: <strong className="text-blue-600">{user?.email}</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-emerald-600">✓</span>
                </div>
                <p className="text-sm text-slate-600">
                  Once invited, refresh this page to access your dashboard
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-6">
            <Mail className="w-4 h-4" />
            <span>Your registered email: <strong>{user?.email}</strong></span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
            >
              Check Status <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="h-10 px-4 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium rounded-md transition-colors duration-150 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400 text-center">
          Need help? Contact support@cleardeal.in
        </p>
      </div>
    </div>
  );
};

export default RepWaiting;
