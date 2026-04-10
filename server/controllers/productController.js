const Product = require('../models/Product');

exports.getProducts = async (req, res) => {
  try {
    // Active Products from Retailers only
    const retailers = await require('../models/User').find({ role: 'retailer' }).select('_id');
    const retailerIds = retailers.map(r => r._id);
    
    const products = await Product.find({ 
      status: 'active',
      retailerId: { $in: retailerIds }
    }).populate('retailerId', 'name').sort({ createdAt: -1 });
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProductsByWholesaler = async (req, res) => {
  try {
    // Retailers see active bulk products from wholesalers
    const products = await Product.find({ 
      retailerId: req.params.wholesalerId,
      status: 'active'
    }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyProducts = async (req, res) => {
  try {
    // Owners (Retailer/Wholesaler) see all their products including drafts
    const products = await Product.find({ retailerId: req.user.id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = new Product({ ...req.body, retailerId: req.user.id });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, retailerId: req.user.id },
      req.body,
      { new: true }
    );
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findOneAndDelete({ _id: req.params.id, retailerId: req.user.id });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleStar = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, retailerId: req.user.id });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.isStarred = !product.isStarred;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.executeVoiceAction = async (req, res) => {
  try {
    const { action, item, quantity, unit } = req.body;
    let product = await Product.findOne({
      retailerId: req.user.id,
      name: { $regex: new RegExp(item, 'i') }
    });

    if (action === 'add') {
      if (product) {
        product.stock += quantity;
      } else {
        product = new Product({
          name: item,
          category: 'Voice-Added',
          price: 0,
          basePrice: 0,
          stock: quantity,
          sku: `VOICE-${Date.now()}`,
          retailerId: req.user.id,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      }
    } else if (action === 'delete' || action === 'remove') {
      if (product) {
        await Product.findOneAndDelete({ _id: product._id, retailerId: req.user.id });
        return res.json({ message: `Successfully removed ${item}`, product: null });
      } else {
        return res.status(404).json({ message: `Could not find an item matching ${item}` });
      }
    } else if (action === 'update') {
      if (product) {
        product.stock = quantity;
      } else {
        return res.status(404).json({ message: `Could not find an item matching ${item}` });
      }
    }

    if (product) await product.save();
    res.json({ message: `Successfully ${action}ed ${quantity} ${unit} of ${item}`, product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getExpiryAlerts = async (req, res) => {
  try {
    const fifteenDaysFromNow = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const alerts = await Product.find({
      retailerId: req.user.id,
      stock: { $gt: 0 },
      expiryDate: { $lte: fifteenDaysFromNow }
    });

    const productsWithSuggestions = alerts.map(p => ({
      ...p.toObject(),
      suggestion: 'Clearance Discount',
      recommendedPrice: p.price * 0.7 // 30% discount suggestion
    }));

    res.json(productsWithSuggestions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
