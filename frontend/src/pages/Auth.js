import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

const ROLES = [
  { value: 'owner', label: 'Billboard Owner', desc: 'I own billboard/hoarding inventory' },
  { value: 'brand_manager', label: 'Brand Manager', desc: 'I buy billboard space for my brand' },
  { value: 'rep', label: 'Negotiation Rep', desc: 'I negotiate deals for a company' },
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', phone: '', role: 'owner'
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMode(searchParams.get('mode') === 'register' ? 'register' : 'login');
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await api.post('/auth/register', form);
        login(res.data.user, res.data.token);
        toast.success('Account created successfully!');
        navigate(res.data.user.company_id ? '/dashboard' : '/onboarding');
      } else {
        const res = await api.post('/auth/login', { email: form.email, password: form.password });
        login(res.data.user, res.data.token);
        toast.success(`Welcome back, ${res.data.user.full_name}!`);
        navigate(res.data.user.company_id ? '/dashboard' : '/onboarding');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="auth-page">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-xl" style={{ fontFamily: "'Public Sans', sans-serif" }}>ClearDeal</span>
        </Link>

        <div>
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: "'Public Sans', sans-serif" }}>
            Every deal, on record.<br />
            <span className="text-blue-400">Every price, justified.</span>
          </h2>
          <div className="space-y-4">
            {[
              'GST-verified companies only',
              'Immutable negotiation audit trail',
              'Price band enforcement for reps',
              'Automatic commission & invoice on payment',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                </div>
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-500 text-sm">India's first B2B billboard transparency platform</p>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors duration-150">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg" style={{ fontFamily: "'Public Sans', sans-serif" }}>ClearDeal</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Public Sans', sans-serif" }}>
            {mode === 'login' ? 'Sign in to ClearDeal' : 'Create your account'}
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              data-testid="toggle-auth-mode"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-150"
            >
              {mode === 'login' ? 'Register here' : 'Sign in'}
            </button>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Ramesh Sharma"
                    value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    data-testid="register-name-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    data-testid="register-phone-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your Role</label>
                  <div className="space-y-2">
                    {ROLES.map(role => (
                      <label
                        key={role.value}
                        data-testid={`role-option-${role.value}`}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors duration-150 ${
                          form.role === role.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={form.role === role.value}
                          onChange={e => setForm({ ...form, role: e.target.value })}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{role.label}</p>
                          <p className="text-xs text-slate-500">{role.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                data-testid="auth-email-input"
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  data-testid="auth-password-input"
                  className="w-full h-10 px-3 pr-10 rounded-md border border-slate-300 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="auth-submit-btn"
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors duration-150 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-400 text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            ClearDeal is GST compliant under CGST Act.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
