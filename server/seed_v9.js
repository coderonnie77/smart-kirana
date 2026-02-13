const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const B2BOrder = require('./models/B2BOrder');
const SalesData = require('./models/SalesData');

dotenv.config({ path: __dirname + '/.env' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-kirana';

const categories = ['Dairy', 'Bakery', 'Pantry', 'Snacks', 'Beverages', 'Personal Care', 'Household'];

const productTemplates = [
    { name: 'Amul Taaza Milk', category: 'Dairy', price: 54 },
    { name: 'Amul Butter 100g', category: 'Dairy', price: 56 },
    { name: 'Britannia Bread', category: 'Bakery', price: 45 },
    { name: 'Farm Fresh Eggs', category: 'Dairy', price: 42 },
    { name: 'Maggi Noodles', category: 'Snacks', price: 140 }, // Pack of 12
    { name: 'Coca Cola 750ml', category: 'Beverages', price: 45 },
    { name: 'Lays Classic', category: 'Snacks', price: 20 },
    { name: 'Tata Salt 1kg', category: 'Pantry', price: 28 },
    { name: 'Aashirvaad Atta', category: 'Pantry', price: 240 },
    { name: 'Fortune Oil 1L', category: 'Pantry', price: 165 },
    { name: 'Dove Soap', category: 'Personal Care', price: 60 },
    { name: 'Colgate Paste', category: 'Personal Care', price: 95 },
    { name: 'Basmati Rice', category: 'Pantry', price: 120 },
    { name: 'Sugar 1kg', category: 'Pantry', price: 44 },
    { name: 'Red Label Tea', category: 'Beverages', price: 130 },
    { name: 'Good Day Biscuits', category: 'Snacks', price: 30 },
    { name: 'Surf Excel 1kg', category: 'Household', price: 130 },
    { name: 'Vim Bar', category: 'Household', price: 20 },
    { name: 'Sprite 2L', category: 'Beverages', price: 95 },
    { name: 'Kissan Jam', category: 'Pantry', price: 150 }
];

const seedDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Using DB:', MONGO_URI);

        // 1. Clear Data
        await User.deleteMany({});
        await Product.deleteMany({});
        await Order.deleteMany({});
        await B2BOrder.deleteMany({});
        await SalesData.deleteMany({});
        console.log('Old Data Cleared.');

        const passwordHash = await bcrypt.hash('password123', 10);
        const specificHash = await bcrypt.hash('chinmay', 10); // for chinmay

        // 2. Create Wholesalers
        const wholesalers = [];
        const wholesalerData = [
            { name: 'Adarsh Wholesale', email: 'adarsh@gmail.com', pass: 'adarsh' },
            { name: 'Metro Cash & Carry', email: 'metro@gmail.com', pass: 'metro' }
        ];

        for (const w of wholesalerData) {
            const hash = await bcrypt.hash(w.pass, 10);
            const user = await User.create({
                name: w.name,
                email: w.email,
                password: hash,
                role: 'wholesaler',
                phoneNumber: '9000000000',
                address: 'Wholesale Market'
            });
            wholesalers.push(user);
        }

        // 3. Create Retailers
        const retailers = [];
        const retailerData = [
            { name: 'Chinmay General Store', email: 'chinmay@gmail.com', pass: 'chinmay' },
            { name: 'Rahul Kirana', email: 'rahul@gmail.com', pass: 'rahul' },
            { name: 'Sneha Supermart', email: 'sneha@gmail.com', pass: 'sneha' }
        ];

        for (const r of retailerData) {
            const hash = await bcrypt.hash(r.pass, 10);
            const user = await User.create({
                name: r.name,
                email: r.email,
                password: hash,
                role: 'retailer',
                phoneNumber: '9000000001',
                address: 'Local Market'
            });
            retailers.push(user);
        }

        // 4. Create Customers
        const customers = [];
        // Main Customer
        const mainCustomer = await User.create({
            name: 'Viram Customer',
            email: 'viram@gmail.com',
            password: await bcrypt.hash('viram', 10),
            role: 'customer',
            phoneNumber: '9876543210',
            address: 'Customer House'
        });
        customers.push(mainCustomer);

        // Dummy Customers
        for (let i = 1; i <= 20; i++) {
            customers.push(await User.create({
                name: `Customer ${i}`,
                email: `cust${i}@gmail.com`,
                password: passwordHash,
                role: 'customer',
                phoneNumber: `8000000${i < 10 ? '0' + i : i}`,
                address: `Area ${i}`
            }));
        }

        // 5. Create Wholesaler Products
        for (const w of wholesalers) {
            for (let i = 0; i < 20; i++) { // 20 bulk products each
                const t = productTemplates[i % productTemplates.length];
                await Product.create({
                    name: `Bulk ${t.name}`,
                    category: t.category,
                    price: t.price * 10 * 0.8, // Bulk price logic
                    basePrice: t.price * 10 * 0.8,
                    stock: 1000,
                    retailerId: w._id, // Owned by wholesaler
                    sku: `WHO-${w.name.substr(0, 3).toUpperCase()}-${i}`,
                    imageUrl: `https://source.unsplash.com/random/400x400/?${t.category}-${i}`,
                    status: 'active',
                    unitConversionFactor: 10,
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                });
            }
        }

        // 6. Create Retailer Products (Inventory)
        const allRetailerProducts = [];

        for (const r of retailers) {
            // Randomize inventory for each retailer
            const numProducts = 30 + Math.floor(Math.random() * 20); // 30-50 products
            const myProducts = [];

            for (let i = 0; i < numProducts; i++) {
                const t = productTemplates[i % productTemplates.length];
                // Slight price variation
                const price = Math.floor(t.price * (0.9 + Math.random() * 0.2));

                const p = await Product.create({
                    name: t.name,
                    category: t.category,
                    price: price,
                    basePrice: price,
                    stock: 10 + Math.floor(Math.random() * 100),
                    retailerId: r._id,
                    sku: `RET-${r.name.substr(0, 3).toUpperCase()}-${i}`,
                    imageUrl: `https://source.unsplash.com/random/400x400/?${t.category.split(' ')[0]}-${i}`,
                    status: 'active',
                    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                });

                myProducts.push(p);
                allRetailerProducts.push(p);
            }

            // Create 2 "Low Stock" items
            for (let l = 0; l < 2; l++) {
                const t = productTemplates[(l + 10) % productTemplates.length];
                myProducts.push(await Product.create({
                    name: t.name,
                    category: t.category,
                    price: t.price,
                    basePrice: t.price,
                    stock: 3, // Very Low!
                    retailerId: r._id,
                    sku: `RET-${r.name.substr(0, 3).toUpperCase()}-LOW-${l}`,
                    imageUrl: `https://source.unsplash.com/random/400x400/?${t.category.split(' ')[0]}-low`,
                    status: 'active',
                    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                }));
            }

            // Create 2 "Expiring Soon" items
            for (let e = 0; e < 2; e++) {
                const t = productTemplates[(e + 15) % productTemplates.length];
                myProducts.push(await Product.create({
                    name: t.name,
                    category: t.category,
                    price: Math.floor(t.price * 0.5), // Discounted!
                    basePrice: t.price,
                    stock: 15,
                    retailerId: r._id,
                    sku: `RET-${r.name.substr(0, 3).toUpperCase()}-EXP-${e}`,
                    imageUrl: `https://source.unsplash.com/random/400x400/?${t.category.split(' ')[0]}-exp`,
                    status: 'active',
                    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // Expires in 5 days
                }));
            }

            // Create 1 "Already Expired" item (for Loss Calculation)
            const tExp = productTemplates[5];
            await Product.create({
                name: tExp.name + " (Expired)",
                category: tExp.category,
                price: tExp.price,
                basePrice: tExp.price,
                stock: 10,
                retailerId: r._id,
                sku: `RET-${r.name.substr(0, 3).toUpperCase()}-LOST`,
                imageUrl: `https://source.unsplash.com/random/400x400/?waste`,
                status: 'active', // Active but shouldn't be sold... just for analytics
                expiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // Expired 5 days ago
            });

            allRetailerProducts.push(...myProducts);

            // 7. Generate Orders & SalesData for this retailer
            // 50 transactions
            for (let j = 0; j < 50; j++) {
                const randCust = customers[Math.floor(Math.random() * customers.length)];
                const orderItems = [];

                // Randomly select 1-5 items
                const itemCount = 1 + Math.floor(Math.random() * 4);
                for (let k = 0; k < itemCount; k++) {
                    const prod = myProducts[Math.floor(Math.random() * myProducts.length)];
                    // Avoid dupes in same order roughly
                    if (!orderItems.find(x => x.productId === prod._id)) {
                        orderItems.push({
                            productId: prod._id,
                            name: prod.name,
                            quantity: 1 + Math.floor(Math.random() * 2),
                            priceAtPurchase: prod.price
                        });
                    }
                }

                if (orderItems.length === 0) continue;

                const totalAmount = orderItems.reduce((sum, item) => sum + (item.priceAtPurchase * item.quantity), 0);
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Past 30 days

                // Create Order
                await Order.create({
                    customerId: randCust._id,
                    retailerId: r._id,
                    items: orderItems,
                    totalAmount,
                    status: 'delivered',
                    createdAt: date,
                    updatedAt: date
                });

                // Create Sales Data
                const transactionId = new mongoose.Types.ObjectId().toString();
                for (const item of orderItems) {
                    await SalesData.create({
                        productId: item.productId,
                        transactionId,
                        quantity: item.quantity,
                        priceAtSale: item.priceAtPurchase,
                        timestamp: date,
                        retailerId: r._id
                    });
                }
            }
        }

        console.log(`\n\nSEEDING COMPLETE!`);
        console.log(`Retailers: ${retailers.length}`);
        console.log(`Wholesalers: ${wholesalers.length}`);
        console.log(`Customers: ${customers.length}`);
        console.log(`Products: ${allRetailerProducts.length} (Retail)`);
        console.log(`SalesData Created for AI.`);

        console.log('\nCREDENTIALS (Login Required):');
        console.log('----------------------------------------------------');
        console.log('Customer: viram@gmail.com / viram');
        console.log('Retailer: chinmay@gmail.com / chinmay');
        console.log('Wholesaler: adarsh@gmail.com / adarsh');
        console.log('----------------------------------------------------');
        console.log('PLEASE RESTART THE CLIENT/SERVER AND LOG IN AGAIN TO SEE DATA.');

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        mongoose.connection.close();
    }
};

seedDB();
