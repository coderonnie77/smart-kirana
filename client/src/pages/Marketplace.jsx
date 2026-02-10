import React, { useEffect, useState, useRef } from 'react';
import { fetchProducts, createOrder, fetchRetailers } from '../api';
import { ShoppingBasket, Plus, Minus, Search, Tag, Filter, CheckCircle2, Mic, MicOff, Info, X, Calendar, Hash, FileText, ChevronRight, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HINDI_DICT = {
  // Phonetic
  'namak': 'salt', 'cheeni': 'sugar', 'chini': 'sugar', 'doodh': 'milk',
  'chawal': 'rice', 'aata': 'flour', 'tel': 'oil', 'masale': 'spices',
  'sabun': 'soap', 'chai': 'tea', 'biskut': 'biscuit', 'daal': 'pulse',
  'pyaaz': 'onion', 'aalu': 'potato', 'tamatar': 'tomato',

  // Devanagari Script
  'नमक': 'salt', 'चीनी': 'sugar', 'दूध': 'milk',
  'चावल': 'rice', 'आटा': 'flour', 'तेल': 'oil', 'मसाले': 'spices',
  'साबुन': 'soap', 'चाय': 'tea', 'बिस्कुट': 'biscuit', 'दाल': 'pulse',
  'प्याज': 'onion', 'आलू': 'potato', 'टमाटर': 'tomato', 'मैगी': 'maggi',
  'कोक': 'coke', 'ब्रेड': 'bread', 'अंडा': 'eggs'
};

const Marketplace = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [activeRetailer, setActiveRetailer] = useState('All');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [orderStatus, setOrderStatus] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const categories = ['All', ...new Set(products.map(p => p.category))];

  useEffect(() => {
    const getData = async () => {
      try {
        const [prodRes, retRes] = await Promise.all([
          fetchProducts(),
          fetchRetailers().catch(() => ({ data: [] }))
        ]);
        setProducts(prodRes.data);
        setRetailers(retRes.data);
        setFilteredProducts(prodRes.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    getData();
  }, []);

  useEffect(() => {
    let result = products;

    if (activeRetailer !== 'All') {
      result = result.filter(p => {
        const rId = p.retailerId?._id || p.retailerId;
        return rId === activeRetailer;
      });
    }

    if (activeCategory !== 'All') {
      result = result.filter(p => p.category === activeCategory);
    }

    if (searchTerm) {
      result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredProducts(result);
  }, [searchTerm, activeCategory, activeRetailer, products]);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Browser doesn't support voice recognition.");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    // Use generic english, but we will handle Hindi words manually
    recognition.lang = 'en-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      // Split by spaces to handle phrases
      const words = transcript.split(' ');
      // Map each word: check dictionary, otherwise keep original
      const translated = words.map(word => HINDI_DICT[word] || word).join(' ');

      console.log('Voice Input:', transcript, 'Translated:', translated);
      setSearchTerm(translated); // Will default to English if no Hindi match
    };
    recognition.start();
  };

  const addToCart = (productId) => {
    // Check if mixing retailers
    const product = products.find(p => p._id === productId);
    const existing = Object.keys(cart);
    if (existing.length > 0) {
      const first = products.find(p => p._id === existing[0]);
      const pRid = product.retailerId?._id || product.retailerId;
      const fRid = first.retailerId?._id || first.retailerId;

      if (pRid !== fRid) {
        if (!window.confirm("You can only order from one retailer at a time. Clear cart and add this item?")) return;
        setCart({ [productId]: 1 });
        return;
      }
    }
    setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };

  const removeFromCart = (productId) => {
    if (cart[productId] <= 1) {
      const newCart = { ...cart };
      delete newCart[productId];
      setCart(newCart);
    } else {
      setCart(prev => ({ ...prev, [productId]: prev[productId] - 1 }));
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      alert("Please login to place an order");
      return;
    }

    const firstProductIdInCart = Object.keys(cart)[0];
    const product = products.find(p => p._id === firstProductIdInCart);

    if (!product || !product.retailerId) {
      alert("Error identifying retailer for these products.");
      return;
    }

    const retailerId = product.retailerId._id || product.retailerId;
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));

    try {
      await createOrder({ items, retailerId });
      setOrderStatus('success');
      setCart({});
      setTimeout(() => setOrderStatus(null), 4000);
    } catch (err) {
      console.error("Checkout Error:", err);
      alert(err.response?.data?.message || err.message || 'Error placing order');
    }
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((acc, [pid, q]) =>
    acc + (products.find(p => p._id === pid)?.price * q || 0), 0
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-32">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-900 pt-16 pb-32 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -mr-64 -mt-64 blur-3xl animate-pulse" />
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <span className="bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full backdrop-blur-md mb-6 inline-block">Hyperlocal Delivery Redefined</span>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter leading-none">
            Your Trusted Store, <br />Now <span className="text-blue-300">Fast & Smart.</span>
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mb-12 font-medium opacity-80 leading-relaxed">
            Order fresh groceries from your neighborhood store using Voice search in Hindi or English.
          </p>

          <div className="w-full max-w-3xl flex flex-col md:flex-row gap-4 p-3 bg-white/10 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                value={searchTerm}
                placeholder="Seach Sugar, Milk, Rice or search in Hindi..."
                className="w-full pl-14 pr-6 py-5 rounded-[1.8rem] bg-white text-slate-900 placeholder:text-slate-400 font-bold text-lg focus:ring-4 focus:ring-blue-500/30 transition-all border-none"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={startListening}
              className={`flex items-center justify-center gap-3 px-8 py-5 rounded-[1.8rem] font-black text-lg transition-all ${isListening ? 'bg-red-500 text-white scale-105 shadow-xl shadow-red-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20'}`}
            >
              {isListening ? <MicOff /> : <Mic />}
              {isListening ? 'Listening...' : 'Search by Voice'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16">
        {/* Retailer Selector - Dropdown Style */}
        <div className="mb-8 bg-white p-4 rounded-3xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom duration-700">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
              <Store size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Store</span>
              <select
                value={activeRetailer}
                onChange={(e) => setActiveRetailer(e.target.value)}
                className="font-black text-lg sm:text-xl text-slate-900 bg-transparent border-none focus:ring-0 p-0 cursor-pointer min-w-[200px] outline-none"
              >
                <option value="All">All Neighborhood Stores</option>
                {retailers.map(r => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-xl">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>{filteredProducts.length} items nearby</span>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-8 no-scrollbar mb-10">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-8 py-4 rounded-2xl font-black whitespace-nowrap transition-all shadow-sm flex items-center gap-3 ${activeCategory === cat ? 'bg-slate-900 text-white scale-105 shadow-2xl' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'}`}
            >
              {cat === 'All' ? <Filter size={18} /> : <Tag size={18} />}
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Loading Fresh Stock...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map(product => (
              <ProductCard
                key={product._id}
                product={product}
                quantity={cart[product._id]}
                onAdd={() => addToCart(product._id)}
                onRemove={() => removeFromCart(product._id)}
                onInfo={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        )}
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50">
          <button onClick={handleCheckout} className="w-full bg-slate-950 text-white py-6 rounded-3xl font-black text-xl shadow-2xl flex items-center justify-between px-10 hover:scale-[1.02] active:scale-95 transition-all group overflow-hidden relative">
            <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold backdrop-blur-md">
                {totalItems}
              </div>
              <span>Place My Order</span>
            </div>
            <span className="text-blue-400 relative z-10 group-hover:text-white transition-colors">₹{totalPrice.toLocaleString()}</span>
          </button>
        </div>
      )}

      {/* Specification / Detail Dialog */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white max-w-2xl w-full rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] relative overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="h-64 relative">
              <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
              <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 p-4 bg-white/80 backdrop-blur rounded-2xl text-slate-900 shadow-xl hover:scale-110 transition-transform"><X /></button>
            </div>
            <div className="p-10 -mt-12 relative z-10">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">{selectedProduct.category}</span>
                  <h2 className="text-4xl font-black text-slate-900 leading-tight">{selectedProduct.name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold mb-1">Price</p>
                  <p className="text-5xl font-black text-blue-600 tracking-tighter">₹{selectedProduct.price}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-10">
                <DetailBox icon={<FileText size={18} />} title="Specifications" value={selectedProduct.specifications || 'Fresh neighborhood quality assured.'} isLong />
                <DetailBox icon={<Calendar size={18} />} title="Expiry Date" value={new Date(selectedProduct.expiryDate).toLocaleDateString()} />
                <DetailBox icon={<Hash size={18} />} title="SKU Batch" value={selectedProduct.sku} />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setSelectedProduct(null)} className="flex-1 py-5 rounded-2xl font-bold bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all border border-slate-100">Close</button>
                <button
                  onClick={() => { addToCart(selectedProduct._id); setSelectedProduct(null); }}
                  className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3"
                >
                  <Plus /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {orderStatus === 'success' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/90 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="text-center">
            <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce transition-transform">
              <CheckCircle2 size={64} className="text-emerald-500" />
            </div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Yay! Order Placed.</h2>
            <p className="text-slate-500 text-xl font-medium max-w-sm mx-auto">Your retailer is preparing your fresh stock. Check history for updates.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailBox = ({ icon, title, value, isLong }) => (
  <div className={`p-6 bg-slate-50 rounded-[1.8rem] border border-slate-100 ${isLong ? 'col-span-2' : ''}`}>
    <div className="flex items-center gap-3 text-blue-600 mb-3">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</span>
    </div>
    <p className={`font-bold text-slate-900 leading-snug ${isLong ? 'text-sm' : 'text-lg'}`}>{value}</p>
  </div>
);

const ProductCard = ({ product, quantity, onAdd, onRemove, onInfo }) => (
  <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 border border-slate-50 group flex flex-col relative overflow-hidden">
    <div className="aspect-[4/5] bg-slate-100 rounded-[2rem] mb-6 relative overflow-hidden">
      <img
        src={product.imageUrl}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        alt={product.name}
        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <button
        onClick={onInfo}
        className="absolute top-6 right-6 p-4 bg-white/90 backdrop-blur-xl rounded-[1.4rem] text-slate-900 shadow-premium opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all hover:bg-blue-600 hover:text-white"
      >
        <FileText size={18} />
      </button>
      {product.stock < 10 && (
        <div className="absolute top-6 left-6 bg-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
          Low Stock
        </div>
      )}
    </div>

    <div className="flex-1 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-60">{product.category}</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase">SKU: {product.sku}</span>
      </div>
      <h3 className="font-black text-slate-900 text-xl leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{product.name}</h3>
    </div>

    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-50">
      <div className="flex flex-col">
        <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{product.price}</span>
      </div>

      {quantity ? (
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={onRemove} className="w-10 h-10 rounded-xl bg-white text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm"><Minus size={16} /></button>
          <span className="font-black text-slate-900 w-8 text-center text-lg">{quantity}</span>
          <button onClick={onAdd} className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"><Plus size={16} /></button>
        </div>
      ) : (
        <button
          onClick={onAdd}
          className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-blue-600 transition-all shadow-xl group-active:scale-90"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  </div>
);

export default Marketplace;
