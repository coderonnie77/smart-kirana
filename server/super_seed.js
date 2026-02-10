const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const B2BOrder = require('./models/B2BOrder');
const SalesData = require('./models/SalesData');
require('dotenv').config();

async function superSeed() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas for Super Seeding');

    // 1. Setup Users
    const salt = await bcrypt.genSalt(10);
    const hashedPw = await bcrypt.hash('password123', salt);

    const wholesaler = await User.findOneAndUpdate(
      { email: 'wholesaler@test.com' },
      { name: 'Global Wholesale Mart', email: 'wholesaler@test.com', password: hashedPw, role: 'wholesaler', address: 'Industrial Area Phase II', phoneNumber: '9000000001' },
      { upsert: true, new: true }
    );

    const retailer = await User.findOneAndUpdate(
      { email: 'retailer@test.com' },
      { name: 'Smart Kirana Retail', email: 'retailer@test.com', password: hashedPw, role: 'retailer', address: 'Downtown Plaza 404', phoneNumber: '9000000002' },
      { upsert: true, new: true }
    );

    const customer = await User.findOneAndUpdate(
      { email: 'customer@test.com' },
      { name: 'John Doe Customer', email: 'customer@test.com', password: hashedPw, role: 'customer', address: 'Residential Colony 7', phoneNumber: '9000000003' },
      { upsert: true, new: true }
    );

    // Clean up old business data before seeding fresh variety
    await Product.deleteMany({});
    await Order.deleteMany({});
    await B2BOrder.deleteMany({});
    await SalesData.deleteMany({});

    // 2. Create Wholesaler Inventory (Bulk Items)
    console.log('--- Seeding Wholesaler Inventory ---');
    const wholesaleProductsData = [
      { name: 'Rice Bulk Bag (50kg)', category: 'Grains', price: 2500, basePrice: 2000, stock: 100, sku: 'W-RICE-50', retailerId: wholesaler._id, status: 'active', expiryDate: new Date('2026-12-01') },
      { name: 'Refined Sugar (50kg)', category: 'Grocery', price: 1800, basePrice: 1500, stock: 80, sku: 'W-SUG-50', retailerId: wholesaler._id, status: 'active', expiryDate: new Date('2026-12-01') },
      { name: 'Mustard Oil Tin (15L)', category: 'Oil', price: 2100, basePrice: 1800, stock: 50, sku: 'W-OIL-15', retailerId: wholesaler._id, status: 'active', expiryDate: new Date('2026-06-01') },
      { name: 'Wheat Flour (40kg)', category: 'Grains', price: 1400, basePrice: 1100, stock: 120, sku: 'W-WHEAT-40', retailerId: wholesaler._id, status: 'active', expiryDate: new Date('2026-08-01') },
      { name: 'Tea Leaves Bulk (10kg)', category: 'Beverage', price: 3200, basePrice: 2800, stock: 30, sku: 'W-TEA-10', retailerId: wholesaler._id, status: 'active', expiryDate: new Date('2027-01-01') }
    ];
    const wProducts = await Product.insertMany(wholesaleProductsData);

    // 3. Create Retailer Inventory (Variety)
    console.log('--- Seeding Retailer Inventory ---');
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const nearExpiryDate = new Date();
    nearExpiryDate.setDate(nearExpiryDate.getDate() + 5); // 5 days from now

    const retailerProductsData = [
      { name: 'Premium Basmati Rice', category: 'Grains', price: 130, basePrice: 100, stock: 45, sku: 'R-RICE-01', retailerId: retailer._id, status: 'active', expiryDate: futureDate, isStarred: true },
      { name: 'Fine Sugar', category: 'Grocery', price: 48, basePrice: 40, stock: 5, sku: 'R-SUG-01', retailerId: retailer._id, status: 'active', expiryDate: futureDate, minStockThreshold: 15 }, // Low stock alert
      { name: 'Mustard Oil 1L', category: 'Oil', price: 175, basePrice: 150, stock: 20, sku: 'R-OIL-01', retailerId: retailer._id, status: 'active', expiryDate: nearExpiryDate }, // Expiry alert
      { name: 'Whole Wheat Flour 5kg', category: 'Grains', price: 220, basePrice: 180, stock: 12, sku: 'R-WHEAT-05', retailerId: retailer._id, status: 'active', expiryDate: futureDate },
      { name: 'Green Tea Pack', category: 'Beverage', price: 450, basePrice: 380, stock: 8, sku: 'R-TEA-01', retailerId: retailer._id, status: 'active', expiryDate: futureDate, isStarred: true },
      { name: 'Salt 1kg', category: 'Grocery', price: 25, basePrice: 20, stock: 100, sku: 'R-SALT-01', retailerId: retailer._id, status: 'active', expiryDate: futureDate },
      { name: 'Turmeric Powder 200g', category: 'Spices', price: 60, basePrice: 45, stock: 0, sku: 'R-SPICE-01', retailerId: retailer._id, status: 'active', expiryDate: futureDate, minStockThreshold: 5 }, // Out of stock
      { name: 'Red Chilli 500g', category: 'Spices', price: 180, basePrice: 150, stock: 15, sku: 'R-SPICE-02', retailerId: retailer._id, status: 'draft', expiryDate: futureDate } // Draft item
    ];
    const rProducts = await Product.insertMany(retailerProductsData);

    // 4. Create B2B Orders (History & Pipeline)
    console.log('--- Seeding B2B Orders ---');
    await B2BOrder.create([
      { retailerId: retailer._id, wholesalerId: wholesaler._id, items: [{ name: 'Rice Bulk Bag', quantity: 2, priceAtPurchase: 2500, wholesalerProductId: wProducts[0]._id }], totalAmount: 5000, status: 'fulfilled' },
      { retailerId: retailer._id, wholesalerId: wholesaler._id, items: [{ name: 'Mustard Oil Tin', quantity: 5, priceAtPurchase: 2100, wholesalerProductId: wProducts[2]._id }], totalAmount: 10500, status: 'pending' }, // Pending for Wholesaler view
      { retailerId: retailer._id, wholesalerId: wholesaler._id, items: [{ name: 'Wheat Flour', quantity: 10, priceAtPurchase: 1400, wholesalerProductId: wProducts[3]._id }], totalAmount: 14000, status: 'accepted' } // Accepted for Wholesaler view
    ]);

    // 5. Create B2C Orders (Last 30 days for graphs)
    console.log('--- Seeding B2C Orders (30 Day History) ---');
    const activeRProducts = rProducts.filter(p => p.status === 'active' && p.price > 0);
    
    for (let i = 0; i < 40; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // random within 30 days
      
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const orderItems = [];
      let total = 0;
      
      for (let j = 0; j < itemCount; j++) {
        const prod = activeRProducts[Math.floor(Math.random() * activeRProducts.length)];
        const qty = Math.floor(Math.random() * 4) + 1;
        orderItems.push({ productId: prod._id, name: prod.name, quantity: qty, priceAtPurchase: prod.price });
        total += prod.price * qty;

        // Sales Data Entry
        await SalesData.create({
          productId: prod._id,
          retailerId: retailer._id,
          quantity: qty,
          priceAtSale: prod.price,
          transactionId: 'TX-' + Math.random().toString(36).substr(2, 9),
          createdAt: date
        });
      }

      await Order.create({
        customerId: customer._id,
        retailerId: retailer._id,
        items: orderItems,
        totalAmount: total,
        status: i % 10 === 0 ? 'cancelled' : 'delivered',
        createdAt: date
      });
    }

    console.log('✅ SUPER SEEDING COMPLETE!');
    process.exit(0);
  } catch (err) {
    console.error('❌ SEEDING FAILED:', err);
    process.exit(1);
  }
}

superSeed();
