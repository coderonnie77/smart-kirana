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
      let lower = text.toLowerCase();
      
      let price = null;
      const priceRegex = /(?:price|प्राइस|at|एट|for|₹|rs\.?)\s*(?:of|ऑफ़|of rs|ऑफ़ रु)?\s*(\d+)|(\d+)\s*(?:rupees|रुपये|रु|rs)/;
      const priceMatch = lower.match(priceRegex);
      if (priceMatch) {
          price = parseInt(priceMatch[1] || priceMatch[2]);
          lower = lower.replace(priceMatch[0], ' '); 
      }

      let action = 'add';
      if (lower.includes('delete') || lower.includes('remove') || lower.includes('hatao') || lower.includes('nikalo') || lower.includes('kam karo') || lower.includes('रिमूव') || lower.includes('हटाओ') || lower.includes('निकालो') || lower.includes('डिलीट')) {
        action = 'delete';
      } else if (lower.includes('update') || lower.includes('set') || lower.includes('अपडेट')) {
        action = 'update';
      }

      // Parse quantity (digits or words)
      let quantity = 1;
      const numMatch = lower.match(/\d+/);
      
      const WORD_NUMBERS = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5, 
        'chhe': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'dus': 10,
        'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 
        'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
        'वन': 1, 'टू': 2, 'थ्री': 3, 'फोर': 4, 'फाइव': 5
      };

      if (numMatch) {
        quantity = parseInt(numMatch[0]);
      } else {
        const tokens = lower.split(/\s+/);
        for (let w of tokens) {
          if (WORD_NUMBERS[w]) {
             quantity = WORD_NUMBERS[w];
             break;
          }
        }
      }
      let unit = 'pcs';
      if (lower.includes('kg') || lower.includes('kilo') || lower.includes('किलो') || lower.includes('केजी')) unit = 'kg';
      else if (lower.includes('gram') || lower.includes('gm') || lower.includes('ग्राम')) unit = 'g';
      else if (lower.includes('liter') || lower.includes('ltr') || lower.includes('लीटर')) unit = 'L';
      else if (lower.includes('packet') || lower.includes('pkt') || lower.includes('पैकेट')) unit = 'pkt';

      let itemTokens = lower.replace(/\d+/g, ' ')
        .replace(/kg|kilo|gram|gm|liter|ltr|packet|pkt|quantity|qty|किलो|केजी|ग्राम|लीटर|पैकेट/g, ' ')
        .replace(/at|एट|price|प्राइस|rupees|रुपये|rs|₹|रु/g, ' ')
        .replace(/add|delete|remove|update|karo|hatao|nikalo|set|please|insert|create/g, ' ')
        .replace(/रिमूव|हटाओ|निकालो|अपडेट|डिलीट|कम|करो|प्लीज|प्लीज़|सेट|ऐड|एड|जोड़ें|बनाएं|क्वांटिटी|मात्रा/g, ' ')
        .replace(/(?:^|\s)(of|for|to|the|a|in|ऑफ़|ऑफ|का|की|के|में|को)(?=\s|$)/g, ' ')
        .split(/\s+/);
      
      // Also filter out word-numbers from the final item name
      itemTokens = itemTokens.filter(w => w.trim() !== '' && !WORD_NUMBERS[w]);
      let item = itemTokens.join(' ').trim();

      const HINDI_DICT = {
        'namak': 'salt', 'cheeni': 'sugar', 'chini': 'sugar', 'doodh': 'milk',
        'chawal': 'rice', 'aata': 'flour', 'tel': 'oil', 'masale': 'spices',
        'sabun': 'soap', 'chai': 'tea', 'biskut': 'biscuit', 'daal': 'pulse',
        'pyaaz': 'onion', 'aalu': 'potato', 'tamatar': 'tomato',
        'नमक': 'salt', 'चीनी': 'sugar', 'दूध': 'milk',
        'चावल': 'rice', 'आटा': 'flour', 'तेल': 'oil', 'मसाले': 'spices',
        'साबुन': 'soap', 'चाय': 'tea', 'बिस्कुट': 'biscuit', 'दाल': 'pulse',
        'प्याज': 'onion', 'आलू': 'potato', 'टमाटर': 'tomato', 'मैगी': 'maggi',
        'कोक': 'coke', 'ब्रेड': 'bread', 'अंडा': 'eggs',
        'शुगर': 'sugar', 'सूगर': 'sugar', 'सक्कर': 'sugar', 'शक्कर': 'sugar',
        'मिल्क': 'milk', 'राईस': 'rice', 'राइस': 'rice', 'ऑयल': 'oil', 'ऑईल': 'oil',
        'आटा': 'flour', 'आट्टा': 'flour', 'बिस्कुट': 'biscuit', 'बिस्किट': 'biscuit',
        'पोटैटो': 'potato', 'टोमेटो': 'tomato', 'टोमाटो': 'tomato', 'चाय': 'tea', 'टी': 'tea'
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
          unit,
          price
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};
