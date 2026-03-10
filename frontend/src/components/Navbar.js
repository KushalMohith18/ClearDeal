import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, LayoutDashboard, Search, Plus, LogOut, Menu, X, ChevronDown, ShoppingCart, Trophy } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'brand_manager', 'rep'] },
    { to: '/browse', label: 'Browse', icon: Search, roles: ['brand_manager', 'rep'] },
    { to: '/billboards/new', label: 'New Listing', icon: Plus, roles: ['owner'] },
    { to: '/campaigns', label: 'Campaigns', icon: ShoppingCart, roles: ['brand_manager'] },
    { to: '/rep-performance', label: 'My Stats', icon: Trophy, roles: ['rep'] },
  ].filter(link => link.roles.includes(user?.role));

  const roleLabel = {
    owner: 'Billboard Owner',
    brand_manager: 'Brand Manager',
    rep: 'Negotiation Rep',
  }[user?.role] || '';

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="navbar-logo">
            <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-200">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight" style={{ fontFamily: "'Public Sans', sans-serif" }}>
              ClearDeal
            </span>
          </Link>

          {/* Desktop Nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  data-testid={`nav-${link.label.toLowerCase().replace(' ', '-')}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                    isActive(link.to)
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right Side */}
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900 leading-none">{user.full_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{roleLabel}</p>
              </div>
              <button
                onClick={handleLogout}
                data-testid="logout-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-150"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/auth" className="px-4 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-150">
                Sign in
              </Link>
              <Link to="/auth?mode=register" className="px-4 py-1.5 text-sm font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors duration-150">
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
            data-testid="mobile-menu-toggle"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {user && navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                isActive(link.to) ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
              }`}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          ))}
          {user ? (
            <button
              onClick={() => { handleLogout(); setMobileOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          ) : (
            <>
              <Link to="/auth" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-50">Sign in</Link>
              <Link to="/auth?mode=register" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold bg-slate-900 text-white rounded-md text-center">Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
