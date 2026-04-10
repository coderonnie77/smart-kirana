const mongoose = require('mongoose');
const Order = require('../models/Order');
const B2BOrder = require('../models/B2BOrder');
const Product = require('../models/Product');
const SalesData = require('../models/SalesData');

exports.createOrder = async (req, res) => {
  try {
    const { items, retailerId } = req.body;
    let totalAmount = 0;
    
    const transactionId = new mongoose.Types.ObjectId().toString();

    const processedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product?.name || 'item'}` });
      }
      
      product.stock -= item.quantity;
      await product.save();
      
      const price = product.price;
      totalAmount += price * item.quantity;

      processedItems.push({
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        priceAtPurchase: price
      });

      // Log Sales Data for AI
      const salesEntry = new SalesData({
        productId: item.productId,
        transactionId,
        quantity: item.quantity,
        priceAtSale: price,
        retailerId
      });
      await salesEntry.save();
    }

    const order = new Order({
      customerId: req.user.id,
      retailerId,
      items: processedItems,
      totalAmount
    });
    await order.save();
    
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    if (req.user.role === 'wholesaler') {
      // Archive: Only show completed/finalized B2B orders
      const b2bOrders = await B2BOrder.find({ 
        wholesalerId: req.user.id,
        status: { $in: ['fulfilled', 'rejected', 'cancelled'] }
      }).sort({ createdAt: -1 });
      return res.json(b2bOrders);
    }

    const query = req.user.role === 'retailer' 
      ? { retailerId: req.user.id } 
      : { customerId: req.user.id };
    
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, retailerId: req.user.id },
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// B2B Logic
exports.createB2BOrder = async (req, res) => {
  try {
    const { wholesalerId, items, totalAmount } = req.body;
    const order = new B2BOrder({
      retailerId: req.user.id,
      wholesalerId,
      items,
      totalAmount,
      status: 'pending'
    });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getB2BOrders = async (req, res) => {
  try {
    const query = req.user.role === 'wholesaler'
      ? { wholesalerId: req.user.id, status: { $in: ['pending', 'accepted'] } }
      : { retailerId: req.user.id };
    const orders = await B2BOrder.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.confirmWholesaleOrder = async (req, res) => {
  try {
    const order = await B2BOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Wholesale order not found' });
    
    if (order.status === 'fulfilled') {
      return res.status(400).json({ message: 'Order already fulfilled' });
    }

    console.log(`[B2B] Fulfilling Order ${order._id} for Retailer ${order.retailerId}`);

    for (const item of order.items) {
      console.log(`[B2B] Processing item: ${item.name} (wPID: ${item.wholesalerProductId})`);

      // 1. Validate Wholesaler Product
      if (!item.wholesalerProductId) {
        console.warn(`[B2B] Item ${item.name} missing wholesalerProductId. Skipping stock reduction but proceeding with retailer sync.`);
      } else {
        const wholesalerProduct = await Product.findById(item.wholesalerProductId);
        if (wholesalerProduct) {
          if (wholesalerProduct.stock >= item.quantity) {
             wholesalerProduct.stock -= item.quantity;
             await wholesalerProduct.save();
             console.log(`[B2B] Reduced wholesaler stock for ${item.name}`);
          } else {
             console.warn(`[B2B] Insufficient wholesaler stock for ${item.name}. Continuing anyway.`);
          }
        }
      }

      // 2. Sync to Retailer Inventory
      const conversionFactor = item.unitConversionFactor || 1; 
      const newRetailUnitsTotal = item.quantity * conversionFactor;

      let retailerProduct = await Product.findOne({ 
        retailerId: order.retailerId, 
        wholesalerProductId: item.wholesalerProductId 
      });

      if (retailerProduct) {
        retailerProduct.stock += newRetailUnitsTotal;
        retailerProduct.imageUrl = item.imageUrl || retailerProduct.imageUrl;
        await retailerProduct.save();
        console.log(`[B2B] Updated existing retailer product: ${item.name}`);
      } else {
        retailerProduct = new Product({
          name: item.name,
          category: item.category || 'General',
          retailerId: order.retailerId,
          wholesalerSourceId: order.wholesalerId,
          wholesalerProductId: item.wholesalerProductId,
          stock: newRetailUnitsTotal,
          unitConversionFactor: conversionFactor,
          basePrice: Math.round((item.priceAtPurchase || 0) / conversionFactor), 
          price: Math.round(((item.priceAtPurchase || 0) / conversionFactor) * 1.2), 
          sku: item.sku || `SKU-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
          expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          status: 'draft' 
        });
        await retailerProduct.save();
        console.log(`[B2B] Created new retailer product (DRAFT): ${item.name}`);
      }
    }

    order.status = 'fulfilled';
    await order.save();

    res.json({ message: 'Order Fulfilled & Inventory Synced Successfully!', order });
  } catch (err) {
    console.error("[B2B] Fulfillment Crash:", err);
    res.status(500).json({ message: `Fulfillment failed: ${err.message}` });
  }
};

exports.getStarredReorders = async (req, res) => {
  try {
    // Fetch all retailer items marked for reorder
    const starredItems = await Product.find({ 
      retailerId: req.user.id, 
      isStarred: true 
    }).populate('wholesalerProductId');
    
    // Group by Wholesaler to generate draft bulk orders
    const drafts = starredItems.reduce((acc, item) => {
      const wid = item.wholesalerSourceId;
      if (!acc[wid]) acc[wid] = [];
      acc[wid].push(item);
      return acc;
    }, {});

    res.json(drafts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Comprehensive B2C Order Logic
exports.processCustomerOrder = async (req, res) => {
  try {
    const { items, retailerId } = req.body;
    let totalAmount = 0;
    const transactionId = new mongoose.Types.ObjectId().toString();

    const processedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) throw new Error(`Product not found: ${item.name}`);
      if (product.stock < item.quantity) throw new Error(`Out of stock: ${product.name}`);

      // 1. Decrement Stock
      product.stock -= item.quantity;
      await product.save();

      // 2. Prepare Snapshot
      const priceAtSale = product.price;
      totalAmount += priceAtSale * item.quantity;

      processedItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        priceAtPurchase: priceAtSale // Consumer price
      });

      // 3. Log Sales Data for AI
      await new SalesData({
        productId: product._id,
        transactionId,
        quantity: item.quantity,
        priceAtSale,
        retailerId: product.retailerId
      }).save();
    }

    const order = new Order({
      customerId: req.user.id,
      retailerId,
      items: processedItems,
      totalAmount,
      status: 'pending',
      paymentScreenshot: req.body.paymentScreenshot || null,
      paymentStatus: req.body.paymentScreenshot ? 'uploaded' : 'pending'
    });
    
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    console.error("Order process error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateB2BOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await B2BOrder.findOneAndUpdate(
      { _id: req.params.id, wholesalerId: req.user.id },
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'B2B Order not found or unauthorized' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
