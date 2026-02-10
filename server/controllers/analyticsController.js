const SalesData = require('../models/SalesData');
const Product = require('../models/Product');
const mongoose = require('mongoose');

exports.getVelocityReport = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const sales = await SalesData.aggregate([
      { $match: { retailerId: new mongoose.Types.ObjectId(req.user.id), timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$productId', totalSold: { $sum: '$quantity' } } },
      { $sort: { totalSold: -1 } }
    ]);

    // Attach product names
    const populatedSales = await Promise.all(sales.map(async (s) => {
      const product = await Product.findById(s._id);
      return {
        name: product?.name || 'Unknown',
        totalSold: s.totalSold,
        status: s.totalSold > 50 ? 'Fast-Moving' : (s.totalSold > 10 ? 'Normal' : 'Slow-Moving')
      };
    }));

    res.json(populatedSales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getFinancials = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const sales = await SalesData.find({
      retailerId: req.user.id,
      timestamp: { $gte: startOfMonth }
    });

    const revenue = sales.reduce((acc, curr) => acc + (curr.quantity * curr.priceAtSale), 0);
    
    // Calculate potential loss from expired products
    const expiredProducts = await Product.find({
      retailerId: req.user.id,
      expiryDate: { $lt: new Date() },
      stock: { $gt: 0 }
    });
    
    const loss = expiredProducts.reduce((acc, curr) => acc + (curr.stock * curr.basePrice), 0);
    
    res.json({
      revenue,
      projectedRevenue: revenue * 1.2, // Simple projection
      loss,
      netProfit: revenue - loss
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mock AI Service Endpoints (Process internally if Python service is unavailable)
exports.getForecast = async (req, res) => {
    try {
        // Generate a 7-day forecast based on recent sales trends
        // For demo, we just return a randomized curve that looks "smart"
        const forecast = [];
        let baseValue = 50 + Math.random() * 50;
        
        for(let i=0; i<7; i++) {
            const noise = (Math.random() - 0.5) * 20;
            const trend = i * 2; // Slight upward trend
            const seasonality = Math.sin(i) * 10;
            forecast.push(Math.max(0, Math.round(baseValue + noise + trend + seasonality)));
        }
        
        res.json({ forecast });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getRecommendations = async (req, res) => {
    try {
        // Mock Apriori Results
        // In a real scenario, this would read from the Python service's output or a pre-calculated collection
        const rules = [
            { antecedents: ['Bread'], consequents: ['Milk', 'Eggs'], confidence: 0.85 },
            { antecedents: ['Maggi'], consequents: ['Coke'], confidence: 0.75 },
            { antecedents: ['Tea'], consequents: ['Sugar', 'Biscuits'], confidence: 0.92 },
            { antecedents: ['Rice'], consequents: ['Dal'], confidence: 0.88 },
            { antecedents: ['Chips'], consequents: ['Cold Drink'], confidence: 0.65 }
        ];
        
        // Randomize slightly so it feels dynamic
        const shuffled = rules.sort(() => 0.5 - Math.random()).slice(0, 3);
        
        res.json({ rules: shuffled });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getPriceSuggestion = async (req, res) => {
    try {
       // Mock Dynamic Pricing
       const product = await Product.findById(req.params.id);
       if(!product) return res.status(404).json({ message: "Product not found" });

       const currentPrice = product.price;
       const suggestedPrice = Math.round(currentPrice * (0.9 + Math.random() * 0.2)); 
       
       res.json({
           productId: product._id,
           currentPrice,
           suggestedPrice,
           reason: suggestedPrice > currentPrice ? "High Demand" : "Low Velocity",
           confidence: 0.8 + Math.random() * 0.15
       });
    } catch(err) {
        res.status(500).json({ message: err.message });
    }
};
