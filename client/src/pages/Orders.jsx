import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrders, updateOrderStatus } from '../api';
import { Package, Calendar, CheckCircle, ShoppingBag, XCircle, Clock, Check, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const { data } = await fetchOrders();
      setOrders(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusUpdate = async (id, status) => {
     try {
       await updateOrderStatus(id, status);
       loadOrders();
     } catch (err) {
       alert('Error updating order');
     }
  };

  const getStatusStyle = (status) => {
      switch(status) {
          case 'delivered': 
          case 'fulfilled': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
          case 'cancelled': 
          case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
          case 'processing': 
          case 'accepted': return 'bg-blue-50 text-blue-600 border-blue-100';
          default: return 'bg-amber-50 text-amber-600 border-amber-100';
      }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 font-bold text-slate-400 hover:text-blue-600 mb-8 transition-colors">
            <ArrowRight className="rotate-180" size={16} /> Back to Dashboard
        </Link>
        <header className="mb-10 flex items-center justify-between">
           <div>
              <h1 className="text-4xl font-black text-slate-900">
                {user.role === 'wholesaler' ? 'व्यापार इतिहास ' : 'ऑर्डर प्रबंधन '}
                <span className="text-blue-600">({user.role === 'wholesaler' ? 'Trade History' : 'Orders'})</span>
              </h1>
              <p className="text-slate-400 font-medium mt-1">
                 {user.role === 'retailer' ? 'नए ऑर्डर स्वीकार करें और भेजें।' : user.role === 'wholesaler' ? 'सभी पिछले और पूरे हुए थोक सौदे।' : 'अपने पिछले ऑर्डर्स देखें।'}
              </p>
           </div>
           <div className="bg-white p-4 rounded-3xl shadow-premium border border-slate-50 flex items-center gap-3">
              <ShoppingBag className="text-blue-600" />
              <span className="font-black text-xl">{orders.length}</span>
           </div>
        </header>

        {loading ? (
             <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="space-y-6">
            {orders.length > 0 ? orders.map(order => (
              <div key={order._id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all group overflow-hidden relative">
                {/* Status Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${['pending', 'processing', 'accepted'].includes(order.status) ? 'bg-amber-400' : ['delivered', 'fulfilled'].includes(order.status) ? 'bg-emerald-500' : 'bg-red-500'}`} />

                <div className="flex flex-wrap justify-between items-start gap-6 mb-8 border-b border-slate-50 pb-8 mt-2">
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                        <Package size={32} />
                     </div>
                     <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Order ID</p>
                        <p className="font-bold text-slate-900">#{order._id.slice(-8).toUpperCase()}</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-10">
                     <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">दिनांक (Date)</p>
                        <div className="flex items-center gap-2 text-slate-900 font-bold">
                           <Calendar size={16} className="text-blue-600" />
                           {new Date(order.createdAt).toLocaleDateString('hi-IN')}
                        </div>
                     </div>
                     <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">स्थिति (Status)</p>
                        <div className={`flex items-center gap-2 font-black uppercase text-[10px] px-3 py-1.5 rounded-full border ${getStatusStyle(order.status)}`}>
                           {['delivered', 'fulfilled'].includes(order.status) ? <CheckCircle size={12} /> : ['cancelled', 'rejected'].includes(order.status) ? <XCircle size={12} /> : <Clock size={12} />}
                           {order.status}
                        </div>
                     </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 transition-colors">
                      <div className="flex flex-col">
                        <p className="font-black text-slate-900">{item.name || 'Stock Item'}</p>
                        <p className="text-[10px] font-bold text-slate-400">UID: {item.productId?.slice(-6) || item.sku || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-8">
                         <span className="text-slate-400 font-bold tracking-tighter">QTY: {item.quantity}</span>
                         <span className="font-black text-slate-900">₹{item.priceAtPurchase}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-8 flex items-center justify-between border-t border-slate-50">
                   {user.role === 'retailer' && order.status === 'pending' ? (
                      <div className="flex gap-4 w-full">
                         <button 
                            onClick={() => handleStatusUpdate(order._id, 'cancelled')}
                            className="flex-1 py-4 rounded-2xl font-black text-red-500 border-2 border-red-50 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                         >
                            <XCircle size={20} /> मना करें (Reject)
                         </button>
                         <button 
                            onClick={() => handleStatusUpdate(order._id, 'processing')}
                            className="flex-[2] py-4 rounded-2xl font-black text-white bg-blue-600 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                         >
                            <Check size={20} /> स्वीकार करें (Accept)
                         </button>
                      </div>
                   ) : user.role === 'retailer' && order.status === 'processing' ? (
                       <button 
                        onClick={() => handleStatusUpdate(order._id, 'delivered')}
                        className="w-full py-4 rounded-2xl font-black text-white bg-emerald-500 shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                       >
                        <ArrowRight size={20} /> सफलतापूर्वक भेजा (Mark as Delivered)
                       </button>
                   ) : (
                       <div className="flex justify-between items-center w-full italic text-slate-400 text-sm">
                          <span>कुल राशि (Total Amount):</span>
                          <span className="text-3xl font-black text-slate-900 not-italic">₹{order.totalAmount?.toLocaleString()}</span>
                       </div>
                   )}
                </div>

                {/* Payment Screenshot Section */}
                {user.role === 'retailer' && order.paymentScreenshot && (
                  <div className="mt-6 pt-6 border-t border-slate-50">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Customer Payment Screenshot (UPI)</p>
                    <div className="rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 w-full lg:w-1/2">
                      <img src={order.paymentScreenshot} alt="Payment Proof" className="w-full h-auto object-contain max-h-64" />
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <div className="bg-white rounded-[3rem] py-24 text-center border-2 border-dashed border-slate-100">
                 <ShoppingBag size={80} className="mx-auto text-slate-100 mb-6" />
                 <h2 className="text-3xl font-black text-slate-300">कोई ऑर्डर नहीं (No Orders)</h2>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
