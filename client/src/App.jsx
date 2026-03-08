import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Marketplace from './pages/Marketplace';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import WholesalerMarketplace from './pages/WholesalerMarketplace';
import B2BOrders from './pages/B2BOrders';
import Chatbot from './components/Chatbot';

const PrivateRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && (Array.isArray(role) ? !role.includes(user.role) : user.role !== role)) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Marketplace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/orders" element={<Orders />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute role="retailer">
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <PrivateRoute role={['retailer', 'wholesaler']}>
                  <Inventory />
                </PrivateRoute>
              }
            />
            <Route
              path="/wholesale"
              element={
                <PrivateRoute role="retailer">
                  <WholesalerMarketplace />
                </PrivateRoute>
              }
            />
            <Route
              path="/b2b-orders"
              element={
                <PrivateRoute role="wholesaler">
                  <B2BOrders />
                </PrivateRoute>
              }
            />
          </Routes>
          <Chatbot />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
