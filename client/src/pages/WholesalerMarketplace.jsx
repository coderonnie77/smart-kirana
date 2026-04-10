import React, { useEffect, useState } from 'react';
import { fetchWholesalers, fetchProductsByWholesaler, createB2BOrder } from '../api';
import { ShoppingCart, Plus, Minus, ArrowLeft, Package, CheckCircle2, User, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const WholesalerMarketplace = () => {
  const [wholesalers, setWholesalers] = useState([]);
  const [selectedWholesaler, setSelectedWholesaler] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getWholesalers = async () => {
      try {
        const { data } = await fetchWholesalers();
        console.log("Wholesalers fetched:", data);
        setWholesalers(data || []);
        setLoading(false);
      } catch (err) {
        console.error("Wholesaler fetch error:", err);
        setLoading(false);
      }
    };
    getWholesalers();
  }, []);

  const handleSelectWholesaler = async (wholesaler) => {
    setLoading(true);
    setSelectedWholesaler(wholesaler);
    try {
      const { data } = await fetchProductsByWholesaler(wholesaler._id);
      setProducts(data);
      setCart({});
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const addToCart = (id) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 10 }));
  };

  const removeFromCart = (id) => {
    if (cart[id] <= 10) {
      const newCart = { ...cart };
      delete newCart[id];
      setCart(newCart);
    } else {
      setCart(prev => ({ ...prev, [id]: prev[id] - 10 }));
    }
  };

  const handleCheckout = async () => {
    const items = Object.entries(cart).map(([pid, qty]) => {
      const p = products.find(prod => prod._id === pid);
      return {
        name: p.name,
        category: p.category,
        quantity: qty,
        priceAtPurchase: p.price,
        sku: p.sku,
        imageUrl: p.imageUrl,
        wholesalerProductId: p._id,
        unitConversionFactor: p.unitConversionFactor
      };
    });

    try {
      await createB2BOrder({
        wholesalerId: selectedWholesaler._id,
        items,
        totalAmount: items.reduce((acc, i) => acc + (i.priceAtPurchase * i.quantity), 0)
      });
      setOrderStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      alert("Checkout failed");
    }
  };

  const totalPrice = Object.entries(cart).reduce((acc, [pid, q]) =>
    acc + (products.find(p => p._id === pid)?.price * q || 0), 0
  );

  return (
    <div className="bg-slate-50 min-h-screen p-10">
      <div className="max-w-7xl mx-auto">
        {!selectedWholesaler ? (
          <>
            <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">B2B <span className="text-blue-600">Connect.</span></h1>
            <p className="text-slate-400 font-medium text-lg mb-12">Select a certified wholesaler to browse their bulk catalog.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {wholesalers.map(w => (
                <div key={w._id} onClick={() => handleSelectWholesaler(w)} className="bg-white p-10 rounded-[3rem] shadow-premium border border-slate-50 hover:border-blue-200 transition-all cursor-pointer group hover:scale-[1.02]">
                  <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <User size={32} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-2">{w.name}</h3>
                  <p className="text-slate-400 font-bold text-sm mb-6 flex items-center gap-2"><Package size={14} /> Certified Wholesaler</p>
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <span className="text-blue-600 font-black uppercase tracking-widest text-[10px]">View Catalog</span>
                    <ChevronRight className="text-blue-600" />
                  </div>
                </div>
              ))}
              {wholesalers.length === 0 && !loading && (
                <p className="col-span-full text-center py-20 text-slate-400 font-bold">No wholesalers found on the platform.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-12">
              <div>
                <button onClick={() => setSelectedWholesaler(null)} className="text-blue-600 flex items-center gap-2 font-bold mb-2">
                  <ArrowLeft size={16} /> Back to Wholesalers
                </button>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                  {selectedWholesaler.name}'s <span className="text-blue-600">Warehouse.</span>
                  <span className="block text-sm font-normal text-slate-400 mt-2">ID: {selectedWholesaler._id}</span>
                </h1>
              </div>
              <div className="bg-white px-8 py-5 rounded-3xl shadow-premium border border-slate-100 flex items-center gap-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bulk Units</p>
                  <p className="text-2xl font-black text-slate-900">{Object.values(cart).reduce((a, b) => a + b, 0)}</p>
                </div>
                <div className="w-px h-10 bg-slate-100" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Cost</p>
                  <p className="text-2xl font-black text-blue-600">₹{totalPrice.toLocaleString()}</p>
                </div>
                <button
                  disabled={Object.keys(cart).length === 0}
                  onClick={handleCheckout}
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black disabled:opacity-50 disabled:grayscale hover:bg-blue-700 transition-all ml-4"
                >
                  Order Bulk
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20 animate-pulse">Scanning Inventory...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map(p => (
                  <div key={p._id} className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-slate-50 group">
                    <div className="flex items-center gap-6 mb-8">
                      <div className="w-20 h-20 bg-slate-100 rounded-3xl overflow-hidden flex items-center justify-center">
                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&size=400`} className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{p.category}</span>
                        <h3 className="text-2xl font-black text-slate-900">{p.name}</h3>
                        <p className="text-sm font-bold text-slate-400">1 Bulk Unit = {p.unitConversionFactor} Retail Units</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem]">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bulk Price</p>
                        <p className="text-2xl font-black text-blue-600">₹{p.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cart[p._id] ? (
                          <>
                            <button onClick={() => removeFromCart(p._id)} className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-slate-400 hover:text-red-500">-</button>
                            <span className="w-12 text-center font-black text-lg">{cart[p._id]}</span>
                            <button onClick={() => addToCart(p._id)} className="w-10 h-10 bg-blue-600 rounded-xl shadow-lg flex items-center justify-center text-white font-bold hover:bg-blue-700">+</button>
                          </>
                        ) : (
                          <button onClick={() => addToCart(p._id)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-600 transition-all">Buy Bulk</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {orderStatus === 'success' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/90 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="text-center">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce transition-transform">
              <CheckCircle2 size={64} className="text-blue-500" />
            </div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Stock Inbound!</h2>
            <p className="text-slate-500 text-xl font-medium">B2B Order has been placed. Waiting for wholesaler acceptance.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WholesalerMarketplace;
