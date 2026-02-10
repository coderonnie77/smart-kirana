const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Product = require('./models/Product');

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-kirana';

const verifyRemoteData = async () => {
    try {
        console.log('Connecting to:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        
        const userCount = await User.countDocuments();
        const productCount = await Product.countDocuments();
        
        console.log('--- REMOTE DB STATUS ---');
        console.log(`Users: ${userCount}`);
        console.log(`Products: ${productCount}`);
        if(productCount > 0) {
             const sample = await Product.findOne();
             console.log(`Sample: ${sample.name}, Retailer: ${sample.retailerId}`);
        }
        
        mongoose.connection.close();
    } catch (err) {
        console.error('Verification Failed:', err);
    }
};

verifyRemoteData();
