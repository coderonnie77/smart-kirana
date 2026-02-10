import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, LayoutDashboard, LogOut, Store, Package, ShoppingBag } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm sticky top-0 z-50 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 group-active:scale-95 transition-all">
              <Store className="text-white w-7 h-7" />
            </div>
            <div className="flex flex-col">
               <span className="font-black text-2xl text-slate-900 leading-none flex items-center gap-2">
                 Smart-Kirana 
                 <span className="text-[9px] bg-green-500 text-white px-1.5 rounded-md py-0.5 tracking-normal font-bold shadow-sm animate-pulse">v2.0-LIVE</span>
               </span>
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none mt-1">AI Hyperlocal Platform</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                {user.role === 'retailer' && (
                  <>
                    <NavLink to="/dashboard" icon={<LayoutDashboard size={18} />} label="Analytics" active={isActive('/dashboard')} />
                    <NavLink to="/inventory" icon={<Package size={18} />} label="Inventory" active={isActive('/inventory')} />
                    <NavLink to="/wholesale" icon={<ShoppingCart size={18} />} label="Wholesale" active={isActive('/wholesale')} />
                  </>
                )}
                {user.role === 'wholesaler' && (
                  <>
                    <NavLink to="/inventory" icon={<Package size={18} />} label="Inventory" active={isActive('/inventory')} />
                    <NavLink to="/b2b-orders" icon={<Package size={18} />} label="B2B Operations" active={isActive('/b2b-orders')} />
                  </>
                )}
                <NavLink to="/orders" icon={<ShoppingBag size={18} />} label={user.role === 'wholesaler' ? "Trade History" : "Customer Orders"} active={isActive('/orders')} />
                
                <div className="h-8 w-px bg-slate-100 mx-4" />
                
                <div className="flex items-center gap-4">
                   <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{user.role}</span>
                      <span className="text-sm font-bold text-slate-900">{user.name}</span>
                   </div>
                   <button
                     onClick={handleLogout}
                     className="bg-slate-50 text-slate-600 p-3 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100 shadow-sm"
                   >
                     <LogOut size={20} />
                   </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-slate-600 font-bold hover:text-blue-600 px-6 py-2 transition-colors">Login</Link>
                <Link to="/register" className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-blue-600 shadow-xl shadow-slate-100 hover:shadow-blue-100 transition-all active:scale-95">
                  JOIN NOW
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden p-3 bg-slate-50 rounded-2xl text-slate-600">
             <LayoutDashboard />
          </button>
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({ to, icon, label, active }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold transition-all ${active ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default Navbar;
