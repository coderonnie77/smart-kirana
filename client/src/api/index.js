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

// Voice parsing might still need Python if complex, but for now we are handling it in Frontend logic
// keeping this as is for now, or pointing to a future node endpoint
export const parseVoiceText = (text) => axios.post(`${import.meta.env.VITE_AI_URL || 'http://localhost:8000'}/parse-voice`, { text });
