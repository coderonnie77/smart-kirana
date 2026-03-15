import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
console.log('Using Backend API:', API_URL);
const API = axios.create({ baseURL: API_URL });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);
export const fetchProducts = () => API.get('/products');
export const fetchProductsByWholesaler = (wholesalerId) => API.get(`/products/wholesaler/${wholesalerId}`);
export const fetchMyProducts = () => API.get('/products/mine');
export const createProduct = (data) => API.post('/products', data);
export const updateProduct = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);
export const createOrder = (data) => API.post('/orders', data);
export const fetchOrders = () => API.get('/orders');
export const updateOrderStatus = (id, status) => API.put(`/orders/${id}/status`, { status });

// Phase 2 Endpoints
export const toggleStar = (id) => API.patch(`/products/${id}/star`);
export const executeVoiceAction = (data) => API.post('/products/voice-action', data);
export const fetchExpiryAlerts = () => API.get('/products/expiry-alerts');

export const fetchWholesalers = () => API.get('/auth/wholesalers');
export const fetchRetailers = () => API.get('/auth/retailers');

export const createB2BOrder = (data) => API.post('/orders/b2b', data);
export const fetchB2BOrders = () => API.get('/orders/b2b');
export const updateB2BOrderStatus = (id, status) => API.put(`/orders/b2b/${id}/status`, { status });
export const fulfillB2BOrder = (id) => API.put(`/orders/b2b/${id}/confirm`); 
export const fetchStarredReorders = () => API.get('/orders/starred-reorders');

export const fetchVelocityReport = () => API.get('/analytics/velocity');
export const fetchFinancials = () => API.get('/analytics/financials');

// AI Service API (Proxied through Node for reliability/auth)
export const fetchForecast = (retailerId) => API.get(`/analytics/forecast/${retailerId}`);
export const fetchRecommendations = (retailerId) => API.get(`/analytics/recommendations/${retailerId}`);
export const fetchPriceSuggestion = (productId) => API.get(`/analytics/price-suggestion/${productId}`);

export const parseVoiceText = async (text) => {
  return new Promise((resolve, reject) => {
    try {
      const lower = text.toLowerCase();
      
      let action = 'add';
      if (lower.includes('delete') || lower.includes('remove') || lower.includes('hatao') || lower.includes('nikalo') || lower.includes('kam karo') || lower.includes('रिमूव') || lower.includes('हटाओ') || lower.includes('निकालो') || lower.includes('डिलीट')) {
        action = 'delete';
      } else if (lower.includes('update') || lower.includes('set') || lower.includes('अपडेट')) {
        action = 'update';
      }

      const numMatch = lower.match(/\d+/);
      const quantity = numMatch ? parseInt(numMatch[0]) : 1;
      
      let unit = 'pcs';
      if (lower.includes('kg') || lower.includes('kilo')) unit = 'kg';
      else if (lower.includes('gram') || lower.includes('gm')) unit = 'g';
      else if (lower.includes('liter') || lower.includes('ltr')) unit = 'L';
      else if (lower.includes('packet') || lower.includes('pkt')) unit = 'pkt';

      let item = lower.replace(/\d+/g, '')
        .replace(/kg|kilo|gram|gm|liter|ltr|packet|pkt/g, '')
        .replace(/add|delete|remove|update|karo|hatao|nikalo|set|please/g, '')
        .replace(/रिमूव|हटाओ|निकालो|अपडेट|डिलीट|कम|करो|प्लीज|प्लीज़|सेट|ऐड/g, '')
        .trim();

      const HINDI_DICT = {
        'namak': 'salt', 'cheeni': 'sugar', 'chini': 'sugar', 'doodh': 'milk',
        'chawal': 'rice', 'aata': 'flour', 'tel': 'oil', 'masale': 'spices',
        'sabun': 'soap', 'chai': 'tea', 'biskut': 'biscuit', 'daal': 'pulse',
        'pyaaz': 'onion', 'aalu': 'potato', 'tamatar': 'tomato',
        'नमक': 'salt', 'चीनी': 'sugar', 'दूध': 'milk',
        'चावल': 'rice', 'आटा': 'flour', 'तेल': 'oil', 'मसाले': 'spices',
        'साबुन': 'soap', 'चाय': 'tea', 'बिस्कुट': 'biscuit', 'दाल': 'pulse',
        'प्याज': 'onion', 'आलू': 'potato', 'टमाटर': 'tomato', 'मैगी': 'maggi',
        'कोक': 'coke', 'ब्रेड': 'bread', 'अंडा': 'eggs'
      };

      const words = item.split(' ').filter(w => w.trim() !== '');
      item = words.map(w => HINDI_DICT[w] || w).join(' ');

      if (!item) {
        throw new Error("Could not detect item name.");
      }

      resolve({
        data: {
          action,
          item,
          quantity,
          unit
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};
