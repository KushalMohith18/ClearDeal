import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { toast } from 'sonner';
import { Building2, Shield, Loader2 } from 'lucide-react';

const InviteAccept = () => {
  const { inviteId } = useParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ password: '', phone: '' });

  useEffect(() => {
    const loadInvite = async () => {
      try {
        const res = await api.get(`/invites/${inviteId}`);
        setInvite(res.data);
      } catch {
        toast.error('This invite is invalid or expired');
      } finally {
        setLoading(false);
      }
    };
    loadInvite();
  }, [inviteId]);

  const handleAccept = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post(`/invites/${inviteId}/accept`, form);
      login(res.data.user, res.data.token);
      toast.success(`Welcome, ${res.data.user.full_name}! You're now a rep.`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );

  if (!invite) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Public Sans', sans-serif" }}>Invalid Invite</h2>
        <p className="text-slate-500 mb-6">This invite link is invalid or has already been used.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">Return to Home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4" data-testid="invite-accept-page">
      <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-md w-full">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg" style={{ fontFamily: "'Public Sans', sans-serif" }}>ClearDeal</span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">You've been invited as a Negotiation Rep</span>
          </div>
          <p className="text-sm text-blue-700">For: <span className="font-semibold">{invite.full_name}</span></p>
          <p className="text-sm text-blue-700">Email: <span className="font-mono">{invite.email}</span></p>
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel" required placeholder="+91 98765 43210"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              data-testid="invite-phone-input"
              className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Create Password</label>
            <input
              type="password" required minLength={6} placeholder="Minimum 6 characters"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              data-testid="invite-password-input"
              className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit" disabled={submitting}
            data-testid="accept-invite-btn"
            className="w-full h-10 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Accept Invite & Join ClearDeal
          </button>
        </form>
      </div>
    </div>
  );
};

export default InviteAccept;
