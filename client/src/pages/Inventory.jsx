import React, { useState, useEffect } from 'react';
import {
  fetchMyProducts, createProduct, updateProduct, deleteProduct,
  fetchPriceSuggestion, toggleStar, parseVoiceText, executeVoiceAction,
  createB2BOrder, fetchWholesalers
} from '../api';
import {
  Package, Plus, Edit2, Trash2, AlertTriangle, Wand2, ArrowLeft,
  Save, X, Image as ImageIcon, FileText, Star, Mic, RotateCcw,
  CheckCircle, User
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const Inventory = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [wholesalers, setWholesalers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedWholesaler, setSelectedWholesaler] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', price: '', basePrice: '', stock: '', category: '', sku: '', expiryDate: '', minStockThreshold: 10, imageUrl: '', specifications: '', status: 'active'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: productsData } = await fetchMyProducts();
      setProducts(productsData);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }

    try {
      const { data: wholesalersData } = await fetchWholesalers();
      setWholesalers(wholesalersData);
    } catch (err) {
      console.error("Failed to fetch wholesalers", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateProduct(editingProduct._id, formData);
      } else {
        await createProduct(formData);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      resetForm();
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving product');
    }
  };

  const handleToggleStar = async (id) => {
    try {
      await toggleStar(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickReorder = async () => {
    const starredItems = products.filter(p => p.isStarred);
    if (starredItems.length === 0) {
      alert("No starred items to reorder!");
      return;
    }

    if (!selectedWholesaler) {
      setShowReorderModal(true);
      return;
    }

    try {
      const orderData = {
        wholesalerId: selectedWholesaler._id,
        items: starredItems.map(p => ({
          name: p.name,
          sku: p.sku,
          quantity: p.minStockThreshold * 2,
          priceAtPurchase: p.basePrice || p.price * 0.8,
          category: p.category,
          imageUrl: p.imageUrl
        })),
        totalAmount: starredItems.reduce((acc, p) => acc + (p.price * 0.8 * p.minStockThreshold * 2), 0)
      };
      await createB2BOrder(orderData);
      alert("B2B Order placed successfully! Check 'Orders' to track status.");
      setShowReorderModal(false);
      setSelectedWholesaler(null);
    } catch (err) {
      alert("Error placing reorder");
    }
  };

  const handleVoiceCommand = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // optimized for Hindi
    recognition.start();
    setIsVoiceActive(true);

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsVoiceActive(false);
      try {
        const { data: parsed } = await parseVoiceText(transcript);
        if (window.confirm(`Voice AI detected request in Hindi/English: \n"${transcript}"\n\nAction: ${parsed.action.toUpperCase()}\nItem: ${parsed.item}\nQuantity: ${parsed.quantity} ${parsed.unit}\n\nConfirm update?`)) {
          await executeVoiceAction(parsed);
          loadData();
        }
      } catch (err) {
        alert("AI could not parse the command. Try: '5 kg rice add karo' or 'chiini 2 kg delete karo'");
      }
    };

    recognition.onerror = () => setIsVoiceActive(false);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      ...product,
      expiryDate: product.expiryDate?.split('T')[0] || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        alert('Product deleted successfully');
        loadData();
      } catch (err) {
        console.error("Delete Error:", err);
        alert(`Error deleting product: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const suggestPrice = async () => {
    if (!editingProduct) return;
    try {
      const { data } = await fetchPriceSuggestion(editingProduct._id);
      if (data.suggestedPrice) {
        setFormData({ ...formData, price: Math.round(data.suggestedPrice) });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', price: '', basePrice: '', stock: '', category: '', sku: '', expiryDate: '', minStockThreshold: 10, imageUrl: '', specifications: '', status: 'active' });
  };

  return (
    <div className="bg-slate-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link to="/dashboard" className="text-blue-600 flex items-center gap-2 font-bold mb-2 hover:translate-x-1 transition-transform">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-4xl font-black text-slate-900">
              {user.role === 'wholesaler' ? 'Bulk Inventory Mgt.' : 'Retail Store Inventory'}
              <span className="text-sm font-normal text-slate-400 ml-2 block">ID: {user.id}</span>
            </h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleVoiceCommand}
              className={`px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all ${isVoiceActive ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-600 shadow-premium border border-slate-100 hover:bg-slate-50'}`}
            >
              <Mic size={20} /> {isVoiceActive ? 'Listening...' : 'Voice Command'}
            </button>
            <button
              onClick={handleQuickReorder}
              className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all"
            >
              <RotateCcw size={20} /> Quick Reorder
            </button>
            {user.role === 'wholesaler' && (
              <button
                onClick={() => { resetForm(); setEditingProduct(null); setIsModalOpen(true); }}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
              >
                <Plus /> Add New Product
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-6 text-sm font-black text-slate-400 uppercase tracking-widest text-center">⭐</th>
                  <th className="px-8 py-6 text-sm font-black text-slate-400 uppercase tracking-widest">Product</th>
                  <th className="px-6 py-6 text-sm font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-6 text-sm font-black text-slate-400 uppercase tracking-widest">Stock</th>
                  <th className="px-6 py-6 text-sm font-black text-slate-400 uppercase tracking-widest">Price</th>
                  <th className="px-8 py-6 text-sm font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 text-center">
                      <button onClick={() => handleToggleStar(p._id)} className={`transition-all ${p.isStarred ? 'text-amber-500 scale-125' : 'text-slate-200 hover:text-slate-400'}`}>
                        <Star fill={p.isStarred ? "currentColor" : "none"} size={24} />
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                          {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" alt="" /> : <Package size={24} className="text-slate-300" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-400 font-medium">SKU: {p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-center border ${p.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'}`}>
                          {p.status || 'active'}
                        </span>
                        {p.status === 'draft' && (
                          <button onClick={() => handleEdit(p)} className="text-[9px] text-blue-600 font-bold hover:underline">Setup Price & Go Live</button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-lg ${p.stock <= p.minStockThreshold ? 'text-red-500' : 'text-slate-900'}`}>{p.stock}</span>
                        {p.stock <= p.minStockThreshold && <AlertTriangle size={16} className="text-amber-500 animate-pulse" />}
                      </div>
                    </td>
                    <td className="px-6 py-6 font-bold text-lg text-blue-600">₹{p.price}</td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => handleEdit(p)} className="p-3 bg-white border border-slate-100 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(p._id)} className="p-3 bg-white border border-slate-100 rounded-xl text-slate-600 hover:text-red-600 hover:border-red-100 transition-all shadow-sm">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white max-w-2xl w-full rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 h-[90vh] flex flex-col">
            <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                  <p className="text-slate-400 font-medium mt-1">Add items in English or Hinglish for easier Search.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><X /></button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-black text-slate-500 px-1">Product Name {user.role === 'wholesaler' && '(Include Hindi in brackets)'}</label>
                  <input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className={`w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold`}
                    required 
                    placeholder="e.g. Sugar (चीनी)" 
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-black text-slate-500 px-1 flex items-center gap-2"><ImageIcon size={14} /> Image URL</label>
                  <input 
                    value={formData.imageUrl} 
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} 
                    className={`w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-medium text-xs text-slate-400`}
                    placeholder="Paste Unsplash image URL here" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 px-1">Base Price (Cost)</label>
                  <input 
                    type="number" 
                    value={formData.basePrice} 
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })} 
                    className={`w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold text-lg`}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 px-1 flex justify-between">
                    Selling Price
                    {editingProduct && (
                      <button type="button" onClick={suggestPrice} className="text-blue-600 flex items-center gap-1 hover:underline">
                        <Wand2 size={12} /> AI Suggest
                      </button>
                    )}
                  </label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full bg-slate-100 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold text-lg text-blue-600" required />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 px-1">Stock Level</label>
                  <input 
                    type="number" 
                    value={formData.stock} 
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })} 
                    className={`w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold`}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 px-1">Category</label>
                  <input 
                    value={formData.category} 
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                    className={`w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold`}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 px-1">SKU Code</label>
                  <input 
                    value={formData.sku} 
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })} 
                    className={`w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold`}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 px-1">Expiry Date</label>
                  <input 
                    type="date" 
                    value={formData.expiryDate} 
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} 
                    className={`w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold`}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 px-1">Visibility Status</label>
                  <select 
                    value={formData.status || 'active'} 
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold"
                  >
                    <option value="active">Active (Visible to Buyers)</option>
                    <option value="draft">Draft (Setup Phase)</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-black text-slate-500 px-1 flex items-center gap-2"><FileText size={14} /> Specifications & Details</label>
                  <textarea value={formData.specifications} onChange={(e) => setFormData({ ...formData, specifications: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-medium h-32" placeholder="Describe the product features, quality etc." />
                </div>

                <div className="col-span-2 flex gap-4 pt-4 mb-10">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-2xl font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all">Cancel</button>
                  <button type="submit" className="flex-[2] py-5 rounded-2xl font-black text-white bg-blue-600 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                    <Save size={20} />
                    {editingProduct ? 'Update Inventory' : 'Add to Catalog'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Wholesaler Selector Modal */}
      {showReorderModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white max-w-md w-full rounded-[2.5rem] shadow-2xl relative overflow-hidden p-10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-black text-slate-900 leading-tight">Pick a <span className="text-blue-600">Wholesaler</span></h2>
              <button onClick={() => setShowReorderModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><X /></button>
            </div>
            <p className="text-slate-400 font-medium mb-8">Choose which supplier to send this bulk reorder to.</p>

            <div className="space-y-4 mb-8">
              {wholesalers.map(w => (
                <button
                  key={w._id}
                  onClick={() => setSelectedWholesaler(w)}
                  className={`w-full p-6 rounded-3xl border-2 transition-all text-left flex items-center justify-between ${selectedWholesaler?._id === w._id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-50 hover:border-slate-100 bg-slate-50/30'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${selectedWholesaler?._id === w._id ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>
                      <User size={20} />
                    </div>
                    <span className={`font-bold ${selectedWholesaler?._id === w._id ? 'text-blue-600' : 'text-slate-700'}`}>{w.name}</span>
                  </div>
                  {selectedWholesaler?._id === w._id && <CheckCircle className="text-blue-600" size={20} />}
                </button>
              ))}
            </div>

            <button
              onClick={handleQuickReorder}
              disabled={!selectedWholesaler}
              className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              Send Bulk Order
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
