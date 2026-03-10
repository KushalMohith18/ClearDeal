import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { toast } from 'sonner';
import {
  MapPin, Maximize2, Zap, Sun, LayoutGrid, Calendar, Eye, ChevronLeft,
  TrendingUp, Shield, AlertCircle, DollarSign, Clock, Flag, CalendarDays
} from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const BENCHMARK = {
  'hitech': { min: 80000, max: 120000 },
  'banjara': { min: 60000, max: 100000 },
  'gachibowli': { min: 50000, max: 90000 },
  'jubilee': { min: 70000, max: 110000 },
  'madhapur': { min: 40000, max: 80000 },
  'default': { min: 30000, max: 70000 },
};
const getBenchmark = (address) => {
  const lower = (address || '').toLowerCase();
  for (const [key, val] of Object.entries(BENCHMARK)) {
    if (lower.includes(key)) return val;
  }
  return BENCHMARK.default;
};

const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

const MakeOfferModal = ({ billboard, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    booking_start_date: '',
    booking_end_date: '',
    initial_offer: billboard.base_monthly_rate,
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/deals', {
        billboard_id: billboard.id,
        ...form,
        initial_offer: Number(form.initial_offer)
      });
      toast.success('Deal initiated! Redirecting to negotiation...');
      onSuccess(res.data.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="offer-modal">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>Make an Offer</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="font-semibold text-sm text-slate-900">{billboard.title}</p>
            <p className="text-xs text-slate-500">{billboard.address}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date" required
                value={form.booking_start_date}
                onChange={e => setForm({ ...form, booking_start_date: e.target.value })}
                data-testid="offer-start-date"
                className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date" required
                value={form.booking_end_date}
                onChange={e => setForm({ ...form, booking_end_date: e.target.value })}
                data-testid="offer-end-date"
                className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Your Offer (₹/month)
              <span className="text-slate-400 font-normal ml-1">Listed at {fmt(billboard.base_monthly_rate)}</span>
            </label>
            <input
              type="number" required min="1"
              value={form.initial_offer}
              onChange={e => setForm({ ...form, initial_offer: e.target.value })}
              data-testid="offer-amount-input"
              className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Message (Optional)</label>
            <textarea
              placeholder="Brief note to the billboard owner..."
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              data-testid="offer-message-input"
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          <button
            type="submit" disabled={loading} data-testid="submit-offer-btn"
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors duration-150"
          >
            {loading ? 'Submitting...' : 'Submit Offer'}
          </button>
        </form>
      </div>
    </div>
  );
};

const BillboardDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [billboard, setBillboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [availability, setAvailability] = useState(null);
  const [interestDate, setInterestDate] = useState('');
  const [interestMsg, setInterestMsg] = useState('');
  const [flagging, setFlagging] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [bbRes, availRes] = await Promise.all([
          api.get(`/billboards/${id}`),
          api.get(`/billboards/${id}/availability`).catch(() => ({ data: null }))
        ]);
        setBillboard(bbRes.data);
        setAvailability(availRes.data);
      } catch (err) {
        toast.error('Billboard not found');
        navigate('/browse');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  if (!billboard) return null;

  const bench = getBenchmark(billboard.address);
  const canMakeOffer = ['rep', 'brand_manager'].includes(user?.role) && billboard.status === 'active';
  const isOwner = user?.company_id === billboard.owner_company_id;
  const benchMid = (bench.min + bench.max) / 2;
  const priceDiffPct = benchMid > 0 ? Math.round(((billboard.base_monthly_rate - benchMid) / benchMid) * 100) : 0;

  const flagInterest = async (e) => {
    e.preventDefault();
    if (!interestDate) { toast.error('Select a date'); return; }
    setFlagging(true);
    try {
      await api.post(`/billboards/${id}/interest`, { interested_date: interestDate, message: interestMsg });
      toast.success('Interest flagged! Owner notified.');
      setInterestDate('');
      setInterestMsg('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to flag interest');
    } finally {
      setFlagging(false);
    }
  };

  const getBookedDates = () => {
    if (!availability?.booked_ranges) return [];
    const dates = [];
    for (const range of availability.booked_ranges) {
      const start = new Date(range.start);
      const end = new Date(range.end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    }
    return dates;
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="billboard-detail-page">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors duration-150">
          <ChevronLeft className="w-4 h-4" /> Back to Browse
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Photos */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="h-64 bg-slate-100 flex items-center justify-center relative">
                {billboard.photos?.length > 0 ? (
                  <img src={billboard.photos[activePhoto]} alt={billboard.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <LayoutGrid className="w-12 h-12" />
                    <span className="text-sm">No photos uploaded</span>
                  </div>
                )}
                {billboard.photos?.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {billboard.photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActivePhoto(i)}
                        className={`w-2 h-2 rounded-full transition-colors duration-150 ${i === activePhoto ? 'bg-white' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              {billboard.photos?.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {billboard.photos.map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhoto(i)}
                      className={`w-14 h-14 rounded-md overflow-hidden flex-shrink-0 border-2 transition-colors duration-150 ${i === activePhoto ? 'border-blue-500' : 'border-transparent'}`}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Public Sans', sans-serif" }}>{billboard.title}</h1>
                  <div className="flex items-center gap-1 text-slate-500 text-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{billboard.address}</span>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                  billboard.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                  billboard.status === 'booked' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-100 text-slate-600'
                }`} data-testid="billboard-status">
                  {billboard.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  { icon: Maximize2, label: 'Size', value: `${billboard.dimensions?.width}×${billboard.dimensions?.height} ft` },
                  { icon: LayoutGrid, label: 'Type', value: billboard.board_type?.toUpperCase() },
                  { icon: Sun, label: 'Illumination', value: billboard.illumination?.replace('_', ' ')?.toUpperCase() },
                  { icon: MapPin, label: 'Facing', value: billboard.facing },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
                    <Icon className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-semibold text-slate-900 capitalize">{value}</p>
                  </div>
                ))}
              </div>

              {billboard.description && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2" style={{ fontFamily: "'Public Sans', sans-serif" }}>About This Location</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{billboard.description}</p>
                </div>
              )}
            </div>

            {/* Map */}
            {billboard.lat && billboard.lng && (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900 text-sm" style={{ fontFamily: "'Public Sans', sans-serif" }}>Location</h3>
                </div>
                <div className="h-48" data-testid="detail-map">
                  <MapContainer center={[billboard.lat, billboard.lng]} zoom={15} className="h-full w-full">
                    <TileLayer
                      attribution='&copy; CartoDB'
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    <Marker position={[billboard.lat, billboard.lng]} />
                  </MapContainer>
                </div>
              </div>
            )}

            {/* Availability Calendar (F7) */}
            <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="availability-calendar">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900 text-sm" style={{ fontFamily: "'Public Sans', sans-serif" }}>3-Month Availability</h3>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {(() => {
                  const booked = getBookedDates();
                  const today = new Date();
                  const months = [];
                  for (let m = 0; m < 3; m++) {
                    const monthDate = new Date(today.getFullYear(), today.getMonth() + m, 1);
                    const monthName = monthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
                    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                    const firstDay = monthDate.getDay();
                    const days = [];
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateObj = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
                      const isBooked = booked.some(bd => bd.toDateString() === dateObj.toDateString());
                      const isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      days.push({ day: d, isBooked, isPast, dateObj });
                    }
                    months.push({ monthName, days, firstDay });
                  }
                  return months.map((mo, mi) => (
                    <div key={mi} className="flex-1 min-w-[200px]">
                      <p className="text-xs font-semibold text-slate-700 mb-2 text-center">{mo.monthName}</p>
                      <div className="grid grid-cols-7 gap-0.5 text-center">
                        {['S','M','T','W','T','F','S'].map((d,i) => (
                          <span key={i} className="text-[10px] text-slate-400 font-medium">{d}</span>
                        ))}
                        {Array(mo.firstDay).fill(null).map((_, i) => <span key={`e${i}`} />)}
                        {mo.days.map(({ day, isBooked, isPast }) => (
                          <span key={day} className={`text-xs py-0.5 rounded ${
                            isBooked ? 'bg-red-100 text-red-600 font-semibold' :
                            isPast ? 'text-slate-300' :
                            'text-slate-700 hover:bg-blue-50'
                          }`} title={isBooked ? 'Booked' : 'Available'}>
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded" /> Booked</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-white border border-slate-200 rounded" /> Available</span>
              </div>

              {/* Interest Flagging for brand managers/reps */}
              {canMakeOffer && (
                <form onSubmit={flagInterest} className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1"><Flag className="w-3 h-3" /> Flag Interest in Future Date</p>
                  <div className="flex gap-2">
                    <input type="date" value={interestDate} onChange={e => setInterestDate(e.target.value)}
                      data-testid="interest-date-input" required
                      className="flex-1 h-8 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <button type="submit" disabled={flagging} data-testid="flag-interest-btn"
                      className="h-8 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium rounded-md transition-colors duration-150">
                      {flagging ? '...' : 'Notify Owner'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Pricing */}
            <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="pricing-card">
              <div className="mb-4">
                <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>
                  {fmt(billboard.base_monthly_rate)}
                  <span className="text-base font-normal text-slate-500">/month</span>
                </p>
                <p className="text-sm text-slate-500 mt-1">Min. booking: {billboard.min_booking_period} month(s)</p>
              </div>

              {/* Benchmark */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4" data-testid="benchmark-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-700">Area Benchmark Price</span>
                </div>
                <p className="text-sm font-bold text-blue-600">{fmt(bench.min)} – {fmt(bench.max)}</p>
                <p className="text-xs text-slate-500">Similar boards in this area</p>
                {isOwner && priceDiffPct !== 0 && (
                  <div className={`mt-2 text-xs font-semibold px-2 py-1 rounded ${
                    priceDiffPct > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`} data-testid="owner-price-insight">
                    Your board is {Math.abs(priceDiffPct)}% {priceDiffPct > 0 ? 'above' : 'below'} area average
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Available from</span>
                  <span className="font-medium text-slate-900">{billboard.available_from || 'Immediately'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Views</span>
                  <span className="font-medium text-slate-900">{billboard.view_count}</span>
                </div>
              </div>

              {canMakeOffer ? (
                <button
                  onClick={() => setShowOfferModal(true)}
                  data-testid="make-offer-btn"
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors duration-150 active:scale-[0.98]"
                >
                  Make an Offer
                </button>
              ) : billboard.status === 'booked' ? (
                <div className="w-full h-10 bg-slate-100 text-slate-500 text-sm font-medium rounded-md flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-2" /> Currently Booked
                </div>
              ) : user?.role === 'owner' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
                  This is your billboard. Manage it from the Dashboard.
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
                  Contact your company to assign a rep for this listing.
                </div>
              )}
            </div>

            {/* Commission Info */}
            {canMakeOffer && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-900 text-sm" style={{ fontFamily: "'Public Sans', sans-serif" }}>Deal Commission Structure</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span>Platform fee</span><span className="font-semibold">6%</span></div>
                  <div className="flex justify-between"><span>Your commission</span><span className="font-semibold text-emerald-700">4%</span></div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5"><span>Billboard owner receives</span><span className="font-semibold">90%</span></div>
                </div>
                <p className="text-slate-400 text-xs">All commissions are auto-split on payment.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showOfferModal && (
        <MakeOfferModal
          billboard={billboard}
          onClose={() => setShowOfferModal(false)}
          onSuccess={(dealId) => navigate(`/deals/${dealId}`)}
        />
      )}
    </div>
  );
};

export default BillboardDetail;
