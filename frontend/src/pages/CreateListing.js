import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { toast } from 'sonner';
import { MapPin, Upload, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const STEPS = ['Basic Info', 'Location', 'Photos & Pricing'];

const CreateListing = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    address: '',
    lat: '17.3850',
    lng: '78.4867',
    dimensions_width: '',
    dimensions_height: '',
    board_type: 'static',
    illumination: 'frontlit',
    facing: 'North',
    description: '',
    base_monthly_rate: '',
    min_booking_period: '1',
    available_from: '',
    min_acceptable_price: '',
    max_rep_discount_percent: '15',
    photos: [],
    status: 'draft'
  });

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo must be under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(prev => ({ ...prev, photos: [...prev.photos, ev.target.result] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.title.trim()) { toast.error('Enter a title'); return false; }
      if (!form.dimensions_width || !form.dimensions_height) { toast.error('Enter dimensions'); return false; }
    }
    if (step === 1) {
      if (!form.address.trim()) { toast.error('Enter an address'); return false; }
      if (!form.lat || !form.lng) { toast.error('Enter GPS coordinates'); return false; }
    }
    if (step === 2) {
      if (!form.base_monthly_rate) { toast.error('Enter the monthly rate'); return false; }
      if (!form.available_from) { toast.error('Enter availability date'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep(s => s + 1);
  };

  const handleSubmit = async (publish = false) => {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        dimensions_width: parseFloat(form.dimensions_width),
        dimensions_height: parseFloat(form.dimensions_height),
        base_monthly_rate: parseFloat(form.base_monthly_rate),
        min_booking_period: parseInt(form.min_booking_period),
        min_acceptable_price: form.min_acceptable_price ? parseFloat(form.min_acceptable_price) : null,
        max_rep_discount_percent: form.max_rep_discount_percent ? parseFloat(form.max_rep_discount_percent) : null,
      };
      const res = await api.post('/billboards', payload);
      if (publish) {
        await api.put(`/billboards/${res.data.id}/status`, { status: 'active' });
        toast.success('Billboard listed and published!');
      } else {
        toast.success('Billboard saved as draft!');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const f = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen bg-slate-50" data-testid="create-listing-page">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors duration-150">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Public Sans', sans-serif" }}>Create Billboard Listing</h1>
          <p className="text-slate-500 text-sm">Add your billboard to the ClearDeal marketplace</p>
        </div>

        {/* Progress Steps */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${i <= step ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
            </React.Fragment>
          ))}
        </div>
        <p className="text-sm font-medium text-slate-700 mb-4">Step {step + 1} of {STEPS.length}: <span className="text-blue-600">{STEPS[step]}</span></p>

        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 slide-up">

          {/* Step 0: Basic Info */}
          {step === 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Billboard Title *</label>
                <input
                  type="text" required placeholder="e.g. Prime Hoarding - Hitech City Flyover"
                  value={form.title} onChange={e => f('title', e.target.value)}
                  data-testid="listing-title-input"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  placeholder="Describe the location, visibility, and traffic..."
                  value={form.description} onChange={e => f('description', e.target.value)}
                  rows={3}
                  data-testid="listing-description-input"
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Width (ft) *</label>
                  <input
                    type="number" min="1" placeholder="40"
                    value={form.dimensions_width} onChange={e => f('dimensions_width', e.target.value)}
                    data-testid="listing-width-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Height (ft) *</label>
                  <input
                    type="number" min="1" placeholder="20"
                    value={form.dimensions_height} onChange={e => f('dimensions_height', e.target.value)}
                    data-testid="listing-height-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Board Type</label>
                  <select
                    value={form.board_type} onChange={e => f('board_type', e.target.value)}
                    data-testid="listing-type-select"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="static">Static</option>
                    <option value="led">LED</option>
                    <option value="digital">Digital</option>
                    <option value="flex">Flex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Illumination</label>
                  <select
                    value={form.illumination} onChange={e => f('illumination', e.target.value)}
                    data-testid="listing-illumination-select"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="frontlit">Front-lit</option>
                    <option value="backlit">Back-lit</option>
                    <option value="unlit">Unlit</option>
                    <option value="led_internal">LED Internal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Facing Direction</label>
                <select
                  value={form.facing} onChange={e => f('facing', e.target.value)}
                  data-testid="listing-facing-select"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Address *</label>
                <input
                  type="text" placeholder="Plot 123, Near HITEC City Metro, Hyderabad - 500081"
                  value={form.address} onChange={e => f('address', e.target.value)}
                  data-testid="listing-address-input"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Latitude *</label>
                  <input
                    type="number" step="0.000001" placeholder="17.3850"
                    value={form.lat} onChange={e => f('lat', e.target.value)}
                    data-testid="listing-lat-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Longitude *</label>
                  <input
                    type="number" step="0.000001" placeholder="78.4867"
                    value={form.lng} onChange={e => f('lng', e.target.value)}
                    data-testid="listing-lng-input"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-700">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>Find GPS coordinates: Open Google Maps → right-click your billboard location → copy coordinates. Hyderabad is approx. (17.3850, 78.4867).</p>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Photos & Pricing */}
          {step === 2 && (
            <>
              {/* Photos */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Billboard Photos (Up to 10)</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {form.photos.map((photo, i) => (
                    <div key={i} className="relative aspect-video bg-slate-100 rounded-md overflow-hidden">
                      <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button" onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {form.photos.length < 10 && (
                    <label data-testid="photo-upload-btn" className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors duration-150">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-xs text-slate-400 mt-1">Upload</span>
                      <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Base Rate (₹/month) *</label>
                    <input
                      type="number" min="1" placeholder="85000"
                      value={form.base_monthly_rate} onChange={e => f('base_monthly_rate', e.target.value)}
                      data-testid="listing-rate-input"
                      className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min. Booking Period</label>
                    <select
                      value={form.min_booking_period} onChange={e => f('min_booking_period', e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {[1, 2, 3, 6, 12].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Available From *</label>
                <input
                  type="date"
                  value={form.available_from} onChange={e => f('available_from', e.target.value)}
                  data-testid="listing-available-input"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-900 mb-1" style={{ fontFamily: "'Public Sans', sans-serif" }}>Price Band Settings</p>
                <p className="text-xs text-slate-500 mb-3">These are private. Reps must stay within this band during negotiations.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Min Acceptable Price (₹/mo)</label>
                    <input
                      type="number" min="1" placeholder="70000"
                      value={form.min_acceptable_price} onChange={e => f('min_acceptable_price', e.target.value)}
                      data-testid="listing-min-price-input"
                      className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Max Discount Rep Can Offer (%)</label>
                    <input
                      type="number" min="0" max="50" placeholder="15"
                      value={form.max_rep_discount_percent} onChange={e => f('max_rep_discount_percent', e.target.value)}
                      data-testid="listing-max-discount-input"
                      className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <button
                type="button" onClick={() => setStep(s => s - 1)}
                className="flex-1 h-10 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button" onClick={handleNext}
                data-testid="next-step-btn"
                className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-md transition-colors duration-150 flex items-center justify-center gap-1.5"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex-1 flex gap-2">
                <button
                  type="button" onClick={() => handleSubmit(false)} disabled={loading}
                  data-testid="save-draft-btn"
                  className="flex-1 h-10 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-md transition-colors duration-150"
                >
                  Save Draft
                </button>
                <button
                  type="button" onClick={() => handleSubmit(true)} disabled={loading}
                  data-testid="publish-listing-btn"
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors duration-150 flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Publish Listing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListing;
