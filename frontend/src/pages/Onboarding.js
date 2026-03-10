import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Shield, Building2, CreditCard, ChevronRight, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, label: 'Company Details', icon: Building2 },
  { id: 2, label: 'GST & Aadhaar', icon: Shield },
  { id: 3, label: 'Bank Account', icon: CreditCard },
];

const COMPANY_TYPES = [
  { value: 'billboard_owner', label: 'Billboard Owner', desc: 'I own outdoor advertising inventory' },
  { value: 'brand', label: 'Brand / Agency', desc: 'I buy billboard space for campaigns' },
];

const Onboarding = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);

  const [companyForm, setCompanyForm] = useState({
    name: '',
    gst_number: '',
    director_name: '',
    company_type: user?.role === 'owner' ? 'billboard_owner' : 'brand',
    city: 'Hyderabad',
    address: '',
    phone: '',
    website: ''
  });

  const [gstVerified, setGstVerified] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarForm, setAadhaarForm] = useState({ aadhaar_number: '', director_name: companyForm.director_name });

  const [bankForm, setBankForm] = useState({
    account_number: '',
    ifsc_code: '',
    account_holder_name: ''
  });
  const [bankVerified, setBankVerified] = useState(false);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/companies', companyForm);
      setCompany(res.data);
      toast.success('Company registered!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyGST = async () => {
    setLoading(true);
    try {
      await api.post('/companies/verify-gst');
      setGstVerified(true);
      toast.success('GST verified successfully!');
    } catch (err) {
      toast.error('GST verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAadhaar = async (e) => {
    e.preventDefault();
    if (!aadhaarForm.aadhaar_number || aadhaarForm.aadhaar_number.length < 12) {
      toast.error('Enter valid 12-digit Aadhaar number');
      return;
    }
    setLoading(true);
    try {
      await api.post('/companies/verify-aadhaar', aadhaarForm);
      setAadhaarVerified(true);
      toast.success('Aadhaar verified via DigiLocker!');
    } catch (err) {
      toast.error('Aadhaar verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBank = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/companies/verify-bank', bankForm);
      setBankVerified(true);
      toast.success('Bank account verified via penny-drop!');
    } catch (err) {
      toast.error('Bank verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    await refreshUser();
    toast.success('Onboarding complete! Welcome to ClearDeal.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="onboarding-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>ClearDeal</span>
          <span className="text-slate-400 text-sm ml-2">— Company Setup</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-200 ${
                    step > s.id ? 'bg-emerald-600 text-white' : step === s.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${step >= s.id ? 'text-slate-900' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-4 ${step > s.id ? 'bg-emerald-400' : 'bg-slate-200'}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Company Details */}
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 slide-up" data-testid="step-company-details">
            <h2 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Public Sans', sans-serif" }}>Register Your Company</h2>
            <p className="text-slate-500 text-sm mb-6">This information will appear on all invoices and deal documents.</p>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text" required placeholder="Sharma Outdoor Advertising Pvt Ltd"
                  value={companyForm.name}
                  onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                  data-testid="company-name-input"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                  <input
                    type="text" required placeholder="27AAAAA0000A1Z5"
                    value={companyForm.gst_number}
                    onChange={e => setCompanyForm({ ...companyForm, gst_number: e.target.value.toUpperCase() })}
                    data-testid="gst-number-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Director/Owner Name</label>
                  <input
                    type="text" required placeholder="Ramesh Sharma"
                    value={companyForm.director_name}
                    onChange={e => setCompanyForm({ ...companyForm, director_name: e.target.value })}
                    data-testid="director-name-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {COMPANY_TYPES.map(ct => (
                    <label
                      key={ct.value}
                      data-testid={`company-type-${ct.value}`}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors duration-150 ${
                        companyForm.company_type === ct.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio" name="company_type" value={ct.value}
                        checked={companyForm.company_type === ct.value}
                        onChange={e => setCompanyForm({ ...companyForm, company_type: e.target.value })}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{ct.label}</p>
                        <p className="text-xs text-slate-500">{ct.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Registered Address</label>
                <input
                  type="text" required placeholder="Plot 45, Hitech City, Hyderabad - 500081"
                  value={companyForm.address}
                  onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
                  data-testid="company-address-input"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel" required placeholder="+91 98765 43210"
                    value={companyForm.phone}
                    onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    data-testid="company-phone-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Website (Optional)</label>
                  <input
                    type="url" placeholder="https://yourcompany.com"
                    value={companyForm.website}
                    onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={loading} data-testid="create-company-btn"
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue to Verification
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Step 2: GST & Aadhaar */}
        {step === 2 && (
          <div className="space-y-4 slide-up" data-testid="step-verification">
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>GST Verification</h3>
                  <p className="text-sm text-slate-500">Verify GST: <span className="font-mono text-blue-600">{companyForm.gst_number}</span></p>
                </div>
                {gstVerified && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>
              {!gstVerified ? (
                <button
                  onClick={handleVerifyGST} disabled={loading} data-testid="verify-gst-btn"
                  className="w-full h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Verify via GST Portal (Simulated)
                </button>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-sm text-emerald-700">
                  GST number verified. Your company is registered with GSTN.
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>Aadhaar Verification</h3>
                  <p className="text-sm text-slate-500">Director identity via DigiLocker</p>
                </div>
                {aadhaarVerified && (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>
              {!aadhaarVerified ? (
                <form onSubmit={handleVerifyAadhaar} className="space-y-3">
                  <input
                    type="text" required placeholder="12-digit Aadhaar Number"
                    maxLength={12}
                    value={aadhaarForm.aadhaar_number}
                    onChange={e => setAadhaarForm({ ...aadhaarForm, aadhaar_number: e.target.value.replace(/\D/g, '') })}
                    data-testid="aadhaar-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit" disabled={loading} data-testid="verify-aadhaar-btn"
                    className="w-full h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    Verify via DigiLocker (Simulated)
                  </button>
                </form>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-sm text-emerald-700">
                  Aadhaar verified. Director identity confirmed.
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!gstVerified || !aadhaarVerified}
              data-testid="proceed-to-bank-btn"
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
            >
              Continue to Bank Verification
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setStep(3)}
              className="w-full text-sm text-slate-500 hover:text-slate-700 py-2 transition-colors duration-150"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step 3: Bank Account */}
        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 slide-up" data-testid="step-bank">
            <h2 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Public Sans', sans-serif" }}>Bank Account Verification</h2>
            <p className="text-slate-500 text-sm mb-6">Required for receiving payments. Verified via ₹1 penny-drop (simulated).</p>

            {!bankVerified ? (
              <form onSubmit={handleVerifyBank} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text" required placeholder="12345678901234"
                    value={bankForm.account_number}
                    onChange={e => setBankForm({ ...bankForm, account_number: e.target.value })}
                    data-testid="bank-account-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text" required placeholder="HDFC0001234"
                    value={bankForm.ifsc_code}
                    onChange={e => setBankForm({ ...bankForm, ifsc_code: e.target.value.toUpperCase() })}
                    data-testid="ifsc-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
                  <input
                    type="text" required placeholder="As per bank records"
                    value={bankForm.account_holder_name}
                    onChange={e => setBankForm({ ...bankForm, account_holder_name: e.target.value })}
                    data-testid="account-holder-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-xs text-amber-800">A ₹1 test deposit will be made to verify your account. This is fully automated and refunded immediately.</p>
                </div>
                <button
                  type="submit" disabled={loading} data-testid="verify-bank-btn"
                  className="w-full h-10 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Verify Bank Account
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-900">Bank Account Verified!</span>
                  </div>
                  <p className="text-sm text-emerald-700">Account XXXX{bankForm.account_number.slice(-4)} • {bankForm.ifsc_code}</p>
                  <p className="text-sm text-emerald-700">{bankForm.account_holder_name}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-blue-900 text-sm">Your company is now Verified</p>
                      <p className="text-xs text-blue-700">You'll display a Verified Badge on all deals</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleFinish} data-testid="complete-onboarding-btn"
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete Setup & Go to Dashboard
                </button>
              </div>
            )}

            {!bankVerified && (
              <button
                onClick={handleFinish}
                className="w-full text-sm text-slate-500 hover:text-slate-700 mt-4 py-2 transition-colors duration-150"
              >
                Skip for now → Go to Dashboard
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
