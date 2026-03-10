import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { toast } from 'sonner';
import {
  LayoutDashboard, TrendingUp, Building2, FileText, Plus, Search,
  CheckCircle, Clock, XCircle, Users, DollarSign, BarChart2, Shield,
  ChevronRight, RefreshCw, Eye, AlertCircle, Settings, Star, UserX, UserCheck
} from 'lucide-react';

const statusColors = {
  negotiating: 'bg-amber-100 text-amber-800',
  pending_approval: 'bg-blue-100 text-blue-800',
  approved: 'bg-violet-100 text-violet-800',
  paid: 'bg-emerald-100 text-emerald-800',
  active: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-slate-100 text-slate-600',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels = {
  negotiating: 'Negotiating',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  paid: 'Paid',
  active: 'Active',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '₹0';

const DealRow = ({ deal }) => (
  <Link
    to={`/deals/${deal.id}`}
    data-testid={`deal-row-${deal.id}`}
    className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors duration-150 group"
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-900 truncate">{deal.billboard_title || 'Billboard Deal'}</p>
      <p className="text-xs text-slate-500 truncate">{deal.billboard_address || ''}</p>
    </div>
    <div className="flex items-center gap-3 ml-4">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[deal.status] || 'bg-slate-100 text-slate-600'}`}>
        {statusLabels[deal.status] || deal.status}
      </span>
      {deal.final_price && <span className="text-sm font-bold text-slate-900 hidden sm:block">{fmt(deal.final_price)}</span>}
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
    </div>
  </Link>
);

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-slate-500">{label}</span>
      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [reps, setReps] = useState([]);
  const [editingRep, setEditingRep] = useState(null);
  const [repSettings, setRepSettings] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, companyRes] = await Promise.all([
        api.get('/dashboard/stats'),
        user?.company_id ? api.get('/companies/me') : null
      ]);
      setStats(statsRes.data);
      if (companyRes) setCompany(companyRes.data);
      if (user?.company_id && user?.role !== 'rep') {
        const repsRes = await api.get(`/companies/${user.company_id}/reps`).catch(() => ({ data: [] }));
        setReps(repsRes.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteRep = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await api.post('/companies/invite-rep', { email: inviteEmail, full_name: inviteName });
      toast.success(res.data.message);
      if (res.data.invite_link) {
        setInviteLink(`${window.location.origin}${res.data.invite_link}`);
      }
      setInviteEmail(''); setInviteName('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to invite rep');
    } finally {
      setInviting(false);
    }
  };

  const updateRepSettings = async (repId) => {
    try {
      await api.put(`/companies/reps/${repId}/settings`, repSettings);
      toast.success('Rep settings updated');
      setEditingRep(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update settings');
    }
  };

  const toggleRepActive = async (repId, isActive) => {
    try {
      await api.post(`/companies/reps/${repId}/${isActive ? 'deactivate' : 'activate'}`);
      toast.success(`Rep ${isActive ? 'deactivated' : 'activated'}`);
      loadData();
    } catch (err) {
      toast.error('Failed to update rep status');
    }
  };

  if (!user?.company_id) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="bg-white border border-slate-200 rounded-lg p-10">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Public Sans', sans-serif" }}>Company Setup Required</h2>
            <p className="text-slate-500 mb-6">Please complete your company registration to access the dashboard.</p>
            <button
              onClick={() => navigate('/onboarding')}
              data-testid="goto-onboarding-btn"
              className="bg-slate-900 text-white px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-slate-800 transition-colors duration-150"
            >
              Complete Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" data-testid="dashboard-page">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>
              Welcome back, {user?.full_name?.split(' ')[0]}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-500 text-sm">{company?.name}</p>
              {company?.verified_badge && (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  <Shield className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors duration-150">
              <RefreshCw className="w-4 h-4" />
            </button>
            {user?.role === 'owner' && (
              <Link to="/billboards/new" data-testid="create-listing-btn" className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-150">
                <Plus className="w-4 h-4" /> New Listing
              </Link>
            )}
            {user?.role !== 'owner' && (
              <Link to="/browse" data-testid="browse-billboards-btn" className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-150">
                <Search className="w-4 h-4" /> Browse
              </Link>
            )}
          </div>
        </div>

        {/* Owner Dashboard */}
        {stats?.role === 'owner' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Billboards" value={stats.total_billboards} sub={`${stats.active_billboards} active`} icon={Building2} color="bg-blue-100 text-blue-700" />
              <StatCard label="Occupancy Rate" value={`${stats.occupancy_rate}%`} sub={`${stats.booked_billboards} booked`} icon={BarChart2} color="bg-violet-100 text-violet-700" />
              <StatCard label="Active Deals" value={stats.active_deals} sub="Pending action" icon={Clock} color="bg-amber-100 text-amber-700" />
              <StatCard label="Revenue Earned" value={fmt(stats.total_revenue)} sub="After commissions" icon={DollarSign} color="bg-emerald-100 text-emerald-700" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Deals */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>Recent Deals</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {stats.recent_deals?.length > 0 ? stats.recent_deals.map(deal => (
                    <DealRow key={deal.id} deal={deal} />
                  )) : (
                    <div className="py-10 text-center text-slate-500 text-sm">No deals yet. List your billboards to get started.</div>
                  )}
                </div>
              </div>

              {/* Invite Reps */}
              <div className="bg-white border border-slate-200 rounded-lg">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>Invite Negotiation Rep</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Reps operate within your price bands</p>
                </div>
                <div className="p-5">
                  <form onSubmit={handleInviteRep} className="space-y-3">
                    <input
                      type="text" required placeholder="Rep's Full Name"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      data-testid="invite-name-input"
                      className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="email" required placeholder="rep@email.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      data-testid="invite-email-input"
                      className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="submit" disabled={inviting} data-testid="invite-rep-btn"
                      className="w-full h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {inviting ? 'Sending...' : 'Send Invite'}
                    </button>
                  </form>
                  {inviteLink && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs text-blue-800 font-medium mb-1">Invite link:</p>
                      <p className="text-xs text-blue-700 break-all font-mono" data-testid="invite-link">{inviteLink}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* My Billboards */}
            {stats.billboards?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>My Billboard Listings</h3>
                  <Link to="/billboards/new" className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add New</Link>
                </div>
                <div className="divide-y divide-slate-50">
                  {stats.billboards.slice(0, 5).map(b => (
                    <div key={b.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{b.title}</p>
                        <p className="text-xs text-slate-500">{b.address}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-900">{fmt(b.base_monthly_rate)}/mo</span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[b.status] || 'bg-slate-100 text-slate-600'}`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rep Management */}
            {reps.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg" data-testid="rep-management-section">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>Team Reps ({reps.length})</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage your negotiation reps and their settings</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {reps.map(rep => (
                    <div key={rep.id} className="px-5 py-3" data-testid={`rep-row-${rep.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                            {rep.full_name?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900">{rep.full_name}</p>
                              {rep.verified_negotiator && (
                                <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                  <Shield className="w-2.5 h-2.5" /> Verified
                                </span>
                              )}
                              {!rep.is_active && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Inactive</span>}
                            </div>
                            <p className="text-xs text-slate-500">{rep.email}</p>
                            {rep.avg_rating && <div className="flex items-center gap-1 mt-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /><span className="text-xs text-slate-600">{rep.avg_rating}</span></div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link to={`/rep-performance/${rep.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-150" title="View Performance">
                            <BarChart2 className="w-4 h-4" />
                          </Link>
                          <button onClick={() => { setEditingRep(editingRep === rep.id ? null : rep.id); setRepSettings({ price_band_min: rep.price_band_min || '', price_band_max: rep.price_band_max || '', budget_ceiling: rep.budget_ceiling || '' }); }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors duration-150" title="Settings">
                            <Settings className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleRepActive(rep.id, rep.is_active !== false)}
                            className={`p-1.5 rounded-md transition-colors duration-150 ${rep.is_active !== false ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                            title={rep.is_active !== false ? 'Deactivate' : 'Activate'}>
                            {rep.is_active !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {editingRep === rep.id && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg" data-testid={`rep-settings-${rep.id}`}>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Min Price Band</label>
                              <input type="number" placeholder="₹" value={repSettings.price_band_min}
                                onChange={e => setRepSettings({ ...repSettings, price_band_min: e.target.value })}
                                className="w-full h-7 px-2 rounded border border-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Max Price Band</label>
                              <input type="number" placeholder="₹" value={repSettings.price_band_max}
                                onChange={e => setRepSettings({ ...repSettings, price_band_max: e.target.value })}
                                className="w-full h-7 px-2 rounded border border-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Budget Ceiling</label>
                              <input type="number" placeholder="₹" value={repSettings.budget_ceiling}
                                onChange={e => setRepSettings({ ...repSettings, budget_ceiling: e.target.value })}
                                className="w-full h-7 px-2 rounded border border-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                          </div>
                          <button onClick={() => updateRepSettings(rep.id)} data-testid={`save-rep-settings-${rep.id}`}
                            className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors duration-150">
                            Save Settings
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Brand Manager Dashboard */}
        {stats?.role === 'brand_manager' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Deals" value={stats.total_deals} sub="All time" icon={FileText} color="bg-blue-100 text-blue-700" />
              <StatCard label="Active Negotiations" value={stats.active_negotiations} sub="In progress" icon={Clock} color="bg-amber-100 text-amber-700" />
              <StatCard label="Deals Approved" value={stats.approved_deals} sub="Ready to pay" icon={CheckCircle} color="bg-violet-100 text-violet-700" />
              <StatCard label="Total Spend" value={fmt(stats.total_spend)} sub="Completed deals" icon={DollarSign} color="bg-emerald-100 text-emerald-700" />
            </div>
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>Recent Deals</h3>
                <Link to="/browse" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Browse Billboards →</Link>
              </div>
              <div className="divide-y divide-slate-50">
                {stats.recent_deals?.length > 0 ? stats.recent_deals.map(d => <DealRow key={d.id} deal={d} />) : (
                  <div className="py-10 text-center">
                    <p className="text-slate-500 text-sm mb-4">No deals yet. Start by browsing available billboards.</p>
                    <Link to="/browse" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors duration-150">
                      <Search className="w-4 h-4" /> Browse Billboards
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rep Dashboard */}
        {stats?.role === 'rep' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Deals" value={stats.total_deals} sub="All time" icon={FileText} color="bg-blue-100 text-blue-700" />
              <StatCard label="Active Deals" value={stats.active_deals} sub="In negotiation" icon={Clock} color="bg-amber-100 text-amber-700" />
              <StatCard label="Completed" value={stats.completed_deals} sub="Closed deals" icon={CheckCircle} color="bg-emerald-100 text-emerald-700" />
              <StatCard label="Commission Earned" value={fmt(stats.total_commission_earned)} sub="4% per deal" icon={DollarSign} color="bg-violet-100 text-violet-700" />
            </div>
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>My Deals</h3>
                <Link to="/browse" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Browse & Negotiate →</Link>
              </div>
              <div className="divide-y divide-slate-50">
                {stats.recent_deals?.length > 0 ? stats.recent_deals.map(d => <DealRow key={d.id} deal={d} />) : (
                  <div className="py-10 text-center">
                    <p className="text-slate-500 text-sm mb-4">No deals yet. Browse billboards to start negotiating.</p>
                    <Link to="/browse" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors duration-150">
                      <Search className="w-4 h-4" /> Find Billboards
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
