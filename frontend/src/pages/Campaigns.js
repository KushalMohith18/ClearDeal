import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { toast } from 'sonner';
import {
  ShoppingCart, Plus, ChevronRight, MapPin, X, FileText, DollarSign, Calendar
} from 'lucide-react';

const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '₹0';

const Campaigns = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', campaign_start_date: '', campaign_end_date: '', total_budget: '' });
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [campRes, bbRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/billboards', { params: { status: 'active' } })
      ]);
      setCampaigns(campRes.data);
      setBillboards(bbRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleBillboard = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const createCampaign = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) { toast.error('Select at least one billboard'); return; }
    setCreating(true);
    try {
      await api.post('/campaigns', {
        ...form,
        billboard_ids: selectedIds,
        total_budget: Number(form.total_budget)
      });
      toast.success('Campaign created');
      setShowCreate(false);
      setSelectedIds([]);
      setForm({ name: '', description: '', campaign_start_date: '', campaign_end_date: '', total_budget: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const loadDetail = async (id) => {
    try {
      const res = await api.get(`/campaigns/${id}`);
      setDetail(res.data);
    } catch (err) {
      toast.error('Failed to load campaign');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" data-testid="campaigns-page">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>Campaign Bundling</h1>
            <p className="text-slate-500 text-sm">Bundle multiple billboards into one campaign</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} data-testid="create-campaign-btn"
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-150">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>

        {/* Create Campaign Form */}
        {showCreate && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6" data-testid="create-campaign-form">
            <h3 className="font-semibold text-slate-900 mb-4" style={{ fontFamily: "'Public Sans', sans-serif" }}>Create Campaign</h3>
            <form onSubmit={createCampaign} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Campaign Name</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    data-testid="campaign-name-input" placeholder="Q1 Hyderabad Campaign"
                    className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total Budget</label>
                  <input type="number" required value={form.total_budget} onChange={e => setForm({ ...form, total_budget: e.target.value })}
                    data-testid="campaign-budget-input" placeholder="500000"
                    className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" required value={form.campaign_start_date} onChange={e => setForm({ ...form, campaign_start_date: e.target.value })}
                    data-testid="campaign-start-date"
                    className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                  <input type="date" required value={form.campaign_end_date} onChange={e => setForm({ ...form, campaign_end_date: e.target.value })}
                    data-testid="campaign-end-date"
                    className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  data-testid="campaign-desc-input" rows={2} placeholder="Campaign goals and notes..."
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>

              {/* Billboard Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Select Billboards ({selectedIds.length} selected)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                  {billboards.map(b => (
                    <button key={b.id} type="button" onClick={() => toggleBillboard(b.id)}
                      data-testid={`select-billboard-${b.id}`}
                      className={`text-left p-3 rounded-lg border-2 transition-all duration-150 ${
                        selectedIds.includes(b.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <p className="text-sm font-medium text-slate-900 truncate">{b.title}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <MapPin className="w-3 h-3" /><span className="truncate">{b.address}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-1">{fmt(b.base_monthly_rate)}/mo</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={creating} data-testid="submit-campaign-btn"
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors duration-150">
                  {creating ? 'Creating...' : `Create Campaign (${selectedIds.length} boards)`}
                </button>
                <button type="button" onClick={() => { setShowCreate(false); setSelectedIds([]); }}
                  className="px-4 h-10 border border-slate-200 text-slate-600 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Campaign List */}
        <div className="space-y-4">
          {campaigns.length > 0 ? campaigns.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid={`campaign-${c.id}`}>
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors duration-150"
                onClick={() => detail?.id === c.id ? setDetail(null) : loadDetail(c.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{c.name}</h3>
                    <p className="text-xs text-slate-500">{c.billboard_ids?.length} boards &middot; {c.campaign_start_date} → {c.campaign_end_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-900">{fmt(c.total_budget)}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${detail?.id === c.id ? 'rotate-90' : ''}`} />
                </div>
              </div>
              {detail?.id === c.id && (
                <div className="px-5 pb-4 border-t border-slate-100 pt-4">
                  {detail.description && <p className="text-sm text-slate-600 mb-3">{detail.description}</p>}
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Billboards in Campaign</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {detail.billboards?.map(b => (
                      <Link key={b.id} to={`/billboards/${b.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors duration-150">
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{b.title}</p>
                          <p className="text-xs text-slate-500 truncate">{b.address}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{fmt(b.base_monthly_rate)}/mo</span>
                      </Link>
                    ))}
                  </div>
                  {detail.deals?.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-slate-700 mb-2">Associated Deals</h4>
                      {detail.deals.map(d => (
                        <Link key={d.id} to={`/deals/${d.id}`} className="flex items-center justify-between py-2 text-sm hover:text-blue-600 transition-colors duration-150">
                          <span>{d.billboard_title}</span>
                          <span className="font-semibold">{d.status}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )) : (
            <div className="bg-white border border-slate-200 rounded-lg py-16 text-center">
              <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium mb-1">No campaigns yet</p>
              <p className="text-slate-500 text-sm mb-4">Bundle multiple billboards into a single campaign for easier management.</p>
              <button onClick={() => setShowCreate(true)} data-testid="empty-create-campaign-btn"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-150">
                <Plus className="w-4 h-4" /> Create Campaign
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Campaigns;
