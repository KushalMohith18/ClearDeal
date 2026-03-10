import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { toast } from 'sonner';
import {
  ChevronLeft, Star, Trophy, FileText, DollarSign, Clock, TrendingUp,
  Share2, Shield, Copy, CheckCircle
} from 'lucide-react';

const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '₹0';

const StarRating = ({ rating, size = 'w-4 h-4' }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} className={`${size} ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
    ))}
  </div>
);

const RepPerformance = () => {
  const { repId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [perf, setPerf] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingForm, setRatingForm] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const targetId = repId || user?.id;
  const isSelf = !repId || repId === user?.id;

  useEffect(() => {
    const load = async () => {
      try {
        const endpoint = isSelf ? '/reps/my-performance' : `/reps/${targetId}/performance`;
        const [perfRes, ratingsRes] = await Promise.all([
          api.get(endpoint),
          api.get(`/reps/${targetId}/ratings`).catch(() => ({ data: [] }))
        ]);
        setPerf(perfRes.data);
        setRatings(ratingsRes.data);
      } catch (err) {
        toast.error('Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [targetId, isSelf]);

  const submitRating = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/reps/${targetId}/rate`, ratingForm);
      toast.success('Rating submitted');
      const ratingsRes = await api.get(`/reps/${targetId}/ratings`);
      setRatings(ratingsRes.data);
      setRatingForm({ rating: 5, comment: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const shareProfile = () => {
    const url = `${window.location.origin}/rep-performance/${targetId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Profile link copied');
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  if (!perf) return null;

  const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : 'N/A';
  const isVerified = perf.avg_rating >= 4.0 && (perf.rating_count || 0) >= 3;
  const canRate = user?.role !== 'rep' && !isSelf;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="rep-performance-page">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors duration-150">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {/* Profile Header */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6" data-testid="rep-profile-header">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ fontFamily: "'Public Sans', sans-serif" }}>
                {perf.full_name?.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>{perf.full_name}</h1>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full" data-testid="verified-badge">
                      <Shield className="w-3 h-3" /> Verified Negotiator
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm">{perf.email}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <StarRating rating={Math.round(parseFloat(avgRating) || 0)} />
                    <span className="text-sm font-semibold text-slate-700">{avgRating}</span>
                    <span className="text-xs text-slate-400">({ratings.length} reviews)</span>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={shareProfile} data-testid="share-profile-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-md hover:bg-slate-50 transition-colors duration-150">
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied' : 'Share Profile'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Deals Closed', value: perf.completed_deals, icon: Trophy, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Total Value', value: fmt(perf.total_deal_value), icon: DollarSign, color: 'bg-blue-100 text-blue-700' },
            { label: 'Win Rate', value: `${perf.win_rate}%`, icon: TrendingUp, color: 'bg-violet-100 text-violet-700' },
            { label: 'Active Deals', value: perf.active_deals, icon: Clock, color: 'bg-amber-100 text-amber-700' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-lg p-4" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">{label}</span>
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${color}`}><Icon className="w-3.5 h-3.5" /></div>
              </div>
              <p className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deal History */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>Deal History</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {perf.recent_deals?.length > 0 ? perf.recent_deals.map(d => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
                  onClick={() => navigate(`/deals/${d.id}`)} data-testid={`deal-history-${d.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{d.billboard_title}</p>
                    <p className="text-xs text-slate-500">{new Date(d.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {d.final_price && <span className="text-sm font-bold text-slate-900">{fmt(d.final_price)}</span>}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      d.status === 'paid' || d.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      d.status === 'negotiating' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>{d.status}</span>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-slate-500 text-sm">No deals yet</div>
              )}
            </div>
          </div>

          {/* Ratings & Review */}
          <div className="space-y-4">
            {canRate && (
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="rate-rep-form">
                <h3 className="font-semibold text-slate-900 mb-3" style={{ fontFamily: "'Public Sans', sans-serif" }}>Rate This Rep</h3>
                <form onSubmit={submitRating} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <button key={i} type="button" onClick={() => setRatingForm({ ...ratingForm, rating: i })}
                          className="p-0.5 transition-transform hover:scale-110" data-testid={`rate-star-${i}`}>
                          <Star className={`w-6 h-6 ${i <= ratingForm.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea placeholder="Optional comment..." value={ratingForm.comment}
                    onChange={e => setRatingForm({ ...ratingForm, comment: e.target.value })}
                    data-testid="rating-comment" rows={2}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                  <button type="submit" disabled={submitting} data-testid="submit-rating-btn"
                    className="w-full h-9 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors duration-150">
                    {submitting ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </form>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>Reviews ({ratings.length})</h3>
              </div>
              <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                {ratings.length > 0 ? ratings.map(r => (
                  <div key={r.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">{r.rated_by_name}</span>
                      <StarRating rating={r.rating} size="w-3 h-3" />
                    </div>
                    {r.comment && <p className="text-xs text-slate-600">{r.comment}</p>}
                    <p className="text-xs text-slate-400 mt-1">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                )) : (
                  <div className="py-8 text-center text-slate-400 text-sm">No reviews yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepPerformance;
