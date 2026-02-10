const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const B2BOrder = require('./models/B2BOrder');
const SalesData = require('./models/SalesData');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-kirana';

const productsList = [
    { name: 'Amul Taaza Milk', category: 'Dairy', price: 54, stock: 100 },
    { name: 'Amul Butter 100g', category: 'Dairy', price: 56, stock: 50 },
    { name: 'Britannia Brown Bread', category: 'Bakery', price: 45, stock: 40 },
    { name: 'Farm Fresh Eggs (6pcs)', category: 'Dairy', price: 42, stock: 100 },
    { name: 'Maggi Noodles 280g', category: 'Snacks', price: 38, stock: 200 },
    { name: 'Coca Cola 750ml', category: 'Beverages', price: 45, stock: 150 },
    { name: 'Lays Classic Salted', category: 'Snacks', price: 20, stock: 100 },
    { name: 'Tata Salt 1kg', category: 'Pantry', price: 28, stock: 300 },
    { name: 'Aashirvaad Atta 5kg', category: 'Pantry', price: 240, stock: 50 },
    { name: 'Fortune Sunlite Oil 1L', category: 'Pantry', price: 165, stock: 60 },
    { name: 'Dove Soap 3pack', category: 'Personal Care', price: 140, stock: 40 },
    { name: 'Colgate Active Salt', category: 'Personal Care', price: 85, stock: 50 },
    { name: 'India Gate Basmati Rice', category: 'Pantry', price: 120, stock: 80 },
    { name: 'Sugar 1kg', category: 'Pantry', price: 44, stock: 200 },
    { name: 'Red Label Tea 250g', category: 'Beverages', price: 130, stock: 60 }
];

const wholesalerProducts = [
    { name: 'Sugar Sacks (50kg)', category: 'Pantry', price: 1800, unitConversionFactor: 50 },
    { name: 'Rice Bags (25kg)', category: 'Pantry', price: 2400, unitConversionFactor: 25 },
    { name: 'Oil Cans (15L)', category: 'Pantry', price: 1900, unitConversionFactor: 15 },
    { name: 'Atta Sacks (50kg)', category: 'Pantry', price: 1800, unitConversionFactor: 10 },
    { name: 'Maggi Cartons (96 packs)', category: 'Snacks', price: 900, unitConversionFactor: 96 }
];

const seedDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected to:', MONGO_URI);

        // Clear existing data
        await User.deleteMany({});
        await Product.deleteMany({});
        await Order.deleteMany({});
        await B2BOrder.deleteMany({});
        await SalesData.deleteMany({});
        console.log('Old data cleared.');

        const hashedPassword = await bcrypt.hash('viram', 10);
        const retailerPassword = await bcrypt.hash('chinmay', 10);
        const wholesalerPassword = await bcrypt.hash('adarsh', 10);

        // 1. Create Key Users
        const customer = await User.create({
            name: 'Viram Customer',
            email: 'viram@gmail.com',
            password: hashedPassword,
            role: 'customer',
            phoneNumber: '9876543210',
            address: 'Viram House, Mumbai'
        });

        const retailer = await User.create({
            name: 'Chinmay General Store',
            email: 'chinmay@gmail.com',
            password: retailerPassword,
            role: 'retailer',
            phoneNumber: '9876543211',
            address: 'Chinmay Market, Mumbai'
        });

        const wholesaler = await User.create({
            name: 'Adarsh Wholesale Traders',
            email: 'adarsh@gmail.com',
            password: wholesalerPassword,
            role: 'wholesaler',
            phoneNumber: '9876543212',
            address: 'Adarsh Warehouse, Mumbai'
        });

        console.log('Key users created: Viram (Cust), Chinmay (Ret), Adarsh (Whole)');

        // 2. Create Dummy Customers to simulate traffic
        const dummyCustomers = [];
        for (let i = 1; i <= 20; i++) {
            dummyCustomers.push(await User.create({
                name: `Customer ${i}`,
                email: `cust${i}@gmail.com`,
                password: hashedPassword,
                role: 'customer',
                phoneNumber: `90000000${i < 10 ? '0' + i : i}`,
                address: `Locality ${i}`
            }));
        }

        // 3. Create Products for Retailer (Chinmay)
        const createdProducts = [];
        for (const p of productsList) {
            const product = await Product.create({
                ...p,
                basePrice: p.price,
                retailerId: retailer._id,
                sku: `RET-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                imageUrl: `https://source.unsplash.com/random/400x400/?${p.name.split(' ')[0]}`,
                expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 6))
            });
            createdProducts.push(product);
        }
        console.log(`Created ${createdProducts.length} products for Chinmay.`);

        // 4. Create Products for Wholesaler (Adarsh)
        for (const p of wholesalerProducts) {
            await Product.create({
                ...p,
                basePrice: p.price,
                stock: 1000,
                retailerId: wholesaler._id, // Products are owned by User model regardless of role
                sku: `WHO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                imageUrl: `https://source.unsplash.com/random/400x400/?warehouse`,
                status: 'active',
                expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            });
        }
        console.log('Wholesale products created.');

        // 5. Generate Orders for Apriori (Transactions)

        const milk = createdProducts.find(p => p.name.includes('Milk'));
        const bread = createdProducts.find(p => p.name.includes('Bread'));
        const butter = createdProducts.find(p => p.name.includes('Butter'));
        const maggi = createdProducts.find(p => p.name.includes('Maggi'));
        const coke = createdProducts.find(p => p.name.includes('Coke'));
        const tea = createdProducts.find(p => p.name.includes('Tea'));
        const sugar = createdProducts.find(p => p.name.includes('Sugar'));

        // Check if products found
        if (!milk || !bread || !butter || !maggi || !coke || !tea || !sugar) {
            console.error("Some products not found for pattern generation!");
            console.log({ milk: !!milk, bread: !!bread, butter: !!butter });
        } else {
            console.log("Products found for patterns.");
        }

        const ordersToCreate = [];
        const salesDataToCreate = [];

        // Create 50 orders with patterns
        for (let i = 0; i < 50; i++) {
            const randCust = dummyCustomers[Math.floor(Math.random() * dummyCustomers.length)];
            let items = [];

            const rand = Math.random();

            try {
                // Pattern Injection
                if (rand < 0.3) {
                    // Breakfast Combo
                    items.push({ productId: milk._id, name: milk.name, quantity: 1, priceAtPurchase: milk.price });
                    items.push({ productId: bread._id, name: bread.name, quantity: 1, priceAtPurchase: bread.price });
                    if (Math.random() > 0.5) items.push({ productId: butter._id, name: butter.name, quantity: 1, priceAtPurchase: butter.price });
                } else if (rand < 0.5) {
                    // Snack Combo
                    items.push({ productId: maggi._id, name: maggi.name, quantity: 2, priceAtPurchase: maggi.price });
                    items.push({ productId: coke._id, name: coke.name, quantity: 1, priceAtPurchase: coke.price });
                } else if (rand < 0.7) {
                    // Chai Bundle
                    items.push({ productId: tea._id, name: tea.name, quantity: 1, priceAtPurchase: tea.price });
                    items.push({ productId: sugar._id, name: sugar.name, quantity: 1, priceAtPurchase: sugar.price });
                } else {
                    // Random
                    const p1 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
                    items.push({ productId: p1._id, name: p1.name, quantity: 1, priceAtPurchase: p1.price });
                }

                const totalAmount = items.reduce((sum, item) => sum + (item.priceAtPurchase * item.quantity), 0);

                // Random dates in last 30 days
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 30));

                ordersToCreate.push({
                    customerId: randCust._id,
                    retailerId: retailer._id,
                    items,
                    totalAmount,
                    status: 'delivered',
                    createdAt: date,
                    updatedAt: date
                });

                // Generate Sales Data for AI
                const transactionId = new mongoose.Types.ObjectId().toString();
                for (const item of items) {
                    salesDataToCreate.push({
                        productId: item.productId,
                        transactionId: transactionId,
                        quantity: item.quantity,
                        priceAtSale: item.priceAtPurchase,
                        timestamp: date,
                        retailerId: retailer._id
                    });
                }

            } catch (err) {
                console.error("Error creating order object:", err);
            }
        }

        // Add orders for Viram (Customer) specifically
        if (milk) {
            for (let i = 0; i < 5; i++) {
                const items = [{ productId: milk._id, name: milk.name, quantity: 2, priceAtPurchase: milk.price }];
                const date = new Date();

                ordersToCreate.push({
                    customerId: customer._id,
                    retailerId: retailer._id,
                    items,
                    totalAmount: milk.price * 2,
                    status: 'delivered',
                    createdAt: date,
                    updatedAt: date
                });

                const transactionId = new mongoose.Types.ObjectId().toString();
                for (const item of items) {
                    salesDataToCreate.push({
                        productId: item.productId,
                        transactionId: transactionId,
                        quantity: item.quantity,
                        priceAtSale: item.priceAtPurchase,
                        timestamp: date,
                        retailerId: retailer._id
                    });
                }
            }
        }

        try {
            await Order.insertMany(ordersToCreate);
            await SalesData.insertMany(salesDataToCreate);
            console.log(`Created ${ordersToCreate.length} orders and ${salesDataToCreate.length} sales records for Apriori analysis.`);
        } catch (insertErr) {
            console.error("InsertMany Error:", insertErr);
        }

        mongoose.connection.close();
        console.log('Seeding Complete.');
    } catch (err) {
        console.error("Global Error:", err);
        mongoose.connection.close();
    }
};

seedDB();
