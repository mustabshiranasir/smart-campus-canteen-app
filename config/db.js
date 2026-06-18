import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Node.js "querySrv ECONNREFUSED" on restrictive Windows networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }
    
    console.log('🔄 Connecting to MongoDB (Cloud)...');
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 4000, // 4 seconds timeout for cloud check
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
    });
    console.log(`✓ MongoDB Connected (Cloud): ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`✗ MongoDB Cloud Connection Failed: ${error.message}`);
    console.log('🔄 Falling back to Local MongoDB (127.0.0.1:27017)...');
    try {
      const conn = await mongoose.connect('mongodb://127.0.0.1:27017/smartcanteen', {
        serverSelectionTimeoutMS: 4000,
      });
      console.log(`✓ MongoDB Connected (Local Fallback): ${conn.connection.host}`);
      return conn;
    } catch (localError) {
      console.error(`✗ Local MongoDB Fallback Failed: ${localError.message}`);
      console.warn('⚠️  Server started with disconnected database. Install/Start MongoDB locally to test offline.');
    }
  }
};

export default connectDB;
