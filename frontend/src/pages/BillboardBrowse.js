import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { toast } from 'sonner';
import { Search, Filter, MapPin, Zap, Sun, MonitorPlay, LayoutGrid, Map as MapIcon, ChevronRight, Shield, X } from 'lucide-react';

// Leaflet imports
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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

const typeIcons = {
  static: LayoutGrid,
  led: Zap,
  digital: MonitorPlay,
  flex: LayoutGrid,
};

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const BillboardCard = ({ b }) => {
  const bench = getBenchmark(b.address);
  const Icon = typeIcons[b.board_type] || LayoutGrid;
  return (
    <Link
      to={`/billboards/${b.id}`}
      data-testid={`billboard-card-${b.id}`}
      className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 group"
    >
      <div className="h-36 bg-slate-100 flex items-center justify-center overflow-hidden">
        {b.photos?.[0] ? (
          <img src={b.photos[0]} alt={b.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Icon className="w-8 h-8" />
            <span className="text-xs">{b.board_type?.toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight group-hover:text-blue-600 transition-colors duration-150" style={{ fontFamily: "'Public Sans', sans-serif" }}>
            {b.title}
          </h3>
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{b.address}</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-medium">
            {b.dimensions?.width}x{b.dimensions?.height}ft
          </span>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-medium capitalize">
            {b.board_type}
          </span>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-medium capitalize">
            {b.illumination}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>{fmt(b.base_monthly_rate)}<span className="text-xs font-normal text-slate-500">/mo</span></p>
            <p className="text-xs text-slate-500">Benchmark: {fmt(bench.min)}–{fmt(bench.max)}</p>
          </div>
          {b.available_from && (
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">Available</span>
          )}
        </div>
      </div>
    </Link>
  );
};

const BillboardBrowse = () => {
  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({ area: '', min_price: '', max_price: '', board_type: '', illumination: '' });
  const [showFilters, setShowFilters] = useState(false);

  const loadBillboards = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.area) params.area = filters.area;
      if (filters.min_price) params.min_price = filters.min_price;
      if (filters.max_price) params.max_price = filters.max_price;
      if (filters.board_type) params.board_type = filters.board_type;
      if (filters.illumination) params.illumination = filters.illumination;
      const res = await api.get('/billboards', { params });
      // Handle both response formats: { billboards: [...] } or [...]
      const data = res.data?.billboards || res.data || [];
      setBillboards(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load billboards');
      setBillboards([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadBillboards();
  }, [loadBillboards]);

  const mapBillboards = billboards.filter(b => b.lat && b.lng);
  const center = mapBillboards.length > 0
    ? [mapBillboards[0].lat, mapBillboards[0].lng]
    : [17.3850, 78.4867]; // Hyderabad

  return (
    <div className="min-h-screen bg-slate-50" data-testid="browse-page">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>Browse Billboards</h1>
            <p className="text-slate-500 text-sm">{billboards.length} listings available in Hyderabad</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')}
              data-testid="toggle-view-btn"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors duration-150 ${
                viewMode === 'map' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              {viewMode === 'map' ? <LayoutGrid className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
              {viewMode === 'map' ? 'Grid View' : 'Map View'}
            </button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by area (e.g. Hitech City, Banjara Hills...)"
                value={filters.area}
                onChange={e => setFilters({ ...filters, area: e.target.value })}
                data-testid="search-input"
                className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              data-testid="toggle-filters-btn"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors duration-150 ${
                showFilters ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Min Price/Month</label>
                <input
                  type="number" placeholder="₹30,000"
                  value={filters.min_price}
                  onChange={e => setFilters({ ...filters, min_price: e.target.value })}
                  data-testid="filter-min-price"
                  className="w-full h-8 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Max Price/Month</label>
                <input
                  type="number" placeholder="₹1,50,000"
                  value={filters.max_price}
                  onChange={e => setFilters({ ...filters, max_price: e.target.value })}
                  data-testid="filter-max-price"
                  className="w-full h-8 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Board Type</label>
                <select
                  value={filters.board_type}
                  onChange={e => setFilters({ ...filters, board_type: e.target.value })}
                  data-testid="filter-board-type"
                  className="w-full h-8 px-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Types</option>
                  <option value="static">Static</option>
                  <option value="led">LED</option>
                  <option value="digital">Digital</option>
                  <option value="flex">Flex</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Illumination</label>
                <select
                  value={filters.illumination}
                  onChange={e => setFilters({ ...filters, illumination: e.target.value })}
                  data-testid="filter-illumination"
                  className="w-full h-8 px-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All</option>
                  <option value="frontlit">Front-lit</option>
                  <option value="backlit">Back-lit</option>
                  <option value="unlit">Unlit</option>
                  <option value="led_internal">LED Internal</option>
                </select>
              </div>
              <button
                onClick={() => setFilters({ area: '', min_price: '', max_price: '', board_type: '', illumination: '' })}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 col-span-2 md:col-span-4"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-500 text-sm">Loading billboards...</p>
          </div>
        ) : billboards.length === 0 ? (
          <div className="py-20 text-center bg-white border border-slate-200 rounded-lg">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-2">No billboards found</p>
            <p className="text-slate-500 text-sm">Try adjusting your filters or search a different area.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {billboards.map(b => <BillboardCard key={b.id} b={b} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Map */}
            <div className="lg:col-span-3 h-[500px] bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="map-container">
              <MapContainer center={center} zoom={12} className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://carto.com">CartoDB</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                {mapBillboards.map(b => (
                  <Marker key={b.id} position={[b.lat, b.lng]}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">{b.title}</p>
                        <p className="text-slate-600 text-xs">{b.address}</p>
                        <p className="font-bold text-blue-600 mt-1">{fmt(b.base_monthly_rate)}/mo</p>
                        <Link to={`/billboards/${b.id}`} className="text-blue-500 text-xs hover:underline">View Details →</Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            {/* List */}
            <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto">
              {billboards.map(b => (
                <Link key={b.id} to={`/billboards/${b.id}`} data-testid={`map-list-item-${b.id}`}
                  className="block bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm hover:border-blue-300 transition-all duration-150">
                  <p className="font-semibold text-sm text-slate-900 mb-1">{b.title}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{b.address}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{fmt(b.base_monthly_rate)}<span className="text-xs font-normal text-slate-500">/mo</span></span>
                    <span className="text-xs capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{b.board_type}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillboardBrowse;
